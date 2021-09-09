import dialogService from '@/services/dialogService'
import workspacesService from '@/services/workspacesService'
import { parseMarket, sleep, slugify, uniqueName } from '@/utils/helpers'
import { scheduleSync } from '@/utils/store'
import { PriceScaleMargins, PriceScaleMode, SeriesOptions, SeriesType } from 'lightweight-charts'
import Vue from 'vue'
import { MutationTree, ActionTree, GetterTree, Module } from 'vuex'
import { ModulesState } from '..'

export interface PriceScaleSettings {
  scaleMargins?: PriceScaleMargins
  mode?: PriceScaleMode
}

export interface IndicatorSettings {
  id?: string
  name?: string
  displayName?: string
  description?: string
  script?: string
  options?: SeriesOptions<SeriesType>
  createdAt?: number
  updatedAt?: number
  unsavedChanges?: boolean
  series?: string[]
}
export interface ChartPaneState {
  _id?: string
  _booted?: boolean
  indicators?: { [id: string]: IndicatorSettings }
  priceScales: { [id: string]: PriceScaleSettings }
  layouting: boolean | string
  timeframe: number
  indicatorsErrors: { [indicatorId: string]: string }
  refreshRate?: number
  showLegend: boolean
  fillGapsWithEmpty: boolean
  showHorizontalGridlines: boolean
  horizontalGridlinesColor: string
  showVerticalGridlines: boolean
  verticalGridlinesColor: string
  showWatermark: boolean
  watermarkColor: string
  hiddenMarkets: { [indicatorId: string]: boolean }
  barSpacing: number
}

const getters = {} as GetterTree<ChartPaneState, ModulesState>

const state = {
  indicatorsErrors: {},
  indicators: {},
  priceScales: {
    right: {
      scaleMargins: {
        top: 0.04,
        bottom: 0.21
      }
    }
  },
  layouting: false,
  timeframe: 10,
  refreshRate: 1000,
  showLegend: true,
  fillGapsWithEmpty: true,
  showHorizontalGridlines: false,
  horizontalGridlinesColor: 'rgba(255,255,255,.1)',
  showVerticalGridlines: false,
  verticalGridlinesColor: 'rgba(255,255,255,.1)',
  showWatermark: false,
  watermarkColor: 'rgba(255,255,255,.1)',
  hiddenMarkets: {},
  barSpacing: null
} as ChartPaneState

