<template>
  <div class="pane-chart">
    <pane-header :loading="loading" :paneId="paneId" :showTimeframe="true" />
    <div class="chart__container" ref="chartContainer"></div>
    <div class="chart__series">
      <SerieControl v-for="(serie, index) in activeSeries" :key="index" :serieId="serie" :paneId="paneId" :legend="legend[serie]" />

      <div class="column mt8">
        <a href="javascript:void(0);" @click="addSerie" v-tippy="{ placement: 'bottom' }" title="Add" class="mr4">
          <i class="icon-plus"></i>
        </a>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'

import ChartController, { TimeRange } from './chartController'

import dialogService from '../../services/dialogService'
import { formatPrice, formatAmount, formatTime, getHms } from '../../utils/helpers'

import SerieControl from './SerieControl.vue'
import { MAX_BARS_PER_CHUNKS } from '../../utils/constants'
import SerieDialog from './SerieDialog.vue'
import CreateSerieDialog from './CreateSerieDialog.vue'
import aggregatorService from '@/services/aggregatorService'
import historicalService from '@/services/historicalService'
import PaneMixin from '@/mixins/paneMixin'
import { getCustomColorsOptions } from './chartOptions'
import PaneHeader from '../panes/PaneHeader.vue'

@Component({
  name: 'Chart',
  components: {
    SerieControl,
    PaneHeader
  }
})
export default class extends Mixins(PaneMixin) {
  reachedEnd = false
  loading = false
  legend = {}

  private _onStoreMutation: () => void
  private _keepAliveTimeout: number
  private _onPanTimeout: number
  private _chartController: ChartController

  get activeSeries() {
    return this.$store.state[this.paneId].activeSeries
  }

  get timeframe() {
    return this.$store.state[this.paneId].timeframe
  }

  get exchanges() {
    return this.$store.state.exchanges
  }

  get markets() {
    return this.$store.state.panes.panes[this.paneId].markets
  }

  get refreshRate() {
    return this.$store.state[this.paneId].refreshRate
  }

  get series() {
    return this.$store.state[this.paneId].series
  }

  get theme() {
    return this.$store.state.settings.theme
  }

  get timezoneOffset() {
    return this.$store.state.settings.timezoneOffset
  }

  $refs!: {
    chartContainer: HTMLElement
  }

  created() {
    this._chartController = new ChartController(this.paneId)

    this._onStoreMutation = this.$store.subscribe(mutation => {
      switch (mutation.type) {
        case 'settings/SET_CHART_COLOR':
          if (mutation.payload) {
            this._chartController.chartInstance.applyOptions(getCustomColorsOptions(mutation.payload))
          }
          break
        case 'settings/SET_CHART_THEME':
          this._chartController.chartInstance.applyOptions(getCustomColorsOptions())
          break
        case 'settings/SET_TIMEZONE_OFFSET':
          this._chartController.clearChart()
          this._chartController.renderVisibleChunks()
          break
        case 'app/EXCHANGE_UPDATED':
          this._chartController.renderVisibleChunks()
          break
        case 'panes/SET_PANE_MARKETS':
          if (mutation.payload.id === this.paneId) {
            this._chartController.setMarkets(mutation.payload.markets)

            this.clear()
            this.fetch()
          }
          break
        case this.paneId + '/SET_TIMEFRAME':
          this.clear()
          this.fetch()
          break
        case this.paneId + '/SET_REFRESH_RATE':
          this._chartController.clearQueue()
          this._chartController.setupQueue()
          break
        case this.paneId + '/SET_SERIE_OPTION':
          this._chartController.setSerieOption(mutation.payload)
          break
        case this.paneId + '/SET_SERIE_TYPE':
        case this.paneId + '/SET_SERIE_INPUT':
          this._chartController.rebuildSerie(mutation.payload.id)
          break
        case this.paneId + '/TOGGLE_SERIE':
          this._chartController.toggleSerie(mutation.payload)
          break
        case 'app/SET_OPTIMAL_DECIMAL':
        case this.paneId + '/SET_DECIMAL_PRECISION':
          if (this.$store.state[this.paneId].decimalPrecision && mutation.payload.type === 'app/SET_OPTIMAL_DECIMAL') {
            break
          }

          for (const id of this.activeSeries) {
            const serie = this.$store.state[this.paneId].series[id]

            if (!serie.options) {
              continue
            }

            if (serie.options.priceFormat && serie.options.priceFormat.type === 'price') {
              this._chartController.setSerieOption({
                id: serie.id,
                key: 'priceFormat.precision',
                value: mutation.payload
              })

              this._chartController.setSerieOption({
                id: serie.id,
                key: 'priceFormat.minMove',
                value: 1 / Math.pow(10, mutation.payload)
              })
            }
          }

          break
      }
    })
  }

