import dialogService from '@/services/dialogService'
import { Market } from '@/types/test'
import { randomString } from '@/utils/helpers'
import Vue from 'vue'
import { ActionTree, GetterTree, Module, MutationTree } from 'vuex'
import { ModulesState } from '.'
import SearchDialog from '../components/SearchDialog.vue'

export interface Notice {
  id?: string
  title?: string
  timeout?: number
  button: NoticeButton
  _timeoutId?: number
}

interface BaseQuoteCurrencies {
  base: string
  baseSymbol: string
  quote: string
  quoteSymbol: string
}

interface NoticeButton {
  text: string
  icon?: string
  click?: Function
}

export interface NoticesState {
  notices: Notice[]
}

export interface AppState {
  isBooted: boolean
  isLoading: boolean
  redirectUrl: string
  showSearch: boolean
  historicalMarkets: string[]
  indexedProducts: { [exchangeId: string]: string[] }
  activeExchanges: { [exchangeId: string]: boolean }
  activeMarkets: Market[]
  proxyUrl: string
  apiUrl: string
  version: string
  buildDate: number | string
  notices: Notice[]
  optimalDecimal: number
  baseCurrency: string
  baseCurrencySymbol: string
  quoteCurrency: string
  quoteCurrencySymbol: string
  paneClipboard: string
}

const state = {
  isBooted: false,
  isLoading: false,
  redirectUrl: null,
  optimalDecimal: null,
  pairs: [],
  showSearch: false,
  activeExchanges: {},
  activeMarkets: [],
  notices: [],
  historicalMarkets: [],
  indexedProducts: {},
  proxyUrl: null,
  apiUrl: null,
  version: 'DEV',
  buildDate: 'now',
  baseCurrency: 'coin',
  baseCurrencySymbol: '฿',
  quoteCurrency: 'dollar',
  quoteCurrencySymbol: '$',
  paneClipboard: null
} as AppState

const actions = {
  async boot({ commit }) {
    commit('SET_API_SUPPORTED_PAIRS', process.env.VUE_APP_API_SUPPORTED_PAIRS)
    commit('SET_VERSION', process.env.VUE_APP_VERSION)
    commit('SET_BUILD_DATE', process.env.VUE_APP_BUILD_DATE)
    commit('SET_API_URL', process.env.VUE_APP_API_URL)
    commit('SET_PROXY_URL', process.env.VUE_APP_PROXY_URL)

    this.dispatch('app/refreshCurrencies')
  },
  setBooted({ commit }, value = true) {
    commit('SET_BOOTED', value)
  },
  async showNotice({ commit, getters }, notice) {
    if (typeof notice === 'string') {
      notice = {
        title: notice
      }
    }

    if (notice.id && getters.getNoticeById(notice.id)) {
      if (notice.update) {
        return this.dispatch('app/updateNotice', notice)
      } else {
        try {
          await this.dispatch('app/hideNotice', notice.id)
        } catch (error) {
          // notice was already hiding, no worries
          return
        }
      }
    }

    if (!notice.id) {
      notice.id = randomString()
    }

    if (typeof notice.timeout === 'undefined') {
      notice.timeout = notice.type === 'error' ? 10000 : 3000
    }

    if (notice.timeout > 0) {
      notice._timeout = setTimeout(() => {
        delete notice._timeout
        this.dispatch('app/hideNotice', notice.id)
      }, notice.timeout)
    }

    commit('CREATE_NOTICE', notice)
  },
  hideNotice({ commit, getters }, id): Promise<void> {
    const notice = getters.getNoticeById(id)

    if (!notice) {
      return Promise.resolve()
    }

    if (notice._timeout) {
      clearTimeout(notice._timeout)
    }

    if (notice._reject) {
      // notice is already hiding
      notice._reject()
    }

    return new Promise((resolve, reject) => {
      notice._reject = reject // mark notice as hiding
      notice._timeout = setTimeout(() => {
        commit('REMOVE_NOTICE', notice)
        delete notice._reject
        delete notice._timeout
        resolve()
      }, 100)
    })
  },
  updateNotice({ commit, getters, state }, notice) {
    const currentNotice = getters.getNoticeById(notice.id)
    const index = state.notices.indexOf(currentNotice)

    if (!currentNotice || index === -1) {
      return Promise.resolve()
    }

    commit('UPDATE_NOTICE', {
      index,
      notice
    })
  },
  refreshCurrencies({ commit, state }) {
    const market = state.activeMarkets[0]

    if (!market) {
      return
    }

    const pair = market.pair

    const symbols = {
      BTC: ['bitcoin', '฿'],
      XBT: ['bitcoin', '฿'],
      GBP: ['pound', '£'],
      EUR: ['euro', '€'],
      USD: ['dollar', '$'],
      JPY: ['yen', '¥'],
      ETH: ['ethereum', 'ETH'],
      XRP: ['xrp', 'XRP'],
      LTC: ['ltc', 'LTC'],
      TRX: ['trx', 'TRX'],
      ADA: ['ada', 'ADA'],
      IOTA: ['iota', 'IOTA'],
      XMR: ['xmr', 'XMR'],
      NEO: ['neo', 'NEO'],
      EOS: ['eos', 'EOS']
    }

    const currencies: BaseQuoteCurrencies = {
      base: 'coin',
      baseSymbol: '฿',
      quote: 'dollar',
      quoteSymbol: '$'
    }

    for (const symbol of Object.keys(symbols)) {
      if (new RegExp(symbol + '$').test(pair)) {
        currencies.quote = symbols[symbol][0]
        currencies.quoteSymbol = symbols[symbol][1]
      }

      if (new RegExp('^' + symbol).test(pair)) {
        currencies.base = symbols[symbol][0]
        currencies.baseSymbol = symbols[symbol][1]
      }
    }

    console.log(
      `[app] refresh currencies\n\tbase: ${currencies.base} - ${currencies.baseSymbol}\n\tquote: ${currencies.quote} - ${currencies.quoteSymbol}`
    )

    commit('SET_CURRENCIES', currencies)
  },
  showSearch({ commit }, { paneId, query }: { paneId?: string; query?: string } = { query: '', paneId: null }) {
    if (state.showSearch) {
      return
    }

    commit('TOGGLE_SEARCH', true)

    dialogService.open(SearchDialog, { query, paneId })
  },
  hideSearch({ commit }) {
    if (!state.showSearch) {
      return
    }

    commit('TOGGLE_SEARCH', false)
  }
} as ActionTree<AppState, ModulesState>

