import dialogService from '@/services/dialogService'
import workspacesService from '@/services/workspacesService'
import { downloadAnything, sleep, slugify, uniqueName } from '@/utils/helpers'
import { scheduleSync } from '@/utils/store'
import {
  PriceScaleMargins,
  PriceScaleMode,
  SeriesOptions,
  SeriesType
} from 'lightweight-charts'
import Vue from 'vue'
import { MutationTree, ActionTree, GetterTree, Module } from 'vuex'
import { ModulesState } from '..'
import merge from 'lodash.merge'

export interface PriceScaleSettings {
  scaleMargins?: PriceScaleMargins
  mode?: PriceScaleMode
}

export interface IndicatorNavigationState {
  tab: string
  optionsQuery: string
  fontSizePx: number
}

export interface IndicatorSettings {
  id?: string
  name?: string
  displayName?: string
  description?: string
  navigationState?: IndicatorNavigationState
  script?: string
  options?: SeriesOptions<SeriesType>
  createdAt?: number
  updatedAt?: number
  unsavedChanges?: boolean
  series?: string[]
  version?: string
  preview?: Blob
}
export interface ChartPaneState {
  _id?: string
  indicators?: { [id: string]: IndicatorSettings }
  priceScales: { [id: string]: PriceScaleSettings }
  layouting: boolean | string
  timeframe: number
  indicatorsErrors: { [indicatorId: string]: string }
  refreshRate?: number
  showAlerts?: boolean
  showAlertsLabel?: boolean
  showLegend: boolean
  showIndicators: boolean
  fillGapsWithEmpty: boolean
  showHorizontalGridlines: boolean
  horizontalGridlinesColor: string
  showVerticalGridlines: boolean
  verticalGridlinesColor: string
  showWatermark: boolean
  watermarkColor: string
  showBorder: boolean
  borderColor: string
  showLeftScale: boolean
  showRightScale: boolean
  showTimeScale: boolean
  hiddenMarkets: { [indicatorId: string]: boolean }
  barSpacing: number
  navigationState: IndicatorNavigationState
}

const getters = {} as GetterTree<ChartPaneState, ModulesState>

const state = {
  indicatorsErrors: {},
  indicators: {},
  priceScales: {
    right: {
      scaleMargins: {
        top: 0.04,
        bottom: 0.26
      }
    }
  },
  layouting: false,
  showIndicators: true,
  timeframe: 5,
  refreshRate: 1000,
  showAlerts: true,
  showAlertsLabel: true,
  showLegend: true,
  fillGapsWithEmpty: true,
  showHorizontalGridlines: false,
  horizontalGridlinesColor: 'rgba(255,255,255,.1)',
  showVerticalGridlines: false,
  verticalGridlinesColor: 'rgba(255,255,255,.1)',
  showWatermark: true,
  watermarkColor: 'rgba(255,255,255,.1)',
  showBorder: true,
  borderColor: null,
  showLeftScale: false,
  showRightScale: true,
  showTimeScale: true,
  hiddenMarkets: {},
  barSpacing: null,
  navigationState: null
} as ChartPaneState

