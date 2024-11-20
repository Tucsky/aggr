<template>
  <div class="pane-counters">
    <PaneHeader
      :pane-id="paneId"
      :settings="() => import('@/components/counters/CountersDialog.vue')"
    />
    <div class="counters hide-scrollbar">
      <div
        v-for="(step, index) in activeSteps"
        :key="index"
        :duration="step.duration"
        class="counter"
      >
        <div
          class="counter__side -buy"
          :style="{ width: (step.buy / (step.buy + step.sell)) * 100 + '%' }"
        >
          <span v-if="!countersCount">{{ formatAmount(step.buy) }}</span>
          <span v-else>{{ step.buy }}</span>
        </div>
        <div
          class="counter__side -sell"
          :style="{ width: (step.sell / (step.buy + step.sell)) * 100 + '%' }"
        >
          <span v-if="!countersCount">{{ formatAmount(step.sell) }}</span>
          <span v-else>{{ step.sell }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
<template>
  <div class="pane-counters">
    <PaneHeader
      :pane-id="paneId"
      :settings="() => import('@/components/counters/CountersDialog.vue')"
    />
    <div class="counters hide-scrollbar">
      <div
        v-for="(step, index) in activeSteps"
        :key="index"
        :duration="step.duration"
        class="counter"
      >
        <div
          class="counter__side -buy"
          :style="{ width: (step.buy / (step.buy + step.sell)) * 100 + '%' }"
        >
          <span v-if="!countersCount">{{ formatAmount(step.buy) }}</span>
          <span v-else>{{ step.buy }}</span>
        </div>
        <div
          class="counter__side -sell"
          :style="{ width: (step.sell / (step.buy + step.sell)) * 100 + '%' }"
        >
          <span v-if="!countersCount">{{ formatAmount(step.sell) }}</span>
          <span v-else>{{ step.sell }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import PaneHeader from '../panes/PaneHeader.vue'
import { getBucketId, getHms } from '@/utils/helpers'
import { formatAmount } from '@/services/productsService'
import {
  getAppBackgroundColor,
  getLinearShade,
  joinRgba,
  splitColorCode
} from '@/utils/colors'
import aggregatorService from '@/services/aggregatorService'
import store from '@/store' // Following Rule #11: store is imported directly from '@/store'
import { computed, onBeforeUnmount, onMounted } from 'vue'

// Interfaces
interface Counter {
  duration: number
  chunks: CounterChunk[]
}

interface CounterChunk {
  timestamp: number
  buy: number
  sell: number
}

interface CounterStep {
  duration: string
  buy: number
  sell: number
  hasData: boolean
}

// Define props
const props = defineProps<{
  paneId: string
}>()

// Non-reactive variables
const _counters: Counter[] = []
let _populateCountersInterval: NodeJS.Timer | null = null
let _activeChunk: CounterChunk = { timestamp: 0, buy: 0, sell: 0 }
let _feed: string | null = null

// Reactive data properties
const steps: CounterStep[] = []

// Computed properties
const liquidationsOnly = computed(
  () => store.state[props.paneId].liquidationsOnly
)
const countersSteps = computed(() => store.state[props.paneId].steps)
const countersCount = computed(() => store.state[props.paneId].count)
const countersGranularity = computed(
  () => store.state[props.paneId].granularity
)
const activeSteps = computed(() => steps.filter(a => a.hasData))

function onVolume(sums: any): void {
  const volume = {
    buy: sums.vbuy,
    sell: sums.vsell
  }

  if (liquidationsOnly.value) {
    volume.buy = sums.lbuy
    volume.sell = sums.lsell
  } else if (countersCount.value) {
    volume.buy = sums.cbuy
    volume.sell = sums.csell
  }

  if (volume.buy || volume.sell) {
    if (!_activeChunk.timestamp) {
      _activeChunk.timestamp = sums.timestamp
    }

    _activeChunk.buy += volume.buy
    _activeChunk.sell += volume.sell

    steps.forEach(step => {
      step.buy += volume.buy
      step.sell += volume.sell
    })
  }
}

function clearCounters(): void {
  if (_feed) {
    console.debug(`[counters/${props.paneId}] unsubscribe from feed`, _feed)
    aggregatorService.off(_feed, onVolume)
  }

  _counters.length = 0
  _activeChunk = { timestamp: 0, buy: 0, sell: 0 }
  steps.length = 0
}

function generateColors(): void {
  const style = getComputedStyle(document.documentElement)
  const buyColor = splitColorCode(
    style.getPropertyValue('--theme-buy-base'),
    getAppBackgroundColor()
  )
  const sellColor = splitColorCode(
    style.getPropertyValue('--theme-sell-base'),
    getAppBackgroundColor()
  )

  const el = document.documentElement as HTMLElement
  steps.forEach((_, i) => {
    const lightenFactor = i * (0.25 / steps.length)
    el.style.setProperty(
      `--buy-color-${i + 1}`,
      joinRgba(getLinearShade(buyColor, -lightenFactor, lightenFactor))
    )
    el.style.setProperty(
      `--sell-color-${i + 1}`,
      joinRgba(getLinearShade(sellColor, -lightenFactor, lightenFactor))
    )
  })
}

function createCounters(): void {
  clearCounters()

  countersSteps.value.forEach(step => {
    const counter: Counter = { duration: step, chunks: [] }
    _counters.push(counter)

    const first = _counters.indexOf(counter) === 0
    steps.push({
      duration: getHms(counter.duration),
      buy: 0,
      sell: 0,
      hasData: first
    })
  })

  _feed = 'bucket-' + getBucketId(store.state[props.paneId].markets)
  console.debug(`[counters/${props.paneId}] subscribe to feed`, _feed)

  if (_feed) {
    aggregatorService.on(_feed, onVolume)
  } else {
    console.debug(`[counters/${props.paneId}] error feed empty...`)
  }
}

function populateCounters(): void {
  const now = Date.now()

  if (_activeChunk.timestamp) {
    _counters[0].chunks.push({
      timestamp: _activeChunk.timestamp,
      buy: _activeChunk.buy,
      sell: _activeChunk.sell
    })

    _activeChunk.timestamp = 0
    _activeChunk.buy = 0
    _activeChunk.sell = 0
  }

  let chunksToDecrease: CounterChunk[] = []
  let decreaseBuy = 0
  let decreaseSell = 0

  _counters.forEach((counter, i) => {
    if (chunksToDecrease.length) {
      counter.chunks.push(...chunksToDecrease)
      if (!steps[i].hasData) steps[i].hasData = true
    }

    decreaseBuy = 0
    decreaseSell = 0
    let to = 0

    counter.chunks.forEach((chunk, j) => {
      decreaseBuy += chunk.buy
      decreaseSell += chunk.sell
      if (chunk.timestamp >= now - counter.duration) {
        to = j
        return
      }
    })

    if (to) {
      chunksToDecrease = counter.chunks.splice(0, to + 1)
      steps[i].buy -= decreaseBuy
      steps[i].sell -= decreaseSell
    }
  })
}

// Lifecycle hooks
onMounted(() => {
  createCounters()
  generateColors()
  _populateCountersInterval = setInterval(
    populateCounters,
    countersGranularity.value
  )
})

onBeforeUnmount(() => {
  if (_feed) aggregatorService.off(_feed, onVolume)
  if (_populateCountersInterval) clearInterval(_populateCountersInterval)
})
</script>

<style lang="scss">
.pane-counters.-large {
  font-weight: 500;
}

.counters {
  display: flex;
  flex-direction: column;
  list-style: none;
  margin: 0;
  padding: 0;
  height: 100%;
  overflow: auto;
  color: white;

  font-family: $font-monospace;
}

.counter {
  display: flex;
  position: relative;
  flex-grow: 1;
  min-height: 2em;

  &:before {
    content: attr(duration);
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    border-radius: $border-radius-small;
    padding: 0.25em;
    font-size: 0.875em;
    text-align: center;
    pointer-events: none;
    line-height: 1;
    padding-top: 0.33em;
    text-shadow: 1px 1px 0 black;
  }

  &:hover:before {
    background-color: black;
    color: var(--theme-color-base);
    opacity: 1;
  }

  &:nth-child(1) .counter__side {
    &.-buy {
      background-color: var(--buy-color-1);
    }
    &.-sell {
      background-color: var(--sell-color-1);
    }
  }

  &:nth-child(2) .counter__side {
    &.-buy {
      background-color: var(--buy-color-2);
    }
    &.-sell {
      background-color: var(--sell-color-2);
    }
  }

  &:nth-child(3) .counter__side {
    &.-buy {
      background-color: var(--buy-color-3);
    }
    &.-sell {
      background-color: var(--sell-color-3);
    }
  }

  &:nth-child(4) .counter__side {
    &.-buy {
      background-color: var(--buy-color-4);
    }
    &.-sell {
      background-color: var(--sell-color-4);
    }
  }

  &:nth-child(5) .counter__side {
    &.-buy {
      background-color: var(--buy-color-5);
    }
    &.-sell {
      background-color: var(--sell-color-5);
    }
  }

  &:nth-child(6) .counter__side {
    &.-buy {
      background-color: var(--buy-color-6);
    }
    &.-sell {
      background-color: var(--sell-color-6);
    }
  }

  &:nth-child(7) .counter__side {
    &.-buy {
      background-color: var(--buy-color-7);
    }
    &.-sell {
      background-color: var(--sell-color-7);
    }
  }

  &:nth-child(8) .counter__side {
    &.-buy {
      background-color: var(--buy-color-8);
    }
    &.-sell {
      background-color: var(--sell-color-8);
    }
  }

  &__side {
    display: flex;
    align-items: center;
    flex-grow: 1;
    white-space: nowrap;

    span {
      position: relative;
      padding: 0 0.5em;
      display: block;
    }

    &.-buy {
      color: var(--theme-buy-color);
    }

    &.-sell {
      color: var(--theme-sell-color);
      justify-content: flex-end;
    }
  }
}
</style>
