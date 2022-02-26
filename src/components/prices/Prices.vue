<template>
  <div class="pane-prices" @mouseenter="pauseSort = true" @mouseleave="pauseSort = false">
    <pane-header :paneId="paneId">
      <prices-sort-dropdown :pane-id="paneId" />
    </pane-header>
    <component
      :is="animateSort ? 'transition-group' : 'div'"
      :name="transitionGroupName"
      tag="div"
      class="markets-bar hide-scrollbar pane"
      :class="[mode === 'vertical' && '-vertical']"
    >
      <div v-for="market in markets" :key="market.id" class="market" :class="market.status" :title="market.id">
        <div class="market__exchange" :class="market.exchange"></div>
        <div v-if="showPairs" class="market__pair" v-text="market.pair"></div>
        <div class="market__price" v-text="market.price"></div>
        <div v-if="showChange" class="market__change">({{ market.change >= 0 ? '+' : '' }}{{ market.change.toFixed(2) }}%)</div>
        <div v-if="showVolume" class="market__volume" v-text="formatAmount(market.volume, 2)"></div>
      </div>
    </component>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator'
import PricesSortDropdown from '@/components/prices/PricesSortDropdown.vue'

import aggregatorService from '@/services/aggregatorService'
import PaneMixin from '@/mixins/paneMixin'
import PaneHeader from '../panes/PaneHeader.vue'
import { Market } from '@/types/test'
import { formatAmount, formatMarketPrice, parseMarket } from '@/services/productsService'

type MarketsBarMarketStatus = '-pending' | '-up' | '-down' | '-neutral'
type MarketStats = Market & { price: number; change: number; volume: number; status: MarketsBarMarketStatus }

@Component({
  components: { PaneHeader, PricesSortDropdown },
  name: 'Prices'
})
export default class extends Mixins(PaneMixin) {
  mode = '-vertical'
  pauseSort = false
  markets: MarketStats[] = []

  private _sortFunction: (a: MarketStats, b: MarketStats) => number

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

  get showVolume() {
    return this.$store.state[this.paneId].showVolume
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

  get transitionGroupName() {
    if (this.animateSort) {
      return 'flip-list'
    } else {
      return null
    }
  }

  created() {
    this._onStoreMutation = this.$store.watch(state => [state[this.paneId].sortType, state[this.paneId].sortOrder], this.cacheSortFunction)

    this.cacheSortFunction()

    this.refreshMarkets()
  }

  mounted() {
    aggregatorService.on('prices', this.updateMarkets)
  }

  beforeDestroy() {
    aggregatorService.off('prices', this.updateMarkets)
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

      market.volume = marketStats.volume

      if (showChange) {
        const change = marketStats.price - marketStats.initialPrice

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
    const index = this.markets.indexOf(this.markets.find(m => m.id === market))

    if (index !== -1) {
      this.markets.splice(index, 1)
    } else {
      console.warn(`[prices] unable to remove market from list after panes.markets change: market doesn't exists in list (${market})`)
    }
  }

  addMarketToList(market: Market) {
    this.markets.push({
      ...market,
      status: '-pending',
      price: null,
      change: 0,
      volume: 0
    })
  }

  cacheSortFunction() {
    const order = this.mode === '-horizontal' ? (this.sortOrder > 0 ? -1 : 1) : this.sortOrder
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
    }

    if (by === 'change') {
      if (order === 1) {
        this._sortFunction = (a, b) => a.change - b.change
      } else {
        this._sortFunction = (a, b) => b.change - a.change
      }
    }

    if (by === 'volume') {
      if (order === 1) {
        this._sortFunction = (a, b) => a.volume - b.volume
      } else {
        this._sortFunction = (a, b) => b.volume - a.volume
      }
    }

    this.markets = this.markets.sort(this._sortFunction)
  }

  formatAmount(amount) {
    return formatAmount(amount, 2)
  }

  onResize(width: number, height: number) {
    this.mode = width > height * 1.5 ? 'horizontal' : 'vertical'
  }
}
</script>

<style lang="scss" scoped>
.markets-bar {
  display: flex;
  flex-direction: row;
  height: 30px;
  overflow-x: auto;
  height: 100%;

  @each $exchange, $icon in $exchanges {
    .market__exchange.#{$exchange} {
      background-image: url('../../assets/exchanges/#{$exchange}.svg');
    }
  }

  &.-vertical {
    flex-direction: column;
    overflow-x: hidden;
    overflow-y: auto;
    width: 100%;
    height: 100%;
    text-align: right;

    .market {
      &__price {
        margin-left: auto;
        flex-basis: auto;
      }

      &__pair {
        text-align: left;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      &__change {
        margin-left: 0.5em;
      }
    }
  }
}

.market {
  padding: 0.5em;
  display: flex;
  flex-direction: row;
  font-size: 0.875em;
  align-items: center;
  flex-grow: 1;
  position: relative;

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
    padding-bottom: 2px;
  }

  &__volume {
    margin-left: 0.5rem;
    font-family: $font-monospace;
    flex-basis: 20%;
  }

  &__price {
    font-family: $font-monospace;
    flex-basis: 20%;
  }

  &__change {
    font-family: $font-monospace;
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

  &.-hidden {
    text-decoration: line-through;
  }
}
</style>
