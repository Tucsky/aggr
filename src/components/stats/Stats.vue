<template>
  <div class="pane-stats">
    <pane-header
      :paneId="paneId"
      :settings="() => import('@/components/stats/StatsDialog.vue')"
    />
    <ul class="stats-buckets">
      <li
        v-for="(bucket, id) in data"
        :key="id"
        class="stat-bucket"
        @click="editStat(id)"
      >
        <div class="stat-bucket__name">{{ bucket.name }}</div>
        <div class="stat-bucket__value">{{ bucket.value }}</div>
      </li>
    </ul>
    <div v-if="enableChart" class="stats-chart" ref="chart"></div>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import * as TV from 'lightweight-charts'
import aggregatorService from '@/services/aggregatorService'
import Bucket from '../../utils/bucket'
import {
  defaultStatsChartOptions,
  getChartOptions,
  getChartCustomColorsOptions,
  getChartFontSize
} from '../chart/options'

import StatDialog from './StatDialog.vue'
import dialogService from '@/services/dialogService'

import { getBucketId } from '@/utils/helpers'
import { formatAmount } from '@/services/productsService'
import PaneMixin from '@/mixins/paneMixin'
import PaneHeader from '../panes/PaneHeader.vue'

@Component({
  components: { PaneHeader },
  name: 'Stats'
})
export default class Stats extends Mixins(PaneMixin) {
  data = {}

  $refs!: {
    chart: HTMLElement
  }

  private _refreshChartDimensionsTimeout: number
  private _chart: TV.IChartApi
  private _buckets: { [id: string]: Bucket } = {}
  private _feed: string = null

  get enableChart() {
    return this.$store.state[this.paneId].enableChart
  }

  get buckets() {
    return this.$store.state[this.paneId].buckets
  }

  created() {
    this._onStoreMutation = this.$store.subscribe(mutation => {
      switch (mutation.type) {
        case 'settings/SET_TEXT_COLOR':
          if (this._chart && mutation.payload) {
            this._chart.applyOptions(getChartCustomColorsOptions(this.paneId))
          }
          break
        case 'settings/SET_CHART_THEME':
          if (this._chart) {
            this._chart.applyOptions(getChartCustomColorsOptions(this.paneId))
          }
          break
        case 'panes/SET_PANE_MARKETS':
        case this.paneId + '/SET_WINDOW':
          if (mutation.payload.id && mutation.payload.id !== this.paneId) {
            break
          }
          this.prepareBuckets()
          break
        case this.paneId + '/SET_BUCKET_COLOR':
          this.recolorBucket(mutation.payload.id, mutation.payload.value)
          break
        case this.paneId + '/SET_BUCKET_TYPE':
          if (this._chart) {
            this.reloadBucketSerie(mutation.payload.id, mutation.payload.value)
          }
          break
        case this.paneId + '/TOGGLE_CHART':
          if (mutation.payload) {
            this.createChart()
          } else {
            this.removeChart()
          }
          break
        case this.paneId + '/TOGGLE_BUCKET':
          if (mutation.payload.value) {
            this.createBucket(this.buckets[mutation.payload.id])
          } else {
            this.removeBucket(mutation.payload.id)
          }
          break
        case 'panes/SET_PANE_ZOOM':
          if (mutation.payload.id === this.paneId) {
            this.updateFontSize()
          }
          break
        case this.paneId + '/REMOVE_BUCKET':
          this.removeBucket(mutation.payload)
          break
        case this.paneId + '/SET_BUCKET_WINDOW':
        case this.paneId + '/SET_BUCKET_INPUT':
        case this.paneId + '/SET_BUCKET_PRECISION':
          this.refreshBucket(mutation.payload.id)
          break
        case this.paneId + '/RENAME_BUCKET':
          this.refreshBucketName(mutation.payload)
          break
      }
    })

    this.prepareBuckets()
  }

  mounted() {
    if (this.enableChart) {
      this.createChart()
    }
  }

  beforeDestroy() {
    if (this._feed) {
      aggregatorService.off(this._feed, this.onVolume)
    }

    this.clearBuckets()
    this.removeChart()

    this._chart = null
  }

  async createChart() {
    await this.$nextTick()

    const chartOptions = getChartOptions(
      defaultStatsChartOptions as any,
      this.paneId
    )

    this._chart = TV.createChart(this.$refs.chart, chartOptions)

    for (const id in this._buckets) {
      this._buckets[id].createSerie(this._chart)
    }

    this.refreshChartDimensions(0)
  }

  updateFontSize() {
    if (!this._chart) {
      return
    }

    this._chart.applyOptions({
      layout: {
        fontSize: getChartFontSize(this.paneId)
      }
    })
  }

  removeChart() {
    if (!this._chart) {
      return
    }

    // this.stopChartUpdate()

    for (const id in this._buckets) {
      this._buckets[id].removeIndicator(this._chart)
    }

    this._chart.remove()

    this._chart = null
  }

