import dialogService from '@/services/dialogService'
import workspacesService from '@/services/workspacesService'
import { sleep, slugify, uniqueName } from '@/utils/helpers'
import { scheduleSync } from '@/utils/store'
import { SeriesOptions, SeriesType } from 'lightweight-charts'
import Vue from 'vue'
import { MutationTree, ActionTree, GetterTree, Module } from 'vuex'

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
  resizingIndicator: string
  timeframe: number
  indicatorsErrors: { [indicatorId: string]: string }
  refreshRate?: number
}

const getters = {} as GetterTree<ChartPaneState, ChartPaneState>

const state = {
  indicatorsErrors: {},
  indicators: {},
  resizingIndicator: null,
  timeframe: 10,
  refreshRate: 500
} as ChartPaneState

const actions = {
  async boot({ state }) {
    if (!Object.keys(state.indicators).length) {
      const indicators = await workspacesService.getIndicators()

      for (const serie of indicators) {
        if ((serie as any).enabled === false) {
          continue
        }

        Vue.set(state.indicators, serie.id, serie)
      }

      scheduleSync(state)
    }

    state._booted = true
  },
  addIndicator({ commit }, indicator) {
    // const ids = Object.keys(state.indicators)
    // const id = uniqueName(slugify(indicator.name), ids)

    indicator = {
      script: 'plotline(avg_close(bar))',
      ...indicator,
      options: {
        priceScaleId: indicator.id,
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

    if (key === 'scaleMargins') {
      // sync scale margins
      const currentPriceScaleId = state.indicators[id].options.priceScaleId

      if (currentPriceScaleId) {
        for (const _id in state.indicators) {
          const serieOptions = state.indicators[_id].options
          if (id !== _id && serieOptions.priceScaleId === currentPriceScaleId) {
            commit('SET_INDICATOR_OPTION', { id: _id, key, value })
          }
        }
      }
    }

    if (state.indicators[id] && state.indicators[id].options[key] === value) {
      return
    }

    commit('SET_INDICATOR_OPTION', { id, key, value })

    commit('FLAG_INDICATOR_AS_UNSAVED', id)

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
  async saveIndicator({ state, commit }, id) {
    commit('FLAG_INDICATOR_AS_SAVED', id)

    workspacesService.saveIndicator(state.indicators[id])
  },
  async renameIndicator({ commit, state, dispatch }, { id, name }) {
    const newId = uniqueName(slugify(name), Object.keys(state.indicators))

    const indicatorCopy = JSON.parse(JSON.stringify(state.indicators[id]))

    const indicator = { ...indicatorCopy, name, id: newId }

    commit('ADD_INDICATOR', indicator)

    dispatch('removeIndicator', { id, confirm: false })

    return newId
  },
  resizeIndicator({ commit }, id) {
    commit('TOGGLE_INDICATOR_RESIZE', id)
  }
} as ActionTree<ChartPaneState, ChartPaneState>

const mutations = {
  SET_REFRESH_RATE(state, value) {
    state.refreshRate = +value || 0
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
  SET_INDICATOR_SCRIPT(state, { id, value }) {
    this.commit(state._id + '/FLAG_INDICATOR_AS_UNSAVED', id)

    Vue.set(state.indicators[id], 'script', value)
  },
  FLAG_INDICATOR_AS_UNSAVED(state, id) {
    Vue.set(state.indicators[id], 'unsavedChanges', true)
  },
  FLAG_INDICATOR_AS_SAVED(state, id) {
    Vue.set(state.indicators[id], 'unsavedChanges', false)
  },
  TOGGLE_INDICATOR_RESIZE(state, id) {
    if (state.resizingIndicator === id) {
      state.resizingIndicator = null
      return
    }

    state.resizingIndicator = id
  },
  UPDATE_INDICATOR_DISPLAY_NAME(state, id) {
    const displayName = state.indicators[id].name.replace(/\{([\w\d_]+)\}/g, (match, key) => state.indicators[id].options[key] || '')
    Vue.set(state.indicators[id], 'displayName', displayName)
  }
} as MutationTree<ChartPaneState>

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
} as Module<ChartPaneState, ChartPaneState>
