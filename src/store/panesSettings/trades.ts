import { MutationTree, ActionTree, GetterTree, Module } from 'vuex'

import Vue from 'vue'
import { randomString } from '@/utils/helpers'
import { scheduleSync } from '@/utils/store'

export interface Threshold {
  id: string
  amount: number
  buyColor: string
  sellColor: string
  buyAudio: string
  sellAudio: string
  gif?: string
}

export type TradeTypeFilter = 'both' | 'liquidations' | 'trades'

export interface TradesPaneState {
  _id?: string
  _booted?: boolean
  liquidations: Threshold
  thresholds: Threshold[]
  audioThreshold: number
  showThresholdsAsTable: boolean
  tradeType: TradeTypeFilter
  muted: boolean
  audioPitch: number
  audioVolume: number
  maxRows: number
  showLogos: boolean
  monochromeLogos: boolean
  showTradesPairs: boolean
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
    sellColor: 'rgb(103,58,183)',
    buyAudio: "var srqtR = Math.min(1, gain / 4)\nplay(329.63, srqtR, srqtR*5,0,,,'sine')\nplay(329.63, srqtR, srqtR*8,0.1,,,'sine')",
    sellAudio: "var srqtR = Math.min(1, gain / 6)\nplay(440, srqtR, srqtR*5,0,,,'sine')\nplay(440, srqtR, srqtR*8,0.1,,,'sine')"
  },
  thresholds: [
    {
      id: 'threshold',
      amount: 100000,
      buyColor: 'rgba(119, 148, 92, 0.5)',
      sellColor: 'rgba(239, 67, 82, 0.5)',
      buyAudio: `play(659.26, gain / 10, 0.1 + gain / 6)`,
      sellAudio: `play(493.88, gain * 1.5 / 10, 0.1 + gain / 6)`
    },
    {
      id: 'significant',
      amount: 250000,
      buyColor: 'rgb(100, 157, 102)',
      sellColor: 'rgb(239, 67, 82)',
      buyAudio: `play(659.26, 0.05 + gain / 10, 0.2 + ratio * 0.23,0,,0);
play(830.6, 0.05 + gain / 10, 0.2 + ratio * 0.23, 0.08,,0)`,
      sellAudio: `play(493.88, 0.05 + gain * 1.5 / 10, 0.2 + ratio * 0.23,0,,0);
play(392, 0.05 + gain * 1.5 / 10, 0.2 + ratio * 0.23, 0.08,,0)`
    },
    {
      id: 'huge',
      amount: 1000000,
      gif: 'cash',
      buyColor: 'rgb(59, 202, 109)',
      sellColor: 'rgb(235, 30, 47)',
      buyAudio: `play(659.26, 0.05 + gain / 25, 0.1 + ratio * 0.23, 0,,0);
play(830.6, 0.05 + gain / 25, 0.1 + ratio * 0.23, 0.08,,0);
play(987.76, 0.05 + gain / 25, 0.1 + ratio * 0.23, 0.16,,0);
play(1318.52, 0.05 + gain / 10, 0.1 + ratio * 0.23, 0.24,,0)`,
      sellAudio: `play(493.88, 0.05 + gain / 25, 0.1 + ratio * 0.23, 0,,0);
play(369.99, 0.05 + gain * 1.5 / 10, 0.2, 0.08,,0);
play(293.66, 0.05 + gain * 1.5 / 10, 0.2, 0.16,,0);
play(246.94, 0.05 + gain * 1.5 / 10, 0.1 + ratio * 0.23, 0.24,,0)`
    },
    {
      id: 'rare',
      amount: 10000000,
      gif: 'explosion',
      buyColor: 'rgb(0, 255, 127)',
      sellColor: 'rgb(217, 31, 28)',
      buyAudio: `play(659.26, 0.05 + gain / 25, 0.1 + ratio * 0.13, 0,,0);
play(830.6, 0.05 + gain / 25, 0.1 + ratio * 0.13, 0.08,,0);
play(987.76, 0.05 + gain / 25, 0.1 + ratio * 0.13, 0.16,,0);
play(1318.52, 0.05 + gain / 10, 0.1 + ratio * 0.13, 0.24,,0)`,
      sellAudio: `play(493.88, 0.05 + gain / 25, 0.1 + ratio * 0.13, 0,,0);
play(369.99, 0.05 + gain * 1.5 / 10, 0.2, 0.08,,0);
play(293.66, 0.05 + gain * 1.5 / 10, 0.2, 0.16,,0);
play(246.94, 0.05 + gain * 1.5 / 10, 0.1 + ratio * 0.13, 0.24,,0)`
    }
  ],
  audioThreshold: null,
  multipliers: {},
  showThresholdsAsTable: true,
  maxRows: 100,
  muted: false,
  audioPitch: null,
  audioVolume: null,
  showTradesPairs: false,
  tradeType: 'both',
  showLogos: true,
  monochromeLogos: true
} as TradesPaneState

const actions = {
  async boot({ state }) {
    // 15th june 2021 retrocompatibillity with liquidationsOnly property
    if (typeof (state as any).liquidationsOnly === 'boolean') {
      state.tradeType = 'liquidations'
      delete (state as any).liquidationsOnly
      scheduleSync(state)
    }

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
      state.audioVolume = +value

      if (state.audioVolume === 0 && !state.muted) {
        state.muted = true
      } else if (state.audioVolume > 0 && state.muted) {
        state.muted = false
      }
    }
  },
  TOGGLE_MONOCHROME_LOGOS(state, value) {
    state.monochromeLogos = value ? true : false
  },
  TOGGLE_TRADE_TYPE(state) {
    const values: TradeTypeFilter[] = ['both', 'liquidations', 'trades']

    const index = Math.max(0, values.indexOf(state.tradeType))

    state.tradeType = values[(index + 1) % values.length]
  },
  TOGGLE_THRESHOLDS_TABLE(state, value) {
    state.showThresholdsAsTable = value ? true : false
  },
  SET_THRESHOLD_AMOUNT(state, { id, value }) {
    const threshold = this.getters[state._id + '/getThreshold'](id)

    if (threshold) {
      if (typeof value === 'string' && /m|k$/i.test(value)) {
        if (/m$/i.test(value)) {
          threshold.amount = parseFloat(value) * 1000000
        } else {
          threshold.amount = parseFloat(value) * 1000
        }
      }
      threshold.amount = +value

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
  SET_THRESHOLD_COLOR(state, { id, side, value }) {
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
  ADD_THRESHOLD(state) {
    const previousThreshold = state.thresholds[state.thresholds.length - 1]

    let buyAudio = `play(659.26, ratio, ratio, 0)`
    let sellAudio = `play(493.88, ratio, ratio, 0)`

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
