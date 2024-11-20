<template>
  <transition name="dialog" :duration="300" @after-leave="close">
    <Dialog
      v-if="opened"
      ref="dialogRef"
      class="search-dialog"
      size="wide"
      @resize="onResize"
      @close="hide"
    >
      <template v-slot:header>
        <div v-if="selectedPaneId">
          <div class="dialog__title">
            Connect →
            <code class="-filled -green">
              <span>{{ paneName }}</span>
            </code>
            <button
              type="button"
              class="btn -small ml4 -text -no-grab"
              v-tippy
              title="Connect to all"
              @click="detargetPane"
            >
              <i class="icon-cross"></i>
            </button>
          </div>
        </div>
        <div v-else>
          <div class="dialog__title">Manage connections</div>
        </div>
        <Loader
          v-if="isLoading || isPreloading"
          small
          class="mtauto mbauto mr0"
          title="Updating database..."
          v-tippy
        />
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
              :checked="searchFilters.normalize"
              @change="
                $store.commit('settings/TOGGLE_SEARCH_TYPE', 'normalize')
              "
            />
            <div></div>
            <span>Group by pair</span>
          </label>
          <label
            v-if="searchFilters.normalize"
            class="checkbox-control -small mb4"
          >
            <input
              type="checkbox"
              class="form-control"
              :checked="searchFilters.mergeUsdt"
              @change="
                $store.commit('settings/TOGGLE_SEARCH_TYPE', 'mergeUsdt')
              "
            />
            <div></div>
            <span>Merge stablecoins</span>
          </label>
          <label
            class="checkbox-control -small mb4"
            title="Pairs tracked by AGGR servers"
            v-tippy="{ followCursor: true }"
          >
            <input
              type="checkbox"
              class="form-control"
              :checked="searchFilters.historical"
              @change="
                $store.commit('settings/TOGGLE_SEARCH_TYPE', 'historical')
              "
            />
            <div></div>
            <span>With historical data</span>
          </label>
          <label class="checkbox-control -small mb4">
            <input
              type="checkbox"
              class="form-control"
              :checked="searchFilters.recent"
              @change="$store.commit('settings/TOGGLE_SEARCH_TYPE', 'recent')"
            />
            <div></div>
            <span>Show history</span>
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
              <span class="d-flex">
                <span v-text="id"></span>
                <Btn
                  type="button"
                  class="btn -text -small px0"
                  :title="`Refresh ${id}'s products`"
                  v-tippy="{ followCursor: true }"
                  @click.stop="refreshExchangeProducts(id)"
                >
                  <i class="icon-refresh ml8"></i>
                </Btn>
              </span>
            </label>
          </template>
          <template v-slot:control>
            <label class="checkbox-control -small flex-right">
              <input
                type="checkbox"
                class="form-control"
                :checked="allExchangesEnabled"
                @change="toggleAll()"
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
              :checked="searchFilters.spots"
              @change="$store.commit('settings/TOGGLE_SEARCH_TYPE', 'spots')"
            />
            <div></div>
            <span>Spots</span>
          </label>
          <label class="checkbox-control -small mb4">
            <input
              type="checkbox"
              class="form-control"
              :checked="searchFilters.perpetuals"
              @change="
                $store.commit('settings/TOGGLE_SEARCH_TYPE', 'perpetuals')
              "
            />
            <div></div>
            <span>Perpetuals</span>
          </label>
          <label class="checkbox-control -small mb4">
            <input
              type="checkbox"
              class="form-control"
              :checked="searchFilters.futures"
              @change="$store.commit('settings/TOGGLE_SEARCH_TYPE', 'futures')"
            />
            <div></div>
            <span>Futures</span>
          </label>
        </ToggableSection>

        <ToggableSection id="search-quotes">
          <template v-slot:title>
            <div class="toggable-section__title">
              Currency
              <span v-if="quotesCount" class="badge -red ml8 mr8">{{
                quotesCount
              }}</span>
            </div>
          </template>
          <label
            class="checkbox-control -small mb4"
            v-for="quote of quoteCurrencies"
            :key="quote"
          >
            <input
              type="checkbox"
              class="form-control"
              :checked="
                searchQuotes[quote] === true ||
                searchQuotes[quote] === undefined
              "
              v-commit="[
                'settings/TOGGLE_SEARCH_QUOTE',
                v => ({
                  key: quote,
                  value: v
                })
              ]"
            />
            <div></div>
            <span>{{ quote }}</span>
          </label>
        </ToggableSection>
      </div>
      <div class="search-dialog__wrapper hide-scrollbar">
        <div
          class="search-dialog-selection search-dialog__tags form-control hide-scrollbar"
          :class="groupsCount < 10 && '-sticky'"
          @click="inputRef.focus()"
          ref="selectionRef"
        >
          <template v-if="searchFilters.normalize">
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
              v-for="market of selectedProducts"
              :key="market.id"
              class="search-dialog__tags-item btn -theme"
              :class="{ '-green': activeMarkets.indexOf(market.id) !== -1 }"
              :title="`Click to remove ${market.id}`"
              @click.stop.prevent="toggleMarkets(market.id)"
            >
              <template v-if="!market.exchange">
                {{ market.id }}
              </template>
              <template v-else>
                <i class="mr4" :class="`icon-${market.exchange}`"></i>
                {{ market.pair }}
              </template>
            </button>
          </template>
          <input
            ref="inputRef"
            class="search-dialog__tags-item"
            type="text"
            :placeholder="`Search (${filteredProducts.length})`"
            :value="query"
            @input="onInput"
          />
        </div>
        <button
          v-if="query.length || selection.length"
          class="btn search-dialog__tags-delete -text -small"
          @click="clearSelection"
          title="Clear"
          v-tippy="{ boundary: 'window', placement: 'bottom' }"
        >
          <i class="icon-cross"></i>
        </button>
        <div class="search-dialog__results hide-scrollbar">
          <table
            class="table mt8 search-dialog-recents table--inset"
            v-if="
              searchFilters.recent &&
              previousSearchSelections.length &&
              !query.length
            "
          >
            <tbody>
              <tr
                v-for="savedSelection of previousSearchSelections"
                :key="savedSelection.label"
                class="-action"
                @click="toggleMarkets(savedSelection.markets, $event.shiftKey)"
              >
                <td class="table-min">🕓</td>
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

          <table class="table mt8 table--inset" v-if="searchFilters.normalize">
            <tbody>
              <tr
                v-for="(group, index) in slicedResults"
                :key="group.localPair"
                @click="toggleMarkets(group.markets)"
                :class="{ '-active': activeIndex === index }"
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
                  ></i>
                </td>
              </tr>
            </tbody>
          </table>
          <table v-else class="table table--inset mt8">
            <tbody>
              <tr
                v-for="(market, index) of slicedResults"
                :key="market.id"
                @click="toggleMarkets([market.id])"
                :class="{ '-active': activeIndex === index }"
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

          <transition name="fade-scale">
            <div
              v-if="!isPreloading && !pagesCount"
              class="search-dialog__results-empty"
              :style="{ backgroundImage: `url(${noResultsPng})` }"
            >
              <p
                class="shake-horizontal"
                v-html="noResultsMessage"
                @click="clearSelection"
              ></p>
            </div>
          </transition>
        </div>
        <div v-if="pagesCount" class="search-dialog__results-footer mt8 d-flex">
          <button class="btn -text mrauto" @click="addAll">
            <i class="icon-plus mr8"></i> add all
          </button>
          <button
            v-for="(i, index) in pagination"
            :key="index"
            class="btn -text search-dialog__results-footer-page"
            :class="[page === i && '-active -theme']"
            @click="goPage(i)"
          >
            {{ i + 1 }}
          </button>
        </div>
      </div>

      <template v-slot:footer>
        <btn
          class="btn -text mrauto search-dialog__side-toggle"
          @click="mobileShowFilters = !mobileShowFilters"
        >
          <i class="icon-cog"></i>
        </btn>
        <button type="button" class="btn -text" @click="hide">Cancel</button>
        <btn
          class="-large -green ml8"
          @click.native="submit"
          :loading="isLoading"
        >
          {{ submitLabel }}
        </btn>
      </template>
    </Dialog>
  </transition>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  watch,
  onMounted,
  nextTick,
  defineProps,
  defineEmits
} from 'vue'
import Loader from '@/components/framework/Loader.vue'
import Btn from '@/components/framework/Btn.vue'
import Dialog from '@/components/framework/Dialog.vue'
import ToggableSection from '@/components/framework/ToggableSection.vue'
import { getBucketId } from '@/utils/helpers'
import dialogService from '@/services/dialogService'
import workspacesService from '@/services/workspacesService'
import {
  indexedProducts,
  indexProducts,
  getExchangeSymbols,
  ensureIndexedProducts,
  parseMarket,
  stripStableQuote,
  ProductTypeEnum
} from '@/services/productsService'
import noResultsPng from '@/assets/noresults.png'
import store from '@/store'
import { useDialog } from '@/composables/useDialog'
import { Product } from '@/store/app'
import { useSearchPagination } from './useSearchPagination'
import { useSearchSelection } from './useSearchSelection'

