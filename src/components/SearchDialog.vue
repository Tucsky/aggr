<template>
  <Dialog @clickOutside="hide" class="-sticky-footer -mobile-fs -auto">
    <template v-slot:header>
      <div v-if="paneId">
        <div class="title">ADD/REMOVE SOURCES</div>
        <div class="subtitle" style="opacity: 1">to <span class="text-success" v-text="paneName"></span> pane</div>
      </div>
      <div v-else>
        <div class="title">REPLACE SOURCES</div>
        <div class="subtitle">across all panes</div>
      </div>
      <div class="column -center"></div>
    </template>
    <div class="search">
      <div class="search__side" :class="{ '-show': mobileShowFilters }">
        <div class="search-filters mb16">
          <div class="search-filters__content" v-if="showExtraFilters">
            <label class="checkbox-control -small mb4">
              <input
                type="checkbox"
                class="form-control"
                :checked="searchTypes.normalize"
                @change="$store.commit('settings/TOGGLE_SEARCH_TYPE', 'normalize')"
              />
              <div></div>
              <span>Group by pair</span>
            </label>
            <label class="checkbox-control -small mb4">
              <input
                type="checkbox"
                class="form-control"
                :checked="searchTypes.mergeUsdt"
                @change="$store.commit('settings/TOGGLE_SEARCH_TYPE', 'mergeUsdt')"
              />
              <div></div>
              <span>hide usd<strong>T</strong> / usd<strong>C</strong></span>
            </label>
            <label class="checkbox-control -small mb4">
              <input
                type="checkbox"
                class="form-control"
                :checked="searchTypes.historical"
                @change="$store.commit('settings/TOGGLE_SEARCH_TYPE', 'historical')"
              />
              <div></div>
              <span>With historical data</span>
            </label>
            <label class="checkbox-control -small mb4">
              <input type="checkbox" class="form-control" :checked="onlyConnected" @change="onlyConnected = !onlyConnected" />
              <div></div>
              <span>Active markets</span>
            </label>
          </div>
          <div class="search-filters__title mb8" @click="showExtraFilters = !showExtraFilters">Extra <i class="icon-up -higher"></i></div>
        </div>

        <div class="search-filters mb16">
          <div class="search-filters__content" v-if="showTypeFilters">
            <label class="checkbox-control -small mb4">
              <input
                type="checkbox"
                class="form-control"
                :checked="searchTypes.spots"
                @change="$store.commit('settings/TOGGLE_SEARCH_TYPE', 'spots')"
              />
              <div></div>
              <span>Spots</span>
            </label>
            <label class="checkbox-control -small mb4">
              <input
                type="checkbox"
                class="form-control"
                :checked="searchTypes.perpetuals"
                @change="$store.commit('settings/TOGGLE_SEARCH_TYPE', 'perpetuals')"
              />
              <div></div>
              <span>Perpetuals</span>
            </label>
            <label class="checkbox-control -small mb4">
              <input
                type="checkbox"
                class="form-control"
                :checked="searchTypes.futures"
                @change="$store.commit('settings/TOGGLE_SEARCH_TYPE', 'futures')"
              />
              <div></div>
              <span>Futures</span>
            </label>
          </div>
          <div class="search-filters__title mb8" @click="showTypeFilters = !showTypeFilters">Type <i class="icon-up -higher"></i></div>
        </div>

        <div class="search-filters">
          <div class="search-filters__content" v-if="showExchanges">
            <label class="search-filters__controls checkbox-control -small mb4 flex-right">
              <input type="checkbox" class="form-control" :checked="allExchangesEnabled" @change="toggleAll" />
              <div></div>
            </label>
            <label class="checkbox-control -small mb4 -custom" v-for="id of exchanges" :key="id">
              <input
                type="checkbox"
                class="form-control"
                :checked="searchExchanges[id] !== false"
                @change="$store.commit('settings/TOGGLE_SEARCH_EXCHANGE', id)"
              />
              <div :class="'icon-' + id"></div>
              <span>
                <span v-text="id"></span>
                <a v-if="canRefreshProducts" href="javascript:void(0);" class="-text" @click="refreshExchangeProducts(id)" title="Refresh products">
                  <i class="icon-refresh ml8"> </i>
                </a>
              </span>
            </label>
          </div>
          <div class="search-filters__title mb8" @click="showExchanges = !showExchanges">Exchanges <i class="icon-up -higher"></i></div>
        </div>
      </div>
      <div class="search__wrapper">
        <div class="search__selection form-control">
          <button v-if="selection.length" class="btn search__clear -text" @click="clearSelection"><i class="icon-eraser"></i></button>
          <template v-if="searchTypes.normalize">
            <button
              v-for="(markets, localPair) of groupedSelection"
              :key="localPair"
              class="btn  -accent -accent-200"
              :title="'Click to remove ' + markets.join(', ')"
              @click="deselectMarkets(markets)"
              v-text="localPair"
            ></button>
          </template>
          <template v-else>
            <button
              v-for="market of selection"
              :key="market"
              class="btn  -accent -accent-200"
              :class="{ '-green': activeMarkets.indexOf(market) !== -1 }"
              title="Click to remove"
              @click="deselectMarket(market)"
              v-text="market"
            ></button>
          </template>
          <input ref="input" type="text" placeholder="Search symbol (ex: EXCHANGE:SYMBOL)" v-model="query" />
        </div>
        <div class="search__results hide-scrollbar">
          <template v-if="results.length">
            <table class="table" v-if="searchTypes.normalize">
              <thead>
                <tr>
                  <th>pair</th>
                  <th>markets</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(group, index) in results"
                  :key="group.localPair"
                  @click="selectMarkets(group.markets)"
                  :class="{ active: activeIndex === index }"
                  class="-action"
                >
                  <td v-text="group.localPair"></td>
                  <td><small v-text="group.markets.join(', ')"></small></td>
                </tr>
                <tr class="-action" @click="addAll">
                  <td colspan="100%">👆 add all of the above</td>
                </tr>
              </tbody>
            </table>
            <table v-else class="table">
              <thead>
                <tr>
                  <th></th>
                  <th>exchange</th>
                  <th>pair</th>
                  <th>type</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(market, index) of results"
                  :key="market.id"
                  @click="selectMarket(market.id)"
                  :class="{ active: activeIndex === index }"
                  class="-action"
                >
                  <td class="icon search__exchange text-center" :class="'icon-' + market.exchange"></td>
                  <td v-text="market.exchange"></td>
                  <td v-text="market.pair"></td>
                  <td v-text="market.type"></td>
                  <td class="text-center">
                    <i v-if="historicalMarkets.indexOf(market.id) !== -1" class="icon-candlestick icon-lower"></i>
                  </td>
                </tr>
                <tr v-if="results.length > 0" class="-action" @click="addAll">
                  <td colspan="100%">👆 add all of the above</td>
                </tr>
              </tbody>
            </table>
          </template>

          <div class="text-danger search__no-result" v-if="!results.length">
            <p class="mt0 mb0 px16 pb0">
              No results found
              <template v-if="hasFilters"> (<button class="btn -text color-100 pl0 pr0" @click="clearFilters">clear filters</button>)</template>
            </p>
            <div v-if="searchTypes.historical" class="color-100 px16 pt0 notice -success" style="font-size: 14px;">
              <div class="notice__wrapper">
                <div class="notice__title">
                  <div class=" mt8 ml8">In need for more historical data ?</div>
                  <div class="mt0">
                    <a class="btn -text" href="https://github.com/Tucsky/aggr-server" target="_blank">🤓 Run your own aggr</a>
                    <dono-dropdown label="🚀 support the project" class="-left " />
                    <a class="btn -text" href="https://github.com/Tucsky/aggr/discussions" target="_blank">🍀 Suggest it on github</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <footer>
      <a
        href="javascript:void(0);"
        class="btn -text mrauto search-filters__toggle"
        @click="mobileShowFilters = !mobileShowFilters"
        v-text="mobileShowFilters ? 'Hide filters' : 'Show filters'"
      ></a>
      <a href="javascript:void(0);" class="btn -text" @click="hide">Cancel</a>
      <button class="btn -large ml8 -green" @click="submit" v-text="submitLabel"></button>
    </footer>
  </Dialog>
