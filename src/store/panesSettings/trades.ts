import { MutationTree, ActionTree, GetterTree, Module } from 'vuex'

import Vue from 'vue'
import { randomString } from '@/utils/helpers'

export interface Threshold {
  id: string
  amount: number
  buyColor: string
  sellColor: string
  buyAudio: string
  sellAudio: string
  gif?: string
}

export interface TradesPaneState {
  _id?: string
  _booted?: boolean
  liquidations: Threshold
  thresholds: Threshold[]
  audioThreshold: number
  showThresholdsAsTable: boolean
  maxRows: number
  showLogos: boolean
  monochromeLogos: boolean
  showTradesPairs: boolean
  liquidationsOnly: boolean
  multipliers: { [identifier: string]: number }
}

const getters = {
  getThreshold: state => id => {
    if (id === 'liquidations') {
      return state.liquidations
    }

    for (let i = 0; i < state.thresholds.length; i++) {
      if (state.thresholds[i].id === id) {
        return state.thresholds[i]
      }
    }
  }
} as GetterTree<TradesPaneState, TradesPaneState>

// https://coolors.co/d91f1c-eb1e2f-ef4352-77945c-3bca6d-00ff7f

const state = {
  liquidations: {
    id: 'liquidations',
    amount: 100000,
    buyColor: 'rgb(103,58,183)',
    sellColor: 'rgb(255,152,0)',
    buyAudio: `play(329.63, gain / 2, duration, 80, null, 'sine');
play(329.63, gain / 1.5, duration * 1.5, 80, null,'sine');`,
    sellAudio: `play(440, gain / 2, duration, 80, null,'sine');
play(440, gain / 1.5, duration * 1.5, 80, null,'sine');`
  },
  thresholds: [
    {
      id: 'threshold',
      amount: 250000,
      buyColor: 'rgba(119, 148, 92, .5)',
      sellColor: 'rgba(239, 67, 82,.5)',
      buyAudio: `play(659.26, gain / 2, duration, 50)`,
      sellAudio: `play(493.88, gain , duration, 50)`
    },
    {
      id: 'significant',
      amount: 500000,
      buyColor: 'rgb(100, 157, 102)',
      sellColor: 'rgb(239, 67, 82)',
      buyAudio: `play(659.26, gain * 0.5, duration, 80);
play(830.6, gain * 1.25, duration, 80)`,
      sellAudio: `play(493.88, gain * 0.5, duration, 80);
play(392, gain * 1.25, duration, 80)`
    },
    {
      id: 'huge',
      amount: 1000000,
      gif: 'cash',
      buyColor: 'rgb(59, 202, 109)',
      sellColor: 'rgb(235, 30, 47)',
      buyAudio: `play(659.26, gain * 0.5, duration * 0.75, 80);
play(830.6, gain * 0.5, duration * 0.75, 80);
play(987.76, gain * 0.5, duration * 0.75, 80);
play(1318.52, gain * 1, duration, 80)`,
      sellAudio: `play(493.88, gain * 0.5, duration * 0.25, 80);
play(369.99, gain * 0.5, duration * 0.5, 80);
play(293.66, gain * 0.5, duration * 0.75, 80);
play(246.94, gain * 1, duration, 80)`
    },
    {
      id: 'rare',
      amount: 10000000,
      gif: 'explosion',
      buyColor: 'rgb(0, 255, 127)',
      sellColor: 'rgb(217, 31, 28)',
      buyAudio: `play(659.26, gain * 0.5, duration * 0.75, 80);
play(830.6, gain * 0.5, duration * 0.75, 80);
play(987.76, gain * 0.5, duration * 0.75, 80);
play(1318.52, gain * 1, duration, 80)`,
      sellAudio: `play(493.88, gain * 0.5, duration * 0.25, 80);
play(369.99, gain * 0.5, duration * 0.5, 80);
play(293.66, gain * 0.5, duration * 0.75, 80);
play(246.94, gain * 1, duration, 80)`
    }
  ],
  audioThreshold: null,
  multipliers: {},
  showThresholdsAsTable: true,
  maxRows: 100,
  showTradesPairs: false,
  liquidationsOnly: false,
  showLogos: true,
  monochromeLogos: true
} as TradesPaneState