const actions = {
  async boot({ state }) {
    state.indicatorsErrors = {} // let chart recalculate potential errors
    state.layouting = false // start without layouting overlay

    /*if (!Object.keys(state.indicators).length) {
      const indicators = await workspacesService.getIndicators()

      for (const indicator of indicators) {
        if ((indicator as any).enabled === false) {
          continue
        }

        if (!indicator.series) {
          indicator.series = []
        }

        Vue.set(state.indicators, indicator.id, indicator)
      }

      scheduleSync(state)
    }*/

    state._booted = true
  },
  addIndicator({ commit }, indicator) {
    // const ids = Object.keys(state.indicators)
    // const id = uniqueName(slugify(indicator.name), ids)

    indicator = {
      script: 'plotline(avg_close(bar))',
      ...indicator,
      options: {
        priceScaleId: indicator.priceScaleId || indicator.id,
        ...indicator.options
      }
    }

    commit('ADD_INDICATOR', indicator)

    return indicator.id
  },
  toggleSerieVisibility({ commit, state }, id) {
    commit('SET_INDICATOR_OPTION', {
      id,
      key: 'visible',
      value:
        !state.indicators[id].options || typeof state.indicators[id].options.visible === 'undefined' ? false : !state.indicators[id].options.visible
    })
  },
  setIndicatorOption({ commit, state }, { id, key, value }) {
    try {
      value = JSON.parse(value)
    } catch (error) {
      // empty
    }

    if (state.indicators[id] && state.indicators[id].options[key] === value) {
      return
    }

    commit('SET_INDICATOR_OPTION', { id, key, value })

    if (!state.indicators[id].unsavedChanges) {
      commit('FLAG_INDICATOR_AS_UNSAVED', id)
    }

    if (state.indicators[id].name.indexOf(key) !== -1) {
      commit('UPDATE_INDICATOR_DISPLAY_NAME', id)
    }
  },
  async removeIndicator({ state, commit, dispatch }, { id, confirm = true }: { id: string; confirm?: boolean }) {
    if (
      state.indicators[id].unsavedChanges &&
      confirm &&
      (await dialogService.confirm({
        message: `You have unsaved changes on "${id}".<br>Save this indicator to workspace before remove ?`,
        cancel: 'DISCARD',
        ok: 'SAVE'
      }))
    ) {
      await dispatch('saveIndicator', id)
    }

    commit('REMOVE_INDICATOR', id)

    await sleep(100)
  },
  async saveIndicator({ state, commit, dispatch }, id) {
    commit('FLAG_INDICATOR_AS_SAVED', id)

    workspacesService.saveIndicator(state.indicators[id])

    await dispatch('transferIndicator', state.indicators[id])
  },
  async renameIndicator({ commit, state, dispatch }, { id, name }) {
    const newId = uniqueName(slugify(name), Object.keys(state.indicators))

    const indicatorCopy = JSON.parse(JSON.stringify(state.indicators[id]))

    const indicator = { ...indicatorCopy, name, id: newId }

    commit('ADD_INDICATOR', indicator)

    dispatch('removeIndicator', { id, confirm: false })

    return newId
  },
  transferIndicator({ state, rootState }, indicator: IndicatorSettings) {
    for (const paneId in rootState.panes.panes) {
      if (paneId === state._id || rootState.panes.panes[paneId].type !== 'chart') {
        continue
      }

      const otherPaneIndicator = rootState[paneId].indicators[indicator.id] as IndicatorSettings

      if (!otherPaneIndicator.unsavedChanges) {
        otherPaneIndicator.options = indicator.options

        this.commit(paneId + '/SET_INDICATOR_SCRIPT', { id: indicator.id })
      }
    }
  },
  async rollbackIndicator({ state, commit }, indicatorId) {
    const savedIndicator = await workspacesService.getIndicator(indicatorId)

    if (!savedIndicator) {
      this.dispatch('app/showNotice', {
        title: `Indicator ${indicatorId} doesn't exist in your library, nothing to rollback to.`,
        type: 'error'
      })
      return
    }

    state.indicators[indicatorId] = savedIndicator
    commit('SET_INDICATOR_SCRIPT', { id: indicatorId })
  },
  toggleMarkets({ state, rootState, commit }, { type, id, inverse }: { type: string; id: string; inverse: boolean }) {
    const containsHidden = typeof rootState.panes.panes[state._id].markets.find(market => state.hiddenMarkets[market] === true) !== 'undefined'

    for (const market of rootState.panes.panes[state._id].markets) {
      const isHidden = state.hiddenMarkets[market] === true

      if (!type) {
        if (!inverse) {
          if (market !== id) {
            continue
          }
          console.log('[toggle market] toggle ' + market, isHidden ? 'show' : 'hide')

          // toggle selected market
          Vue.set(state.hiddenMarkets, market, !isHidden)
        } else if (!isHidden && market !== id) {
          // hide market other than selected
          Vue.set(state.hiddenMarkets, market, true)
        } else if (isHidden && market === id) {
          // show current market
          Vue.set(state.hiddenMarkets, market, false)
        }
      } else if (type === 'all') {
        if (containsHidden !== !isHidden) {
          Vue.set(state.hiddenMarkets, market, !containsHidden)
        }
      } else {
        const [exchange] = parseMarket(market)
        const indexedMarket = rootState.app.indexedProducts[exchange].find(product => product.id === market)

        const hide = type !== indexedMarket.type

        if (hide !== isHidden) {
          Vue.set(state.hiddenMarkets, market, hide)
        }
      }
    }
    commit('TOGGLE_MARKET')
  }
} as ActionTree<ChartPaneState, ModulesState>

