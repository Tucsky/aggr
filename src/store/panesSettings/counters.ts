import { MutationTree, ActionTree, GetterTree, Module } from 'vuex'

export interface CountersPaneState {
  _id?: string
  granularity?: number
  liquidationsOnly?: boolean
  steps?: number[]
  count?: boolean
}

const getters = {} as GetterTree<CountersPaneState, CountersPaneState>

const state = {
  granularity: 5000,
  liquidationsOnly: false,
  steps: [30000, 60000, 900000, 1800000],
  count: false
} as CountersPaneState

const actions = {} as ActionTree<CountersPaneState, CountersPaneState>

const mutations = {
  REPLACE_COUNTERS(state, counters) {
    state.steps = counters.sort((a, b) => a - b)
  },
  TOGGLE_COUNT(state) {
    state.count = !state.count
  },
  TOGGLE_LIQUIDATIONS_ONLY(state) {
    state.liquidationsOnly = !state.liquidationsOnly
  }
} as MutationTree<CountersPaneState>

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
} as Module<CountersPaneState, CountersPaneState>