  mounted() {
    this._chartController.setupQueue()

    this.createChart()

    this.keepAlive()
  }

  async createChart() {
    await this.$nextTick()

    this._chartController.createChart(this.$refs.chartContainer)

    this.bindChartEvents()

    this.fetch()
  }

  destroyChart() {
    this.unbindChartEvents()

    this._chartController.destroy()

    clearTimeout(this._keepAliveTimeout)
  }

  beforeDestroy() {
    this.destroyChart()
    this._onStoreMutation()
  }

  /**
   * fetch whatever is missing based on visiblerange
   * @param {boolean} clear will clear the chart / initial fetch
   */
  fetch(rangeToFetch?: TimeRange) {
    if (this.loading) {
      return Promise.reject('already-fetching')
    }

    const historicalMarkets = historicalService.getHistoricalMarktets(this.markets)

    if (!historicalMarkets.length) {
      return Promise.reject('unsupported-markets')
    }

    const visibleRange = this._chartController.getVisibleRange() as TimeRange
    const timeframe = +this.$store.state[this.paneId].timeframe

    if (!rangeToFetch) {
      const barsCount = window.innerWidth / 2

      let leftTime

      if (this._chartController.chartCache.cacheRange && this._chartController.chartCache.cacheRange.from) {
        leftTime = this._chartController.chartCache.cacheRange.from
      } else if (visibleRange && visibleRange.from) {
        leftTime = visibleRange.from + this.timezoneOffset / 1000
      } else {
        leftTime = +new Date() / 1000
      }

      rangeToFetch = {
        from: leftTime - timeframe * barsCount,
        to: leftTime - timeframe
      }

      this.$store.dispatch('app/showNotice', {
        id: 'fetching-' + this.paneId,
        timeout: 15000,
        title: `🥵 Fetching ${barsCount}×${historicalMarkets.length} bars (timeframe ${getHms(timeframe * 1000)})...`,
        type: 'info'
      })
    }

    rangeToFetch.from = Math.floor(Math.round(rangeToFetch.from) / timeframe) * timeframe
    rangeToFetch.to = Math.ceil(Math.round(rangeToFetch.to) / timeframe) * timeframe - 1

    console.debug(`[chart/fetch] fetch rangeToFetch: FROM: ${formatTime(rangeToFetch.from)} | TO: ${formatTime(rangeToFetch.to)}`)

    this._chartController.lockRender()

    this.loading = true

    return historicalService
      .fetch(Math.round(rangeToFetch.from * 1000), Math.round(rangeToFetch.to * 1000 - 1), timeframe, historicalMarkets)
      .then(({ data, from, to, format }) => {
        /**
         * @type {Chunk}
         */
        let chunk

        switch (format) {
          case 'point':
            chunk = {
              from,
              to,
              bars: data
            }
            break
          default:
            throw new Error('unsupported-historical-data-format')
        }

        if (chunk && chunk.bars.length) {
          /**
           * @type {Chunk[]}
           */
          const chunks = [
            {
              from: chunk.from,
              to: chunk.from,
              bars: []
            }
          ]

          console.log(`[chart/fetch] success (${data.length} new ${format}s)`)

          if (chunk.bars.length > MAX_BARS_PER_CHUNKS) {
            console.debug(`[chart/fetch] response chunk is too large (> ${MAX_BARS_PER_CHUNKS} bars) -> start splitting`)
          }

          while (chunk.bars.length) {
            const bar = chunk.bars.shift()

            if (chunks[0].bars.length >= MAX_BARS_PER_CHUNKS && chunks[0].to < bar.timestamp) {
              chunks.unshift({
                from: bar.timestamp,
                to: bar.timestamp,
                bars: []
              })
            }

            chunks[0].bars.push(bar)
            chunks[0].to = bar.timestamp
          }

          if (chunks.length > 1) {
            console.debug(`[chart/fetch] splitted result into ${chunks.length} chunks`)
          }

          console.debug(`[chart/fetch] save ${chunks.length} new chunks`)
          console.debug(
            `\t-> [first] FROM: ${formatTime(chunks[0].from)} | TO: ${formatTime(chunks[0].to)} (${formatAmount(chunks[0].bars.length)} bars)`
          )
          console.debug(
            `\t-> [last] FROM: ${formatTime(chunks[chunks.length - 1].from)} | TO: ${formatTime(chunks[chunks.length - 1].to)} (${formatAmount(
              chunks[chunks.length - 1].bars.length
            )} bars)`
          )
          console.debug(
            `\t-> [current cacheRange] FROM: ${formatTime(this._chartController.chartCache.cacheRange.from)} | TO: ${formatTime(
              this._chartController.chartCache.cacheRange.to
            )}`
          )
          for (const chunk of chunks) {
            this._chartController.chartCache.saveChunk(chunk)
          }

          this._chartController.renderVisibleChunks()
        }
      })
      .catch(err => {
        if (err === 'no-more-data') {
          this.reachedEnd = true
        }

        console.error(err)
      })
      .then(() => {
        this.$store.dispatch('app/hideNotice', 'fetching-' + this.paneId)
        this.loading = false
        this._chartController.unlockRender()
      })
  }