  /* chartUpdate() {
    if (!this._chartUpdateInterval) {
      this._chartUpdateInterval = setInterval(this.chartUpdate.bind(this), 100)
      return
    }

    for (const id in this._buckets) {
      this._buckets[id].updateSerie()
    }
  }
  stopChartUpdate() {
    if (this._chartUpdateInterval) {
      clearInterval(this._chartUpdateInterval)
      delete this._chartUpdateInterval
    }
  } */
  async refreshChartDimensions(debounceTime = 500) {
    if (!this.enableChart) {
      return
    }

    clearTimeout(this._refreshChartDimensionsTimeout)

    this._refreshChartDimensionsTimeout = setTimeout(() => {
      this._chart &&
        this._chart.resize(this.$el.clientWidth, this.$el.clientHeight)
    }, debounceTime) as unknown as number
  }
  prepareBuckets() {
    if (this._feed) {
      console.debug(`[stats/${this.paneId}] unsubscribe from feed`, this._feed)
      aggregatorService.off(this._feed, this.onVolume)
    }

    this.clearBuckets()

    for (const id in this.buckets) {
      this.createBucket(this.buckets[id])
    }

    this._feed = 'bucket-' + getBucketId(this.pane.markets)
    console.debug(`[stats/${this.paneId}] subscribe to feed`, this._feed)

    if (this._feed.length) {
      aggregatorService.on(this._feed, this.onVolume)
    } else {
      console.debug(`[stats/${this.paneId}] error feed empty...`)
    }
  }
  onVolume(sums) {
    for (const id in this._buckets) {
      this._buckets[id].onStats(sums)

      if (this._buckets[id].stacks.length) {
        const value = this._buckets[id].getValue()

        this.$set(
          this.data[id],
          'value',
          formatAmount(value, this._buckets[id].precision)
        )
      }

      if (this._chart) {
        this._buckets[id].updateSerie()
      }
    }
  }

  clearBuckets() {
    for (const id in this._buckets) {
      this.removeBucket(id)
    }

    this._buckets = {}
  }

  removeBucket(id) {
    if (!this._buckets[id]) {
      return
    }

    this._buckets[id].unbind()

    if (this._chart) {
      this._buckets[id].removeIndicator(this._chart)
    }

    this.$delete(this.data, id)

    delete this._buckets[id]
  }
  refreshBucket(id) {
    const options = this.buckets[id]

    if (!options) {
      return
    }

    this.removeBucket(id)
    this.createBucket(options)
  }

  recolorBucket(id, color) {
    if (!this._buckets[id]) {
      return
    }

    this._buckets[id].updateColor(color)

    this.$set(this.data[id], 'color', color)
  }

  reloadBucketSerie(id, type?: string) {
    if (!this._buckets[id]) {
      return
    }

    if (type) {
      // set different serie type
      this._buckets[id].type = type
    }

    this._buckets[id].removeIndicator(this._chart)
    this._buckets[id].createSerie(this._chart)
  }

  createBucket(statBucket) {
    if (statBucket.enabled && typeof this.data[statBucket.id] === 'undefined') {
      const bucket = new Bucket(statBucket.input, statBucket, this.paneId)

      if (this._chart) {
        bucket.createSerie(this._chart)
      }

      this._buckets[statBucket.id] = bucket

      this.$set(this.data, bucket.id, {
        value: 0,
        name: bucket.name,
        color: bucket.color
      })
    }
  }

  refreshBucketName({ id, name }: { id: string; name: string }) {
    const bucket = this._buckets[id]
    bucket.name = name
    this.$set(this.data[id], 'name', name)
  }

  editStat(id) {
    dialogService.open(StatDialog, { paneId: this.paneId, bucketId: id })
  }

  onResize() {
    this.refreshChartDimensions()
  }
}
</script>

<style lang="scss">
.pane-stats {
  position: relative;
}

.stats-chart {
  display: static;

  &:before {
    content: '';
    display: block;
  }

  > * {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }
}

.stats-buckets {
  padding: 0;
  margin: 0;
  list-style: none;
  top: 0;
  position: relative;
  width: 0;

  .tv-lightweight-charts canvas {
    z-index: auto;
  }

  .stat-bucket {
    flex-direction: column;
    align-items: flex-start;
    width: 0;
    white-space: nowrap;
  }

  &:last-child {
    width: auto;
    .stat-bucket {
      flex-direction: row;
      align-items: center;
      width: auto;
    }
  }
}

.stat-bucket {
  display: flex;
  align-items: center;
  padding: 0.75em;
  cursor: pointer;

  + .stat-bucket {
    padding-top: 0;
  }

  &__name {
    letter-spacing: 0.4px;
    transition: opacity 0.2s $ease-out-expo;
    font-size: 80%;
  }

  &__value {
    text-align: right;
    white-space: nowrap;
    font-family: $font-condensed;
    z-index: 1;
    flex-grow: 1;
    font-weight: 600;
    letter-spacing: 0.5px;
  }
}
</style>
