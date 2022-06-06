<template>
  <Dialog @clickOutside="hide" class="-sticky-footer -mobile-fs -internal-scroll -auto" :class="[loading && '-loading']">
    <template v-slot:header>
      <div v-if="paneId">
        <div class="title">ADD/REMOVE SOURCES</div>
        <div class="subtitle" style="opacity: 1">
          to
          <span class="text-success" v-text="paneName"></span>
          pane
          <button type="button" class="btn -small ml4 -text" v-tippy title="Target all instead" @click="detargetPane">
            <i class="icon-cross"></i>
          </button>
        </div>
      </div>
      <div v-else>
        <div class="title">REPLACE SOURCES</div>
        <div class="subtitle">across all panes</div>
      </div>
      <div class="column -center"></div>
    </template>
    <div class="search">
      <div class="search__side hide-scrollbar" :class="{ '-show': mobileShowFilters }">
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
              <span>Merge stablecoins</span>
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
              <span>Already connected</span>
            </label>
          </div>
          <div class="search-filters__title text-muted mb8" @click="showExtraFilters = !showExtraFilters">
            Extra
            <i class="icon-up-thin"></i>
          </div>
        </div>

        <div class="search-filters mb16">
          <div class="search-filters__content" v-if="showQuoteFilters">
            <label class="checkbox-control -small mb4" v-for="quote of quoteCurrencies" :key="quote">
              <input
                type="checkbox"
                class="form-control"
                :checked="searchQuotes[quote] === true || searchQuotes[quote] === undefined"
                @change="
                  $store.commit('settings/TOGGLE_SEARCH_QUOTE', {
                    key: quote,
                    value: $event.target.checked
                  })
                "
              />
              <div></div>
              <span>{{ quote }}</span>
            </label>
          </div>
          <div class="search-filters__title text-muted mb8" @click="showQuoteFilters = !showQuoteFilters">
            Quote currency
            <i class="icon-up-thin"></i>
          </div>
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
          <div class="search-filters__title text-muted mb8" @click="showTypeFilters = !showTypeFilters">
            Type
            <i class="icon-up-thin"></i>
          </div>
        </div>

        <div class="search-filters">
          <div class="search-filters__content" v-if="showExchanges">
            <label class="search-filters__controls checkbox-control -small mb4 flex-right">
              <input type="checkbox" class="form-control" :checked="allExchangesEnabled" @change="toggleAll" />
              <div></div>
            </label>
            <template v-for="id of exchanges">
              <label class="checkbox-control -small mb4 -custom" :key="id" v-if="!$store.state.exchanges[id].disabled">
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
                    <i class="icon-refresh ml8"></i>
                  </a>
                </span>
              </label>
            </template>
          </div>
          <div class="search-filters__title text-muted mb8" @click="showExchanges = !showExchanges">
            Exchanges
            <a
              v-if="canRefreshProducts"
              href="javascript:void(0);"
              class="search-filters__refresh-all -text"
              @click="refreshExchangeProducts()"
              title="Refresh products"
            >
              <i class="icon-refresh ml8"></i>
            </a>
            <i class="icon-up-thin"></i>
          </div>
        </div>
      </div>
      <div class="search__wrapper hide-scrollbar" ref="wrapper">
        <div class="search-selection search__tags form-control" :class="groupsCount < 10 && '-sticky'">
          <div v-if="selection.length" class="search-selection__controls">
            <button class="btn -text" @click="$store.commit('settings/TOGGLE_SEARCH_TYPE', 'normalize')" v-tippy title="Toggle grouping">
              <i class="icon-merge"></i>
            </button>
            <button class="btn -text" @click="clearSelection" title="Clear" v-tippy>
              <i class="icon-eraser"></i>
            </button>
          </div>
          <template v-if="searchTypes.normalize">
            <button
              v-for="(markets, localPair) of groupedSelection"
              :key="localPair"
              class="btn -accent -accent-200 -pill"
              :title="'Click to remove ' + markets.join(', ')"
              @click.stop.prevent="deselectWhileRetainingScroll(markets)"
            >
              <span v-if="markets.length > 1" class="badge -compact ml8" v-text="markets.length"></span>
              <span v-text="localPair"></span>
            </button>
          </template>
          <template v-else>
            <button
              v-for="market of selection"
              :key="market"
              class="btn -accent -accent-200"
              :class="{ '-green': activeMarkets.indexOf(market) !== -1 }"
              title="Click to remove"
              @click.stop.prevent="deselectWhileRetainingScroll(market)"
              v-text="market"
            ></button>
          </template>
          <input
            ref="input"
            type="text"
            placeholder="Search"
            :value="query"
            @focus="toggleHistory(true)"
            @blur="toggleHistory(false)"
            @input=";(page = 0), (query = $event.target.value)"
          />
        </div>
        <div class="search__results">
          <transition-height name="search-history" single>
            <div v-if="showHistory && previousSearchSelections.length" class="search-history">
              <div class="search__tags">
                <button
                  v-for="savedSelection of previousSearchSelections"
                  :key="savedSelection.label"
                  class="btn -accent -accent-200 -pill -small"
                  :title="savedSelection.markets.join(', ')"
                  @click="selectMarkets(savedSelection.markets, $event.shiftKey)"
                >
                  <span v-if="savedSelection.count > 1" class="badge -invert ml8" v-text="savedSelection.markets.length"></span>
                  <span>{{ savedSelection.label }}</span>
                </button>
              </div>
              <button class="btn -outline search-history__clear" v-tippy title="Clear recent searches<br><i>💡 SHIFT+CLIC to delete 1 item</i>">
                <i class="icon-trash -small" @click="$store.commit('settings/CLEAR_SEARCH_HISTORY')"></i>
              </button>
            </div>
          </transition-height>
          <template v-if="results.length">
            <div v-if="page > 0" class="d-flex mt8">
              <button class="btn -text mlauto switch-page" @click="showLess">... go page {{ page }}</button>
            </div>

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
                  <td>
                    <small v-text="group.markets.join(', ')"></small>
                  </td>
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
              </tbody>
            </table>

            <div class="mt8 d-flex">
              <button class="btn -text" @click="addAll"><i class="icon-plus mr8"></i> add all of the above</button>
              <button class="btn -text mlauto switch-page" @click="showMore" v-if="results.length === resultsPerPage">
                go page {{ page + 2 }} ...
              </button>
            </div>
          </template>
          <p class="mb0 pb0" v-else-if="query.length">
            <span>No results found for "{{ query }}".</span>
            <br />

            <button v-if="hasFilters || !allExchangesEnabled" class="btn -outline -cases" @click="clearFilters">
              <i class="icon-refresh"></i> Retry without filters
            </button>
          </p>
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
      <button class="btn -large ml8 -green" @click="submit" :class="loading && '-loading'">
        {{ submitLabel }}
        <div v-if="loading" class="lds-spinner -center">
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
      </button>
    </footer>
  </Dialog>
