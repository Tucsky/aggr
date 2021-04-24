<template>
  <div class="pane-prices" :class="{ [scale]: true, [mode]: true }">
    <pane-header :paneId="paneId" />
    <transition-group v-if="markets" :name="transitionGroupName" tag="div" class="markets-bar condensed custom-scrollbar pane">
      <div
        v-for="market in markets"
        :key="market.id"
        class="market"
        :class="{ ['-' + market.exchange]: true, ['-' + market.status]: true, '-hidden': exchanges[market.exchange].hidden }"
        :title="market.id"
        @click="$store.commit('settings/TOGGLE_EXCHANGE', market.exchange)"
      >
        <div v-if="showPairs" class="market__pair" v-text="market.pair"></div>
        <div class="market__price" v-text="formatPrice(market.price)"></div>
      </div>
    </transition-group>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator'

import { formatPrice, parseMarket } from '../../utils/helpers'

import aggregatorService from '@/services/aggregatorService'
import PaneMixin from '@/mixins/paneMixin'
import PaneHeader from '../panes/PaneHeader.vue'
import { Market } from '@/types/test'

type MarketsBarMarketStatus = 'pending' | 'idle' | 'up' | 'down' | 'neutral'

@Component({
  components: { PaneHeader },
  name: 'Prices'
})
export default class extends Mixins(PaneMixin) {
  mode = '-vertical'
  markets: (Market & { price: number; status: MarketsBarMarketStatus })[] = null

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
          id: exchange + pair,
          exchange,
          pair
        })
      }
    }
  }

  get activeExchanges() {
    return this.$store.state.app.activeExchanges
  }

  get activeMarkets() {
    return this.$store.state.app.activeMarkets
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

  get animateSort() {
    return this.$store.state[this.paneId].animateSort
  }

  get transitionGroupName() {
    if (this.animateSort) {
      return 'flip-list'
    } else {
      return null
    }
  }

  mounted() {
    aggregatorService.on('prices', this.updateExchangesPrices)
  }

  beforeDestroy() {
    aggregatorService.off('prices', this.updateExchangesPrices)
  }

  updateExchangesPrices(marketsPrices) {
    if (!this.markets) {
      this.markets = []

      for (const market of this.activeMarkets) {
        this.addMarketToList(market)
      }
    } else {
      for (const market of this.markets) {
        const price = marketsPrices[market.id]

        if (price === market.price) {
          continue
        }

        if (!price) {
          market.status = 'pending'
        } else if (market.price > price) {
          market.status = 'down'
        } else if (market.price < price) {
          market.status = 'up'
        } else {
          market.status = 'neutral'
        }

        market.price = price
      }
    }

    if (this.mode === '-horizontal') {
      this.markets = this.markets.sort((a, b) => a.price - b.price)
    } else {
      this.markets = this.markets.sort((a, b) => b.price - a.price)
    }
  }

  removeMarketFromList(market: string) {
    const index = this.markets.indexOf(this.markets.find(m => m.exchange + ':' + m.pair === market))

    if (index !== -1) {
      this.markets.splice(index, 1)
    } else {
      console.warn(`[prices] unable to remove market from list after panes.markets change: market doesn't exists in list (${market})`)
    }
  }

  addMarketToList(market: Market) {
    this.markets.push({
      ...market,
      status: 'pending',
      price: null
    })
  }

  formatPrice(amount) {
    return formatPrice(amount)
  }

  onResize(width: number, height: number) {
    this.mode = width > height ? '-horizontal' : '-vertical'
  }
}
</script>

<style lang="scss">
.markets-bar {
  display: flex;
  flex-direction: row;
  height: 30px;
  overflow-x: auto;

  @each $exchange, $icon in $exchanges {
    .market.-#{$exchange} {
      background-image: url('../../assets/exchanges/#{$exchange}.svg');
    }
  }

  .market {
    padding: 0.5em 0.5em 0.5em 2em;
    display: flex;
    flex-direction: row;
    font-size: 0.9em;
    align-items: center;
    flex-grow: 1;
    flex-basis: 0;
    position: relative;
    line-height: 1;
    background-position: 0.5em;
    background-repeat: no-repeat;
    background-size: 1em;
    cursor: pointer;

    &__pair {
      white-space: nowrap;
    }

    &__price {
      margin-left: 0.5rem;
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
      color: rgba(white, 0.75);
      font-style: italic;
    }
    &.-pending {
      background-color: rgba(white, 0.2);
      opacity: 0.5;
    }
  }
}

.pane-prices {
  &.-vertical .markets-bar {
    flex-direction: column;
    overflow-x: hidden;
    overflow-y: auto;
    width: 100%;
    height: 100%;
  }
}
</style>
