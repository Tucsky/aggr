import dialogService from '@/services/dialogService'
import { randomString } from '@/utils/helpers'
import Vue from 'vue'
import { ActionTree, GetterTree, Module, MutationTree } from 'vuex'
import { ModulesState } from '.'
import TimeframeDialog from '../components/TimeframeDialog.vue'
import { getApiSupportedMarkets } from '../services/productsService'

export interface Notice {
  id?: string
  title?: string
  timeout?: number
  button: NoticeButton
  _timeoutId?: number
}

interface NoticeButton {
  text: string
  icon?: string
  click?: () => void
}

export interface NoticesState {
  notices: Notice[]
}

export interface Product {
  id: string
  pair: string
  exchange: string
  type: string
  base: string
  quote: string
  local: string
}

export interface ListenedProduct extends Product {
  listeners?: number
}

export interface AppState {
  isBooted: boolean
  isLoading: boolean
  isExchangesReady: boolean
  showSearch: boolean
  historicalMarkets: string[]
  apiSupportedTimeframes: string[]
  activeExchanges: { [exchangeId: string]: boolean }
  version: string
  buildDate: number | string
  notices: Notice[]
  focusedPaneId: string
}

const state = {
  isBooted: false,
  isLoading: false,
  isExchangesReady: false,
  showSearch: false,
  activeExchanges: {},
  notices: [],
  historicalMarkets: [],
  apiSupportedTimeframes: [],
  version: 'DEV',
  buildDate: 'now',
  focusedPaneId: null
} as AppState

const actions = {
  async boot({ commit, dispatch }) {
    await dispatch('getApiSupportedPairs')
    commit(
      'SET_API_SUPPORTED_TIMEFRAMES',
      import.meta.env.VITE_APP_API_SUPPORTED_TIMEFRAMES
    )
    commit('SET_VERSION', import.meta.env.VITE_APP_VERSION)
    commit('SET_BUILD_DATE', import.meta.env.VITE_APP_BUILD_DATE)
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
  async showSearch(
    { commit, state },
    { paneId, pristine = false, input = null } = {}
  ) {
    if (state.showSearch) {
      return
    }

    commit('TOGGLE_SEARCH', true)

    if (typeof paneId === 'undefined' && input && state.focusedPaneId) {
      paneId = state.focusedPaneId
    }

    dialogService.open(
      (await import('@/components/SearchDialog.vue')).default,
      { paneId, pristine, input }
    )
  },
  showTimeframe({ commit, state, rootState }) {
    if (
      state.showSearch ||
      !state.focusedPaneId ||
      !rootState[state.focusedPaneId]
    ) {
      return
    }

    commit('TOGGLE_SEARCH', true)

    dialogService.open(TimeframeDialog)
  },
  hideSearch({ commit, state }) {
    if (!state.showSearch) {
      return
    }

    commit('TOGGLE_SEARCH', false)
  },
  async getApiSupportedPairs({ commit }) {
    const markets = await getApiSupportedMarkets()
    commit('SET_HISTORICAL_MARKETS', markets)
  }
} as ActionTree<AppState, ModulesState>

const mutations = {
  SET_BOOTED: (state, value: boolean) => {
    state.isBooted = value
  },
  SET_EXCHANGES_READY(state) {
    state.isExchangesReady = true
  },
  EXCHANGE_UPDATED(state, exchangeId: string) {
    Vue.set(
      state.activeExchanges,
      exchangeId,
      !this.state.exchanges[exchangeId].disabled
    )
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
  SET_HISTORICAL_MARKETS(state, value) {
    state.historicalMarkets = value
  },
  SET_API_SUPPORTED_TIMEFRAMES(state, value) {
    if (value && value.trim()) {
      state.apiSupportedTimeframes = value.split(',')
    } else {
      state.apiSupportedTimeframes = []
    }
  },
  SET_VERSION(state, value) {
    state.version = value
  },
  SET_BUILD_DATE(state, value) {
    state.buildDate = value
  },
  SET_FOCUSED_PANE(state, id: string) {
    if (id !== state.focusedPaneId) {
      const paneElement = document.getElementById(id)

      if (paneElement) {
        paneElement.classList.remove('pane--selected')
        paneElement.offsetHeight
        paneElement.classList.add('pane--selected')
      }
    }

    state.focusedPaneId = id
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