const mutations = {
  SET_BOOTED: (state, value: boolean) => {
    state.isBooted = value
  },
  SET_REDIRECT_URL: (state, redirectUrl: string) => {
    if (state.redirectUrl && redirectUrl) {
      return
    }

    console.info(`[redirect] ${redirectUrl ? 'save url for later' : 'clear redirectUrl'}`, redirectUrl)

    state.redirectUrl = redirectUrl
  },
  EXCHANGE_UPDATED(state, exchangeId: string) {
    const active = !this.state.exchanges[exchangeId].disabled && !this.state.exchanges[exchangeId].hidden

    Vue.set(state.activeExchanges, exchangeId, active)
  },
  TOGGLE_LOADING(state, value) {
    state.isLoading = value ? true : false
  },
  CREATE_NOTICE(state, notice) {
    state.notices.push(notice)
  },
  UPDATE_NOTICE(state, { index, notice }) {
    Vue.set(state.notices, index, notice)
  },
  REMOVE_NOTICE(state, notice) {
    const index = state.notices.indexOf(notice)

    if (index !== -1) {
      state.notices.splice(index, 1)
    }
  },
  TOGGLE_SEARCH(state, value) {
    state.showSearch = typeof value === 'boolean' ? value : !state.showSearch
  },
  SET_OPTIMAL_DECIMAL(state, value) {
    state.optimalDecimal = value
  },
  SET_API_URL(state, value) {
    state.apiUrl = value
  },
  SET_PROXY_URL(state, value) {
    state.proxyUrl = value
  },
  SET_API_SUPPORTED_PAIRS(state, value) {
    if (!value) {
      state.historicalMarkets = []
    } else if (typeof value === 'string') {
      state.historicalMarkets = value.split(',').map(a => a.trim())
    } else {
      state.historicalMarkets = value
    }
  },
  SET_VERSION(state, value) {
    state.version = value
  },
  SET_BUILD_DATE(state, value) {
    state.buildDate = value
  },
  INDEX_EXCHANGE_PRODUCTS(state, { exchange, products }: { exchange: string; products: string[] }) {
    Vue.set(
      state.indexedProducts,
      exchange,
      products.map(p => exchange + ':' + p)
    )
  },
  ADD_ACTIVE_MARKET(state, { exchange, pair }: { exchange: string; pair: string }) {
    const market = state.activeMarkets.find(m => m.exchange === exchange && m.pair === pair)

    if (market) {
      throw new Error('add-active-market-already-exist')
    }

    state.activeMarkets.push({
      id: exchange + pair,
      exchange,
      pair
    })
  },
  REMOVE_ACTIVE_MARKET(state, { exchange, pair }: { exchange: string; pair: string }) {
    const market = state.activeMarkets.find(m => m.exchange === exchange && m.pair === pair)

    if (!market) {
      throw new Error('remove-active-market-not-found')
    }

    const index = state.activeMarkets.indexOf(market)

    state.activeMarkets.splice(index, 1)
  },
  SET_CURRENCIES(state, currencies: BaseQuoteCurrencies) {
    state.baseCurrency = currencies.base
    state.baseCurrencySymbol = currencies.baseSymbol
    state.quoteCurrency = currencies.quote
    state.quoteCurrencySymbol = currencies.quoteSymbol
  },
  SET_PANE_CLIPBOARD(state, settings: string) {
    state.paneClipboard = settings
  }
} as MutationTree<AppState>

const getters = {
  getNoticeById: state => id => {
    for (let i = 0; i < state.notices.length; i++) {
      if (state.notices[i].id === id) {
        return state.notices[i]
      }
    }
  }
} as GetterTree<AppState, ModulesState>

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
} as Module<AppState, ModulesState>