</template>

<script>
import Dialog from '@/components/framework/Dialog.vue'
import DialogMixin from '@/mixins/dialogMixin'
import { copyTextToClipboard, getBucketId } from '@/utils/helpers'
import dialogService from '@/services/dialogService'
import workspacesService from '@/services/workspacesService'
import { formatStablecoin, indexedProducts, indexProducts, requestProducts } from '@/services/productsService'
import TransitionHeight from '@/components/framework/TransitionHeight.vue'

const RESULTS_PER_PAGE = 25

export default {
  mixins: [DialogMixin],
  components: {
    Dialog,
    TransitionHeight
  },
  props: {
    paneId: {
      required: false
    }
  },
  data: () => ({
    page: 0,
    query: '',
    showHistory: true,
    markets: [],
    loading: false,
    selection: [],
    originalSelection: [],
    activeIndex: null,
    mobileShowFilters: false,
    showExchanges: true,
    showExtraFilters: true,
    showQuoteFilters: false,
    showTypeFilters: true,
    onlyConnected: false,
    canRefreshProducts: true,
    flattenedProducts: [],
    quoteCurrencies: ['USD', 'USDT', 'UST', 'USDC', 'BUSD', 'ETH', 'BTC', 'BNB', 'EUR', 'AUD', 'GBP', 'OTHERS']
  }),
  computed: {
    previousSearchSelections() {
      return this.$store.state.settings.previousSearchSelections
    },
    resultsPerPage() {
      return RESULTS_PER_PAGE
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
      return Object.keys(this.$store.state.panes.marketsListeners)
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
        label += `connect${this.loading ? 'ing' : ''} ${toConnect}`
      }

      if (toDisconnect) {
        label += `${toConnect ? ' and ' : ''}disconnect${this.loading ? 'ing' : ''} ${toDisconnect}`
      }

      return label ? label : 'REFRESH'
    },
    searchTypes() {
      return this.$store.state.settings.searchTypes
    },
    searchQuotes() {
      const searchQuotesPreferences = this.$store.state.settings.searchQuotes

      return this.quoteCurrencies.reduce((acc, quote) => {
        acc[quote] = typeof searchQuotesPreferences[quote] === 'undefined' ? false : searchQuotesPreferences[quote]

        return acc
      }, {})
    },
    allQuotes() {
      return !Object.values(this.searchQuotes).find(a => !!a)
    },
    exchanges() {
      return this.$store.getters['exchanges/getExchanges']
    },
    searchExchanges() {
      const searchExchanges = this.$store.state.settings.searchExchanges

      return Object.keys(this.$store.state.exchanges).reduce((output, id) => {
        if (this.$store.state.exchanges[id].disabled) {
          return output
        }

        output[id] = typeof searchExchanges[id] === 'undefined' ? true : searchExchanges[id]

        return output
      }, {})
    },
    allExchangesEnabled() {
      return typeof Object.values(this.searchExchanges).find(a => a === false) === 'undefined'
    },
    hasFilters() {
      const hasHistorical = this.searchTypes.historical
      const hasSpot = this.searchTypes.spots
      const hasPerpetuals = this.searchTypes.perpetuals
      const hasFutures = this.searchTypes.futures
      const isMergeStables = this.searchTypes.mergeUsdt
      return isMergeStables || hasHistorical || hasSpot || hasPerpetuals || hasFutures || this.onlyConnected
    },
    historicalMarkets() {
      return this.$store.state.app.historicalMarkets
    },
    queryFilter: function() {
      const multiQuery = this.query.replace(/[ ,]/g, '|').replace(/(^|\w|\s)\*(\w|\s|$)/g, '$1.*$2')

      if (this.searchTypes.normalize) {
        return new RegExp('^' + multiQuery, 'i')
      } else {
        return new RegExp(multiQuery, 'i')
      }
    },
    filteredProducts() {
      const hasHistorical = this.searchTypes.historical
      const hasSpot = this.searchTypes.spots
      const hasPerpetuals = this.searchTypes.perpetuals
      const hasFutures = this.searchTypes.futures

      const exchanges = this.searchExchanges
      const isConnected = this.onlyConnected
      const activeMarkets = this.activeMarkets
      const hasTypeFilters = hasSpot || hasPerpetuals || hasFutures

      const searchQuotes = this.searchQuotes
      const allQuotes = this.allQuotes

      // eslint-disable-next-line vue/no-side-effects-in-computed-properties
      this.page = 0

      return this.flattenedProducts.filter(a => {
        if (hasHistorical && this.historicalMarkets.indexOf(a.id) === -1) {
          return false
        }

        if (
          !allQuotes &&
          ((typeof searchQuotes[a.quote] === 'boolean' && searchQuotes[a.quote] === false) ||
            (typeof searchQuotes[a.quote] !== 'boolean' && !searchQuotes.OTHERS))
        ) {
          return false
        }

        if (isConnected && activeMarkets.indexOf(a.id) === -1) {
          return false
        }

        if (!exchanges[a.exchange]) {
          return false
        }

        if (hasTypeFilters && ((!hasFutures && a.type === 'future') || (!hasPerpetuals && a.type === 'perp') || (!hasSpot && a.type === 'spot'))) {
          return false
        }

        return true
      })
    },
    results: function() {
      const offset = this.page * RESULTS_PER_PAGE

      if (this.searchTypes.normalize) {
        const marketsByPair = this.filteredProducts
          .filter(product => this.selection.indexOf(product.id) === -1 && this.queryFilter.test(product.local))
          .reduce((groups, product) => {
            let local = product.local

            if (this.searchTypes.mergeUsdt) {
              local = formatStablecoin(local)
            }

            if (!groups[local]) {
              groups[local] = []
            }

            groups[local].push(product.id)

            return groups
          }, {})

        return Object.keys(marketsByPair)
          .slice(offset, offset + RESULTS_PER_PAGE)
          .map(localPair => ({
            localPair,
            markets: marketsByPair[localPair]
          }))
      } else {
        return this.filteredProducts
          .filter(product => this.selection.indexOf(product.id) === -1 && this.queryFilter.test(product.id))
          .slice(offset, offset + RESULTS_PER_PAGE)
      }
    },
    groupedSelection: function() {
      return this.selection.reduce((groups, market) => {
        const [exchange] = market.split(':')

        if (!indexedProducts[exchange]) {
          return groups
        }

        const indexedProduct = indexedProducts[exchange].find(product => product.id === market)

        let localPair = indexedProduct ? indexedProduct.local : market

        if (this.searchTypes.mergeUsdt) {
          localPair = formatStablecoin(localPair)
        }

        if (!groups[localPair]) {
          groups[localPair] = []
        }

        groups[localPair].push(market)

        return groups
      }, {})
    },
    groupsCount() {
      return Object.keys(this.groupedSelection).length
    }
  },

  watch: {
    '$store.state.app.showSearch': function(value) {
      if (!value) {
        this.close(false)
      }
    }
  },
  async created() {
    await this.ensureProducts()

    this.initSelection()

    this.cacheProducts()
  },
  mounted() {
    this.$nextTick(() => {
      if (!this.$refs.input) {
        return
      }

      this.$refs.input.focus()
    })

    document.addEventListener('paste', this.onPaste)
    document.addEventListener('keydown', this.onKeydown)
  },
  beforeDestroy() {
    document.removeEventListener('paste', this.onPaste)
    document.removeEventListener('keydown', this.onKeydown)

    if (this._hideHistoryTimeout) {
      clearTimeout(this._hideHistoryTimeout)
    }
  },
  methods: {
    detargetPane() {
      this.$store.commit('app/SET_FOCUSED_PANE', null)
      this.paneId = null
      this.initSelection()
    },
    initSelection() {
      if (this.paneId) {
        this.selection = this.$store.state.panes.panes[this.paneId].markets.slice()
      } else {
        this.selection = this.activeMarkets.slice()
      }

      this.originalSelection = this.selection.slice()
    },
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
    selectMarkets(markets, removeFromHistory) {
      if (removeFromHistory) {
        this.$store.commit('settings/REMOVE_SEARCH_HISTORY', markets)
        clearTimeout(this._hideHistoryTimeout)
        return
      }

      const marketsToAdd = markets.filter(market => this.selection.indexOf(market) === -1)

      if (!marketsToAdd.length) {
        this.$store.dispatch('app/showNotice', {
          id: 'select-market-already-added',
          title: `You already selected ${markets.length > 1 ? 'these markets' : markets[0]} !`,
          type: 'error'
        })
        return
      }

      this.selection = this.selection.concat(marketsToAdd)
    },
    async deselectWhileRetainingScroll(markets) {
      const scrollTop = this.$refs.wrapper.scrollTop

      if (Array.isArray(markets)) {
        this.deselectMarkets(markets)
      } else {
        this.deselectMarket(markets)
      }

      await this.$nextTick()

      this.$refs.input.focus()

      this.$refs.wrapper.scrollTop = scrollTop
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
      if (this.selection.length) {
        this.$store.dispatch('settings/saveSearchSelection', this.selection)
      }

      if (!this.paneId) {
        if (
          this.containMultipleMarketsConfigurations() &&
          !(await dialogService.confirm('Are you sure ? Some of the panes are watching specific markets.'))
        ) {
          return
        }

        this.loading = true

        if (!Object.keys(this.$store.state.panes.panes).length) {
          await this.$store.dispatch('panes/addPane', { type: 'trades' })
        }

        await this.$store.dispatch('panes/setMarketsForAll', this.selection)
      } else {
        this.loading = true

        await this.$store.dispatch('panes/setMarketsForPane', {
          id: this.paneId,
          markets: this.selection
        })
      }

      this.loading = false

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

    async ensureProducts() {
      for (const exchangeId of this.$store.getters['exchanges/getExchanges']) {
        if (this.$store.state.exchanges[exchangeId].disabled === true) {
          continue
        }

        if (!this.$store.state.exchanges[exchangeId].fetched) {
          await requestProducts(exchangeId)
        }

        if (this.$store.state.exchanges[exchangeId].fetched && !indexedProducts[exchangeId]) {
          await indexProducts(exchangeId)
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
      this.toggleAll(true)
      this.onlyConnected = false
    },

    onPaste(event) {
      debugger
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
          if ((event.ctrlKey || event.metaKey) && !window.getSelection().toString().length) {
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

    toggleAll(selectAll) {
      if (typeof selectAll !== 'boolean') {
        selectAll = Boolean(!this.allExchangesEnabled)
      }

      this.$set(
        this.$store.state.settings,
        'searchExchanges',
        this.exchanges.reduce((output, id) => {
          output[id] = selectAll ? true : false
          return output
        }, {})
      )
    },

    async refreshExchangeProducts(exchangeId) {
      if (!exchangeId) {
        for (const exchange of this.exchanges) {
          await this.refreshExchangeProducts(exchange)
        }

        return
      }

      this.canRefreshProducts = false

      await workspacesService.deleteProducts(exchangeId)

      setTimeout(() => {
        this.canRefreshProducts = true
      }, 3000)

      await requestProducts(exchangeId, true)
      await indexProducts(exchangeId)

      await this.$store.dispatch('exchanges/disconnect', exchangeId)
      await this.$store.dispatch('exchanges/connect', exchangeId)

      this.cacheProducts()
    },

    showMore() {
      this.page++
    },

    showLess() {
      this.page = Math.max(this.page - 1, 0)
    },

    cacheProducts() {
      this.flattenedProducts = Array.prototype.concat(...Object.values(indexedProducts))
    },

    toggleHistory(show) {
      if (this._hideHistoryTimeout) {
        clearTimeout(this._hideHistoryTimeout)
        this._hideHistoryTimeout = null
      }

      if (show) {
        this.showHistory = true
        return
      }

      this._hideHistoryTimeout = setTimeout(() => {
        this._hideHistoryTimeout = null
        this.showHistory = false
      }, 1000)
    }
  }
}
</script>
<style lang="scss" scoped>
.search {
  display: flex;
  align-items: stretch;
  height: 100%;
  overflow: hidden;

  &__side {
    width: 11rem;
    min-width: 11rem;
    padding: 1rem 0 1rem 1rem;
    overflow: auto;

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
    padding: 1rem;
    overflow: auto;
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

  &__tags {
    display: flex;
    flex-wrap: wrap;
    padding: 6px 2rem 2px 6px;

    &-controls > button,
    > button,
    > input {
      margin-bottom: 4px;
      margin-right: 5px;
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

  &-selection {
    position: relative;
    min-width: 19rem;

    &.-sticky {
      @media screen and (min-width: 550px) {
        backdrop-filter: blur(1rem);
        background-color: var(--theme-background-o75);
        position: sticky;
        top: 0;
        z-index: 2;
      }
    }

    &__controls {
      position: absolute;
      top: 0;
      right: 0;
      margin: 6px !important;
    }
  }

  &-history {
    display: flex;
    justify-content: space-between;
    align-items: center;

    small {
      text-transform: uppercase;
    }

    &__clear {
      padding: 0;
      margin: 0.5rem;
    }

    .search__tags {
      padding-right: 0;
      margin-right: auto;

      button,
      button:hover {
        background: none;
        border: 1px dashed currentColor;
        height: 24px;
      }
    }
  }

  &-filters {
    display: flex;
    flex-direction: column-reverse;
    position: relative;

    &__toggle {
      @media screen and (min-width: 550px) {
        display: none;
      }
    }

    &__refresh-all > .icon-refresh {
      vertical-align: middle;
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
      user-select: none;
      display: flex;
      align-items: center;

      .icon-up-thin {
        transition: transform 0.2s $ease-out-expo;
        line-height: inherit;
        margin-left: auto;
      }

      &:first-child {
        .icon-up-thin {
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
}

.search .switch-page {
  height: 0;
  display: block;
  padding: 0;
  line-height: 0;
  border: 0;
  background: 0 !important;
}

.search-history-enter-active,
.search-history-leave-active {
  overflow: hidden;
}
.search-history-enter-active {
  transition: all 0.4s $ease-elastic, height 0.4s $ease-out-expo;
}
.search-history-leave-active {
  transition: all 1s $ease-out-expo;
}

.search-history-enter,
.search-history-leave-to {
  opacity: 0;
}

.search-history-enter,
.search-history-leave-to {
  transform: translateY(-1rem);
}
</style>