  /**
   * TV chart mousemove event
   * @param{TV.MouseEventParams} param tv mousemove param
   */
  onCrosshair(param) {
    if (
      param === undefined ||
      param.time === undefined ||
      param.point.x < 0 ||
      param.point.x > this.$refs.chartContainer.clientWidth ||
      param.point.y < 0 ||
      param.point.y > this.$refs.chartContainer.clientHeight
    ) {
      this.legend = {}
    } else {
      for (const serie of this._chartController.activeSeries) {
        const data = param.seriesPrices.get(serie.api)

        if (!data) {
          this.$set(this.legend, serie.id, '')
          continue
        }

        const formatFunction = serie.options.priceFormat && serie.options.priceFormat.type === 'volume' ? formatAmount : formatPrice

        if (data.close) {
          this.$set(
            this.legend,
            serie.id,
            `O: ${formatFunction(data.open)} H: ${formatFunction(data.high)} L: ${formatFunction(data.low)} C: ${formatFunction(data.close)}`
          )
        } else {
          this.$set(this.legend, serie.id, formatFunction(data))
        }
      }
    }
  }

  /**
   * @param{Trade[]} trades trades to process
   */
  onTrades(trades) {
    if (this._chartController.preventRender || this.refreshRate) {
      this._chartController.queueTrades(trades)
      return
    }

    this._chartController.renderRealtimeTrades(trades)
  }

  refreshChartDimensions() {
    if (!this._chartController || !this._chartController.chartInstance) {
      return
    }

    this._chartController.chartInstance.resize(this.$el.clientWidth, this.$el.clientHeight)
  }

  onPan(visibleLogicalRange) {
    if (!visibleLogicalRange || this._chartController.panPrevented) {
      return
    }

    if (this._onPanTimeout) {
      clearTimeout(this._onPanTimeout)
      this._onPanTimeout = null
    }

    this._onPanTimeout = setTimeout(() => {
      if (this._chartController.chartCache.cacheRange.from === null) {
        return
      }

      this.fetchOrRecover(visibleLogicalRange)
    }, 200)
  }

  bindChartEvents() {
    aggregatorService.on('trades', this.onTrades)

    this._chartController.chartInstance.subscribeCrosshairMove(this.onCrosshair)
    this._chartController.chartInstance.timeScale().subscribeVisibleLogicalRangeChange(this.onPan)
  }

  unbindChartEvents() {
    aggregatorService.off('trades', this.onTrades)

    this._chartController.chartInstance.unsubscribeCrosshairMove(this.onCrosshair)
    this._chartController.chartInstance.timeScale().unsubscribeVisibleLogicalRangeChange(this.onPan)
  }

