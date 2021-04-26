<template>
  <div
    v-if="isBooted"
    id="app"
    :data-prefered-sizing-currency="preferedSizingCurrency"
    :data-base="baseCurrency"
    :data-base-symbol="baseCurrencySymbol"
    :data-quote="quoteCurrency"
    :data-quote-symbol="quoteCurrencySymbol"
    :class="{
      '-loading': isLoading,
      '-no-animations': disableAnimations,
      '-light': theme === 'light'
    }"
    v-background
  >
    <Notices />
    <Settings v-if="showSettings" />
    <div class="app__wrapper">
      <Header />
      <SearchProducts />

      <div class="app__layout">
        <Panes />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'

import aggregatorService from './services/aggregatorService'

import Notices from './components/framework/Notices.vue'
import Header from './components/Header.vue'
import Settings from './components/settings/Settings.vue'
import SearchProducts from './components/SearchProducts.vue'

import Panes from '@/components/panes/Panes.vue'

import upFavicon from './assets/up.png'
import downFavicon from './assets/down.png'

import { formatPrice } from './utils/helpers'
import { Notice } from './store/app'

@Component({
  name: 'App',
  components: {
    Header,
    SearchProducts,
    Settings,
    Notices,
    Panes
  }
})
export default class extends Vue {
  price: string = null

  private _faviconElement: HTMLLinkElement

  get pair() {
    const pairs = this.$store.state.app.activeMarkets

    if (!pairs.length) {
      return 'SignificantTrades'
    }

    return pairs[0].pair
  }

  get showSettings() {
    return this.$store.state.app.showSettings
  }

  get isBooted() {
    return this.$store.state.app && this.$store.state.app.isBooted
  }

  get isLoading() {
    return this.$store.state.app.isLoading
  }

  get backgroundColor() {
    return this.$store.state.settings.backgroundColor
  }

  get theme() {
    return this.$store.state.settings.theme
  }

  get markets() {
    return Object.keys(this.$store.state.panes.marketsListeners)
  }

  get preferedSizingCurrency() {
    return this.$store.state.settings.preferQuoteCurrencySize ? 'quote' : 'base'
  }

  get baseCurrency() {
    return this.$store.state.app.baseCurrency
  }

  get baseCurrencySymbol() {
    return this.$store.state.app.baseCurrencySymbol
  }

  get quoteCurrency() {
    return this.$store.state.app.quoteCurrency
  }

  get quoteCurrencySymbol() {
    return this.$store.state.app.quoteCurrencySymbol
  }

  get disableAnimations() {
    return this.$store.state.settings.disableAnimations
  }

  mounted() {
    aggregatorService.on('notice', (notice: Notice) => {
      this.$store.dispatch('app/showNotice', notice)
    })
    aggregatorService.on('prices', this.updatePrice)
  }

  beforeDestroy() {
    this.stopUpdatingPrice()
  }

  updatePrice(marketsPrices) {
    let price = 0
    let count = 0

    for (const market in marketsPrices) {
      price += marketsPrices[market]
      count++
    }

    if (count) {
      price = price / count

      if (this.price !== null) {
        if (price > +this.price) {
          this.updateFavicon('up')
        } else if (price < +this.price) {
          this.updateFavicon('down')
        }
      }

      this.price = formatPrice(price)

      window.document.title = this.pair + ' ' + this.price
    } else {
      this.price = null
      this.updateFavicon('neutral')

      window.document.title = this.pair
    }
  }

  stopUpdatingPrice() {
    aggregatorService.off('prices', this.updatePrice)
    this.price = null
  }

  updateFavicon(direction: 'up' | 'down' | 'neutral') {
    if (!this._faviconElement) {
      this._faviconElement = document.createElement('link')
      this._faviconElement.id = 'favicon'
      this._faviconElement.rel = 'shortcut icon'

      document.head.appendChild(this._faviconElement)
    }

    if (direction === 'up') {
      this._faviconElement.href = upFavicon
    } else {
      this._faviconElement.href = downFavicon
    }
  }
}
</script>
