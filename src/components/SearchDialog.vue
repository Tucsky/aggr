<template>
  <Dialog @clickOutside="hide" class="search-dialog" ref="dialog">
    <template v-slot:header>
      <div v-if="paneId">
        <div class="dialog__title">
          Connect <code class="-filled -green">{{ paneName }}</code>
          <button
            type="button"
            class="btn -small ml4 -text"
            v-tippy
            title="Target all instead"
            @click="detargetPane"
          >
            <i class="icon-cross"></i>
          </button>
        </div>
      </div>
      <div v-else>
        <div class="dialog__title">Manage connections</div>
      </div>
      <Loader v-if="isPreloading" small class="mtauto mbauto mr0" />
      <div class="column -center"></div>
    </template>
    <div
      class="search-dialog__side hide-scrollbar"
      :class="{ '-show': mobileShowFilters }"
    >
      <ToggableSection title="Extras" persistent id="search-extras">
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
          <input
            type="checkbox"
            class="form-control"
            :checked="searchTypes.recent"
            @change="$store.commit('settings/TOGGLE_SEARCH_TYPE', 'recent')"
          />
          <div></div>
          <span>Show recents</span>
        </label>
      </ToggableSection>

      <ToggableSection title="Exchanges" id="search-exchanges">
        <template v-for="id of exchanges">
          <label
            class="checkbox-control -small mb4 -custom hide-scrollbar"
            :key="id"
            v-if="!$store.state.exchanges[id].disabled"
          >
            <input
              type="checkbox"
              class="form-control"
              :checked="searchExchanges[id] !== false"
              @click="toggleExchange($event, id)"
            />
            <div :class="'icon-' + id"></div>
            <span>
              <span v-text="id"></span>
              <a
                v-if="canRefreshProducts"
                href="javascript:void(0);"
                class="-text"
                @click.stop="refreshExchangeProducts(id)"
                :title="`Refresh ${id}'s products`"
                v-tippy="{ boundary: 'window', placement: 'left' }"
              >
                <i class="icon-refresh ml8 mr8"></i>
              </a>
            </span>
          </label>
        </template>
        <template v-slot:control>
          <label class="checkbox-control -small flex-right">
            <input
              type="checkbox"
              class="form-control"
              :checked="allExchangesEnabled"
              @change="toggleAll"
            />
            <div></div>
          </label>
        </template>
      </ToggableSection>

      <ToggableSection title="Type" id="search-type">
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
      </ToggableSection>

      <ToggableSection
        title="Quote currency"
        id="search-quotes"
        :badge="quotesCount.length"
      >
        <label
          class="checkbox-control -small mb4"
          v-for="quote of quoteCurrencies"
          :key="quote"
        >
          <input
            type="checkbox"
            class="form-control"
            :checked="
              searchQuotes[quote] === true || searchQuotes[quote] === undefined
            "
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
      </ToggableSection>
    </div>
    <div ref="scroller" class="search-dialog__wrapper hide-scrollbar">
      <div
        class="search-dialog-selection search-dialog__tags form-control"
        :class="groupsCount < 10 && '-sticky'"
        @click="$refs.input.focus()"
        ref="selection"
      >
        <div v-if="selection.length" class="search-dialog-selection__controls">
          <button
            class="search-dialog__tags-item btn -text"
            @click="$store.commit('settings/TOGGLE_SEARCH_TYPE', 'normalize')"
            title="Toggle grouping"
            v-tippy="{ boundary: 'window', placement: 'bottom' }"
          >
            <i class="icon-merge"></i>
          </button>
          <button
            class="search-dialog__tags-item btn -text"
            @click="clearSelection"
            title="Clear"
            v-tippy="{ boundary: 'window', placement: 'bottom' }"
          >
            <i class="icon-eraser"></i>
          </button>
        </div>
        <template v-if="searchTypes.normalize">
          <button
            v-for="(markets, localPair) of groupedSelection"
            :key="localPair"
            class="search-dialog__tags-item btn -green -pill"
            :title="'Click to remove ' + markets.join(', ')"
            @click.stop.prevent="toggleMarkets(markets)"
          >
            <span
              v-if="markets.length > 1"
              class="badge -green ml8"
              v-text="markets.length"
            ></span>
            <span v-text="localPair"></span>
          </button>
        </template>
        <template v-else>
          <button
            v-for="market of selection"
            :key="market"
            class="search-dialog__tags-item btn"
            :class="{ '-green': activeMarkets.indexOf(market) !== -1 }"
            title="Click to remove"
            @click.stop.prevent="toggleMarkets(market)"
            v-text="market"
          ></button>
        </template>
        <input
          ref="input"
          class="search-dialog__tags-item"
          type="text"
          placeholder="Search"
          :value="query"
          @input=";(page = 0), (query = $event.target.value)"
        />
      </div>
      <div class="search-dialog__results">
        <template v-if="results.length">
          <div v-if="page > 0" class="d-flex mt8">
            <button class="mx8 btn -text mlauto switch-page" @click="showLess">
              ... go page {{ page }}
            </button>
          </div>
          <table
            class="table mt8 search-dialog-recents table--inset"
            v-if="
              searchTypes.recent &&
              previousSearchSelections.length &&
              !query.length
            "
          >
            <thead>
              <tr>
                <th colspan="100%">
                  Search history
                  <button
                    class="btn -small -text"
                    @click="toggleType('recent')"
                  >
                    <i class="icon-cross"></i>
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="savedSelection of previousSearchSelections"
                :key="savedSelection.label"
                class="-action"
                :title="savedSelection.markets.join(', ')"
                @click="toggleMarkets(savedSelection.markets, $event.shiftKey)"
              >
                <td class="search-dialog-recents__label">
                  {{ savedSelection.label }}
                  <span
                    v-if="savedSelection.count > 1"
                    class="badge -invert ml8"
                    v-text="savedSelection.markets.length"
                  ></span>
                </td>
                <td
                  class="search-dialog-recents__markets table-ellipsis text-nowrap"
                >
                  <small>{{ savedSelection.markets.join(', ') }}</small>
                </td>
              </tr>
            </tbody>
          </table>

          <table class="table mt8 table--inset" v-if="searchTypes.normalize">
            <tbody>
              <tr
                v-for="(group, index) in results"
                :key="group.localPair"
                @click="toggleMarkets(group.markets)"
                :class="{ active: activeIndex === index }"
                class="-action"
              >
                <td v-text="group.localPair"></td>
                <td class="-lower">
                  <span class="search-dialog__group-count">
                    <div class="badge mr8">
                      {{ group.markets.length }}
                    </div>
                  </span>
                  <i
                    v-for="(pairs, exchange) of group.exchanges"
                    :key="exchange"
                    class="pr4 search-dialog__exchange-logo"
                    :class="'icon-' + exchange"
                    :title="pairs.join(', ')"
                  ></i>
                </td>
              </tr>
            </tbody>
          </table>
          <table v-else class="table table--inset mt8">
            <tbody>
              <tr
                v-for="(market, index) of results"
                :key="market.id"
                @click="toggleMarkets([market.id])"
                :class="{ active: activeIndex === index }"
                class="-action"
              >
                <td
                  class="icon search-dialog__exchange text-center text-color-base"
                  :class="'icon-' + market.exchange"
                ></td>
                <td v-text="market.exchange"></td>
                <td v-text="market.pair"></td>
                <td v-text="market.type"></td>
                <td class="text-center">
                  <i
                    v-if="historicalMarkets.indexOf(market.id) !== -1"
                    class="icon-candlestick"
                    title="historical data available for this market"
                  ></i>
                </td>
              </tr>
            </tbody>
          </table>

          <div class="mt8 d-flex">
            <button class="mx8 btn -text" @click="addAll">
              <i class="icon-plus mr8"></i> add all of the above
            </button>
            <button
              class="mx8 btn -text mlauto switch-page"
              @click="showMore"
              v-if="results.length === resultsPerPage"
            >
              go page {{ page + 2 }} ...
            </button>
          </div>
        </template>
        <p class="mb0 pb0 ml16" v-else-if="query.length">
          <span class="text-muted">No results found for "{{ query }}".</span>
          <br />

          <button
            v-if="hasFilters || !allExchangesEnabled"
            class="btn -cases -text"
            @click="clearFilters"
          >
            <i class="icon-eraser mr8"></i> remove filters
          </button>
        </p>
      </div>
    </div>

    <template v-slot:footer>
      <btn
        class="btn -text mrauto search-dialog__side-toggle"
        @click="mobileShowFilters = !mobileShowFilters"
      >
        <i class="icon-cog"></i
      ></btn>
      <a href="javascript:void(0);" class="btn -text" @click="hide">Cancel</a>
      <btn
        class="-large -green ml8"
        @click.native="submit"
        :loading="isLoading"
      >
        {{ submitLabel }}
      </btn>
    </template>
  </Dialog>
