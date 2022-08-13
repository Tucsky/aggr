import Vue from 'vue'

import { ActionTree, Module, MutationTree } from 'vuex'

import DEFAULTS_STATE from './defaultSettings.json'
import {
  getColorLuminance,
  getLinearShare,
  getLogShade,
  getTextColor,
  joinRgba,
  splitColorCode
} from '@/utils/colors'
import { ModulesState } from '.'
import {
  AggregationLength,
  PreviousSearchSelection,
  SlippageMode
} from '@/types/types'
import aggregatorService from '@/services/aggregatorService'
import audioService from '@/services/audioService'
import { getTimeframeForHuman } from '@/utils/helpers'
import { isTouchSupported } from '@/utils/touchevent'
import { getMarketProduct, parseMarket } from '../services/productsService'

export type AudioFilters = { [id: string]: boolean }
export interface SettingsState {
  preferQuoteCurrencySize?: boolean
  calculateSlippage?: SlippageMode
  aggregationLength?: AggregationLength
  theme?: string
  backgroundColor?: string
  textColor?: string
  buyColor?: string
  sellColor?: string
  timezoneOffset?: number
  useAudio?: boolean
  audioVolume?: number
  audioFilters?: AudioFilters
  settings?: string[]
  searchSections?: string[]
  disableAnimations?: boolean
  autoHideHeaders?: boolean
  searchTypes?: any
  searchQuotes?: any
  searchExchanges?: any
  previousSearchSelections?: PreviousSearchSelection[]
  timeframes?: { label: string; value: string }[]
  timeframeGroups?: string[]
  favoriteTimeframes?: { [timeframe: number]: string }
  normalizeWatermarks: boolean
  alerts: number | boolean
  alertsLineStyle: number
  alertsLineWidth: number
  alertsColor: string
  alertsClick: boolean
  alertSound: string
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
      op: 'configureAggregator',
      data: { key: 'calculateSlippage', value: state.calculateSlippage }
    })

    aggregatorService.dispatch({
      op: 'configureAggregator',
      data: { key: 'aggregationLength', value: state.aggregationLength }
    })

    aggregatorService.dispatch({
      op: 'configureAggregator',
      data: {
        key: 'preferQuoteCurrencySize',
        value: state.preferQuoteCurrencySize
      }
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
  async setColor(
    { commit, dispatch, state },
    { type, value }: { type: string; value: string }
  ) {
    state[type.toLowerCase() + 'Color'] = value

    const mutation = `SET_${type.toUpperCase()}_COLOR`

    if (mutation === 'SET_BACKGROUND_COLOR') {
      dispatch('refreshTheme')
    }

    dispatch('updateCSS')

    commit(mutation, value)
  },
  refreshTheme({ commit, state }) {
    const backgroundRgb = splitColorCode(state.backgroundColor)
    const backgroundLuminance = getColorLuminance(backgroundRgb)
    const theme = backgroundLuminance > 0 ? 'light' : 'dark'

    if (theme !== state.theme) {
      commit('SET_CHART_THEME', theme)
    }

    if (state.textColor) {
      commit('SET_TEXT_COLOR', '')
    }
  },
  updateCSS({ state }) {
    const theme = state.theme
    const backgroundDirection = theme === 'dark' ? 1 : -1
    const backgroundRgb = splitColorCode(state.backgroundColor)
    const background100Rgb = getLinearShare(
      backgroundRgb,
      0.025 * backgroundDirection
    )
    const background100 = joinRgba(background100Rgb)

    document.documentElement.style.setProperty(
      '--theme-background-base',
      state.backgroundColor
    )
    document.documentElement.style.setProperty(
      '--theme-background-100',
      background100
    )
    document.documentElement.style.setProperty(
      '--theme-background-150',
      joinRgba(getLinearShare(backgroundRgb, 0.05 * backgroundDirection))
    )
    document.documentElement.style.setProperty(
      '--theme-background-200',
      joinRgba(getLinearShare(backgroundRgb, 0.08 * backgroundDirection))
    )
    document.documentElement.style.setProperty(
      '--theme-background-300',
      joinRgba(getLinearShare(backgroundRgb, 0.125 * backgroundDirection))
    )

    // const background100 = splitColorCode(document.documentElement.style.getPropertyValue('--theme-background-100'))
    document.documentElement.style.setProperty(
      '--theme-background-o75',
      `rgba(${background100Rgb[0]}, ${background100Rgb[1]},${background100Rgb[2]}, .75)`
    )
    document.documentElement.style.setProperty(
      '--theme-background-o20',
      `rgba(${background100Rgb[0]}, ${background100Rgb[1]},${background100Rgb[2]}, .2)`
    )

    let textColor = state.textColor
    let textColorRgb

    if (!textColor) {
      textColorRgb = getTextColor(backgroundRgb, 1.25)
      textColor = joinRgba(textColorRgb)
    } else {
      textColorRgb = splitColorCode(textColor)
    }

    document.documentElement.style.setProperty('--theme-color-base', textColor)
    document.documentElement.style.setProperty(
      '--theme-color-100',
      joinRgba(getTextColor(backgroundRgb, 1.2))
    )
    document.documentElement.style.setProperty(
      '--theme-color-150',
      joinRgba(getTextColor(backgroundRgb, 1.4))
    )
    document.documentElement.style.setProperty(
      '--theme-color-200',
      joinRgba(getTextColor(backgroundRgb, 1.7))
    )
    document.documentElement.style.setProperty(
      '--theme-color-o75',
      `rgba(${textColorRgb[0]}, ${textColorRgb[1]},${textColorRgb[2]}, .75)`
    )
    document.documentElement.style.setProperty(
      '--theme-color-o50',
      `rgba(${textColorRgb[0]}, ${textColorRgb[1]},${textColorRgb[2]}, .5)`
    )
    document.documentElement.style.setProperty(
      '--theme-color-o20',
      `rgba(${textColorRgb[0]}, ${textColorRgb[1]},${textColorRgb[2]}, .2)`
    )
    document.documentElement.style.setProperty(
      '--theme-color-o10',
      `rgba(${textColorRgb[0]}, ${textColorRgb[1]},${textColorRgb[2]}, .1)`
    )
    document.documentElement.style.setProperty(
      '--theme-color-o05',
      `rgba(${textColorRgb[0]}, ${textColorRgb[1]},${textColorRgb[2]}, .05)`
    )

    const buyRgb = splitColorCode(state.buyColor)

    document.documentElement.style.setProperty(
      '--theme-buy-base',
      state.buyColor
    )
    document.documentElement.style.setProperty(
      '--theme-buy-100',
      getLogShade(buyRgb, 0.25)
    )
    document.documentElement.style.setProperty(
      '--theme-buy-color',
      joinRgba(getTextColor(buyRgb))
    )

    const sellRgb = splitColorCode(state.sellColor)

    document.documentElement.style.setProperty(
      '--theme-sell-base',
      state.sellColor
    )
    document.documentElement.style.setProperty(
      '--theme-sell-100',
      getLogShade(sellRgb, 0.25)
    )
    document.documentElement.style.setProperty(
      '--theme-sell-color',
      joinRgba(getTextColor(sellRgb))
    )
  },
  setAudioVolume({ commit, state }, volume: number) {
    commit('SET_AUDIO_VOLUME', volume)

    audioService.setVolume(volume)

    if (volume && !state.useAudio) {
      commit('TOGGLE_AUDIO', true)
    } else if (!volume && state.useAudio) {
      commit('TOGGLE_AUDIO', false)
    }
  },
  saveSearchSelection({ commit }, selection: string[]) {
    const sortedSelection = selection.sort((a, b) => a.localeCompare(b))

    const pairs = []
    const exchanges = []

    for (const market of sortedSelection) {
      const [exchange, pair] = parseMarket(market)
      const product = getMarketProduct(exchange, pair, true)

      const local = product.local

      if (pairs.indexOf(local) === -1) {
        pairs.push(local)
      }

      if (exchanges.indexOf(exchange) === -1) {
        exchanges.push(exchange)
      }
    }

    let label
    let count = 0

    if (sortedSelection.length === 1) {
      label = sortedSelection[0]
    } else if (exchanges.length === 1) {
      label = exchanges[0] + ':' + pairs.join('+')
      count = sortedSelection.length
    } else {
      label = pairs.join('+')
      count = sortedSelection.length
    }

    commit('SAVE_SEARCH_SELECTION', {
      label: label.length > 32 ? label.slice(0, 29) + '...' : label,
      markets: sortedSelection,
      count
    })
  }
} as ActionTree<SettingsState, ModulesState>

const mutations = {
  SET_QUOTE_AS_PREFERED_CURRENCY(state, value) {
    state.preferQuoteCurrencySize = value ? true : false

    aggregatorService.dispatch({
      op: 'configureAggregator',
      data: {
        key: 'preferQuoteCurrencySize',
        value: state.preferQuoteCurrencySize
      }
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
  TOGGLE_SEARCH_PANEL(state, value) {
    const index = state.searchSections.indexOf(value)

    if (index === -1) {
      state.searchSections.push(value)
    } else {
      state.searchSections.splice(index, 1)
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
  SET_BACKGROUND_COLOR(state, value) {
    state.backgroundColor = value
  },
  SET_CHART_THEME(state, value) {
    state.theme = value
  },
  SET_TEXT_COLOR(state, value) {
    state.textColor = value
  },
  SET_BUY_COLOR(state, value) {
    state.buyColor = value
  },
  SET_SELL_COLOR(state, value) {
    state.sellColor = value
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
  TOGGLE_SEARCH_QUOTE(state, { key, value }: { key: string; value: boolean }) {
    Vue.set(state.searchQuotes, key, value)
  },
  TOGGLE_SEARCH_EXCHANGE(state, key: string) {
    Vue.set(
      state.searchExchanges,
      key,
      typeof state.searchExchanges[key] === 'boolean'
        ? !state.searchExchanges[key]
        : false
    )
  },
  CLEAR_SEARCH_FILTERS(state) {
    for (const key in state.searchTypes) {
      if (key === 'normalize') {
        continue
      }

      state.searchTypes[key] = false
    }

    Vue.set(state, 'searchTypes', state.searchTypes)
    Vue.set(state, 'searchQuotes', {})
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
  },
  SET_ALERT_SOUND(state, value) {
    state.alertSound = value
  },
  SAVE_SEARCH_SELECTION(state, value) {
    const matchingSavedSearch = state.previousSearchSelections.find(
      a => a.label === value.label && a.count === value.count
    )

    if (matchingSavedSearch) {
      state.previousSearchSelections.splice(
        state.previousSearchSelections.indexOf(matchingSavedSearch),
        1
      )
    }
    state.previousSearchSelections.unshift(value)

    if (state.previousSearchSelections.length > 32) {
      state.previousSearchSelections.splice(
        32,
        state.previousSearchSelections.length - 32
      )
    }
  },
  CLEAR_SEARCH_HISTORY(state) {
    state.previousSearchSelections = []
  },
  REMOVE_SEARCH_HISTORY(state, markets) {
    const match = state.previousSearchSelections.find(
      a => a.markets === markets
    )

    if (match) {
      state.previousSearchSelections.splice(
        state.previousSearchSelections.indexOf(match),
        1
      )
    }
  },
  REMOVE_TIMEFRAME(state, value) {
    const index = state.timeframes.indexOf(
      state.timeframes.find(timeframe => timeframe.value === value)
    )

    if (index !== -1) {
      state.timeframes.splice(index, 1)
    }
  },
  ADD_TIMEFRAME(state, value) {
    state.timeframes.push({
      label: getTimeframeForHuman(value),
      value
    })
  },
  TOGGLE_TIMEFRAME_GROUP(state, value) {
    const index = state.timeframeGroups.indexOf(value)

    if (index === -1) {
      state.timeframeGroups.push(value)
    } else {
      state.timeframeGroups.splice(index, 1)
    }
  }
} as MutationTree<SettingsState>

export default {
  namespaced: true,
  state,
  actions,
  mutations
} as Module<SettingsState, ModulesState>
