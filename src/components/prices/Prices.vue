<template>
  <div
    class="pane-prices"
    @mouseenter="toggleSort(false)"
    @mouseleave="toggleSort(true)"
  >
    <pane-header
      :paneId="paneId"
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

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator'
import PricesSortDropdown from '@/components/prices/PricesSortDropdown.vue'

import aggregatorService from '@/services/aggregatorService'
import PaneMixin from '@/mixins/paneMixin'
import PaneHeader from '../panes/PaneHeader.vue'
import { Market, Ticker } from '@/types/types'
import {
  formatAmount,
  formatMarketPrice,
  parseMarket,
  getMarketProduct
} from '@/services/productsService'

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

@Component({
  components: { PaneHeader, PricesSortDropdown },
  name: 'Prices'
})
export default class Prices extends Mixins(PaneMixin) {
  mode = 'vertical'
  pauseSort = false
  showCryptosLogos = false
  filteredMarkets: WatchlistMarket[] = []
  VITE_APP_BASE_PATH = import.meta.env.VITE_APP_BASE_PATH

  // cache sort function
  private sortFunction: (a: WatchlistMarket, b: WatchlistMarket) => number

  // markets storage
  private markets: WatchlistMarket[]

  // prices event contain cumulative data
  // keep track of last period ticker's volume & change
  private lastResetTimestamp: number
  private lastPeriodTickers: {
    [id: string]: Ticker & {
      change: number
    }
  }
  private periodMs: number

  private resetTimeout: number

  @Watch('pane.markets')
  private onMarketChange(currentMarket, previousMarkets) {
    for (const id of previousMarkets) {
      if (currentMarket.indexOf(id) === -1) {
        this.removeMarketFromList(id)
      }
    }

    for (const id of currentMarket) {
      if (previousMarkets.indexOf(id) === -1) {
        const [exchange, pair] = parseMarket(id)

        this.addMarketToList({
          id,
          exchange,
          pair
        })
      }
    }

    this.showCryptosLogos = this.hasMultipleLocals()
  }

  @Watch('period', { immediate: true })
  private onPeriodChange(period) {
    if (period > 0) {
      this.periodReset()
    } else {
      this.clearPeriodReset()
    }
  }

  @Watch('volumeThreshold')
  private onVolumeThresholdChange(value) {
    this.toggleSort(true)

    if (!value) {
      this.filteredMarkets = this.markets
    } else {
      this.filterMarkets()
    }
  }

  @Watch('shortSymbols')
  private onShortSymbolsChange(value) {
    for (const market of this.markets) {
      if (value) {
        const product = getMarketProduct(market.exchange, market.pair)

        if (product) {
          market.local = this.getSymbol(product)
          continue
        }
      }

      market.local = market.pair
    }
  }

  @Watch('sortOrder')
  private onSortOrderChange() {
    this.cacheSortFunction()
  }

  @Watch('sortType')
  private onSortTypeChange() {
    this.cacheSortFunction()
  }

  get exchanges() {
    return this.$store.state.exchanges
  }

  get disableAnimations() {
    return this.$store.state.settings.disableAnimations
  }

  get showPairs() {
    return this.$store.state[this.paneId].showPairs
  }

  get showChange() {
    return this.$store.state[this.paneId].showChange
  }

  get showPrice() {
    return this.$store.state[this.paneId].showPrice
  }

  get showVolume() {
    return this.$store.state[this.paneId].showVolume
  }

  get showVolumeDelta() {
    return this.$store.state[this.paneId].showVolumeDelta
  }

  get animateSort() {
    return this.$store.state[this.paneId].animateSort
  }

  get sortType() {
    return this.$store.state[this.paneId].sortType
  }

  get sortOrder() {
    return this.$store.state[this.paneId].sortOrder
  }

  get period() {
    return this.$store.state[this.paneId].period
  }

  get shortSymbols() {
    return this.$store.state[this.paneId].shortSymbols
  }

  get avgPeriods() {
    return this.$store.state[this.paneId].avgPeriods
  }

  get volumeThreshold() {
    return this.$store.state[this.paneId].volumeThreshold
  }

  get transitionGroupName() {
    if (this.animateSort) {
      return 'flip-list'
    } else {
      return null
    }
  }

  created() {
    this.cacheSortFunction()
    this.refreshMarkets()
  }

  mounted() {
    aggregatorService.on('tickers', this.updateMarkets)

    // start filter interval
    this.filterMarkets(true)
  }

  beforeDestroy() {
    aggregatorService.off('tickers', this.updateMarkets)

    if (this.resetTimeout) {
      // clear periodic reset timeout
      clearTimeout(this.resetTimeout)
    }
  }

  refreshMarkets() {
    // non reactive storages
    this.markets = []
    this.lastPeriodTickers = {}

    // active normalized pairs
    const locals = []

    for (const market of this.pane.markets) {
      const [exchange, pair] = parseMarket(market)

      const product = this.addMarketToList({
        id: market,
        pair,
        exchange
      })

      if (locals.indexOf(product.local) === -1) {
        locals.push(product.local)
      }
    }

    this.showCryptosLogos = this.hasMultipleLocals()

    this.filterMarkets()
  }

