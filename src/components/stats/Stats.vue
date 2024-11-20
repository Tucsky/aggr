<template>
  <div class="pane-stats" ref="paneElementRef">
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
    <div v-if="enableChart" class="stats-chart" ref="chartRef"></div>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  reactive,
  computed,
  onMounted,
  onBeforeUnmount,
  nextTick
} from 'vue'
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
import PaneHeader from '../panes/PaneHeader.vue'
import { usePane } from '@/composables/usePane'
import store from '@/store'
import { useMutationObserver } from '@/composables/useMutationObserver'

// Define props
const props = defineProps({
  paneId: {
    type: String,
    required: true
  }
})

// Data
const data = reactive<{ [key: string]: any }>({})

const chartRef = ref<HTMLElement | null>(null)

// Private variables
let _refreshChartDimensionsTimeout: number | undefined
let _chart: TV.IChartApi | null = null
const _buckets: { [id: string]: Bucket } = {}
let _feed: string | null = null

// Computed properties
const paneId = props.paneId
const enableChart = computed(() => store.state[paneId].enableChart)
const buckets = computed(() => store.state[paneId].buckets)
const pane = computed(() => store.state.panes[paneId])

useMutationObserver(mutation => {
  switch (mutation.type) {
    case 'settings/SET_TEXT_COLOR':
      if (_chart && mutation.payload) {
        _chart.applyOptions(getChartCustomColorsOptions(paneId))
      }
      break
    case 'settings/SET_CHART_THEME':
      if (_chart) {
        _chart.applyOptions(getChartCustomColorsOptions(paneId))
      }
      break
    case 'panes/SET_PANE_MARKETS':
    case paneId + '/SET_WINDOW':
      if (mutation.payload.id && mutation.payload.id !== paneId) {
        break
      }
      prepareBuckets()
      break
    case paneId + '/SET_BUCKET_COLOR':
      recolorBucket(mutation.payload.id, mutation.payload.value)
      break
    case paneId + '/SET_BUCKET_TYPE':
      if (_chart) {
        reloadBucketSerie(mutation.payload.id, mutation.payload.value)
      }
      break
    case paneId + '/TOGGLE_CHART':
      if (mutation.payload) {
        createChart()
      } else {
        removeChart()
      }
      break
    case paneId + '/TOGGLE_BUCKET':
      if (mutation.payload.value) {
        createBucket(buckets.value[mutation.payload.id])
      } else {
        removeBucket(mutation.payload.id)
      }
      break
    case 'panes/SET_PANE_ZOOM':
      if (mutation.payload.id === paneId) {
        updateFontSize()
      }
      break
    case paneId + '/REMOVE_BUCKET':
      removeBucket(mutation.payload)
      break
    case paneId + '/SET_BUCKET_WINDOW':
    case paneId + '/SET_BUCKET_INPUT':
    case paneId + '/SET_BUCKET_PRECISION':
      refreshBucket(mutation.payload.id)
      break
    case paneId + '/RENAME_BUCKET':
      refreshBucketName(mutation.payload)
      break
  }
})

onMounted(() => {
  prepareBuckets()

  if (enableChart.value) {
    createChart()
  }

  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  if (_feed) {
    aggregatorService.off(_feed, onVolume)
  }

  clearBuckets()
  removeChart()
  _chart = null
  window.removeEventListener('resize', onResize)
})

async function createChart() {
  await nextTick()

  const chartOptions = getChartOptions(defaultStatsChartOptions as any, paneId)

  _chart = TV.createChart(chartRef.value, chartOptions)

  for (const id in _buckets) {
    _buckets[id].createSerie(_chart)
  }

  refreshChartDimensions(0)
}

function updateFontSize() {
  if (!_chart) {
    return
  }

  _chart.applyOptions({
    layout: {
      fontSize: getChartFontSize(paneId)
    }
  })
}

function removeChart() {
  if (!_chart) {
    return
  }

  for (const id in _buckets) {
    _buckets[id].removeIndicator(_chart)
  }

  _chart.remove()

  _chart = null
}

async function refreshChartDimensions(debounceTime = 500) {
  if (!enableChart.value) {
    return
  }

  clearTimeout(_refreshChartDimensionsTimeout)

  _refreshChartDimensionsTimeout = window.setTimeout(() => {
    if (_chart && paneElementRef.value) {
      _chart.resize(
        paneElementRef.value.clientWidth,
        paneElementRef.value.clientHeight
      )
    }
  }, debounceTime)
}

function prepareBuckets() {
  if (_feed) {
    console.debug(`[stats/${paneId}] unsubscribe from feed`, _feed)
    aggregatorService.off(_feed, onVolume)
  }

  clearBuckets()

  for (const id in buckets.value) {
    createBucket(buckets.value[id])
  }

  _feed = 'bucket-' + getBucketId(pane.value.markets)
  console.debug(`[stats/${paneId}] subscribe to feed`, _feed)

  if (_feed.length) {
    aggregatorService.on(_feed, onVolume)
  } else {
    console.debug(`[stats/${paneId}] error feed empty...`)
  }
}

function onVolume(sums) {
  for (const id in _buckets) {
    _buckets[id].onStats(sums)

    if (_buckets[id].stacks.length) {
      const value = _buckets[id].getValue()

      data[id].value = formatAmount(value, _buckets[id].precision)
    }

    if (_chart) {
      _buckets[id].updateSerie()
    }
  }
}

function clearBuckets() {
  for (const id in _buckets) {
    removeBucket(id)
  }
}

function removeBucket(id) {
  if (!_buckets[id]) {
    return
  }

  _buckets[id].unbind()

  if (_chart) {
    _buckets[id].removeIndicator(_chart)
  }

  delete data[id]
  delete _buckets[id]
}

function refreshBucket(id) {
  const options = buckets.value[id]

  if (!options) {
    return
  }

  removeBucket(id)
  createBucket(options)
}

function recolorBucket(id, color) {
  if (!_buckets[id]) {
    return
  }

  _buckets[id].updateColor(color)

  data[id].color = color
}

function reloadBucketSerie(id, type?: string) {
  if (!_buckets[id]) {
    return
  }

  if (type) {
    _buckets[id].type = type
  }

  _buckets[id].removeIndicator(_chart)
  _buckets[id].createSerie(_chart)
}

function createBucket(statBucket) {
  if (statBucket.enabled && typeof data[statBucket.id] === 'undefined') {
    const bucket = new Bucket(statBucket.input, statBucket, paneId)

    if (_chart) {
      bucket.createSerie(_chart)
    }

    _buckets[statBucket.id] = bucket

    data[bucket.id] = {
      value: 0,
      name: bucket.name,
      color: bucket.color
    }
  }
}

function refreshBucketName({ id, name }: { id: string; name: string }) {
  const bucket = _buckets[id]
  bucket.name = name
  data[id].name = name
}

function editStat(id) {
  dialogService.open(StatDialog, { paneId: paneId, bucketId: id })
}

function onResize() {
  refreshChartDimensions()
}

const paneElementRef = ref<HTMLElement>()
usePane(props.paneId, paneElementRef, onResize)
defineExpose({ onResize })
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
