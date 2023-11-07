<template>
  <div
    v-if="isBooted"
    id="app"
    :data-prefered-sizing-currency="preferedSizingCurrency"
    :class="{
      '-no-animations': disableAnimations,
      '-auto-hide-headers': autoHideHeaders,
      '-auto-hide-names': autoHideNames,
      '-light': theme === 'light'
    }"
  >
    <Loader v-if="isLoading" />
    <Notices />
    <div class="app__wrapper">
      <Menu />

      <div class="app__layout">
        <HotkeyManagement>
          <Panes />
        </HotkeyManagement>
      </div>
    </div>
  </div>
  <div id="app" v-else>
    <div class="app__loader d-flex -column">
      <div v-if="showStuck" class="px8 py8">
        💡 Stuck here ?
        <button class="btn -text" @click="resetAndReload">
          reset everything
        </button>
      </div>
      <Loader />
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'

import aggregatorService from './services/aggregatorService'

import Loader from '@/components/framework/Loader.vue'
import Notices from '@/components/framework/Notices.vue'
import Menu from '@/components/Menu.vue'
import HotkeyManagement from '@/component/HotkeyManagement.vue'

import Panes from '@/components/panes/Panes.vue'

import upFavicon from '@/assets/up.png'
import downFavicon from '@/assets/down.png'

import { Notice } from '@/store/app'

import workspacesService from '@/services/workspacesService'
import { formatMarketPrice } from '@/services/productsService'
import dialogService from '@/services/dialogService'
import importService from '@/services/importService'

@Component({
  name: 'App',
  components: {
    Menu,
    Notices,
    Panes,
    Loader
  },
  watch: {
    '$store.state.panes.marketsListeners'(newMarkets, previousMarkets) {
      if (newMarkets !== previousMarkets) {
        this.refreshMainMarkets(newMarkets)
      }
    }
  }
})
export default class App extends Vue {
  price: string = null
  showStuck = false

  private _mainMarkets: string[]
  private _faviconElement: HTMLLinkElement
  private _stuckTimeout: number
  private _mainPair: string

  get showSearch() {
    return this.$store.state.app.showSearch
  }

  get isBooted() {
    const isBooted = this.$store.state.app && this.$store.state.app.isBooted

    clearTimeout(this._stuckTimeout)

    if (!isBooted) {
      this.showStuck = false
      this._stuckTimeout = setTimeout(() => {
        this.showStuck = true
      }, 15000) as unknown as number
    }

    return isBooted
  }

  get isLoading() {
    return this.$store.state.app.isLoading
  }

  get theme() {
    return this.$store.state.settings.theme
  }

  get autoHideHeaders() {
    return this.$store.state.settings.autoHideHeaders
  }

  get autoHideNames() {
    return this.$store.state.settings.autoHideNames
  }

  get preferedSizingCurrency() {
    return this.$store.state.settings.preferQuoteCurrencySize ? 'quote' : 'base'
  }

  get disableAnimations() {
    return this.$store.state.settings.disableAnimations
  }

  mounted() {
    this.bindDropFile()
    aggregatorService.on('notice', (notice: Notice) => {
      this.$store.dispatch('app/showNotice', notice)
    })
    aggregatorService.on('prices', this.updatePrice)

    document.addEventListener('keydown', this.onDocumentKeyPress)
  }

  beforeDestroy() {
    this.unbindDropFile()
    this.stopUpdatingPrice()
  }

  updatePrice(marketsPrices) {
    let price = 0
    let count = 0

    for (const marketKey of this._mainMarkets) {
      if (
        !marketsPrices[marketKey] ||
        marketsPrices[marketKey].price === null
      ) {
        continue
      }
      price += marketsPrices[marketKey].price
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

      this.price = formatMarketPrice(price, this._mainPair)

      window.document.title = this._mainPair + ' ' + this.price
    } else {
      this.price = null
      this.updateFavicon('neutral')

      window.document.title = this._mainPair ? this._mainPair : 'AGGR'
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

  onDocumentKeyPress(event: KeyboardEvent) {
    if (!this.isBooted) {
      return
    }

    const activeElement = document.activeElement as HTMLElement

    if (
      this.$store.state.app.showSearch ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.tagName === 'SELECT' ||
      activeElement.isContentEditable
    ) {
      return
    }

    event = event || (window.event as any)

    if (/^[a-z]$/i.test(event.key)) {
      this.$store.dispatch('app/showSearch', {
        pristine: true,
        input: event.key
      })
    } else if (/^[0-9]$/i.test(event.key)) {
      this.$store.dispatch('app/showTimeframe')
    }
  }

  async resetAndReload() {
    const response = await dialogService.confirm({
      title: 'Reset app',
      message: 'Are you sure ?',
      ok: 'Reset settings',
      cancel: workspacesService.workspace
        ? 'Download workspace ' + workspacesService.workspace.id
        : 'Cancel'
    })

    if (response === true) {
      await workspacesService.reset()
      window.location.reload()
    } else if (response === false && workspacesService.workspace) {
      workspacesService.downloadWorkspace()
    }
  }

  bindDropFile() {
    document.body.addEventListener('drop', this.handleDrop)
    document.body.addEventListener('dragover', this.handleDrop)
  }

  unbindDropFile() {
    document.body.removeEventListener('drop', this.handleDrop)
    document.body.removeEventListener('dragover', this.handleDrop)
  }
  async handleDrop(event) {
    event.preventDefault()

    if (event.type !== 'drop') {
      return false
    }

    if (!event.dataTransfer.files || !event.dataTransfer.files.length) {
      return
    }

    for (const file of event.dataTransfer.files) {
      try {
        await importService.importAnything(file)
      } catch (error) {
        this.$store.dispatch('app/showNotice', {
          title: error.message,
          type: 'error',
          timeout: 60000
        })
      }
    }
  }
  refreshMainMarkets(markets) {
    const marketsByNormalizedPair = {}
    for (const id in markets) {
      const pair = markets[id].local
      if (!marketsByNormalizedPair[pair]) {
        marketsByNormalizedPair[pair] = 0
      }

      marketsByNormalizedPair[pair] += markets[id].listeners
    }

    this._mainPair = Object.keys(marketsByNormalizedPair).sort(
      (a, b) => marketsByNormalizedPair[b] - marketsByNormalizedPair[a]
    )[0]

    this._mainMarkets = Object.keys(markets)
      .filter(id => markets[id].local === this._mainPair)
      .map(id => markets[id].exchange + ':' + markets[id].pair)
  }
}
</script>