  updateMarkets(tickers) {
    // cache setting getters
    const showChange = this.showChange
    const avgPeriods = this.avgPeriods
    const periodWeight = this.getPeriodWeight(avgPeriods)

    for (const market of this.markets) {
      const ticker = tickers[market.id]

      if (!ticker) {
        continue
      }

      const oldData = this.lastPeriodTickers[market.id]

      if (!oldData.price) {
        oldData.price = ticker.price
      }

      market.price = formatMarketPrice(ticker.price, market.id)

      market.volume += ticker.volume
      market.volumeDelta += ticker.volumeDelta

      if (avgPeriods) {
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

      if (showChange && ticker.price) {
        // colorize using price change accross period
        const change = ticker.price - this.lastPeriodTickers[market.id].price

        market.change = (change / this.lastPeriodTickers[market.id].price) * 100

        if (avgPeriods) {
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

    if (!this.pauseSort && this.sortFunction !== null) {
      this.filteredMarkets = this.filteredMarkets.sort(this.sortFunction)
    }
  }

  removeMarketFromList(market: string) {
    if (this.lastPeriodTickers[market]) {
      delete this.lastPeriodTickers[market]
    }

    const index = this.markets.indexOf(this.markets.find(m => m.id === market))

    if (index !== -1) {
      this.markets.splice(index, 1)
    } else {
      console.warn(
        `[prices] unable to remove market from list after panes.markets change: market doesn't exists in list (${market})`
      )
    }
  }

  addMarketToList(market: Market) {
    this.lastPeriodTickers[market.id] = {
      price: 0,
      change: 0,
      volume: 0,
      volumeDelta: 0
    }

    const product = getMarketProduct(market.exchange, market.pair)

    if (product) {
      this.markets.push({
        ...market,
        local: this.getSymbol(product),
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

  cacheSortFunction() {
    const order =
      this.mode === 'horizontal'
        ? this.sortOrder > 0
          ? -1
          : 1
        : this.sortOrder
    const by = this.sortType

    if (!by || by === 'none') {
      this.sortFunction = null
      return
    }

    if (by === 'price') {
      if (order === 1) {
        this.sortFunction = (a, b) => (a as any).price - (b as any).price
      } else {
        this.sortFunction = (a, b) => (b as any).price - (a as any).price
      }
    } else if (by === 'change') {
      if (order === 1) {
        this.sortFunction = (a, b) => a.avgChange - b.avgChange
      } else {
        this.sortFunction = (a, b) => b.avgChange - a.avgChange
      }
    } else if (by === 'volume') {
      if (order === 1) {
        this.sortFunction = (a, b) => a.avgVolume - b.avgVolume
      } else {
        this.sortFunction = (a, b) => b.avgVolume - a.avgVolume
      }
    } else if (by === 'delta') {
      if (order === 1) {
        this.sortFunction = (a, b) => a.avgVolumeDelta - b.avgVolumeDelta
      } else {
        this.sortFunction = (a, b) => b.avgVolumeDelta - a.avgVolumeDelta
      }
    }

    this.filteredMarkets = this.filteredMarkets.sort(this.sortFunction)
  }

  formatAmount(amount) {
    return formatAmount(amount, 0)
  }

  onResize(width: number, height: number) {
    this.mode = width > height * 3 ? 'horizontal' : 'vertical'
  }

  getTimeToNextReset() {
    const now = Date.now()
    const periodMs = this.period * 1000 * 60
    const timeOfReset = Math.ceil(now / periodMs) * periodMs

    return timeOfReset - now
  }

  scheduleNextPeriodReset() {
    if (this.resetTimeout) {
      clearTimeout(this.resetTimeout)
    }

    this.resetTimeout = setTimeout(
      this.periodReset.bind(this),
      this.getTimeToNextReset()
    ) as unknown as number
  }

  periodReset() {
    if (this.period) {
      this.periodMs = this.period * 1000 * 60
      this.lastResetTimestamp = this.resetTimeout ? Date.now() : null

      if (this.markets) {
        for (const market of this.markets) {
          this.lastPeriodTickers[market.id].price = +market.price
          this.lastPeriodTickers[market.id].change = +market.change
          this.lastPeriodTickers[market.id].volume = +market.volume
          this.lastPeriodTickers[market.id].volumeDelta = +market.volumeDelta

          market.volume = 0
          market.volumeDelta = 0
        }
      }

      this.scheduleNextPeriodReset()
    }
  }

  clearPeriodReset() {
    for (const market in this.lastPeriodTickers) {
      this.lastPeriodTickers[market].price =
        this.lastPeriodTickers[market].volume =
        this.lastPeriodTickers[market].volumeDelta =
          0
    }

    if (this.resetTimeout) {
      clearTimeout(this.resetTimeout)
      this.resetTimeout = null
    }
  }

  filterMarkets(scheduled?) {
    const threshold = this.volumeThreshold

    if (!this.pauseSort) {
      if (threshold) {
        this.filteredMarkets = this.markets.filter(
          market => market.avgVolume >= threshold
        )

        if (this.sortFunction) {
          this.filteredMarkets = this.filteredMarkets.sort(this.sortFunction)
        }
      } else {
        this.filteredMarkets = this.markets
      }
    }

    if (scheduled) {
      // schedule next filter
      setTimeout(() => {
        this.filterMarkets(true)
      }, Math.random() * 10000)
    }
  }

  getPeriodWeight(avgPeriods) {
    if (!avgPeriods || !this.lastResetTimestamp) {
      return 1
    }

    return (Date.now() - this.lastResetTimestamp) / this.periodMs
  }

  toggleSort(value) {
    this.pauseSort = !value
  }

  getSymbol(product) {
    if (this.shortSymbols) {
      return product.base.replace(/^1000+/, '').slice(0, 8)
    }

    return product.pair
  }

  hasMultipleLocals() {
    if (!this.markets.length) {
      return false
    }

    const base = this.markets[0].base

    for (const market of this.markets) {
      if (base !== market.base) {
        return true
      }
    }

    return false
  }
}
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
      background-size: 1em;
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
