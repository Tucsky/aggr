<template>
  <div v-if="showSearch" class="app-search" :class="{ '-loading': loading }">
    <div class="app-search__wrapper">
      <div v-if="searchTarget && activeMarkets.length" class="mb8 form-group">
        <label>Main window connections :</label>
        <button
          v-for="market of activeMarkets"
          :key="market"
          class="btn -small mr4 mb4 -green"
          :class="{ '-outline': pairs.indexOf(market) === -1 }"
          :title="pairs.indexOf(market) !== -1 ? 'Remove from pane' : 'Add to pane'"
          @click="togglePaneMarket(market)"
          v-tippy
        >
          {{ market }}
        </button>
      </div>
      <div class="form-group">
        <label v-if="paneName">Selected pane connections :</label>
        <Autocomplete :load="search" :query="query" :items="pairs" @submit="setPairs($event)"></Autocomplete>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { Component, Vue, Watch } from 'vue-property-decorator'
import Autocomplete from '@/components/framework/Autocomplete.vue'
import dialogService from '@/services/dialogService'
import { getBucketId } from '@/utils/helpers'
import { getAllProducts } from '@/services/productsService'

@Component({
  name: 'SearchProducts',
  components: {
    Autocomplete
  }
})
export default class extends Vue {
  loading = false
  query = ''
  pairs: string[] = []

  get showSearch() {
    return this.$store.state.app.showSearch
  }

  get searchTarget() {
    return this.$store.state.app.searchTarget
  }

  get paneName() {
    if (this.searchTarget) {
      return this.$store.state.panes.panes[this.searchTarget].name
    } else {
      return null
    }
  }

  get indexedProducts() {
    return this.$store.state.app.indexedProducts
  }

  get activeMarkets() {
    return this.$store.state.app.activeMarkets.map(market => market.exchange + ':' + market.pair)
  }

  @Watch('showSearch')
  async onShowSearch(shown) {
    if (shown) {
      this.getPairs()
      this.bindSearchClickOutside()

      if (!Object.keys(this.indexedProducts).length && !this.loading) {
        this.loading = true
        await getAllProducts()
        this.loading = false
      }
    } else {
      this.unbindSearchClickOutside()
    }
  }

  mounted() {
    this.bindSearchOpenByKey()
  }

  beforeDestroy() {
    this.unbindSearchOpenByKey()
    this.unbindSearchClickOutside()
  }

  search(query) {
    const reg = new RegExp(query, 'i')

    return Array.prototype.concat(...Object.values(this.indexedProducts)).filter(a => reg.test(a))
  }

  getPairs() {
    console.log('get pairs', this.searchTarget)
    if (this.searchTarget) {
      this.pairs = this.$store.state.panes.panes[this.searchTarget].markets.slice()
    } else {
      this.pairs = Object.keys(this.$store.state.panes.marketsListeners)
    }
  }

  async setPairs(pairs: string[]) {
    if (!this.searchTarget) {
      if (this.multipleMarketsSettings() && !(await dialogService.confirm('Are you sure ?'))) {
        return
      }

      this.$store.dispatch('panes/setMarketsForAll', pairs)
    } else {
      this.$store.dispatch('panes/setMarketsForPane', {
        id: this.searchTarget,
        markets: pairs
      })
    }

    this.$store.dispatch('app/hideSearch')
  }

  multipleMarketsSettings() {
    return (
      Object.keys(this.$store.state.panes.panes)
        .map(id => getBucketId(this.$store.state.panes.panes[id].markets))
        .filter((v, i, a) => a.indexOf(v) === i).length > 1
    )
  }

  bindSearchOpenByKey() {
    document.addEventListener('keypress', this.onDocumentKeyPress)
  }

  unbindSearchOpenByKey() {
    document.removeEventListener('keypress', this.onDocumentKeyPress)
  }

  bindSearchClickOutside() {
    document.addEventListener('mousedown', this.onDocumentClick)
  }

  unbindSearchClickOutside() {
    document.removeEventListener('mousedown', this.onDocumentClick)
  }

  onDocumentKeyPress(event: KeyboardEvent) {
    const activeElement = document.activeElement as HTMLElement

    if (
      this.showSearch ||
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.tagName === 'SELECT' ||
      activeElement.isContentEditable
    ) {
      return
    }

    event = event || (window.event as any)
    const charCode = event.which || event.keyCode
    const charStr = String.fromCharCode(charCode)

    if (/[a-z0-9]/i.test(charStr)) {
      this.query = charStr
      this.$store.dispatch('app/showSearch')
    }
  }

  onDocumentClick(event) {
    const element = this.$el.children[0]

    const dialog = document.querySelector('.dialog')

    if (element !== event.target && !element.contains(event.target) && (!dialog || !dialog.contains(event.target))) {
      this.$store.dispatch('app/hideSearch')
    }
  }

  togglePaneMarket(market: string) {
    const index = this.pairs.indexOf(market)

    if (index === -1) {
      this.pairs.push(market)
    } else {
      this.pairs.splice(index, 1)
    }
  }
}
</script>
<style lang="scss">
#app.-light .app-search + div:before {
  background: linear-gradient(to bottom, rgba(white, 0.2) 0%, rgba(white, 0) 60%);
}

.app-search {
  position: absolute;
  max-height: 100vh;
  transform: translateX(-50%);
  left: 50%;
  padding: 1em;
  z-index: 3;
  min-width: 320px;
  max-width: 80%;

  @media screen and (min-width: 768px) {
    .app-search__wrapper {
      .form-group > label {
        font-size: 1rem;
      }

      .btn {
        font-size: 0.875em;
      }
    }
  }

  &.-loading {
    pointer-events: none;

    .app-search__wrapper {
      opacity: 0.5;
    }
  }

  &__wrapper {
    position: relative;
  }

  .autocomplete {
    &__wrapper {
      border-radius: 4px;
      z-index: 2;

      box-shadow: rgba(0, 0, 0, 0.2) 0px 18px 50px -10px;
    }

    &__items {
      border-radius: 4px 0 0 4px;
    }

    &__dropdown {
      margin-top: -17px;

      box-shadow: rgba(0, 0, 0, 0.2) 0px 18px 50px -10px;

      &:before {
        content: '';
        position: fixed;
        right: 1rem;
        height: 1em;
        height: 1em;
        box-shadow: 0 0.2em 1em rgba(darken($dark, 5%), 0.5);
        z-index: 1;
        border-radius: 4px;
      }
    }

    &__option:first-child {
      margin-top: 1.5rem;
    }

    &__option:last-child {
      margin-bottom: 0.5rem;
    }
  }

  + div:before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1;
    background: linear-gradient(to bottom, rgba(black, 0.9) 0%, rgba(black, 0) 40%);
    background-size: 150%;
    backdrop-filter: blur(1px);
  }
}
</style>
