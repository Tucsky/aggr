<template>
  <div
    class="settings-exchange"
    :class="{
      '-active': active,
      '-enabled': !settings.disabled,
      '-invisible': settings.hidden,
      '-expanded': expanded
    }"
  >
    <div class="settings-exchange__header">
      <div class="settings-exchange__identity" :title="'Toggle ' + id" v-tippy @click="toggleExchange">
        <div class="settings-exchange__name">{{ name }}</div>
      </div>
      <div class="settings-exchange__controls">
        <button
          class="settings-exchange__visibility"
          v-tippy
          :title="settings.hidden ? 'Show' : 'Hide'"
          @click.stop.prevent="$store.dispatch('exchanges/toggleExchangeVisibility', id)"
        >
          <i class="icon-visible"></i>
        </button>
        <button class="settings-exchange__more" @click.stop.prevent="expanded = !expanded">
          <i class="icon-down"></i>
        </button>
      </div>
    </div>
    <div class="settings-exchange__detail" v-if="expanded">
      <div class="form-group" v-if="markets.length">
        <small class="mb4 d-block">Connections</small>
        <div>
          <div v-for="market in markets" :key="market.identifier" class="d-flex">
            <div class="-fill -center">{{ market.pair }}</div>
            <div class="-center">{{ prices[market.identifier] }}</div>
          </div>
        </div>
      </div>
      <div class="form-group mt8">
        <small class="mb4 d-block"
          >Products : <strong>{{ indexedProducts.length }}</strong></small
        >
        <button v-if="canRefreshProducts" class="btn -red -small" @click="refreshProducts">Refresh</button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
// import { getExchangeById } from '@/exchanges'
// import Exchange from '@/exchanges/exchangeAbstract'
// import aggregatorService from '@/services/aggregatorService'
import { formatAmount, formatPrice } from '@/utils/helpers'
import { Component, Vue } from 'vue-property-decorator'
import Slider from '@/components/framework/picker/Slider.vue'
import aggregatorService from '@/services/aggregatorService'

@Component({
  name: 'Exchange',
  components: {
    Slider
  },
  props: ['id']
})
export default class extends Vue {
  id: string
  canRefreshProducts = true
  expanded = false
  prices: { [identifier: string]: number } = {}

  mounted() {
    aggregatorService.on('prices', this.updateMarketsPrices)
  }

  beforeDestroy() {
    aggregatorService.off('prices', this.updateMarketsPrices)
  }

  updateMarketsPrices(prices) {
    this.prices = prices
  }

  get name() {
    return this.id.replace(/[\W_]+/g, ' ')
  }

  get settings() {
    return this.$store.state.exchanges[this.id]
  }

  get markets() {
    return this.$store.state.app.activeMarkets.filter(m => m.exchange === this.id).sort((a, b) => this.prices[a.id] - this.prices[b.id])
  }

  get active() {
    return this.markets.length
  }

  get indexedProducts() {
    return this.$store.state.app.indexedProducts[this.id] || []
  }

  async refreshProducts() {
    this.canRefreshProducts = false

    await aggregatorService.dispatch({
      op: 'fetch-products',
      data: this.id
    })

    setTimeout(() => {
      this.canRefreshProducts = true
    }, 3000)

    aggregatorService.dispatch({
      op: 'products',
      data: {
        exchange: this.id,
        data: null
      }
    })

    await this.$store.dispatch('exchanges/disconnect', this.id)
    await this.$store.dispatch('exchanges/connect', this.id)

    this.$store.dispatch('app/showNotice', {
      type: 'success',
      title: `${this.indexedProducts.length} products refreshed`
    })
  }

  async toggleExchange() {
    await this.$store.dispatch('exchanges/toggleExchange', this.id)
  }

  formatAmount(amount) {
    return formatAmount(amount)
  }

  formatPrice(price) {
    return formatPrice(price)
  }
}
</script>

