import dialogService from '@/services/dialogService'
import workspacesService from '@/services/workspacesService'
import { downloadAnything, sleep, slugify, uniqueName } from '@/utils/helpers'
import { scheduleSync, syncState } from '@/utils/store'
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
import ScriptBuilder from '@/components/chart/scripts/scriptBuilder'

export interface PriceScaleSettings {
  scaleMargins?: PriceScaleMargins
  mode?: PriceScaleMode
}

export interface IndicatorWindowState {
  sections: string[]
  tab: string
  optionsQuery: string
  fontSizePx: number
}

export interface IndicatorSettings {
  id?: string
  name?: string
  displayName?: string
  description?: string
  build?: string
  script?: string
  options?: SeriesOptions<SeriesType>
  createdAt?: number
  updatedAt?: number
  unsavedChanges?: boolean
  version?: string
  uses?: number
}
export interface ChartPaneState {
  _id?: string
  indicators?: { [id: string]: IndicatorSettings }
  priceScales: { [id: string]: PriceScaleSettings }
  layouting: boolean | string
  timeframe: number
  indicatorWindowState?: IndicatorWindowState
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
        bottom: 0.26
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
  showWatermark: true,
  watermarkColor: 'rgba(255,255,255,.1)',
  hiddenMarkets: {},
  barSpacing: null
} as ChartPaneState

const actions = {
  async boot({ state }) {
    state.indicatorsErrors = {} // let chart recalculate potential errors
    state.layouting = false // start without layouting overlay

    if (!Object.keys(state.indicators).length) {
      state.indicators = (await workspacesService.getIndicators())
        .filter(indicator => (indicator as any).enabled === true)
        .reduce((acc, indicator) => {
          acc[indicator.id] = indicator
          return acc
        }, {} as { [id: string]: IndicatorSettings })

      scheduleSync(state)
    }

    // prebuild indicators (will populate .model of each indicators)
    ScriptBuilder.buildSequence(state.indicators)
  },
  toSubscriptions({ state }, markets: string[]) {
    const precision =
      state.refreshRate < 50 || /t$/.test(state.timeframe.toString())
        ? 'ticks'
        : 'trades'
    return markets.map(market => `${market}.${precision}`)
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
    delete indicator.model

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
          script: indicator.script
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
        message: `This indicator has unsaved changes <i class="icon-warning"></i>`,
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
    commit('FLAG_INDICATOR_AS_SAVED', id)

    workspacesService.saveIndicator(state.indicators[id])

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
  async setIndicatorWindowState(
    { state },
    indicatorWindowState: IndicatorWindowState
  ) {
    state.indicatorWindowState = indicatorWindowState
    syncState(state)
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
        const indexedMarket = rootState.panes.products[market]

        const hide = type !== indexedMarket.type

        if (hide !== isHidden) {
          Vue.set(state.hiddenMarkets, market, hide)
        }
      }
    }

    commit('TOGGLE_MARKET')
  },
  setRefreshRate({ commit, state }, newValue) {
    const oldValue = state.refreshRate
    commit('SET_REFRESH_RATE', newValue)
    if (
      (oldValue >= 50 && newValue < 50) ||
      (oldValue < 50 && newValue >= 50)
    ) {
      this.dispatch(`panes/refreshPaneSubscriptions`, state._id)
    }
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

    state.priceScales[id] = priceScale
  },
  SET_BAR_SPACING(state, value) {
    state.barSpacing = value
  },
  SET_INDICATOR_META(
    state,
    { id, meta }: { id: string; meta: IndicatorMetadata }
  ) {
    Vue.set(state.indicators[id], 'meta', JSON.stringify(meta))
  }
} as MutationTree<ChartPaneState>

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
} as Module<ChartPaneState, ModulesState>
