import { MutationTree, ActionTree, GetterTree, Module } from 'vuex'

import Vue from 'vue'
import { parseAmount, randomString } from '@/utils/helpers'
import { formatMarketPrice } from '@/services/productsService'
import { ModulesState } from '..'
import { getLogShade, joinRgba, splitColorCode } from '@/utils/colors'
import defaultTresholds from '@/store/defaultThresholds.json'

export interface Threshold {
  id: string
  amount: number
  buyColor: string
  sellColor: string
  buyAudio: string
  sellAudio: string
  buyGif?: string
  sellGif?: string
  max?: boolean
}

export type TradeTypeFilter = 'both' | 'liquidations' | 'trades'

export interface TradesPaneState {
  _id?: string
  liquidations: Threshold[]
  thresholds: Threshold[]
  audioThreshold: number
  muted: boolean
  audioPitch: number
  audioVolume: number
  maxRows: number
  showPairs: boolean
  showTimeAgo: boolean
  showPrices: boolean
  showHistograms: boolean
  showTrades: boolean
  showLiquidations: boolean
  showLogos: boolean
  monochromeLogos: boolean
  multipliers: { [identifier: string]: number }
  thresholdsMultipler: number
  showAvgPrice: boolean
}

const getters = {
  getThreshold: state => (id: string) => {
    for (let i = 0; i < state.thresholds.length; i++) {
      if (state.thresholds[i].id === id) {
        return state.thresholds[i]
      }
    }

    for (let i = 0; i < state.liquidations.length; i++) {
      if (state.liquidations[i].id === id) {
        return state.liquidations[i]
      }
    }
  }
} as GetterTree<TradesPaneState, ModulesState>

const state = {
  liquidations: [],
  thresholds: [],
  audioThreshold: null,
  multipliers: {},
  maxRows: 100,
  muted: false,
  audioPitch: null,
  audioVolume: null,
  showPairs: false,
  showTrades: true,
  showLiquidations: true,
  showLogos: true,
  monochromeLogos: false,
  showTimeAgo: true,
  showPrices: true,
  showHistograms: true,
  thresholdsMultipler: 1,
  showAvgPrice: true
} as TradesPaneState

const actions = {
  boot({ state }) {
    if (
      !state.thresholds.length ||
      (state.thresholds.length === 1 &&
        typeof state.thresholds[0].id === 'undefined')
    ) {
      state.thresholds = defaultTresholds.thresholds
    }

    if (
      !state.liquidations.length ||
      (state.liquidations.length === 1 &&
        typeof state.liquidations[0].id === 'undefined')
    ) {
      state.liquidations = defaultTresholds.liquidations
    }
  },
  updateThreshold(
    { state, commit },
    { index, prop, value }: { index: number; prop: string; value: any }
  ) {
    const threshold = state.thresholds[index]

    if (!threshold) {
      throw new Error('No threshold')
    }

    let payload = {
      index
    } as any

    if (value && typeof value === 'object') {
      payload = { ...payload, ...value }
    } else {
      payload.value = value
    }

    commit('SET_THRESHOLD_' + prop, payload)

    state.thresholds = JSON.parse(JSON.stringify(state.thresholds))
  },
  generateSwatch(
    { state },
    {
      color,
      side,
      type = 'thresholds',
      baseVariance = 0.15
    }: {
      color: string
      side: 'buy' | 'sell'
      type: 'thresholds' | 'liquidations'
      baseVariance: number
    }
  ) {
    const count = state[type].length
    const baseMultipler = (count / 2) * -baseVariance
    const colorRgb = color ? splitColorCode(color) : null
    const name = `${side}Color`

    if (!colorRgb) {
      return
    }

    for (let i = 0; i < count; i++) {
      if (i === 1) {
        state[type][i][name] = joinRgba([
          colorRgb[0],
          colorRgb[1],
          colorRgb[2],
          (colorRgb[3] || 1) * 0.8
        ])
      } else {
        const buyScaled = getLogShade(
          colorRgb,
          baseMultipler + baseVariance * (i ? i : -0.5)
        )
        if (!i) {
          buyScaled[3] = 0.5
        }
        state[type][i][name] = joinRgba(buyScaled)
      }
    }
  },
  upgradeToLite({ state }) {
    this.dispatch('panes/resetPane', {
      id: state._id,
      data: state,
      type: 'trades-lite'
    })
  }
} as ActionTree<TradesPaneState, ModulesState>

