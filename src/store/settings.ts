import { ActionTree, Module, MutationTree } from 'vuex'

import DEFAULTS_STATE from './defaultSettings.json'
import { getColorLuminance, getLogShade, splitRgba } from '@/utils/colors'
import { ModulesState } from '.'
import { SlippageMode } from '@/types/test'
import aggregatorService from '@/services/aggregatorService'
import audioService from '@/services/audioService'
import Vue from 'vue'

export interface SettingsState {
  preferQuoteCurrencySize?: boolean
  calculateSlippage?: SlippageMode
  aggregateTrades?: boolean
  theme?: string
  backgroundColor?: string
  textColor?: string
  timezoneOffset?: number
  useAudio?: boolean
  audioVolume?: number
  audioFilter?: boolean
  audioCompressor?: boolean
  audioPingPong?: boolean
  audioDelay?: boolean
  settings?: string[]
  recentColors?: string[]
  disableAnimations?: boolean
  decimalPrecision?: number
}

const state = Object.assign(
  {
    _id: 'settings'
  },
  DEFAULTS_STATE
) as SettingsState

const actions = {
  async boot({ state, dispatch }) {
    aggregatorService.dispatch({
      op: 'settings.calculateSlippage',
      data: state.calculateSlippage
    })

    aggregatorService.dispatch({
      op: 'settings.aggregateTrades',
      data: state.aggregateTrades
    })

    aggregatorService.dispatch({
      op: 'settings.preferQuoteCurrencySize',
      data: state.preferQuoteCurrencySize
    })

    dispatch('updateCSS')

    Vue.nextTick(() => {
      if (state.useAudio) {
        audioService.connect()
      } else {
        audioService.disconnect()
      }
    })
  },
  addRecentColor({ commit, state }, newColor) {
    if (state.recentColors.includes(newColor)) {
      return
    }

    if (state.recentColors.length >= 16) {
      commit('TRIM_RECENT_COLORS')
    }

    commit('ADD_RECENT_COLOR', newColor)
  },
  setBackgroundColor({ commit, state, dispatch }, rgb) {
    commit('SET_CHART_BACKGROUND_COLOR', rgb)

    const backgroundLuminance = getColorLuminance(splitRgba(rgb))
    const theme = backgroundLuminance > 144 ? 'light' : 'dark'

    if (theme !== state.theme) {
      commit('SET_CHART_THEME', theme)
    }

    if (state.textColor.length) {
      commit('SET_CHART_COLOR', '')
    }

    dispatch('updateCSS')
  },
  updateCSS({ state }) {
    const theme = state.theme
    const variantMultiplier = theme === 'light' ? 0.5 : 1
    const backgroundSide = theme === 'dark' ? 1 : -10
    const colorSide = theme === 'dark' ? -1 : 1
    const backgroundRgb = splitRgba(state.backgroundColor)

    document.documentElement.style.setProperty('--theme-background-base', state.backgroundColor)
    document.documentElement.style.setProperty('--theme-background-100', getLogShade(backgroundRgb, variantMultiplier * 0.02 * backgroundSide))
    document.documentElement.style.setProperty('--theme-background-150', getLogShade(backgroundRgb, variantMultiplier * 0.05 * backgroundSide))
    document.documentElement.style.setProperty('--theme-background-200', getLogShade(backgroundRgb, variantMultiplier * 0.075 * backgroundSide))
    document.documentElement.style.setProperty('--theme-background-300', getLogShade(backgroundRgb, variantMultiplier * 0.1 * backgroundSide))
    document.documentElement.style.setProperty('--theme-background-o75', `rgba(${backgroundRgb[0]}, ${backgroundRgb[1]},${backgroundRgb[2]}, .75)`)
    document.documentElement.style.setProperty('--theme-background-o20', `rgba(${backgroundRgb[0]}, ${backgroundRgb[1]},${backgroundRgb[2]}, .2)`)

    const colorInverse = theme !== 'light' ? 'rgb(17,17,17)' : 'rgb(246,246,246)'
    let textColor = state.textColor

    if (!textColor) {
      textColor = theme === 'light' ? 'rgb(17,17,17)' : 'rgb(246,246,246)'
    }

    const textColorRgb = splitRgba(textColor)

    document.documentElement.style.setProperty('--theme-color-base', textColor)
    document.documentElement.style.setProperty('--theme-color-100', getLogShade(textColorRgb, 0.1 * colorSide))
    document.documentElement.style.setProperty('--theme-color-150', getLogShade(textColorRgb, 0.3 * colorSide))
    document.documentElement.style.setProperty('--theme-color-200', getLogShade(textColorRgb, 0.5 * colorSide))
    document.documentElement.style.setProperty('--theme-color-o75', `rgba(${textColorRgb[0]}, ${textColorRgb[1]},${textColorRgb[2]}, .75)`)
    document.documentElement.style.setProperty('--theme-color-o20', `rgba(${textColorRgb[0]}, ${textColorRgb[1]},${textColorRgb[2]}, .2)`)

    document.documentElement.style.setProperty('--theme-color-inverse', colorInverse)
  },
  setQuoteCurrencySizing({ commit }, sizeInQuote: boolean) {
    commit('SET_QUOTE_CURRENCY_SIZING', sizeInQuote)

    this.dispatch('app/refreshCurrencies')
  },
  setAudioVolume({ commit, state }, volume: number) {
    commit('SET_AUDIO_VOLUME', volume)

    if (volume && !state.useAudio) {
      commit('TOGGLE_AUDIO', true)
    } else if (!volume && state.useAudio) {
      commit('TOGGLE_AUDIO', false)
    }
  }
} as ActionTree<SettingsState, ModulesState>