let flattenedProducts: Product[] = []

interface GroupedProducts {
  localPair: string
  exchanges: string[]
  markets: string[]
}

const props = defineProps({
  paneId: String,
  pristine: {
    type: Boolean,
    default: false
  },
  input: {
    type: String,
    default: null
  }
})

const { opened, close, hide: hideDialog } = useDialog()
defineEmits(['close'])

const selectionRef = ref<HTMLElement>(null)
const dialogRef = ref<InstanceType<typeof Dialog> | null>(null)
const inputRef = ref<HTMLInputElement>(null)
const maxPages = ref(5)
const isLoading = ref(false)
const noResultsMessage = ref<string | null>(null)
const isPreloading = ref(false)
const selectedPaneId = ref(props.paneId)
const cacheTimestamp = ref(0)
const originalSelection = ref<string[]>([])
const activeIndex = ref<number>(0)
const mobileShowFilters = ref(false)
const quoteCurrencies = [
  'USD',
  'USDT',
  'FDUSD',
  'UST',
  'USDC',
  'USDD',
  'TUSD',
  'ETH',
  'BTC',
  'BNB',
  'EUR',
  'AUD',
  'GBP',
  'OTHERS'
]

// Computed properties
const previousSearchSelections = computed(
  () => store.state.settings.previousSearchSelections
)
const paneName = computed(() => {
  if (!selectedPaneId.value) return 'n/a'
  const name = store.getters['panes/getName'](selectedPaneId.value)
  return name.trim().length
    ? name
    : store.state.panes.panes[selectedPaneId.value].type
})
const activeMarkets = computed(() =>
  Object.keys(store.state.panes.marketsListeners)
)
const paneMarkets = computed(() =>
  selectedPaneId.value
    ? store.state.panes.panes[selectedPaneId.value].markets
    : []
)
const toConnect = computed(() => {
  if (selectedPaneId.value) {
    return selection.value.filter(a => !paneMarkets.value.includes(a)).length
  }
  return selection.value.filter(a => !activeMarkets.value.includes(a)).length
})
const toDisconnect = computed(
  () => originalSelection.value.filter(a => !selection.value.includes(a)).length
)
const submitLabel = computed(() => {
  const toConnectCount = toConnect.value
  const toDisconnectCount = toDisconnect.value
  if (!selection.value.length && toDisconnectCount)
    return `disconnect (${toDisconnectCount})`
  if (toConnectCount) return `connect (${toConnectCount})`
  return 'refresh'
})
const searchFilters = computed(() => store.state.settings.searchTypes)
const searchQuotes = computed(() => {
  const searchQuotesPreferences = store.state.settings.searchQuotes
  return quoteCurrencies.reduce((acc: Record<string, boolean>, quote) => {
    acc[quote] =
      searchQuotesPreferences[quote] !== undefined
        ? searchQuotesPreferences[quote]
        : false
    return acc
  }, {})
})
const quotesCount = computed(
  () => Object.values(searchQuotes.value).filter(Boolean).length
)
const allQuotes = computed(() => !quotesCount.value)
const exchanges = computed(() => store.getters['exchanges/getExchanges'])
const searchExchanges = computed(() => {
  const searchExchangesPref = store.state.settings.searchExchanges
  return Object.keys(store.state.exchanges).reduce(
    (output: Record<string, boolean>, id) => {
      if (!store.state.exchanges[id].disabled) {
        output[id] =
          searchExchangesPref[id] !== undefined ? searchExchangesPref[id] : true
      }
      return output
    },
    {}
  )
})
const allExchangesEnabled = computed(
  () => !Object.values(searchExchanges.value).includes(false)
)
const historicalMarkets = computed(() => store.state.app.historicalMarkets)
const queryFilter = computed(() => {
  const multiQuery = query.value
    .replace(/[ ,]/g, '|')
    .replace(/(^|\w|\s)\*(\w|\s|$)/g, '$1.*$2')
  return new RegExp(
    searchFilters.value.normalize ? '^' + multiQuery : multiQuery,
    'i'
  )
})

