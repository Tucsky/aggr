import { parseAmount } from '@/utils/helpers'
import { MutationTree, ActionTree, GetterTree, Module } from 'vuex'

export interface PricesPaneState {
  _id?: string
  animateSort?: boolean
  showPairs?: boolean
  showVolume?: boolean
  showVolumeDelta?: boolean
  period?: number
  showPrice?: boolean
  showChange?: boolean
  sortOrder?: 1 | -1
  sortType?: 'price' | 'change' | 'volume' | null
  shortSymbols?: boolean
  avgPeriods?: boolean
  volumeThreshold?: number
}

const getters = {} as GetterTree<PricesPaneState, PricesPaneState>

// https://coolors.co/d91f1c-eb1e2f-ef4352-77945c-3bca6d-00ff7f

const state = {
  animateSort: true,
  showPairs: true,
  showVolume: true,
  showVolumeDelta: true,
  period: 0,
  showChange: true,
  showPrice: true,
  sortType: 'change',
  sortOrder: -1,
  shortSymbols: false,
  avgPeriods: false,
  volumeThreshold: 0
} as PricesPaneState

const actions = {} as ActionTree<PricesPaneState, PricesPaneState>

const mutations = {
  TOGGLE_SORT_ANIMATION(state) {
    state.animateSort = !state.animateSort
  },
  TOGGLE_AVG_PERIODS(state) {
    state.avgPeriods = !state.avgPeriods
  },
  TOGGLE_SHORT_SYMBOLS(state) {
    state.shortSymbols = !state.shortSymbols
  },
  TOGGLE_PAIRS(state) {
    state.showPairs = !state.showPairs
  },
  TOGGLE_VOLUME(state) {
    state.showVolume = !state.showVolume
  },
  TOGGLE_VOLUME_DELTA(state) {
    state.showVolumeDelta = !state.showVolumeDelta
  },
  SET_PERIOD(state, value) {
    state.period = value
  },
  TOGGLE_CHANGE(state) {
    state.showChange = !state.showChange
  },
  TOGGLE_PRICE(state) {
    state.showPrice = !state.showPrice
  },
  TOGGLE_SORT_ORDER(state) {
    state.sortOrder = state.sortOrder > 0 ? -1 : 1
  },
  SET_SORT_TYPE(state, sortType) {
    state.sortType = sortType
  },
  SET_VOLUME_THRESHOLD(state, value) {
    state.volumeThreshold = parseAmount(value)
  }
} as MutationTree<PricesPaneState>

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
} as Module<PricesPaneState, PricesPaneState>