const actions = {
  async boot({ state }) {
    state._booted = true
  },
  updateThreshold({ state, commit }, { index, prop, value }: { index: number; prop: string; value: any }) {
    const threshold = state.thresholds[index]

    if (!threshold) {
      throw new Error('no threshold')
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
  },
  updateLiquidations({ state, commit }, { prop, value }: { prop: string; value: any }) {
    const threshold = state.liquidations

    if (!threshold) {
      throw new Error('no liquidation threshold')
    }

    commit('SET_LIQUIDATIONS_' + prop, value)
  }
} as ActionTree<TradesPaneState, TradesPaneState>

const mutations = {
  TOGGLE_TRADES_PAIRS(state) {
    state.showTradesPairs = !state.showTradesPairs
  },
  SET_MAX_ROWS(state, value) {
    state.maxRows = value
  },
  TOGGLE_LOGOS(state, value) {
    state.showLogos = value ? true : false
  },
  TOGGLE_MONOCHROME_LOGOS(state, value) {
    state.monochromeLogos = value ? true : false
  },
  TOGGLE_LIQUIDATIONS_ONLY(state) {
    state.liquidationsOnly = !state.liquidationsOnly
  },
  TOGGLE_THRESHOLDS_TABLE(state, value) {
    state.showThresholdsAsTable = value ? true : false
  },
  SET_THRESHOLD_AMOUNT(state, payload) {
    const threshold = this.getters[state._id + '/getThreshold'](payload.id)

    if (threshold) {
      if (typeof payload.value === 'string' && /m|k$/i.test(payload.value)) {
        if (/m$/i.test(payload.value)) {
          threshold.amount = parseFloat(payload.value) * 1000000
        } else {
          threshold.amount = parseFloat(payload.value) * 1000
        }
      }
      threshold.amount = +payload.value

      this.commit(state._id + '/UPDATE_THRESHOLD', threshold)
    }
  },
  SET_THRESHOLD_MULTIPLIER(state, { identifier, multiplier }: { identifier: string; multiplier: number }) {
    if (isNaN(multiplier) || multiplier < 0) {
      multiplier = 0
    }

    Vue.set(state.multipliers, identifier, multiplier)
  },
  SET_THRESHOLD_GIF(state, payload) {
    const threshold = this.getters[state._id + '/getThreshold'](payload.id)

    if (threshold) {
      if (payload.value.trim().length) {
        threshold.gif = payload.value
      } else {
        payload.value = threshold.gif
        payload.isDeleted = true

        threshold.gif = null
      }

      this.commit(state._id + '/UPDATE_THRESHOLD', threshold)
    }
  },
  SET_THRESHOLD_COLOR(state, payload) {
    const threshold = this.getters[state._id + '/getThreshold'](payload.id)

    if (threshold) {
      threshold[payload.side] = payload.value
    }
  },
  SET_THRESHOLD_AUDIO(state, payload) {
    const threshold = this.getters[state._id + '/getThreshold'](payload.id)

    if (threshold) {
      threshold['buyAudio'] = payload.buyAudio
      threshold['sellAudio'] = payload.sellAudio
    }
  },
  ADD_THRESHOLD(state) {
    const previousThreshold = state.thresholds[state.thresholds.length - 1]

    let buyAudio = `play(659.26, gain, duration, 50)`
    let sellAudio = `play(493.88, gain, duration, 50)`

    if (previousThreshold) {
      buyAudio = previousThreshold.buyAudio
      sellAudio = previousThreshold.sellAudio
    }

    state.thresholds.push({
      id: randomString(8),
      amount: state.thresholds[state.thresholds.length - 1].amount * 2,
      buyColor: 'rgb(0, 255, 0)',
      sellColor: 'rgb(255, 0, 0)',
      buyAudio,
      sellAudio
    })
  },
  DELETE_THRESHOLD(state, id: string) {
    const index = state.thresholds.indexOf(state.thresholds.find(t => t.id === id))

    state.thresholds.splice(index, 1)
  },
  UPDATE_THRESHOLD(state, threshold: Threshold) {
    if (threshold.id === 'liquidations') {
      state.liquidations = threshold
    } else {
      const index = state.thresholds.indexOf(state.thresholds.find(t => t.id === threshold.id))

      if (index === -1) {
        console.warn(`[${state._id}] couldn't update threshold ${threshold.id} (invalid index ${index})`)
        return
      }

      Vue.set(state.thresholds, index, threshold)
    }
  },
  SET_AUDIO_THRESHOLD(state, amount: number) {
    state.audioThreshold = amount
  }
} as MutationTree<TradesPaneState>

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
} as Module<TradesPaneState, TradesPaneState>
