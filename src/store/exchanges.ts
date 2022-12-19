import Vue from 'vue'
import { ActionTree, GetterTree, Module, MutationTree } from 'vuex'
import { ModulesState } from '.'

export interface ExchangeSettings {
  disabled?: boolean
}

export type ExchangesState = { [exchangeId: string]: ExchangeSettings } & {
  _id: string
  _exchanges: string[]
}

const supportedExchanges = process.env.VUE_APP_EXCHANGES.split(',').map(id =>
  id.toUpperCase()
)

const state = supportedExchanges.reduce(
  (exchangesState: ExchangesState, id: string) => {
    exchangesState[id] = {
      disabled: /AGGR|HITBTC|PHEMEX|BINANCE_US|SERUM|HUOBI|POLONIEX|FTX/.test(
        id
      )
    }

    return exchangesState
  },
  {
    _exchanges: []
  } as any
) as ExchangesState

state._id = 'exchanges'

const getters = {
  getExchanges: state =>
    Object.keys(state).filter(id => id !== 'INDEX' && !/^_/.test(id))
} as GetterTree<ExchangesState, ModulesState>

const actions = {
  async boot({ dispatch }) {
    await dispatch('prepareExchanges')
  },
  prepareExchanges({ state, getters, rootState }) {
    state._exchanges.splice(0, state._exchanges.length)

    for (const id of getters.getExchanges) {
      if (supportedExchanges.indexOf(id) === -1) {
        if (rootState.settings.searchExchanges[id]) {
          delete rootState.settings.searchExchanges[id]
        }

        if (rootState.exchanges[id]) {
          delete rootState.exchanges[id]
        }

        continue
      }

      state._exchanges.push(id)
      rootState.app.activeExchanges[id] = !state[id].disabled
    }
  },
  async toggleExchange({ commit }, id: string) {
    commit('TOGGLE_EXCHANGE', id)
    await this.dispatch('panes/reviewPanesMarkets')
    this.commit('app/EXCHANGE_UPDATED', id)
  }
} as ActionTree<ExchangesState, ModulesState>

const mutations = {
  TOGGLE_EXCHANGE: (state, id: string) => {
    let disabled = true

    if (typeof state[id].disabled === 'boolean') {
      disabled = !state[id].disabled
    }

    Vue.set(state[id], 'disabled', disabled)
  }
} as MutationTree<ExchangesState>

export default {
  namespaced: true,
  getters,
  state,
  actions,
  mutations
} as Module<ExchangesState, ModulesState>