const actions = {
  async boot({ state }) {
    state.indicatorsErrors = {} // let chart recalculate potential errors
    state.layouting = false // start without layouting overlay

    if (!Object.keys(state.indicators).length) {
      const indicators = await workspacesService.getIndicators()

      for (const indicator of indicators) {
        if ((indicator as any).enabled !== true) {
          continue
        }

        if (!indicator.series) {
          indicator.series = []
        }

        Vue.set(state.indicators, indicator.id, indicator)
      }

      scheduleSync(state)
    }
  },
  addIndicator({ state, commit }, indicator) {
    const ids = Object.keys(state.indicators)

    indicator.id = uniqueName(indicator.id, ids)

    indicator = {
      script: 'plotline(avg_close(bar))',
      ...indicator,
      options: {
        priceScaleId: indicator.priceScaleId || indicator.id,
        ...indicator.options
      }
    }

    commit('ADD_INDICATOR', indicator)
    commit('UPDATE_INDICATOR_DISPLAY_NAME', indicator.id)

    return indicator.id
  },

  duplicateIndicator({ state, dispatch }, id) {
    const indicator = merge({}, state.indicators[id])

    const indicators = Object.values(state.indicators)

    indicator.name = uniqueName(
      indicator.name,
      indicators.map(indicator => indicator.name)
    )

    indicator.id = slugify(indicator.name)

    delete indicator.updatedAt
    delete indicator.createdAt
    delete indicator.enabled

    dispatch('addIndicator', indicator)
  },

  async downloadIndicator({ state }, indicatorId) {
    const indicator = state.indicators[indicatorId]

    const priceScale = state.priceScales[indicator.options.priceScaleId] || {}

    const exportableIndicator = Object.assign(
      {},
      indicator.options,
      priceScale
        ? {
            scaleMargins: priceScale.scaleMargins
          }
        : {}
    )

    await downloadAnything(
      {
        type: 'indicator',
        name: 'indicator:' + indicator.name,
        data: {
          options: exportableIndicator,
          description: indicator.description,
          script: indicator.script,
          createdAt: indicator.createdAt,
          updatedAt: indicator.updatedAt
        }
      },
      'indicator_' + indicatorId
    )
  },

  toggleSerieVisibility({ commit, state }, id) {
    commit('SET_INDICATOR_OPTION', {
      id,
      key: 'visible',
      value:
        !state.indicators[id].options ||
        typeof state.indicators[id].options.visible === 'undefined'
          ? false
          : !state.indicators[id].options.visible
    })
  },
  setIndicatorOption({ commit, state }, { id, key, value, silent }) {
    try {
      value = JSON.parse(value)
    } catch (error) {
      // empty
    }
    if (state.indicators[id] && state.indicators[id].options[key] === value) {
      return
    }

    commit('SET_INDICATOR_OPTION', { id, key, value, silent })

    if (!state.indicators[id].unsavedChanges) {
      commit('FLAG_INDICATOR_AS_UNSAVED', id)
    }

    if (state.indicators[id].name.indexOf(key) !== -1) {
      commit('UPDATE_INDICATOR_DISPLAY_NAME', id)
    }
  },
  async removeIndicator(
    { state, commit, dispatch },
    { id, confirm = true }: { id: string; confirm?: boolean }
  ) {
    if (
      dialogService.mountedComponents.indicator &&
      dialogService.mountedComponents.indicator.indicatorId === id
    ) {
      await dialogService.mountedComponents.indicator.close()
    }

    if (state.indicators[id].unsavedChanges && confirm) {
      const output = await dialogService.confirm({
        title: 'Save changes ?',
        message: `Indicator has unsaved&nbsp;changes&nbsp;<i class="icon-warning"></i><br><br>Click <code class="-filled -green">SAVE</code> to save indicator under "${id}"`,
        cancel: 'DISCARD',
        ok: 'SAVE',
        actions: [
          {
            label: 'Cancel',
            callback: () => 2
          }
        ],
        html: true
      })

      if (output === null || output === 2) {
        return
      }

      if (output) {
        await dispatch('saveIndicator', id)
      }
    }

    commit('REMOVE_INDICATOR', id)

    await sleep(100)
  },
  async saveIndicator({ state, commit, dispatch }, id) {
    await workspacesService.saveIndicator(state.indicators[id])

    commit('FLAG_INDICATOR_AS_SAVED', id)

    await dispatch('syncIndicator', state.indicators[id])
  },
  async renameIndicator({ commit, state, dispatch }, { id, name }) {
    const newId = uniqueName(slugify(name), Object.keys(state.indicators))

    const indicatorCopy = JSON.parse(JSON.stringify(state.indicators[id]))

    const indicator = { ...indicatorCopy, name, id: newId }

    commit('ADD_INDICATOR', indicator)

    dispatch('removeIndicator', { id, confirm: false })
    commit('UPDATE_INDICATOR_DISPLAY_NAME', newId)

    return newId
  },
  syncIndicator({ state, rootState }, indicator: IndicatorSettings) {
    for (const paneId in rootState.panes.panes) {
      if (
        paneId === state._id ||
        rootState.panes.panes[paneId].type !== 'chart'
      ) {
        continue
      }

      const otherPaneIndicator = rootState[paneId].indicators[
        indicator.id
      ] as IndicatorSettings
      if (otherPaneIndicator && !otherPaneIndicator.unsavedChanges) {
        otherPaneIndicator.options = indicator.options

        this.commit(paneId + '/SET_INDICATOR_SCRIPT', { id: indicator.id })
      }
    }
  },
  async setIndicatorNavigationState(
    { commit },
    navigationState: IndicatorNavigationState
  ) {
    state.navigationState = navigationState
    commit('SET_NAVIGATION_STATE', navigationState)
  },
  async undoIndicator({ state, commit }, indicatorId) {
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
  toggleMarkets(
    { state, rootState, commit },
    { type, id, inverse }: { type: string; id: string; inverse: boolean }
  ) {
    const containsHidden =
      typeof rootState.panes.panes[state._id].markets.find(
        market => state.hiddenMarkets[market] === true
      ) !== 'undefined'

    for (const market of rootState.panes.panes[state._id].markets) {
      const isHidden = state.hiddenMarkets[market] === true

      if (!type) {
        if (!inverse) {
          if (market !== id) {
            continue
          }

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
        const indexedMarket = rootState.panes.marketsListeners[market]

        const hide = type !== indexedMarket.type

        if (hide !== isHidden) {
          Vue.set(state.hiddenMarkets, market, hide)
        }
      }
    }
    commit('TOGGLE_MARKET')
  },
  setTimeframe({ rootState, commit }, timeframe) {
    if ((window.event as any).shiftKey) {
      for (const id in rootState.panes.panes) {
        const type = rootState.panes.panes[id].type
        if (type === 'chart' && rootState[id].timeframe !== timeframe) {
          this.commit(id + '/SET_TIMEFRAME', timeframe)
        }
      }
    } else {
      commit('SET_TIMEFRAME', timeframe)
    }
  }
} as ActionTree<ChartPaneState, ModulesState>

const mutations = {
  TOGGLE_ALERTS(state) {
    state.showAlerts = !state.showAlerts
  },
  TOGGLE_ALERTS_LABEL(state) {
    state.showAlertsLabel = !state.showAlertsLabel
  },
  SET_REFRESH_RATE(state, value) {
    state.refreshRate = +value || 0
  },
  TOGGLE_LEGEND(state) {
    state.showLegend = !state.showLegend
  },
  TOGGLE_INDICATORS(state, value) {
    state.showIndicators = value
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
  SET_BORDER(state, { value }) {
    if (typeof value === 'boolean') {
      state.showBorder = value
    } else {
      state.borderColor = value
    }
  },
  TOGGLE_AXIS(state, side) {
    if (side === 'left') {
      state.showLeftScale = !state.showLeftScale
    } else if (side === 'right') {
      state.showRightScale = !state.showRightScale
    } else if (side === 'time') {
      state.showTimeScale = !state.showTimeScale
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

    if (state.indicators[payload.id].script !== payload.value) {
      this.commit(state._id + '/FLAG_INDICATOR_AS_UNSAVED', payload.id)
    }

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
    const displayName = state.indicators[id].name.replace(
      /\{([\w\d_]+)\}/g,
      (match, key) => state.indicators[id].options[key] || ''
    )
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

    for (const indicatorId in state.indicators) {
      const options = state.indicators[indicatorId].options as any
      if (options && options.priceScaleId === id) {
        options.scaleMargins = priceScale.scaleMargins
      }
    }

    state.priceScales[id] = priceScale
  },
  SET_BAR_SPACING(state, value) {
    state.barSpacing = value
  },
  SET_NAVIGATION_STATE(state, value) {
    state.navigationState = value
  }
} as MutationTree<ChartPaneState>

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
} as Module<ChartPaneState, ModulesState>