const mutations = {
  SET_MAX_ROWS(state, value) {
    state.maxRows = value
  },
  TOGGLE_MUTED(state) {
    state.muted = !state.muted

    if (!state.muted && state.audioVolume === 0) {
      state.audioVolume = null
    }
  },
  SET_AUDIO_PITCH(state, value) {
    if (typeof value === 'string') {
      value = value.replace(/[^0-9-.]/g, '')
    }

    value = +value

    if (!value || value === 1) {
      state.audioPitch = null
    } else {
      state.audioPitch = value
    }
  },
  SET_AUDIO_VOLUME(state, value) {
    if (typeof value === 'string') {
      value = value.replace(/[^0-9-.]/g, '')
    }

    if (isNaN(+value) || value === null) {
      state.audioVolume = null
    } else {
      state.audioVolume = +(+value).toFixed(2)

      if (state.audioVolume === 0 && !state.muted) {
        state.muted = true
      } else if (state.audioVolume > 0 && state.muted) {
        state.muted = false
      }
    }
  },
  TOGGLE_PREFERENCE(state, key) {
    state[key] = !state[key]
  },
  SET_THRESHOLD_AMOUNT(state, { id, value }) {
    const threshold = this.getters[state._id + '/getThreshold'](id)

    if (threshold) {
      threshold.amount = parseAmount(value)
    }
  },
  TOGGLE_THRESHOLD_MAX(state, id) {
    const threshold = this.getters[state._id + '/getThreshold'](id)

    if (threshold) {
      Vue.set(threshold, 'max', !threshold.max)
    }
  },
  SET_THRESHOLD_MULTIPLIER(
    state,
    { identifier, multiplier }: { identifier: string; multiplier: number }
  ) {
    if (multiplier === null || isNaN(multiplier) || multiplier < 0) {
      Vue.delete(state.multipliers, identifier)
      return
    }

    if (multiplier === 0) {
      multiplier = 0.01
    }

    Vue.set(state.multipliers, identifier, multiplier)
  },
  SET_THRESHOLD_GIF(state, payload) {
    const threshold = this.getters[state._id + '/getThreshold'](payload.id)

    const key = payload.side + 'Gif'

    if (threshold) {
      if (payload.value.trim().length) {
        threshold[key] = payload.value
      } else {
        payload.value = threshold.gif
        payload.isDeleted = true

        threshold[key] = null
      }
    }
  },
  SET_THRESHOLD_COLOR(state, { id, side, value }) {
    if (!id) {
      return
    }

    const threshold = this.getters[state._id + '/getThreshold'](id)

    if (threshold) {
      threshold[side] = value
    }
  },
  SET_THRESHOLD_AUDIO(state, { id, buyAudio, sellAudio }) {
    const threshold = this.getters[state._id + '/getThreshold'](id)

    if (threshold) {
      threshold['buyAudio'] = buyAudio
      threshold['sellAudio'] = sellAudio
    }
  },
  ADD_THRESHOLD(state, type) {
    const previousThreshold = state[type][state[type].length - 1]

    let buyAudio = `play(659.26, ratio, ratio, 0)`
    let sellAudio = `play(493.88, ratio, ratio, 0)`

    if (previousThreshold) {
      buyAudio = previousThreshold.buyAudio
      sellAudio = previousThreshold.sellAudio
    }

    state[type].push({
      id: randomString(8),
      amount: state[type][state[type].length - 1].amount * 2,
      buyColor: 'rgb(0, 255, 0)',
      sellColor: 'rgb(255, 0, 0)',
      buyAudio,
      sellAudio
    })
  },
  DELETE_THRESHOLD(state, id: string) {
    const tradesIndex = state.thresholds.indexOf(
      state.thresholds.find(t => t.id === id)
    )

    if (tradesIndex !== -1) {
      state.thresholds.splice(tradesIndex, 1)

      return
    }

    const liquidationsIndex = state.liquidations.indexOf(
      state.liquidations.find(t => t.id === id)
    )

    if (liquidationsIndex !== -1) {
      state.liquidations.splice(liquidationsIndex, 1)

      return
    }
  },
  SET_AUDIO_THRESHOLD(state, amount: number) {
    state.audioThreshold = amount
  },
  SET_THRESHOLDS_MULTIPLER(
    state,
    { value, market }: { value: number; market: string }
  ) {
    value = Math.max(value, 0.01)
    const change =
      (value - state.thresholdsMultipler) / state.thresholdsMultipler

    state.thresholdsMultipler = value

    for (const threshold of state.thresholds) {
      threshold.amount = +formatMarketPrice(
        threshold.amount + threshold.amount * change,
        market
      )
    }

    for (const threshold of state.liquidations) {
      threshold.amount = +formatMarketPrice(
        threshold.amount + threshold.amount * change,
        market
      )
    }
  }
} as MutationTree<TradesPaneState>

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
} as Module<TradesPaneState, ModulesState>