</template>

<script>
import Dialog from '@/components/framework/Dialog.vue'
import DonoDropdown from '@/components/settings/DonoDropdown.vue'
import DialogMixin from '@/mixins/dialogMixin'
import { copyTextToClipboard, getBucketId } from '@/utils/helpers'
import dialogService from '@/services/dialogService'
import aggregatorService from '@/services/aggregatorService'
import { parseMarket } from '@/worker/helpers/utils'
import workspacesService from '@/services/workspacesService'

export default {
  mixins: [DialogMixin],
  components: {
    Dialog,
    DonoDropdown
  },
  props: {
    query: {
      default: ''
    },
    paneId: {
      required: false
    }
  },
  data: () => ({
    markets: [],
    selection: [],
    originalSelection: [],
    activeIndex: null,
    mobileShowFilters: false,
    showExchanges: true,
    showExtraFilters: false,
    showTypeFilters: true,
    onlyConnected: false,
    canRefreshProducts: true
  }),
  computed: {
    transitionGroupName() {
      if (!this.$store.state.settings.disableAnimations) {
        return 'slide-notice'
      } else {
        return null
      }
    },
    otherPanes() {
      return Object.keys(this.$store.state.panes.panes)
        .filter(a => a !== this.paneId)
        .map(a => this.$store.state.panes.panes[a])
    },
    paneName() {
      if (this.paneId) {
        return this.$store.state.panes.panes[this.paneId].name || this.paneId
      } else {
        return null
      }
    },
    activeMarkets() {
      return this.$store.state.app.activeMarkets.map(m => m.exchange + ':' + m.pair)
    },
    paneMarkets() {
      if (!this.paneId) {
        return []
      }

      return this.$store.state.panes.panes[this.paneId].markets
    },
    toConnect() {
      if (this.paneId) {
        return this.selection.filter(a => this.paneMarkets.indexOf(a) === -1).length
      } else {
        return this.selection.filter(a => this.activeMarkets.indexOf(a) === -1).length
      }
    },
    toDisconnect() {
      return this.originalSelection.filter(a => this.selection.indexOf(a) === -1).length
    },
    submitLabel() {
      const toConnect = +this.toConnect
      const toDisconnect = +this.toDisconnect
      let label = ''

      if (toConnect) {
        label += `add ${toConnect}`
      }

      if (toDisconnect) {
        label += `${toConnect ? ' and ' : ''}remove ${toDisconnect}`
      }

      return label ? label + ' markets' : 'OK'
    },
    searchTypes() {
      return Object.assign(
        {
          historical: false,
          spots: true,
          perpetuals: true,
          futures: false,
          normalize: true,
          mergeUsdt: true
        },
        this.$store.state.settings.searchTypes
      )
    },
    searchExchanges() {
      return this.$store.state.settings.searchExchanges
    },
    exchanges() {
      return this.$store.getters['exchanges/getExchanges']
    },
    allExchangesEnabled() {
      return !this.exchanges.find(a => this.searchExchanges[a] === false)
    },
    hasFilters() {
      const hasHistorical = this.searchTypes.historical
      const hasSpot = this.searchTypes.spots
      const hasPerpetuals = this.searchTypes.perpetuals
      const hasFutures = this.searchTypes.futures
      const isNormalized = this.searchTypes.normalize
      return isNormalized || hasHistorical || hasSpot || hasPerpetuals || hasFutures || this.onlyConnected
    },
    historicalMarkets() {
      return this.$store.state.app.historicalMarkets
    },
    indexedProducts() {
      return this.$store.state.app.indexedProducts
    },
    flattenedProducts() {
      return Array.prototype.concat(...Object.values(this.indexedProducts))
    },
    queryFilter: function() {
      const multiQuery = this.query.replace(/[ ,]/g, '|')

      if (this.searchTypes.normalize) {
        return new RegExp('^' + multiQuery, 'i')
      } else {
        return new RegExp(multiQuery, 'i')
      }
    },
    filteredProducts() {
      const exchanges = this.searchExchanges
      const hasHistorical = this.searchTypes.historical
      const hasSpot = this.searchTypes.spots
      const hasPerpetuals = this.searchTypes.perpetuals
      const hasFutures = this.searchTypes.futures
      const isConnected = this.onlyConnected
      const activeMarkets = this.activeMarkets
      const hasTypeFilters = hasSpot || hasPerpetuals || hasFutures

      return this.flattenedProducts.filter(a => {
        if (hasHistorical && this.historicalMarkets.indexOf(a.id) === -1) {
          return false
        }

        if (isConnected && activeMarkets.indexOf(a.id) === -1) {
          return false
        }

        if (exchanges[a.exchange] === false) {
          return false
        }

        if (hasTypeFilters) {
          if ((hasFutures && a.type === 'future') || (hasPerpetuals && a.type === 'perp') || (hasSpot && a.type === 'spot')) {
            return true
          }

          return false
        }

        return true
      })
    },
    results: function() {
      if (this.searchTypes.normalize) {
        const marketsByPair = this.filteredProducts
          .filter(product => this.selection.indexOf(product.id) === -1 && this.queryFilter.test(product.local))
          .reduce((groups, product) => {
            let local = product.local

            if (this.searchTypes.mergeUsdt) {
              local = local.replace('USDT', 'USD').replace('USDC', 'USD')
            }

            if (!groups[local]) {
              groups[local] = []
            }

            groups[local].push(product.id)

            return groups
          }, {})

        return Object.keys(marketsByPair)
          .slice(0, 50)
          .map(localPair => ({
            localPair,
            markets: marketsByPair[localPair]
          }))
      } else {
        return this.filteredProducts.filter(product => this.selection.indexOf(product.id) === -1 && this.queryFilter.test(product.id)).slice(0, 50)
      }
    },
    groupedSelection: function() {
      return this.selection.reduce((groups, market) => {
        const [exchange] = parseMarket(market)
        const indexedProduct = this.indexedProducts[exchange].find(product => product.id === market)

        let localPair = indexedProduct ? indexedProduct.local : market

        if (this.searchTypes.mergeUsdt) {
          localPair = localPair.replace('USDT', 'USD').replace('USDC', 'USD')
        }

        if (!groups[localPair]) {
          groups[localPair] = []
        }

        groups[localPair].push(market)

        return groups
      }, {})
    }
  },

  watch: {
    '$store.state.app.showSearch': function(value) {
      if (!value) {
        this.close(false)
      }
    },
    query: () => {
      console.log('query change')
    }
  },
  async created() {
    if (this.paneId) {
      this.selection = this.$store.state.panes.panes[this.paneId].markets.slice()
    } else {
      this.selection = this.activeMarkets.slice()
    }

    this.originalSelection = this.selection.slice()

    await this.ensureProducts()
  },
  mounted() {
    this.$nextTick(() => {
      this.$refs.input.focus()
    })

    document.addEventListener('paste', this.onPaste)
    document.addEventListener('keydown', this.onKeydown)
  },
  beforeDestroy() {
    document.removeEventListener('paste', this.onPaste)
    document.removeEventListener('keydown', this.onKeydown)
  },
  methods: {
    containMultipleMarketsConfigurations() {
      return (
        Object.keys(this.$store.state.panes.panes)
          .map(id => getBucketId(this.$store.state.panes.panes[id].markets))
          .filter((v, i, a) => a.indexOf(v) === i).length > 1
      )
    },
    selectPaneMarkets(paneId) {
      const pane = this.otherPanes[paneId]

      for (let i = 0; i < pane.markets.length; i++) {
        if (this.selection.indexOf(pane.markets[i]) !== -1) {
          continue
        }

        this.selection.push(pane.markets[i])
      }
    },
    selectMarket(market) {
      this.selection.push(market)
    },
    selectMarkets(markets) {
      this.selection = this.selection.concat(markets)
    },
    deselectMarket(market) {
      this.selection.splice(this.selection.indexOf(market), 1)
    },
    deselectMarkets(markets) {
      for (const market of markets) {
        this.deselectMarket(market)
      }
    },
    async submit() {
      if (!this.paneId) {
        if (
          this.containMultipleMarketsConfigurations() &&
          !(await dialogService.confirm('Are you sure ? Some of the panes are watching specific markets.'))
        ) {
          return
        }

        if (!Object.keys(this.$store.state.panes.panes).length) {
          await this.$store.dispatch('panes/addPane', { type: 'trades' })
        }

        this.$store.dispatch('panes/setMarketsForAll', this.selection)
      } else {
        this.$store.dispatch('panes/setMarketsForPane', {
          id: this.paneId,
          markets: this.selection
        })
      }

      this.hide()
    },
    hide() {
      this.$store.dispatch('app/hideSearch')
    },
    toggleType(key) {
      this.$store.commit('settings/TOGGLE_SEARCH_TYPE', key)
    },
    toggleExchange(key) {
      this.$store.commit('settings/TOGGLE_SEARCH_EXCHANGE', key)
    },

    beforeEnter(element) {
      element.style.height = '0px'
      element.style.width = '0px'
    },

    enter(element) {
      const wrapper = element.children[0]

      const height = wrapper.offsetHeight + 'px'
      const width = wrapper.offsetWidth + 'px'

      element.dataset.height = height
      element.dataset.width = width

      setTimeout(() => {
        element.style.height = height
        element.style.width = width
      }, 100)
    },

    afterEnter(element) {
      element.style.height = ''
      element.style.width = ''
    },

    beforeLeave(element) {
      if (typeof element.dataset.height === 'undefined') {
        const wrapper = element.children[0]

        element.dataset.height = wrapper.offsetHeight + 'px'
      }
      element.style.height = element.dataset.height

      if (typeof element.dataset.width === 'undefined') {
        const wrapper = element.children[0]

        element.dataset.width = wrapper.offsetWidth + 'px'
      }

      element.style.width = element.dataset.width
    },

    leave(element) {
      setTimeout(() => {
        element.style.height = '0px'
        element.style.width = '0px'
      })
    },

    async ensureProducts() {
      for (const exchangeId of this.$store.getters['exchanges/getExchanges']) {
        if (!this.$store.state.exchanges[exchangeId].fetched) {
          await aggregatorService.dispatch({
            op: 'fetchExchangeProducts',
            data: {
              exchangeId
            }
          })
        }
      }
    },

    clearSelection() {
      this.selection.splice(0, this.selection.length)

      this.query = ''

      this.$refs.input.focus()
    },

    copySelection() {
      copyTextToClipboard(this.selection.join(','))

      this.$store.dispatch('app/showNotice', {
        id: 'products-clipboard',
        title: `Copied ${this.selection.length} product(s) to clipboard`
      })
    },

    clearFilters() {
      this.$store.commit('settings/CLEAR_SEARCH_FILTERS')
    },

    onPaste(event) {
      if (document.activeElement) {
        if (document.activeElement.tagName === 'INPUT') {
          return
        }
      }

      const raw = event.clipboardData.getData('text/plain')
      const markets = raw.split(',').filter(a => /^.{3,}:.{4,32}$/.test(a))

      if (!markets.length) {
        return
      }

      this.selection = markets
    },

    onKeydown(event) {
      switch (event.key) {
        case 'Enter':
          event.preventDefault()
          if (this.results[this.activeIndex]) {
            if (this.searchTypes.normalize) {
              this.selectMarkets(this.results[this.activeIndex].markets)
            } else {
              this.selectMarket(this.results[this.activeIndex].id)
            }
          }
          break

        case 'ArrowDown':
        case 'ArrowUp':
          if (this.results.length) {
            if (event.key === 'ArrowUp') {
              this.activeIndex = Math.max(0, this.activeIndex - 1)
            } else {
              if (this.activeIndex === null) {
                this.activeIndex = 0
              } else {
                this.activeIndex = Math.min(this.results.length - 1, this.activeIndex + 1)
              }
            }
          }
          break

        case 'Backspace':
        case 'Delete':
          this.deleteLast()
          break

        case 'c':
          if (event.metaKey && !window.getSelection().toString().length) {
            this.copySelection()
          }
          break
      }
    },

    deleteLast() {
      if (!this.query.length && this.selection.length) {
        if (this.searchTypes.normalize) {
          const lastPair = Object.keys(this.groupedSelection).pop()
          this.deselectMarkets(this.groupedSelection[lastPair])
        } else {
          this.selection.splice(this.selection.length - 1, 1)
        }
      }
    },

    addAll() {
      const normalized = this.searchTypes.normalize
      const markets = []

      for (let i = 0; i < this.results.length; i++) {
        if (normalized) {
          for (const market of this.results[i].markets) {
            markets.push(market)
          }
        } else {
          markets.push(this.results[i].id)
        }
      }

      this.selectMarkets(markets)
    },

    toggleAll() {
      const deselectAll = Boolean(this.allExchangesEnabled)

      this.$set(
        this.$store.state.settings,
        'searchExchanges',
        this.exchanges.reduce((output, id) => {
          output[id] = deselectAll ? false : true
          return output
        }, {})
      )
    },

    async refreshExchangeProducts(exchangeId) {
      this.canRefreshProducts = false

      await workspacesService.deleteProducts(exchangeId)

      setTimeout(() => {
        this.canRefreshProducts = true
      }, 3000)

      await aggregatorService.dispatchAsync({
        op: 'fetchExchangeProducts',
        data: {
          exchangeId,
          forceFetch: true
        }
      })

      await this.$store.dispatch('exchanges/disconnect', this.id)
      await this.$store.dispatch('exchanges/connect', this.id)

      this.$store.dispatch('app/showNotice', {
        type: 'success',
        title: `${exchangeId}: ${this.indexedProducts[exchangeId].length} products refreshed`
      })
    }
  }
}
</script>
<style lang="scss" scoped>
.search {
  display: flex;
  padding: 1rem;

  &__side {
    margin-right: 1rem;

    @media screen and (max-width: 550px) {
      display: none;

      &.-show {
        display: block;
      }
    }
  }

  &__wrapper {
    flex-grow: 1;
    width: 650px;
    max-width: 650px;
  }

  &__results {
    table {
      border: 0;
      border-collapse: collapse;
      width: 100%;
    }

    tr.active {
      background-color: rgba(black, 0.2) !important;
    }

    td:first-child,
    th:first-child {
      padding-left: 1rem;
    }

    td:last-child,
    th:last-child {
      padding-right: 1rem;
    }

    td {
      padding: 0.35em 0.5em 0.6em;
    }
  }

  &__selection {
    display: flex;
    flex-wrap: wrap;
    padding: 6px 16px 2px 6px;
    position: relative;

    > button,
    > input {
      margin-bottom: 4px;
      margin-right: 4px;
      height: 32px;
    }

    input {
      border: 0;
      background: 0;
      color: inherit;
      font-family: inherit;
      padding: 0 4px;
      flex-grow: 1;
    }
  }

  &__clear {
    position: absolute;
    top: 0;
    right: 0;
    margin: 6px !important;
  }
}

.search-filters {
  display: flex;
  flex-direction: column-reverse;
  position: relative;

  &__toggle {
    @media screen and (min-width: 550px) {
      display: none;
    }
  }

  &__controls {
    position: absolute;
    right: 0;
    top: 0;
    font-size: 0.875em;
    z-index: 1;
  }

  &__title {
    cursor: pointer;
    opacity: 0.5;
    user-select: none;

    .icon-up {
      transition: transform 0.2s $ease-out-expo;
      vertical-align: middle;
    }

    &:first-child {
      .icon-up {
        display: inline-block;
        transform: rotateZ(180deg);
      }
    }
  }

  .checkbox-control {
    a {
      visibility: hidden;
    }

    &:hover a {
      visibility: visible;
    }
  }
}
</style>
