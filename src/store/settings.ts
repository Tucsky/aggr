import { ActionTree, Module, MutationTree } from 'vuex'

import DEFAULTS_STATE from './defaultSettings.json'
import { getColorLuminance, getLogShade, increaseBrightness, joinRgba, splitRgba } from '@/utils/colors'
import { ModulesState } from '.'
import { AggregationLength, SlippageMode } from '@/types/test'
import aggregatorService from '@/services/aggregatorService'
import audioService from '@/services/audioService'
import Vue from 'vue'
import { getTimeframeForHuman } from '@/utils/helpers'
import { isTouchSupported } from '@/utils/touchevent'

export type AudioFilters = { [id: string]: boolean }
export interface SettingsState {
  preferQuoteCurrencySize?: boolean
  calculateSlippage?: SlippageMode
  aggregationLength?: AggregationLength
  theme?: string
  backgroundColor?: string
  textColor?: string
  timezoneOffset?: number
  useAudio?: boolean
  audioVolume?: number
  audioFilters?: AudioFilters
  settings?: string[]
  disableAnimations?: boolean
  autoHideHeaders?: boolean
  searchTypes?: any
  searchExchanges?: any
  favoriteTimeframes?: { [timeframe: number]: string }
  normalizeWatermarks: boolean
  alerts: number | boolean
  alertsLineStyle: number
  alertsLineWidth: number
  alertsColor: string
  alertsClick: boolean
}

const state = Object.assign(
  {
    _id: 'settings'
  },
  DEFAULTS_STATE
) as SettingsState

