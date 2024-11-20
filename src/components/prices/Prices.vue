<template>
  <div
    ref="paneElementRef"
    class="pane-prices"
    @mouseenter="toggleSort(false)"
    @mouseleave="toggleSort(true)"
  >
    <pane-header
      :pane-id="paneId"
      :settings="() => import('@/components/prices/PricesDialog.vue')"
    >
      <hr />
      <prices-sort-dropdown :pane-id="paneId" class="pane-overlay -text" />
    </pane-header>
    <div class="markets-bar__wrapper hide-scrollbar">
      <component
        :is="animateSort ? 'transition-group' : 'div'"
        :name="transitionGroupName"
        tag="div"
        class="markets-bar hide-scrollbar pane"
        :class="[mode === 'horizontal' && '-horizontal']"
      >
        <div
          v-for="market in filteredMarkets"
          :key="market.id"
          class="market"
          :class="market.status"
          :title="market.id"
          :data-market="market.id"
          v-draggable-market
        >
          <div
            class="market__exchange"
            :class="market.exchange"
            :style="
              showCryptosLogos && {
                backgroundImage: `url(${VITE_APP_BASE_PATH}img/logos/${market.base}.svg)`
              }
            "
          ></div>
          <div v-if="showPairs" class="market__pair">
            {{ market.local }}
          </div>
          <div class="market__price" v-if="showPrice">{{ market.price }}</div>
          <div class="market__change" v-if="showChange">
            {{
              (market.avgChange >= 0 ? '+' : '') + market.avgChange.toFixed(2)
            }}%
          </div>
          <div v-if="showVolume" class="market__volume">
            {{ formatAmount(market.avgVolume) }}
          </div>
          <div v-if="showVolumeDelta" class="market__volume">
            {{ market.avgVolumeDelta }}%
          </div>
        </div>
      </component>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import PricesSortDropdown from '@/components/prices/PricesSortDropdown.vue'

import aggregatorService from '@/services/aggregatorService'
import PaneHeader from '../panes/PaneHeader.vue'
import { Market, Ticker } from '@/types/types'
import {
  formatAmount as formatAmountService,
  formatMarketPrice,
  parseMarket,
  getMarketProduct
} from '@/services/productsService'
import store from '@/store'
import { usePane } from '@/composables/usePane'

type TickerStatus = '-pending' | '-up' | '-down' | '-neutral'
type WatchlistMarket = Market & {
  local: string
  base: string
  price: string
  change: number
  avgChange: number
  volume: number
  avgVolume: number
  volumeDelta: number
  avgVolumeDelta: number
  status: TickerStatus
}

const props = defineProps({
  paneId: {
    type: String,
    required: true
  }
})

const VITE_APP_BASE_PATH = import.meta.env.VITE_APP_BASE_PATH

const pane = computed(() => store.state[props.paneId])

const mode = ref('vertical')
const pauseSort = ref(false)
const showCryptosLogos = ref(false)
const filteredMarkets = ref<WatchlistMarket[]>([])

// cache sort function
let sortFunction: ((a: WatchlistMarket, b: WatchlistMarket) => number) | null =
  null

// markets storage
const markets = ref<WatchlistMarket[]>([])

// prices event contain cumulative data
// keep track of last period ticker's volume & change
let lastResetTimestamp: number | null = null
let lastPeriodTickers: {
  [id: string]: Ticker & {
    change: number
  }
} = {}
let periodMs: number

let resetTimeout: NodeJS.Timeout = null

const showPairs = computed(() => pane.value.showPairs)
const showChange = computed(() => pane.value.showChange)
const showPrice = computed(() => pane.value.showPrice)
const showVolume = computed(() => pane.value.showVolume)
const showVolumeDelta = computed(() => pane.value.showVolumeDelta)
const animateSort = computed(() => pane.value.animateSort)
const sortType = computed(() => pane.value.sortType)
const sortOrder = computed(() => pane.value.sortOrder)
const period = computed(() => pane.value.period)
const shortSymbols = computed(() => pane.value.shortSymbols)
const avgPeriods = computed(() => pane.value.avgPeriods)
const volumeThreshold = computed(() => pane.value.volumeThreshold)

