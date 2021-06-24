import aggregatorService from '@/services/aggregatorService'
import { getProducts, showIndexedProductsCount } from '@/services/productsService'
import { progress } from '@/utils/helpers'
import Vue from 'vue'
import { ActionTree, GetterTree, Module, MutationTree } from 'vuex'
import { ModulesState } from '.'

export interface ExchangeSettings {
  disabled?: boolean
  hidden?: boolean
}

export type ExchangesState = { [exchangeId: string]: ExchangeSettings } & { _id: string; _exchanges: string[] }

const state = [
  'BITMEX',
  'BINANCE_FUTURES',
  'KRAKEN',
  'HUOBI',
  'BINANCE',
  'BITFINEX',
  'BITSTAMP',
  'COINBASE',
  'HITBTC',
  'OKEX',
  'POLONIEX',
  'DERIBIT',
  'BYBIT',
  'FTX',
  'PHEMEX'
].reduce(
  (exchangesState: ExchangesState, id: string) => {
    exchangesState[id] = {}

    if (id === 'HITBTC' || id === 'BYBIT') {
      exchangesState[id].disabled = true
    }

    return exchangesState
  },
  {
    _exchanges: []
  } as any
) as ExchangesState

state._id = 'exchanges'

const getters = {
  getExchanges: state => Object.keys(state).filter(id => !/^_/.test(id))
} as GetterTree<ExchangesState, ModulesState>

const actions = {
  async boot({ state, getters }) {
    state._exchanges.splice(0, state._exchanges.length)

    for (const id of getters.getExchanges) {
      state._exchanges.push(id)
      this.commit('app/EXCHANGE_UPDATED', id)
    }

    await Promise.all(getters.getExchanges.map(id => getProducts(id)))

    await progress(`connecting to exchanges`)

    await this.dispatch('panes/refreshMarketsListeners')

    showIndexedProductsCount()
  },
  async toggleExchange({ commit, state, dispatch }, id: string) {
    commit('TOGGLE_EXCHANGE', id)

    if (state[id].disabled) {
      dispatch('disconnect', id)
    } else {
      dispatch('connect', id)
    }

    this.commit('app/EXCHANGE_UPDATED', id)
  },
  async disconnect({ rootState }, id: string) {
    const exchangeRegex = new RegExp(`^${id}:`, 'i')
    const markets = Object.keys(rootState.panes.marketsListeners).filter(p => exchangeRegex.test(p))

    console.log(`[exchanges.${id}] manually disconnecting ${markets.join(', ')}`)

    await aggregatorService.disconnect(markets)
  },
  async connect({ rootState }, id: string) {
    const exchangeRegex = new RegExp(`^${id}:`, 'i')
    const markets = Object.keys(rootState.panes.marketsListeners).filter(p => exchangeRegex.test(p))

    console.log(`[exchanges.${id}] manually connecting ${markets.join(', ')}`)

    await aggregatorService.connect(markets)
  },
  toggleExchangeVisibility({ commit }, id: string) {
    commit('TOGGLE_EXCHANGE_VISIBILITY', id)

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
  },
  TOGGLE_EXCHANGE_VISIBILITY: (state, id: string) => {
    let hidden = true

    if (typeof state[id].hidden === 'boolean') {
      hidden = !state[id].hidden
    }

    Vue.set(state[id], 'hidden', hidden)
  }
} as MutationTree<ExchangesState>

export default {
  namespaced: true,
  getters,
  state,
  actions,
  mutations
} as Module<ExchangesState, ModulesState>
