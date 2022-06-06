<template>
  <div class="pane-prices" @mouseenter="pauseSort = true" @mouseleave="pauseSort = false">
    <pane-header :paneId="paneId">
      <prices-sort-dropdown :pane-id="paneId" />
    </pane-header>
    <div class="markets-bar__wrapper hide-scrollbar">
      <component
        :is="animateSort ? 'transition-group' : 'div'"
        :name="transitionGroupName"
        tag="div"
        class="markets-bar hide-scrollbar pane"
        :class="[mode === 'horizontal' && '-horizontal']"
      >
        <div v-for="market in markets" :key="market.id" class="market" :class="market.status" :title="market.id">
          <div class="market__exchange" :class="market.exchange"></div>
          <div v-if="showPairs" class="market__pair">{{ market.local }}</div>
          <div class="market__price" v-if="showPrice">{{ market.price }}</div>
          <div class="market__change" v-if="showChange">{{ (market.change >= 0 ? '+' : '') + market.change.toFixed(2) }}%</div>
          <div v-if="showVolume" class="market__volume">{{ formatAmount(market.volume, 2) }}</div>
          <div v-if="showVolumeDelta" class="market__volume">{{ formatAmount(market.volumeDelta, 2) }}</div>
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
import { Market } from '@/types/test'
import { formatAmount, formatMarketPrice, parseMarket, getMarketProduct } from '@/services/productsService'

type MarketsBarMarketStatus = '-pending' | '-up' | '-down' | '-neutral'
type MarketStats = Market & {
  local: string
  price: number
  change: number
  volume: number
  volumeDelta: number
  status: MarketsBarMarketStatus
}

@Component({
  components: { PaneHeader, PricesSortDropdown },
  name: 'Prices'
})
export default class extends Mixins(PaneMixin) {
  mode = 'vertical'
  pauseSort = false
  markets: MarketStats[] = []

  private _sortFunction: (a: MarketStats, b: MarketStats) => number

  private _initialValues: {
    [id: string]: {
      volume: number
      volumeDelta: number
      change: number
    }
  }
  private _resetTimeout: number

  @Watch('pane.markets')
  private marketChange(currentMarket, previousMarkets) {
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
  }