const transitionGroupName = computed(() => {
  return animateSort.value ? 'flip-list' : null
})

watch(
  () => pane.value.markets,
  (currentMarket, previousMarkets) => {
    if (!previousMarkets) previousMarkets = []
    for (const id of previousMarkets) {
      if (currentMarket.indexOf(id) === -1) {
        removeMarketFromList(id)
      }
    }

    for (const id of currentMarket) {
      if (previousMarkets.indexOf(id) === -1) {
        const [exchange, pair] = parseMarket(id)

        addMarketToList({
          id,
          exchange,
          pair
        })
      }
    }

    showCryptosLogos.value = hasMultipleLocals()
  },
  { immediate: true }
)

watch(
  period,
  newPeriod => {
    if (newPeriod > 0) {
      periodReset()
    } else {
      clearPeriodReset()
    }
  },
  { immediate: true }
)

watch(volumeThreshold, value => {
  toggleSort(true)

  if (!value) {
    filteredMarkets.value = markets.value
  } else {
    filterMarkets()
  }
})

watch(shortSymbols, value => {
  for (const market of markets.value) {
    if (value) {
      const product = getMarketProduct(market.exchange, market.pair)

      if (product) {
        market.local = getSymbol(product)
        continue
      }
    }

    market.local = market.pair
  }
})

watch(sortOrder, () => {
  cacheSortFunction()
})

watch(sortType, () => {
  cacheSortFunction()
})

onMounted(() => {
  cacheSortFunction()
  refreshMarkets()

  aggregatorService.on('tickers', updateMarkets)

  // start filter interval
  filterMarkets(true)
})

onBeforeUnmount(() => {
  aggregatorService.off('tickers', updateMarkets)

  if (resetTimeout) {
    // clear periodic reset timeout
    clearTimeout(resetTimeout)
  }
})

function refreshMarkets() {
  // non reactive storages
  markets.value = []
  lastPeriodTickers = {}

  // active normalized pairs
  const locals = []

  for (const marketId of pane.value.markets) {
    const [exchange, pair] = parseMarket(marketId)

    const product = addMarketToList({
      id: marketId,
      pair,
      exchange
    })

    if (product) {
      if (locals.indexOf(product.local) === -1) {
        locals.push(product.local)
      }
    }
  }

  showCryptosLogos.value = hasMultipleLocals()

  filterMarkets()
}

function updateMarkets(tickers) {
  // cache setting getters
  const showChangeValue = showChange.value
  const avgPeriodsValue = avgPeriods.value
  const periodWeight = getPeriodWeight(avgPeriodsValue)

  for (const market of markets.value) {
    const ticker = tickers[market.id]

    if (!ticker) {
      continue
    }

    const oldData = lastPeriodTickers[market.id]

    if (!oldData.price) {
      oldData.price = ticker.price
    }

    market.price = formatMarketPrice(ticker.price, market.id)

    market.volume += ticker.volume
    market.volumeDelta += ticker.volumeDelta

    if (avgPeriodsValue) {
      market.avgVolume =
        market.volume * periodWeight + oldData.volume * (1 - periodWeight)
      market.avgVolumeDelta = Math.round(
        ((market.volumeDelta * periodWeight +
          oldData.volumeDelta * (1 - periodWeight)) /
          market.avgVolume) *
          100
      )
    } else {
      market.avgVolume = market.volume
      market.avgVolumeDelta = Math.round(
        (market.volumeDelta / market.volume) * 100
      )
    }

    if (showChangeValue && ticker.price) {
      // colorize using price change across period
      const change = ticker.price - lastPeriodTickers[market.id].price

      market.change = (change / lastPeriodTickers[market.id].price) * 100

      if (avgPeriodsValue) {
        market.avgChange =
          market.change * periodWeight + oldData.change * (1 - periodWeight)
      } else {
        market.avgChange = market.change
      }

      market.status = market.avgChange > 0 ? '-up' : '-down'
    } else {
      // colorize using now vs last value only
      if (ticker.price === null) {
        market.status = '-pending'
      } else if (market.price > ticker.price) {
        market.status = '-down'
      } else if (market.price < ticker.price) {
        market.status = '-up'
      } else {
        market.status = '-neutral'
      }
    }
  }

  if (!pauseSort.value && sortFunction !== null) {
    filteredMarkets.value = filteredMarkets.value.sort(sortFunction)
  }
}