const mutations = {
  SET_QUOTE_AS_PREFERED_CURRENCY(state, value) {
    state.preferQuoteCurrencySize = value ? true : false

    aggregatorService.dispatch({
      op: 'settings.preferQuoteCurrencySize',
      data: state.preferQuoteCurrencySize
    })
  },
  TOGGLE_SLIPPAGE(state) {
    const values: SlippageMode[] = [false, 'bps', 'price']

    const index = Math.max(0, values.indexOf(state.calculateSlippage))

    state.calculateSlippage = values[(index + 1) % values.length]

    aggregatorService.dispatch({
      op: 'settings.calculateSlippage',
      data: state.calculateSlippage
    })
  },
  TOGGLE_AGGREGATION(state, value) {
    state.aggregateTrades = value ? true : false

    aggregatorService.dispatch({
      op: 'settings.aggregateTrades',
      data: state.aggregateTrades
    })
  },
  TOGGLE_ANIMATIONS(state) {
    state.disableAnimations = !state.disableAnimations
  },
  TOGGLE_SETTINGS_PANEL(state, value) {
    const index = state.settings.indexOf(value)

    if (index === -1) {
      state.settings.push(value)
    } else {
      state.settings.splice(index, 1)
    }
  },
  TOGGLE_AUDIO(state, value) {
    state.useAudio = value ? true : false

    if (state.useAudio) {
      audioService.connect()
    } else {
      audioService.disconnect()
    }
  },
  SET_AUDIO_VOLUME(state, value) {
    state.audioVolume = value
  },
  TOGGLE_AUDIO_COMPRESSOR(state) {
    state.audioCompressor = !state.audioCompressor
    audioService.reconnect()
  },
  TOGGLE_AUDIO_FILTER(state) {
    state.audioFilter = !state.audioFilter
    audioService.reconnect()
  },
  TOGGLE_AUDIO_DELAY(state) {
    state.audioDelay = !state.audioDelay
    audioService.reconnect()
  },
  TOGGLE_AUDIO_PING_PONG(state) {
    state.audioPingPong = !state.audioPingPong
    audioService.reconnect()
  },
  SET_CHART_BACKGROUND_COLOR(state, value) {
    state.backgroundColor = value
  },
  SET_CHART_THEME(state, value) {
    state.theme = value
  },
  SET_CHART_COLOR(state, value) {
    state.textColor = value
  },
  SET_TIMEZONE_OFFSET(state, value) {
    state.timezoneOffset = +value || 0
  },
  ADD_RECENT_COLOR(state, value) {
    state.recentColors.push(value)
  },
  TRIM_RECENT_COLORS(state) {
    state.recentColors.pop()
  },
  SET_DECIMAL_PRECISION(state, value) {
    state.decimalPrecision = value
  }
} as MutationTree<SettingsState>

export default {
  namespaced: true,
  state,
  actions,
  mutations
} as Module<SettingsState, ModulesState>