const actions = {
  async boot({ state, dispatch }) {
    if (state.alertsClick === null) {
      state.alertsClick = window.innerWidth >= 768
    }

    aggregatorService.dispatch({
      op: 'configureAggregator',
      data: { key: 'calculateSlippage', value: state.calculateSlippage }
    })

    aggregatorService.dispatch({
      op: 'configureAggregator',
      data: { key: 'aggregationLength', value: state.aggregationLength }
    })

    aggregatorService.dispatch({
      op: 'configureAggregator',
      data: { key: 'preferQuoteCurrencySize', value: state.preferQuoteCurrencySize }
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
  setTextColor({ commit, dispatch }, rgb) {
    commit('SET_CHART_COLOR', rgb)

    dispatch('updateCSS')
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
    const background100 = getLogShade(backgroundRgb, variantMultiplier * 0.015 * backgroundSide)
    const background100Rgb = splitRgba(background100)

    document.documentElement.style.setProperty('--theme-background-base', state.backgroundColor)
    document.documentElement.style.setProperty('--theme-background-100', background100)
    document.documentElement.style.setProperty('--theme-background-150', getLogShade(backgroundRgb, variantMultiplier * 0.05 * backgroundSide))
    document.documentElement.style.setProperty('--theme-background-200', getLogShade(backgroundRgb, variantMultiplier * 0.075 * backgroundSide))
    document.documentElement.style.setProperty('--theme-background-300', getLogShade(backgroundRgb, variantMultiplier * 0.1 * backgroundSide))

    // const background100 = splitRgba(document.documentElement.style.getPropertyValue('--theme-background-100'))
    document.documentElement.style.setProperty(
      '--theme-background-o75',
      `rgba(${background100Rgb[0]}, ${background100Rgb[1]},${background100Rgb[2]}, .75)`
    )
    document.documentElement.style.setProperty(
      '--theme-background-o20',
      `rgba(${background100Rgb[0]}, ${background100Rgb[1]},${background100Rgb[2]}, .2)`
    )

    const colorInverse = theme !== 'light' ? 'rgb(17,17,17)' : 'rgb(246,246,246)'
    let textColor = state.textColor

    if (!textColor) {
      textColor = theme === 'light' ? 'rgb(17,17,17)' : 'rgb(246,246,246)'
    }

    const textColorRgb = splitRgba(textColor)

    document.documentElement.style.setProperty('--theme-color-base', textColor)
    document.documentElement.style.setProperty('--theme-color-100', getLogShade(textColorRgb, 0.1 * colorSide))
    document.documentElement.style.setProperty('--theme-color-150', getLogShade(textColorRgb, 0.2 * colorSide))
    document.documentElement.style.setProperty('--theme-color-200', getLogShade(textColorRgb, 0.5 * colorSide))
    document.documentElement.style.setProperty('--theme-color-700', getLogShade(textColorRgb, 0.9 * colorSide))
    document.documentElement.style.setProperty('--theme-color-accent', joinRgba(increaseBrightness(textColorRgb, 2)))
    document.documentElement.style.setProperty('--theme-color-o75', `rgba(${textColorRgb[0]}, ${textColorRgb[1]},${textColorRgb[2]}, .75)`)
    document.documentElement.style.setProperty('--theme-color-o50', `rgba(${textColorRgb[0]}, ${textColorRgb[1]},${textColorRgb[2]}, .5)`)
    document.documentElement.style.setProperty('--theme-color-o20', `rgba(${textColorRgb[0]}, ${textColorRgb[1]},${textColorRgb[2]}, .2)`)

    document.documentElement.style.setProperty('--theme-color-inverse', colorInverse)
  },
  setAudioVolume({ commit, state }, volume: number) {
    commit('SET_AUDIO_VOLUME', volume)

    audioService.setVolume(volume)

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
      op: 'configureAggregator',
      data: { key: 'preferQuoteCurrencySize', value: state.preferQuoteCurrencySize }
    })
  },
  TOGGLE_SLIPPAGE(state) {
    const values: SlippageMode[] = [false, 'bps', 'price']

    const index = Math.max(0, values.indexOf(state.calculateSlippage))

    state.calculateSlippage = values[(index + 1) % values.length]

    aggregatorService.dispatch({
      op: 'configureAggregator',
      data: { key: 'calculateSlippage', value: state.calculateSlippage }
    })
  },
  TOGGLE_AGGREGATION(state) {
    const values: AggregationLength[] = [0, 1, 10, 100, 1000]

    const index = Math.max(0, values.indexOf(state.aggregationLength))

    state.aggregationLength = values[(index + 1) % values.length]

    aggregatorService.dispatch({
      op: 'configureAggregator',
      data: { key: 'aggregationLength', value: state.aggregationLength }
    })
  },
  TOGGLE_ANIMATIONS(state) {
    state.disableAnimations = !state.disableAnimations
  },
  TOGGLE_NORMAMIZE_WATERMARKS(state) {
    state.normalizeWatermarks = !state.normalizeWatermarks
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
  SET_AUDIO_FILTER(state, { id, value }: { id: string; value: boolean }) {
    state.audioFilters[id] = value
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
  TOGGLE_AUTO_HIDE_HEADERS(state) {
    state.autoHideHeaders = !state.autoHideHeaders
  },
  TOGGLE_SEARCH_TYPE(state, key: string) {
    Vue.set(state.searchTypes, key, !state.searchTypes[key])
  },
  TOGGLE_SEARCH_EXCHANGE(state, key: string) {
    Vue.set(state.searchExchanges, key, typeof state.searchExchanges[key] === 'boolean' ? !state.searchExchanges[key] : false)
  },
  CLEAR_SEARCH_FILTERS(state) {
    for (const key in state.searchTypes) {
      if (key === 'normalize') {
        continue
      }

      state.searchTypes[key] = false
    }

    Vue.set(state, 'searchTypes', state.searchTypes)
  },
  TOGGLE_FAVORITE_TIMEFRAME(state, value) {
    if (typeof state.favoriteTimeframes[value] === 'undefined') {
      Vue.set(state.favoriteTimeframes, value, getTimeframeForHuman(value))
    } else {
      Vue.delete(state.favoriteTimeframes, value)
    }
  },
  TOGGLE_ALERTS(state, value) {
    state.alerts = typeof value !== 'undefined' ? value : !state.alerts

    if (value && isTouchSupported()) {
      state.alertsClick = true
    }
  },
  SET_ALERTS_COLOR(state, value) {
    state.alertsColor = value
  },
  SET_ALERTS_LINESTYLE(state, value) {
    state.alertsLineStyle = Math.max(0, Math.min(4, value))
  },
  SET_ALERTS_LINEWIDTH(state, value) {
    state.alertsLineWidth = Math.max(0, +value || 0)
  },
  TOGGLE_ALERTS_CLICK(state) {
    state.alertsClick = !state.alertsClick
  }
} as MutationTree<SettingsState>

export default {
  namespaced: true,
  state,
  actions,
  mutations
} as Module<SettingsState, ModulesState>