function removeMarketFromList(marketId: string) {
  if (lastPeriodTickers[marketId]) {
    delete lastPeriodTickers[marketId]
  }

  const index = markets.value.findIndex(m => m.id === marketId)

  if (index !== -1) {
    markets.value.splice(index, 1)
  } else {
    console.warn(
      `[prices] unable to remove market from list after panes.markets change: market doesn't exist in list (${marketId})`
    )
  }
}

function addMarketToList(market: Market) {
  lastPeriodTickers[market.id] = {
    price: 0,
    change: 0,
    volume: 0,
    volumeDelta: 0
  }

  const product = getMarketProduct(market.exchange, market.pair)

  if (product) {
    markets.value.push({
      ...market,
      local: getSymbol(product),
      base: product.base.replace(/^1000+/, '').toLowerCase(),
      status: '-pending',
      price: null,
      change: 0,
      avgChange: 0,
      volume: 0,
      avgVolume: 0,
      volumeDelta: 0,
      avgVolumeDelta: 0
    })

    return product
  }
}

function cacheSortFunction() {
  const order =
    mode.value === 'horizontal'
      ? sortOrder.value > 0
        ? -1
        : 1
      : sortOrder.value
  const by = sortType.value

  if (!by || by === 'none') {
    sortFunction = null
    return
  }

  if (by === 'price') {
    if (order === 1) {
      sortFunction = (a, b) => (a as any).price - (b as any).price
    } else {
      sortFunction = (a, b) => (b as any).price - (a as any).price
    }
  } else if (by === 'change') {
    if (order === 1) {
      sortFunction = (a, b) => a.avgChange - b.avgChange
    } else {
      sortFunction = (a, b) => b.avgChange - a.avgChange
    }
  } else if (by === 'volume') {
    if (order === 1) {
      sortFunction = (a, b) => a.avgVolume - b.avgVolume
    } else {
      sortFunction = (a, b) => b.avgVolume - a.avgVolume
    }
  } else if (by === 'delta') {
    if (order === 1) {
      sortFunction = (a, b) => a.avgVolumeDelta - b.avgVolumeDelta
    } else {
      sortFunction = (a, b) => b.avgVolumeDelta - a.avgVolumeDelta
    }
  }

  filteredMarkets.value = filteredMarkets.value.sort(sortFunction)
}

function formatAmount(amount) {
  return formatAmountService(amount, 0)
}

function onResize(width: number, height: number) {
  mode.value = width > height * 3 ? 'horizontal' : 'vertical'
}

function getTimeToNextReset() {
  const now = Date.now()
  const periodMsValue = period.value * 1000 * 60
  const timeOfReset = Math.ceil((now + 10000) / periodMsValue) * periodMsValue

  return timeOfReset - now
}

function scheduleNextPeriodReset() {
  if (resetTimeout) {
    clearTimeout(resetTimeout)
  }

  resetTimeout = setTimeout(periodReset, getTimeToNextReset())
}