<style lang="scss">
.settings-exchange {
  background-color: rgba(white, 0.15);
  transition: all 0.2s $ease-out-expo;
  border-radius: 3px;
  margin-bottom: 8px;
  flex-basis: calc(50% - 4px);
  max-width: calc(50% - 4px);

  &:nth-child(odd) {
    margin-right: 8px;
  }

  &.-loading {
    background-color: $blue;

    .settings-exchange__header:before {
      transition: all 0.2s $ease-elastic;
      display: block;
      opacity: 1;
      width: 16px;
      height: 16px;
    }
  }

  &.-enabled {
    .settings-exchange__threshold {
      display: block;
    }

    .settings-exchange__name:before {
      width: 0%;
    }
  }

  &.-active {
    background-color: $green;
    color: white;

    .settings-exchange__visibility {
      display: flex;
    }

    &.-invisible {
      .icon-visibility:before {
        transform: scale(1.2) rotateY(180deg);
      }
    }
  }

  &.-invisible {
    opacity: 0.8;

    .icon-eye:before {
      content: unicode($icon-hidden);
    }
  }

  &.-error {
    background-color: $red;

    .icon-warning {
      display: block;
      margin-left: 5px;
    }
  }

  &.-unmatched {
    background-color: #555;

    color: rgba(white, 0.75);
  }

  &.-expanded {
    .settings-exchange__more i:before {
      content: unicode($icon-up);
    }
  }
}

.settings-exchange__identity {
  position: relative;
  margin: 0 0 0 0.5rem;
  display: flex;
  flex-direction: column;
  height: 40px;
  justify-content: center;
  font-size: 80%;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

.settings-exchange__name {
  position: relative;
  margin-right: auto;
  text-transform: uppercase;
  white-space: normal;
  font-weight: 600;

  .icon-line-chart {
    position: absolute;
    right: -1.5em;
    top: 0.05em;
  }

  &:before {
    content: '';
    position: absolute;
    top: calc(50% + 1px);
    height: 1px;
    background-color: white;
    transition: width 0.2s $ease-out-expo 0.2s;
    left: -2px;
    width: calc(100% + 4px);
  }
}

.settings-exchange__price {
  opacity: 0.8;
}

.settings-exchange__threshold {
  display: none;
  position: absolute;
  top: -0.5em;
  right: -0.5em;
  pointer-events: none;
  font-size: 90%;
  background-color: $blue;
  border-radius: 3px;
  color: white;
  padding: 0.1em 0.2em;
  box-shadow: 0 0 0 1px rgba(black, 0.2);
}

.settings-exchange__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  cursor: pointer;

  &:before {
    content: '';
    width: 0px;
    height: 0px;

    background-color: #fff;
    border-radius: 50%;
    animation: circle-scaleout 1s infinite ease-in-out;
    transition: all 0.2s $ease-elastic, visibility 0.2s linear 0.2s;
    left: 3px;
    display: none;
    align-self: center;
    position: relative;

    opacity: 0;

    @keyframes circle-scaleout {
      0% {
        -webkit-transform: scale(0);
        transform: scale(0);
      }
      100% {
        -webkit-transform: scale(1);
        transform: scale(1);
        opacity: 0;
      }
    }
  }

  .icon-warning {
    display: none;
  }
}

.settings-exchange__controls {
  display: flex;
  margin-left: auto;
  align-self: stretch;

  .settings-exchange__visibility {
    display: none;
  }

  button {
    border: 0;
    background: none;
    cursor: pointer;
    font-size: 1rem;
    display: flex;
    align-items: center;

    .icon-down,
    .icon-up {
      font-size: 80%;
    }

    &:hover {
      background-color: rgba(white, 0.1);
    }
  }
}

.settings-exchange__detail {
  padding: 10px;
}

#app.-light .settings-exchange {
  &.-active {
    background-color: white;
    color: #111;
  }
}
</style>
