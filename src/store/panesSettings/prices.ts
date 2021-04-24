import { MutationTree, ActionTree, GetterTree, Module } from 'vuex'

export interface PricesPaneState {
  _id?: string
  animateSort?: boolean
  showPairs?: boolean
}

const getters = {} as GetterTree<PricesPaneState, PricesPaneState>

// https://coolors.co/d91f1c-eb1e2f-ef4352-77945c-3bca6d-00ff7f

const state = {
  animateSort: true,
  showPairs: false
} as PricesPaneState

const actions = {
  async boot() {
    //
  }
} as ActionTree<PricesPaneState, PricesPaneState>

const mutations = {
  TOGGLE_SORT_ANIMATION(state, value) {
    state.animateSort = value ? true : false
  },
  TOGGLE_PAIRS(state, value) {
    state.showPairs = value ? true : false
  }
} as MutationTree<PricesPaneState>

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
} as Module<PricesPaneState, PricesPaneState>