function periodReset() {
  if (period.value) {
    periodMs = period.value * 1000 * 60
    lastResetTimestamp = resetTimeout ? Date.now() : null

    if (markets.value) {
      for (const market of markets.value) {
        lastPeriodTickers[market.id].price = +market.price
        lastPeriodTickers[market.id].change = +market.change
        lastPeriodTickers[market.id].volume = +market.volume
        lastPeriodTickers[market.id].volumeDelta = +market.volumeDelta

        market.volume = 0
        market.volumeDelta = 0
      }
    }

    scheduleNextPeriodReset()
  }
}

function clearPeriodReset() {
  for (const market in lastPeriodTickers) {
    lastPeriodTickers[market].price =
      lastPeriodTickers[market].volume =
      lastPeriodTickers[market].volumeDelta =
        0
  }

  if (resetTimeout) {
    clearTimeout(resetTimeout)
    resetTimeout = null
  }
}

function filterMarkets(scheduled?) {
  const threshold = volumeThreshold.value

  if (!pauseSort.value) {
    if (threshold) {
      filteredMarkets.value = markets.value.filter(
        market => market.avgVolume >= threshold
      )

      if (sortFunction) {
        filteredMarkets.value = filteredMarkets.value.sort(sortFunction)
      }
    } else {
      filteredMarkets.value = markets.value
    }
  }

  if (scheduled) {
    // schedule next filter
    setTimeout(() => {
      filterMarkets(true)
    }, Math.random() * 10000)
  }
}

function getPeriodWeight(avgPeriodsValue) {
  if (!avgPeriodsValue || !lastResetTimestamp) {
    return 1
  }

  return (Date.now() - lastResetTimestamp) / periodMs
}

function toggleSort(value) {
  pauseSort.value = !value
}

function getSymbol(product) {
  if (shortSymbols.value) {
    return product.base.replace(/^1000+/, '').slice(0, 8)
  }

  return product.pair
}

function hasMultipleLocals() {
  if (!markets.value.length) {
    return false
  }

  const base = markets.value[0].base

  for (const market of markets.value) {
    if (base !== market.base) {
      return true
    }
  }

  return false
}

const paneElementRef = ref<HTMLElement>()
usePane(props.paneId, paneElementRef, onResize)
defineExpose({ onResize })
</script>

<style lang="scss" scoped>
.markets-bar {
  $self: &;
  display: table;
  text-align: right;

  &__wrapper {
    overflow-y: auto;
    max-height: 100%;
    padding: 0;
  }

  > div {
    display: table-row;

    > div {
      display: table-cell;
      vertical-align: middle;
    }
  }

  @each $exchange, $icon in $exchange-list {
    .market__exchange.#{$exchange} {
      background-image: url('../../assets/exchanges/#{$exchange}.svg');
    }
  }

  &.-horizontal {
    display: flex;
    flex-direction: row;
    overflow-y: hidden;
    overflow-x: auto;
    text-align: center;

    #{$self}__wrapper {
      display: block;
    }

    .market {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 0.25em;

      > div {
        display: block;
        padding: 0;
      }

      &__change {
        width: auto;
      }
    }
  }

  .market {
    font-size: 0.875em;
    font-family: $font-monospace;
    white-space: nowrap;

    > div {
      padding: 0 0.25em;
    }

    &.-up {
      background-color: transparent;
      color: var(--theme-buy-base);
    }

    &.-down {
      background-color: transparent;
      color: var(--theme-sell-base);
    }

    &.-neutral {
      color: var(--theme-color-o50);
    }

    &.-pending {
      opacity: 0.5;
    }

    &__change {
      padding-left: 0.25em;
    }

    &__exchange {
      padding: 0;
      background-repeat: no-repeat;
      background-size: 1em 1em;
      width: 1rem;
      align-self: stretch;
      flex-shrink: 0;
      background-position: center;
      min-width: 1em;
      padding: 0 !important;
    }

    &__pair {
      white-space: nowrap;
      margin-right: 0.5rem;
      text-align: left;
    }
  }
}
</style>