const filteredProducts = computed(() => {
  // force recalculate computed when cacheTimestamp changes
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const id = cacheTimestamp.value
  const { historical, spots, perpetuals, futures } = searchFilters.value
  const exchangesFilter = searchExchanges.value
  const typeFilters = spots || perpetuals || futures
  const quotesFilter = searchQuotes.value
  const allQuotesFlag = allQuotes.value
  const historicalMarketsList = historicalMarkets.value

  return flattenedProducts.filter(product => {
    if (historical && !historicalMarketsList.includes(product.id)) return false
    if (!allQuotesFlag && !quotesFilter[product.quote] && !quotesFilter.OTHERS)
      return false
    if (!exchangesFilter[product.exchange]) return false
    if (
      typeFilters &&
      ((!futures && product.type === ProductTypeEnum.FUTURE) ||
        (!perpetuals && product.type === ProductTypeEnum.PERP) ||
        (!spots && product.type === ProductTypeEnum.SPOT))
    )
      return false
    return true
  })
})

const marketsByPair = computed<{ [localPair: string]: string[] }>(() => {
  const _searchFilters = searchFilters.value
  const _selection = selection.value
  const _queryFilter = queryFilter.value

  if (!_searchFilters.normalize) {
    return {}
  }

  return filteredProducts.value
    .filter(
      product =>
        _selection.indexOf(product.id) === -1 &&
        _queryFilter.test(product.local)
    )
    .reduce((groups, product) => {
      let localPair

      if (product && _searchFilters.mergeUsdt) {
        localPair = product.base + stripStableQuote(product.quote)
      } else {
        localPair = product.base + product.quote
      }

      if (!groups[localPair]) {
        groups[localPair] = []
      }

      groups[localPair].push(product.id)

      return groups
    }, {})
})