  @Watch('period', { immediate: true })
  private periodChange(period) {
    if (period > 0) {
      this.periodReset()
    } else {
      this.clearPeriodReset()
    }
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

  get transitionGroupName() {
    if (this.animateSort) {
      return 'flip-list'
    } else {
      return null
    }
  }

  created() {
    this._initialValues = {}
    this._onStoreMutation = this.$store.watch(state => [state[this.paneId].sortType, state[this.paneId].sortOrder], this.cacheSortFunction)

    this.cacheSortFunction()

    this.refreshMarkets()
  }

  mounted() {
    aggregatorService.on('prices', this.updateMarkets)
  }

  beforeDestroy() {
    aggregatorService.off('prices', this.updateMarkets)

    if (this._resetTimeout) {
      clearTimeout(this._resetTimeout)
    }
  }

  refreshMarkets() {
    this.markets = []

    for (const market of this.pane.markets) {
      const [exchange, pair] = parseMarket(market)

      this.addMarketToList({
        id: market,
        pair,
        exchange
      })
    }
  }

  updateMarkets(marketsStats) {
    const showChange = this.showChange

    for (const market of this.markets) {
      const marketStats = marketsStats[market.id]

      if (!marketStats || marketStats.volume === market.volume) {
        continue
      }

      market.volume = marketStats.volume - this._initialValues[market.id].volume
      market.volumeDelta = marketStats.volumeDelta - this._initialValues[market.id].volumeDelta

      if (showChange && marketStats.price) {
        const change = marketStats.price - marketStats.initialPrice - this._initialValues[market.id].change

        market.change = (change / marketStats.price) * 100
        market.status = change > 0 ? '-up' : '-down'
      } else {
        if (marketStats.price === null) {
          market.status = '-pending'
        } else if (market.price > marketStats.price) {
          market.status = '-down'
        } else if (market.price < marketStats.price) {
          market.status = '-up'
        } else {
          market.status = '-neutral'
        }
      }

      market.price = formatMarketPrice(marketStats.price, market.id)
    }

    if (!this.pauseSort && this._sortFunction !== null) {
      this.markets = this.markets.sort(this._sortFunction)
    }
  }

  removeMarketFromList(market: string) {
    if (this._initialValues[market]) {
      delete this._initialValues[market]
    }

    const index = this.markets.indexOf(this.markets.find(m => m.id === market))

    if (index !== -1) {
      this.markets.splice(index, 1)
    } else {
      console.warn(`[prices] unable to remove market from list after panes.markets change: market doesn't exists in list (${market})`)
    }
  }

  addMarketToList(market: Market) {
    this._initialValues[market.id] = {
      change: 0,
      volume: 0,
      volumeDelta: 0
    }

    const product = getMarketProduct(market.exchange, market.pair)

    this.markets.push({
      ...market,
      local: product.local,
      status: '-pending',
      price: null,
      change: 0,
      volume: 0,
      volumeDelta: 0
    })
  }

  cacheSortFunction() {
    const order = this.mode === 'horizontal' ? (this.sortOrder > 0 ? -1 : 1) : this.sortOrder
    const by = this.sortType

    if (!by || by === 'none') {
      this._sortFunction = null
      return
    }

    if (by === 'price') {
      if (order === 1) {
        this._sortFunction = (a, b) => a.price - b.price
      } else {
        this._sortFunction = (a, b) => b.price - a.price
      }
    } else if (by === 'change') {
      if (order === 1) {
        this._sortFunction = (a, b) => a.change - b.change
      } else {
        this._sortFunction = (a, b) => b.change - a.change
      }
    } else if (by === 'volume') {
      if (order === 1) {
        this._sortFunction = (a, b) => a.volume - b.volume
      } else {
        this._sortFunction = (a, b) => b.volume - a.volume
      }
    } else if (by === 'delta') {
      if (order === 1) {
        this._sortFunction = (a, b) => a.volumeDelta - b.volumeDelta
      } else {
        this._sortFunction = (a, b) => b.volumeDelta - a.volumeDelta
      }
    }

    this.markets = this.markets.sort(this._sortFunction)
  }

  formatAmount(amount) {
    return formatAmount(amount, 2)
  }

  onResize(width: number, height: number) {
    this.mode = width > height * 1.75 ? 'horizontal' : 'vertical'
  }

  getTimeToNextReset() {
    const now = Date.now()
    const periodMs = this.period * 1000 * 60
    const timeOfReset = Math.ceil(now / periodMs) * periodMs

    return timeOfReset - now
  }

  scheduleNextPeriodReset() {
    if (this._resetTimeout) {
      clearTimeout(this._resetTimeout)
    }

    this._resetTimeout = setTimeout(this.periodReset.bind(this), this.getTimeToNextReset())
  }

  periodReset() {
    aggregatorService.once('prices', marketsStats => {
      for (const market of this.markets) {
        if (!marketsStats[market.id]) {
          continue
        }

        this._initialValues[market.id].change = marketsStats[market.id].price - marketsStats[market.id].initialPrice
        this._initialValues[market.id].volume = marketsStats[market.id].volume
        this._initialValues[market.id].volumeDelta = marketsStats[market.id].volumeDelta
      }

      this.updateMarkets(marketsStats)

      if (this.period) {
        this.scheduleNextPeriodReset()
      }
    })
  }

  clearPeriodReset() {
    for (const market in this._initialValues) {
      this._initialValues[market].change = this._initialValues[market].volume = this._initialValues[market].volumeDelta = 0
    }

    if (this._resetTimeout) {
      clearTimeout(this._resetTimeout)
      this._resetTimeout = null
    }
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
    height: 100%;
    padding: 0 0.5em;
  }

  > div {
    display: table-row;

    > div {
      display: table-cell;
      vertical-align: middle;
    }
  }

  height: 100%;

  @each $exchange, $icon in $exchanges {
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

    > div {
      padding: 0 0.25em;
    }

    &.-up {
      background-color: transparent;
      color: lighten($green, 10%);
    }

    &.-down {
      background-color: transparent;
      color: $red;
    }

    &.-neutral {
      color: var(--theme-color-o50);
    }

    &.-pending {
      background-color: rgba(var(--theme-color-base), 0.2);
      opacity: 0.5;
    }

    &__change {
      width: 1px;
      padding-left: 0.25em;
    }

    &__exchange {
      background-repeat: no-repeat;
      background-size: 1.25em;
      width: 2em;
      align-self: stretch;
      flex-shrink: 0;
      background-position: center;
    }

    &__pair {
      white-space: nowrap;
      margin-right: 0.5rem;
      font-family: $font-base;
      text-align: left;
    }
  }
}
</style>