  keepAlive() {
    if (this._keepAliveTimeout) {
      this._chartController.chartCache.trim()

      this._chartController.redraw()
    }

    this._keepAliveTimeout = setTimeout(this.keepAlive.bind(this), 1000 * 60 * 30)
  }

  refreshChart() {
    this._chartController.chartCache.trim()

    this._chartController.redraw()
  }

  async addSerie() {
    const serie = await dialogService.openAsPromise(CreateSerieDialog, { paneId: this.paneId })

    if (serie) {
      this.$store.dispatch(this.paneId + '/createSerie', serie)
      dialogService.open(SerieDialog, { paneId: this.paneId, serieId: serie.id }, 'serie')
    }
  }

  fetchOrRecover(visibleLogicalRange) {
    if (!visibleLogicalRange || visibleLogicalRange.from > 0) {
      return
    }

    const barsToLoad = Math.abs(visibleLogicalRange.from)
    const rangeToFetch = {
      from: this._chartController.chartCache.cacheRange.from - barsToLoad * this.timeframe,
      to: this._chartController.chartCache.cacheRange.from
    }

    console.debug(`[chart/pan] timeout fired`)
    console.debug(`\t-> barsToLoad: ${barsToLoad}`)
    console.debug(`\t-> rangeToFetch: FROM: ${formatTime(rangeToFetch.from)} | TO: ${formatTime(rangeToFetch.to)}`)
    console.debug(
      `\t-> current cacheRange: FROM: ${formatTime(this._chartController.chartCache.cacheRange.from)} | TO: ${formatTime(
        this._chartController.chartCache.cacheRange.to
      )}`
    )

    if (
      !this.reachedEnd &&
      (!this._chartController.chartCache.cacheRange.from || rangeToFetch.to <= this._chartController.chartCache.cacheRange.from)
    ) {
      this.fetch(rangeToFetch)
    } else {
      console.warn(
        `[chart/pan] wont fetch this range\n\t-> rangeToFetch.to (${formatTime(rangeToFetch.to)}) > chart.chartCache.cacheRange.from (${formatTime(
          this._chartController.chartCache.cacheRange.from
        )})`
      )
      console.warn('(might trigger redraw with more cached chunks here...)')

      this._chartController.renderVisibleChunks()
    }
  }

  onResize() {
    this.refreshChartDimensions()
  }

  clear() {
    this._chartController.clear()

    this.reachedEnd = false
  }
}
</script>

<style lang="scss">
.pane-chart {
  &:hover .chart__series,
  &:hover .chart__controls {
    opacity: 1;
  }

  &.-loading {
    cursor: wait;
  }
}

.chart__container {
  position: relative;
  width: 100%;
  height: 100%;

  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -khtml-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}

.chart__series {
  position: absolute;
  top: 2em;
  left: 1em;
  font-family: 'Barlow Semi Condensed';
  z-index: 3;
  opacity: 0;
  transition: opacity 0.2s $ease-out-expo;

  font-size: 12px;
}

.chart__layout {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 3;
}

.chart__handler {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 2;

  &.-width {
    top: 0;
    left: auto;
    width: 16px;
    margin-right: -8px;
    cursor: ew-resize;
    display: none;

    @media screen and (min-width: 768px) {
      display: block;
    }
  }

  &.-height {
    height: 8px;
    margin-top: -4px;
    cursor: row-resize;

    @media screen and (min-width: 768px) {
      display: none;
    }
  }
}

.chart__positions {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 2rem;
  font-family: 'Barlow Semi Condensed';
  background-color: rgba(black, 0.8);
  pointer-events: none;
  display: flex;
  justify-content: space-between;
  text-align: center;
  z-index: 10;

  > div {
    &:first-child {
      text-align: left;
    }
    &:last-child {
      text-align: right;
    }
  }
}

.chart__controls {
  position: absolute;
  top: 1em;
  right: 5em;
  font-family: 'Barlow Semi Condensed';
  z-index: 2;
  opacity: 0;
  transition: opacity 0.2s $ease-out-expo;
  display: flex;
  flex-direction: row;
  align-items: flex-start;

  @media screen and (max-width: 767px) {
    display: none;
  }
}
</style>