const results = computed<Product[] | GroupedProducts[]>(() => {
  const _selection = selection.value
  const _queryFilter = queryFilter.value

  if (searchFilters.value.normalize) {
    const _marketsByPair = marketsByPair.value

    return slicedGroups.value.map(localPair => ({
      localPair,
      markets: _marketsByPair[localPair],
      exchanges: _marketsByPair[localPair].reduce((acc, market: string) => {
        const [exchange, pair] = parseMarket(market)

        const normalizedExchange = exchange.replace(/_.*/, '')

        if (!acc[normalizedExchange]) {
          acc[normalizedExchange] = []
        }

        acc[normalizedExchange].push(pair)

        return acc
      }, {})
    })) as GroupedProducts[]
  } else {
    return filteredProducts.value.filter(
      product =>
        _selection.indexOf(product.id) === -1 && _queryFilter.test(product.id)
    )
  }
})

const { page, pagesCount, slicedResults, slicedGroups, pagination, goPage } =
  useSearchPagination(dialogRef, results, marketsByPair, searchFilters)

const {
  query,
  selection,
  groupedSelection,
  selectedProducts,
  addAll,
  onInput,
  toggleMarkets,
  clearSelection,
  cacheSelectedProducts
} = useSearchSelection(
  page,
  activeIndex,
  slicedResults,
  selectionRef,
  inputRef,
  searchFilters,
  submit
)

const groupsCount = computed(() => Object.keys(groupedSelection.value).length)
const showNoResults = computed(() => !isPreloading.value && !pagesCount.value)

// Watchers
watch(
  () => store.state.app.showSearch,
  value => {
    if (!value) hideDialog()
  }
)
watch(searchExchanges, async () => {
  if (await _ensureIndexedProducts()) cacheProducts()
})
watch(showNoResults, value => {
  if (value) noResultsMessage.value = getNoResultsMessage()
})
watch(pagesCount, () => {
  page.value = 0
})

// Lifecycle hooks
onMounted(() => {
  initSelection()
  isPreloading.value = true
  _ensureIndexedProducts().then(() => {
    isPreloading.value = false
    cacheProducts()
  })
  nextTick(() => {
    maxPages.value = getMaxPages()
    if (props.input && !inputRef.value.value.startsWith(props.input)) {
      query.value = props.input + query.value
    }
    inputRef.value.focus()
  })
})

// Methods

const hide = () => {
  store.dispatch('app/hideSearch')
}

const getMaxPages = () => {
  return dialogRef.value.currentSize === 'small'
    ? 3
    : dialogRef.value.currentSize === 'medium'
      ? 5
      : 10
}

const onResize = () => {
  maxPages.value = getMaxPages()
}