const mutations = {
  SET_REFRESH_RATE(state, value) {
    state.refreshRate = +value || 0
  },
  TOGGLE_LEGEND(state) {
    state.showLegend = !state.showLegend
  },
  SET_GRIDLINES(state, { type, value }) {
    if (type === 'vertical') {
      if (typeof value === 'boolean') {
        state.showVerticalGridlines = value
      } else {
        state.verticalGridlinesColor = value
      }
    } else {
      if (typeof value === 'boolean') {
        state.showHorizontalGridlines = value
      } else {
        state.horizontalGridlinesColor = value
      }
    }
  },
  SET_WATERMARK(state, { value }) {
    if (typeof value === 'boolean') {
      state.showWatermark = value
    } else {
      state.watermarkColor = value
    }
  },
  SET_INDICATOR_SERIES(state, { id, series }) {
    state.indicators[id].series = series
  },
  SET_INDICATOR_ERROR(state, { id, error }) {
    if (error) {
      Vue.set(state.indicatorsErrors, id, error)
    } else {
      Vue.set(state.indicatorsErrors, id, null)
    }
  },
  SET_TIMEFRAME(state, value) {
    state.timeframe = value
  },
  ADD_INDICATOR(state, indicator) {
    Vue.set(state.indicators, indicator.id, indicator)
  },
  UPDATE_DESCRIPTION(state, { id, description }) {
    Vue.set(state.indicators[id], 'description', description)
  },
  REMOVE_INDICATOR(state, id) {
    Vue.delete(state.indicators, id)
  },
  SET_INDICATOR_OPTION(state, { id, key, value }) {
    if (!state.indicators[id]) {
      state.indicators[id] = {}
    }

    if (!state.indicators[id].options) {
      ;(state.indicators[id] as any).options = {}
    }

    Vue.set(state.indicators[id].options, key, value)
  },
  REMOVE_INDICATOR_OPTION(state, { id, key }) {
    if (!state.indicators[id]) {
      return
    }

    Vue.delete(state.indicators[id].options, key)
  },
  SET_INDICATOR_SCRIPT(state, payload) {
    if (typeof payload.value === 'undefined') {
      return
    }

    this.commit(state._id + '/FLAG_INDICATOR_AS_UNSAVED', payload.id)

    Vue.set(state.indicators[payload.id], 'script', payload.value)
  },
  FLAG_INDICATOR_AS_UNSAVED(state, id) {
    Vue.set(state.indicators[id], 'unsavedChanges', true)
  },
  FLAG_INDICATOR_AS_SAVED(state, id) {
    Vue.set(state.indicators[id], 'unsavedChanges', false)
  },
  TOGGLE_LAYOUTING(state, indicatorId: string) {
    if (typeof indicatorId === 'string' && !state.layouting) {
      state.layouting = indicatorId
    } else {
      state.layouting = !state.layouting
    }
  },
  TOGGLE_FILL_GAPS_WITH_EMPTY(state) {
    state.fillGapsWithEmpty = !state.fillGapsWithEmpty
  },
  UPDATE_INDICATOR_DISPLAY_NAME(state, id) {
    const displayName = state.indicators[id].name.replace(/\{([\w\d_]+)\}/g, (match, key) => state.indicators[id].options[key] || '')
    Vue.set(state.indicators[id], 'displayName', displayName)
  },
  TOGGLE_MARKET(state, marketId) {
    if (marketId) {
      Vue.set(state.hiddenMarkets, marketId, !state.hiddenMarkets[marketId])
    }
  },
  SET_PRICE_SCALE(state, { id, priceScale }) {
    if (!priceScale) {
      delete state.priceScales[id]
      return
    }

    console.log(id, priceScale.scaleMargins.top, priceScale.scaleMargins.bottom)

    state.priceScales[id] = priceScale
  },
  SET_BAR_SPACING(state, value) {
    state.barSpacing = value
  }
} as MutationTree<ChartPaneState>

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
} as Module<ChartPaneState, ModulesState>