</template>

<script>
import Loader from '@/components/framework/Loader.vue'
import Btn from '@/components/framework/Btn.vue'
import Dialog from '@/components/framework/Dialog.vue'
import DialogMixin from '@/mixins/dialogMixin'
import { copyTextToClipboard, getBucketId } from '@/utils/helpers'
import dialogService from '@/services/dialogService'
import workspacesService from '@/services/workspacesService'
import {
  stripStable,
  indexedProducts,
  indexProducts,
  getExchangeSymbols,
  ensureIndexedProducts,
  parseMarket
} from '@/services/productsService'
import ToggableSection from '@/components/framework/ToggableSection.vue'

const RESULTS_PER_PAGE = 25

export default {
  mixins: [DialogMixin],
  components: {
    ToggableSection,
    Dialog,
    Btn,
    Loader
  },
  props: {
    paneId: {
      required: false
    },
    pristine: {
      type: Boolean,
      default: false
    }
  },
  data: () => ({
    page: 0,
    query: '',
    markets: [],
    isLoading: false,
    isPreloading: false,
    selection: [],
    originalSelection: [],
    activeIndex: null,
    mobileShowFilters: false,
    canRefreshProducts: true,
    flattenedProducts: [],
    quoteCurrencies: [
      'USD',
      'USDT',
      'UST',
      'USDC',
      'BUSD',
      'ETH',
      'BTC',
      'BNB',
      'EUR',
      'AUD',
      'GBP',
      'OTHERS'
    ]
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
        return this.selection.filter(a => this.paneMarkets.indexOf(a) === -1)
          .length
      } else {
        return this.selection.filter(a => this.activeMarkets.indexOf(a) === -1)
          .length
      }
    },
    toDisconnect() {
      return this.originalSelection.filter(
        a => this.selection.indexOf(a) === -1
      ).length
    },
    submitLabel() {
      const toConnect = +this.toConnect
      const toDisconnect = +this.toDisconnect

      if (!this.selection.length && toDisconnect) {
        return `disconnect (${toDisconnect})`
      } else if (toConnect) {
        return `connect (${toConnect})`
      }

      return 'refresh'
    },
    searchTypes() {
      return this.$store.state.settings.searchTypes
    },
    searchQuotes() {
      const searchQuotesPreferences = this.$store.state.settings.searchQuotes

      return this.quoteCurrencies.reduce((acc, quote) => {
        acc[quote] =
          typeof searchQuotesPreferences[quote] === 'undefined'
            ? false
            : searchQuotesPreferences[quote]

        return acc
      }, {})
    },
    quotesCount() {
      return Object.values(this.searchQuotes).filter(a => !!a)
    },
    allQuotes() {
      return !this.quotesCount.length
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

        output[id] =
          typeof searchExchanges[id] === 'undefined'
            ? true
            : searchExchanges[id]

        return output
      }, {})
    },
    allExchangesEnabled() {
      return (
        typeof Object.values(this.searchExchanges).find(a => a === false) ===
        'undefined'
      )
    },
    hasFilters() {
      const hasHistorical = this.searchTypes.historical
      const hasSpot = this.searchTypes.spots
      const hasPerpetuals = this.searchTypes.perpetuals
      const hasFutures = this.searchTypes.futures
      const isMergeStables = this.searchTypes.mergeUsdt
      return (
        isMergeStables ||
        hasHistorical ||
        hasSpot ||
        hasPerpetuals ||
        hasFutures
      )
    },
    historicalMarkets() {
      return this.$store.state.app.historicalMarkets
    },
    queryFilter: function () {
      const multiQuery = this.query
        .replace(/[ ,]/g, '|')
        .replace(/(^|\w|\s)\*(\w|\s|$)/g, '$1.*$2')

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
          ((typeof searchQuotes[a.quote] === 'boolean' &&
            searchQuotes[a.quote] === false) ||
            (typeof searchQuotes[a.quote] !== 'boolean' &&
              !searchQuotes.OTHERS))
        ) {
          return false
        }

        if (!exchanges[a.exchange]) {
          return false
        }

        if (
          hasTypeFilters &&
          ((!hasFutures && a.type === 'future') ||
            (!hasPerpetuals && a.type === 'perp') ||
            (!hasSpot && a.type === 'spot'))
        ) {
          return false
        }

        return true
      })
    },
    results: function () {
      const offset = this.page * RESULTS_PER_PAGE

      if (this.searchTypes.normalize) {
        const marketsByPair = this.filteredProducts
          .filter(
            product =>
              this.selection.indexOf(product.id) === -1 &&
              this.queryFilter.test(product.local)
          )
          .reduce((groups, product) => {
            let local = product.local

            if (this.searchTypes.mergeUsdt) {
              local = stripStable(local)
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
            markets: marketsByPair[localPair],
            exchanges: marketsByPair[localPair].reduce((acc, market) => {
              const [exchange, pair] = parseMarket(market)

              const normalizedExchange = exchange.replace(/_.*/, '')

              if (!acc[normalizedExchange]) {
                acc[normalizedExchange] = []
              }

              acc[normalizedExchange].push(pair)

              return acc
            }, {})
          }))
      } else {
        return this.filteredProducts
          .filter(
            product =>
              this.selection.indexOf(product.id) === -1 &&
              this.queryFilter.test(product.id)
          )
          .slice(offset, offset + RESULTS_PER_PAGE)
      }
    },
    groupedSelection: function () {
      return this.selection.reduce((groups, market) => {
        const [exchange] = market.split(':')

        if (!indexedProducts[exchange]) {
          return groups
        }

        const indexedProduct = indexedProducts[exchange].find(
          product => product.id === market
        )

        let localPair = indexedProduct ? indexedProduct.local : market

        if (this.searchTypes.mergeUsdt) {
          localPair = stripStable(localPair)
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
    '$store.state.app.showSearch': function (value) {
      if (!value) {
        this.close(false)
      }
    },
    async searchExchanges() {
      if (await ensureIndexedProducts(this.searchExchanges)) {
        this.cacheProducts()
      }
    }
  },
  async created() {
    this.isPreloading = true
    await ensureIndexedProducts(this.searchExchanges)
    this.isPreloading = false

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
      if (this.pristine) {
        return
      }

      if (this.paneId) {
        this.selection =
          this.$store.state.panes.panes[this.paneId].markets.slice()
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
    async toggleMarkets(markets, removeFromHistory) {
      const scrollTop = this.$refs.selection.scrollTop

      if (!Array.isArray(markets)) {
        markets = [markets]
      }
      if (removeFromHistory) {
        this.$store.commit('settings/REMOVE_SEARCH_HISTORY', markets)
        clearTimeout(this._hideHistoryTimeout)
        return
      }
      for (const market of markets) {
        this.toggleMarket(market)
      }

      await this.$nextTick()

      this.$refs.input.focus()

      this.$refs.selection.scrollTop = scrollTop
    },
    toggleMarket(market) {
      const index = this.selection.indexOf(market)

      if (index === -1) {
        this.selection.push(market)
      } else {
        this.selection.splice(index, 1)
      }
    },
    async submit() {
      if (this.selection.length) {
        this.$store.dispatch('settings/saveSearchSelection', this.selection)
      }

      if (!this.paneId) {
        if (
          this.containMultipleMarketsConfigurations() &&
          !(await dialogService.confirm(
            `Override the other panes market filters`
          ))
        ) {
          return
        }

        this.isLoading = true

        if (!Object.keys(this.$store.state.panes.panes).length) {
          await this.$store.dispatch('panes/addPane', { type: 'trades' })
        }

        await this.$store.dispatch('panes/setMarketsForAll', this.selection)
      } else {
        this.isLoading = true

        this.$store.dispatch('panes/setMarketsForPane', {
          id: this.paneId,
          markets: this.selection
        })
      }

      this.isLoading = false

      this.hide()
    },
    hide() {
      this.$store.dispatch('app/hideSearch')
    },
    toggleType(key) {
      this.$store.commit('settings/TOGGLE_SEARCH_TYPE', key)
    },
    toggleExchange(event, id) {
      if (event.shiftKey) {
        this.toggleAll(false)

        if (!event.target.checked) {
          event.target.checked = true
        }
      }

      this.$store.commit('settings/TOGGLE_SEARCH_EXCHANGE', id)
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
              this.toggleMarkets([this.results[this.activeIndex].markets])
            } else {
              this.toggleMarkets([this.results[this.activeIndex].id])
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
                this.activeIndex = Math.min(
                  this.results.length - 1,
                  this.activeIndex + 1
                )
              }
            }
          }
          break

        case 'Backspace':
        case 'Delete':
          this.deleteLast()
          break

        case 'c':
          if (
            (event.ctrlKey || event.metaKey) &&
            !window.getSelection().toString().length
          ) {
            this.copySelection()
          }
          break
      }
    },

    deleteLast() {
      if (!this.query.length && this.selection.length) {
        if (this.searchTypes.normalize) {
          const lastPair = Object.keys(this.groupedSelection).pop()
          this.toggleMarkets(this.groupedSelection[lastPair])
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

      this.toggleMarkets(markets)
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
        if (
          await dialogService.confirm(
            `Download all exchange's products ?\n\nThis might take a while.`
          )
        ) {
          for (const exchange of this.exchanges) {
            await this.refreshExchangeProducts(exchange)
          }
        }

        return
      }

      if (this._refreshProductsTimeout) {
        clearTimeout(this._refreshProductsTimeout)
      }

      this.canRefreshProducts = false

      this.$store.dispatch('app/showNotice', {
        id: exchangeId,
        title: `Refreshing ${exchangeId}'s products...`
      })

      await workspacesService.deleteProducts(exchangeId)

      const count = (
        await indexProducts(
          exchangeId,
          await getExchangeSymbols(exchangeId, true)
        )
      ).length

      this.$store.dispatch('app/showNotice', {
        id: exchangeId,
        title: `Saved ${count} ${exchangeId}'s products`
      })

      await this.$store.dispatch('exchanges/disconnect', exchangeId)
      await this.$store.dispatch('exchanges/connect', exchangeId)

      this._refreshProductsTimeout = setTimeout(() => {
        this._refreshProductsTimeout = null
        this.canRefreshProducts = true
      }, 10000)

      this.cacheProducts()
    },

    async showMore() {
      this.page++
      await this.$nextTick()
      this.$refs.scroller.scrollTop = 0
    },

    async showLess() {
      this.page = Math.max(this.page - 1, 0)
      await this.$nextTick()
      this.$refs.scroller.scrollTop = this.$refs.scroller.offsetHeight
    },

    cacheProducts() {
      this.flattenedProducts = Array.prototype.concat(
        ...Object.values(indexedProducts)
      )
    }
  }
}
</script>
<style lang="scss" scoped>
.search-dialog {
  ::v-deep .dialog__content {
    .dialog__body {
      padding: 0;
      flex-direction: row;
      align-items: stretch;
      overflow: hidden;
    }

    .dialog__subtitle {
      color: var(--theme-color-o75);
      opacity: 1;
    }
  }

  &__side {
    width: 12.5rem;
    min-width: 12.5rem;
    overflow: auto;

    .dialog--small & {
      display: none;

      &.-show {
        display: block;
      }
    }

    &-toggle {
      .dialog:not(.dialog--small) & {
        display: none;
      }
    }
  }

  &__wrapper {
    flex-grow: 1;
    overflow: auto;

    @media screen and (min-width: 551px) {
      padding-left: 0;
    }
  }

  &__results {
    table {
      border: 0;
      border-collapse: collapse;
      margin: 0;
      width: 100%;
    }

    tr.-action {
      color: var(--theme-color-300);

      padding-top: 1px;

      &:hover {
        color: var(--theme-color-base);

        .search-dialog__exchange-logo {
          color: var(--theme-color-200);
        }
      }
    }

    td {
      padding: 0.5em;
    }
  }

  &__tags {
    padding: 0.25rem;

    &-item {
      padding: 0.25rem;

      .dialog--small & {
        padding: 0.125rem;
      }

      .dialog--large & {
        padding: 0.375rem;
      }
    }

    input {
      border: 0;
      background: 0;
      color: inherit;
      font-family: inherit;
      padding: 0.25rem;
      flex-grow: 1;
      font-size: 1em;
    }
  }

  &-recents {
    &__label {
      min-width: 0;
      width: 0;
      white-space: nowrap;
    }
    &__markets {
      display: none;
      @media screen and (min-width: 550px) {
        display: table-cell;
      }
    }
  }
  &-selection {
    position: relative;
    min-width: 19rem;
    border: 0;
    max-height: 50%;
    overflow: auto;
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;

    &.-sticky {
      @media screen and (min-width: 550px) {
        backdrop-filter: blur(0.25rem);
        background-color: var(--theme-background-o75);
        position: sticky;
        top: 0;
        z-index: 2;
        border-radius: 0;
      }
    }

    &__controls {
      position: absolute;
      top: 0;
      right: 0;
      display: flex;
      gap: 0.25rem;
      padding: 0.25rem;
    }
  }

  &__group-count {
    width: 2rem;
    display: inline-flex;
    justify-content: center;
    .badge {
      font-weight: 400;
      text-align: center;
      color: var(--theme-color-base);
      font-size: 1rem;
      line-height: 0;
      margin: 0;
    }
  }

  &__exchange-logo {
    width: 2rem;
    color: var(--theme-background-300);
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
