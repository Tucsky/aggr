import { MutationTree, ActionTree, GetterTree, Module } from 'vuex'

export interface PricesPaneState {
  _id?: string
  _booted?: boolean
  animateSort?: boolean
  showPairs?: boolean
  boldFont?: boolean
}

const getters = {} as GetterTree<PricesPaneState, PricesPaneState>

// https://coolors.co/d91f1c-eb1e2f-ef4352-77945c-3bca6d-00ff7f

const state = {
  animateSort: true,
  showPairs: false,
  boldFont: false
} as PricesPaneState

const actions = {
  async boot({ state }) {
    state._booted = true
    //
  }
} as ActionTree<PricesPaneState, PricesPaneState>

const mutations = {
  TOGGLE_SORT_ANIMATION(state) {
    state.animateSort = !state.animateSort
  },
  TOGGLE_PAIRS(state) {
    state.showPairs = !state.showPairs
  },
  TOGGLE_BOLD_FONT(state) {
    state.boldFont = !state.boldFont
  }
} as MutationTree<PricesPaneState>

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
} as Module<PricesPaneState, PricesPaneState>