const _ensureIndexedProducts = async () => {
  const selectedExchanges = selection.value.reduce((acc, market) => {
    const [exchangeId] = parseMarket(market)

    if (!acc[exchangeId]) {
      acc[exchangeId] = true
    }

    return acc
  }, {})

  const requiredExchanges = {
    ...searchExchanges.value,
    ...selectedExchanges
  }

  const indexChanged = await ensureIndexedProducts(requiredExchanges)

  if (indexChanged) {
    return true
  }

  return false
}

const detargetPane = async () => {
  store.commit('app/SET_FOCUSED_PANE', null)
  selectedPaneId.value = null
  if (
    selection.value.join('') !== originalSelection.value.join('') &&
    !(await dialogService.confirm({
      title: `Override selection ?`,
      message: `Replace the existing selection<br>with the app's current active connections ?`,
      html: true
    }))
  ) {
    return
  }
  initSelection()
}

const initSelection = () => {
  if (props.pristine) {
    return
  }

  if (selectedPaneId.value) {
    selection.value =
      store.state.panes.panes[selectedPaneId.value].markets.slice()
  } else {
    selection.value = activeMarkets.value.slice()
  }

  originalSelection.value = selection.value.slice()
}

function hasMultipleMarketsConfigurations() {
  return (
    Object.keys(store.state.panes.panes)
      .map(id => getBucketId(store.state.panes.panes[id].markets))
      .filter((v, i, a) => a.indexOf(v) === i).length > 1
  )
}

async function submit() {
  if (selection.value.length) {
    store.dispatch('settings/saveSearchSelection', selection.value)
  }

  if (!selectedPaneId.value) {
    if (
      hasMultipleMarketsConfigurations() &&
      !(await dialogService.confirm(`Override the other panes market filters`))
    ) {
      return
    }

    isLoading.value = true
    if (!Object.keys(store.state.panes.panes).length) {
      await store.dispatch('panes/addPane', { type: 'trades' })
    }
    await store.dispatch('panes/setMarketsForAll', selection.value)
  } else {
    isLoading.value = true
    store.dispatch('panes/setMarketsForPane', {
      id: selectedPaneId.value,
      markets: selection.value
    })
  }

  isLoading.value = false
  hide()
}

function toggleExchange(event: MouseEvent, id: string) {
  const target = event.target as HTMLInputElement
  if (event.shiftKey) {
    toggleAll(false)
    if (!target.checked) {
      target.checked = true
    }
  }
  store.commit('settings/TOGGLE_SEARCH_EXCHANGE', id)
}

function toggleAll(selectAll?: boolean) {
  const state = Boolean(selectAll ?? !allExchangesEnabled.value)
  store.state.settings.searchExchanges = exchanges.value.reduce(
    (output: Record<string, boolean>, id) => {
      output[id] = state
      return output
    },
    {}
  )
}

async function refreshExchangeProducts(exchangeId?: string) {
  if (!exchangeId) {
    if (
      await dialogService.confirm(
        `Download all exchange's products? This might take a while.`
      )
    ) {
      for (const exchange of exchanges.value) {
        await refreshExchangeProducts(exchange)
      }
    }
    return
  }

  store.dispatch('app/showNotice', {
    id: exchangeId,
    title: `Refreshing ${exchangeId}'s products...`
  })
  await workspacesService.deleteProducts(exchangeId)
  const count = (
    await indexProducts(exchangeId, await getExchangeSymbols(exchangeId, true))
  ).length
  store.dispatch('app/showNotice', {
    id: exchangeId,
    title: `Saved ${count} ${exchangeId}'s products`
  })
  await store.dispatch('exchanges/disconnect', exchangeId)
  await store.dispatch('exchanges/connect', exchangeId)

  cacheProducts()
}

function cacheProducts() {
  flattenedProducts = [].concat(...Object.values(indexedProducts))
  cacheSelectedProducts()
  selection.value = [...selection.value]
  cacheTimestamp.value = Date.now()
}

function getNoResultsMessage() {
  const options = [
    "Oops! Looks like the market's playing hide and seek. <button>Try searching again</button>! 🐮🐻💰",
    'Bulls and bears are puzzled! No coins found.',
    "The market's taking a breather. <button>Try another search</button>!",
    "Even our bullish friend couldn't find that coin!",
    'Bear with us! No coins matched your search.',
    "Lost in the crypto maze? <button>Let's search again</button>!",
    'Coins in limbo! Adjust your filters or <button>try a new term</button>.',
    "Our bear's got the blues, no results found!",
    'Tales of the missing coins! <button>Refine your search</button>.',
    'Crypto hideout! Nothing turned up, <button>try again</button>!',
    "Coins playing hard to get? <button>Let's give it another shot</button>!"
  ]
  return options[Math.floor(Math.random() * options.length)]
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
  }

  &__side {
    width: 13.5rem;
    overflow-y: auto;
    border-right: 1px solid var(--theme-background-150);
    flex-shrink: 0;

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
    display: flex;
    flex-direction: column;
    background-color: var(--theme-base-o25);
    position: relative;
  }

  &__indexations {
    display: flex;
    padding: 2rem;
    flex-grow: 1;
    justify-content: center;
    align-items: center;

    li {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    ul {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      list-style: none;
      margin: 0;
      padding: 0;
    }

    &-dots {
      flex-grow: 1;
      background-image: radial-gradient(
        currentColor 1px,
        transparent 1px
      ); /* Increase dot size */
      background-size: 4px 1px; /* Adjust spacing as needed */
      background-repeat: repeat-x;
      height: 2px; /* Slightly increase height for better visibility */
      margin: 0 8px;
      display: inline-block;
      opacity: 0.7; /* Optional: make dots slightly transparent for subtle effect */
    }

    &-loader {
      width: 0.5rem;
      height: 0.5rem;
    }
  }

  &__results {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    min-height: 1px;
    position: relative;
    overflow: auto;

    .icon-candlestick {
      display: block;
    }

    table {
      border: 0;
      border-collapse: collapse;
      margin: 0;
      width: 100%;
    }

    tr {
      color: var(--theme-color-300);

      + tr > td {
        border-top: 1px solid var(--theme-background-100);
      }

      &:hover {
        background-color: transparent;
      }

      &.-active,
      &:hover {
        color: var(--theme-color-base);

        .search-dialog__exchange-logo {
          color: var(--theme-color-200);
        }
      }

      &.-active {
        background-color: var(--theme-background-100);
      }
    }

    td {
      padding: 0.5rem;
      line-height: 1;
      white-space: nowrap;
    }

    &-footer {
      position: sticky;
      bottom: 0;
      backdrop-filter: blur(0.25rem);
      background-color: var(--theme-background-o75);
      position: sticky;
      border-top: 1px solid var(--theme-background-150);
      align-items: center;
      padding: 0.5rem;
      gap: 0.25rem;
      margin-top: auto;

      &-page {
        opacity: 0.5;
        width: 1.75rem;
        justify-content: center;

        &.-active,
        &:hover {
          opacity: 1;
          background-color: var(--theme-background-150) !important;
        }
      }
    }

    &-empty {
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      font-size: 1.125rem;
      flex-grow: 1;
      gap: 1rem;
      max-height: 100%;
      position: relative;
      background-color: var(--theme-background-50);
      background-blend-mode: lighten;
      background-size: cover;
      background-position: center center;
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 0;

      #app.-light & {
        background-blend-mode: darken;
      }

      p {
        max-width: 75%;
        text-align: center;
        margin: 0;
      }

      ::v-deep button {
        text-decoration: underline;
        cursor: pointer;
      }
    }
  }

  &__tags {
    &-item {
      padding: 0.25rem;

      .dialog--small & {
        padding: 0.125rem;
      }

      .dialog--large & {
        padding: 0.375rem;
      }
    }

    &-delete {
      position: absolute;
      top: 0;
      right: 0;
      margin: 0.375rem;
      z-index: 2;

      .dialog--small & {
        margin: 0.25rem;
      }

      .dialog--large & {
        margin: 0.5rem;
      }
    }

    input {
      border: 0;
      background: 0;
      color: inherit;
      font-family: inherit;
      padding: 0.25rem;
      flex-grow: 1;
      font-size: 1rem;
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
    max-height: 33%;
    overflow: auto;
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    align-items: flex-start;
    justify-content: flex-start;
    flex-shrink: 0;
    padding-right: 1.5rem;

    &.-sticky {
      @media screen and (min-width: 550px) {
        backdrop-filter: blur(0.25rem);
        background-color: var(--theme-background-o75);
        border-bottom: 1px solid var(--theme-background-150);
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
    font-size: 1rem;
    color: var(--theme-background-300);
  }

  .checkbox-control {
    button {
      visibility: hidden;
    }

    &:hover button {
      visibility: visible;
    }
  }
}
</style>
