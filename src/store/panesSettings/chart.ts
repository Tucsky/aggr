import { defaultChartSeries } from '@/components/chart/defaultSeries'
import { getSerieSettings, slugify, uniqueName } from '@/utils/helpers'
import { scheduleSync } from '@/utils/store'
import { SeriesOptions, SeriesType } from 'lightweight-charts'
import Vue from 'vue'
import { MutationTree, ActionTree, GetterTree, Module } from 'vuex'

export interface SerieSettings {
  id?: string
  name?: string
  type?: string
  description?: string
  input?: string
  enabled?: boolean
  options?: SeriesOptions<SeriesType>
}

export interface ChartPaneState {
  _id?: string
  series?: { [id: string]: SerieSettings }
  timeframe: number
  activeSeries: string[]
  activeSeriesErrors: { [serieId: string]: string }
  refreshRate?: number
}

const getters = {} as GetterTree<ChartPaneState, ChartPaneState>

const state = {
  activeSeries: [],
  activeSeriesErrors: {},
  series: {},
  timeframe: 10,
  refreshRate: 500
} as ChartPaneState

const actions = {
  async boot({ state }) {
    if (!Object.keys(state.series).length) {
      for (const id in defaultChartSeries) {
        if (defaultChartSeries[id].enabled === false) {
          continue
        }

        Vue.set(state.series, id, {})
      }

      scheduleSync(state)
    }
  },
  createSerie({ commit, state }, serie) {
    const seriesIdMap = Object.keys(state.series)
    const id = uniqueName(slugify(serie.name), seriesIdMap)

    serie = {
      input: 'avg_close(bar)',
      type: 'line',
      ...serie,
      options: {
        priceScaleId: id,
        ...serie.options
      }
    }

    serie.id = id

    commit('CREATE_SERIE', serie)
    commit('TOGGLE_SERIE', id)

    return id
  },
  toggleSerie({ commit }, id) {
    commit('TOGGLE_SERIE', id)
  },
  toggleSerieVisibility({ commit, state }, id) {
    commit('SET_SERIE_OPTION', {
      id,
      key: 'visible',
      value: !state.series[id].options || typeof state.series[id].options.visible === 'undefined' ? false : !state.series[id].options.visible
    })
  },
  setSerieOption({ commit, state, dispatch }, { id, key, value }) {
    try {
      value = JSON.parse(value)
    } catch (error) {
      // empty
    }

    if (key === 'scaleMargins') {
      const currentPriceScaleId = state.series[id].options.priceScaleId

      if (currentPriceScaleId) {
        for (const _id in state.series) {
          const serieOptions = getSerieSettings(state._id, _id).options
          if (id !== _id && serieOptions.priceScaleId === currentPriceScaleId) {
            dispatch('setSerieOption', { id: _id, key, value })
          }
        }
      }
    }

    if (state.series[id] && state.series[id].options[key] === value) {
      return
    }

    commit('SET_SERIE_OPTION', { id, key, value })
  },
  removeSerie({ commit, state }, id): Promise<void> {
    if (state.series[id].enabled !== false) {
      commit('TOGGLE_SERIE', id)
    }

    return new Promise(resolve => {
      setTimeout(() => {
        commit('REMOVE_SERIE', id)
        resolve()
      }, 100)
    })
  },
  async renameSerie({ commit, state, dispatch }, { id, name }) {
    const newId = uniqueName(slugify(name), Object.keys(state.series))

    const serieSource = getSerieSettings(state._id, id)

    const serie = { ...serieSource, name, id: newId, enabled: false }

    commit('CREATE_SERIE', serie)

    Vue.nextTick(() => {
      dispatch('removeSerie', id)

      commit('TOGGLE_SERIE', newId)
    })

    return newId
  }
} as ActionTree<ChartPaneState, ChartPaneState>

const mutations = {
  SET_REFRESH_RATE(state, value) {
    state.refreshRate = +value || 0
  },

  ENABLE_SERIE(state, id) {
    const index = state.activeSeries.indexOf(id)

    if (index === -1) {
      state.activeSeries.push(id)
    }
  },
  DISABLE_SERIE(state, id) {
    const index = state.activeSeries.indexOf(id)

    if (index !== -1) {
      state.activeSeries.splice(index, 1)
    }

    if (state.activeSeriesErrors[id]) {
      Vue.delete(state.activeSeriesErrors, id)
    }
  },
  SET_SERIE_ERROR(state, { id, error }) {
    if (error) {
      Vue.set(state.activeSeriesErrors, id, error)
    } else {
      Vue.set(state.activeSeriesErrors, id, null)
    }
  },
  SET_TIMEFRAME(state, value) {
    state.timeframe = value
  },

  CREATE_SERIE(state, serie) {
    Vue.set(state.series, serie.id, serie)
  },
  TOGGLE_SERIE(state, id) {
    Vue.set(state.series[id], 'enabled', typeof state.series[id].enabled === 'undefined' ? false : !state.series[id].enabled)
  },
  SET_SERIE_OPTION(state, { id, key, value }) {
    if (!state.series[id]) {
      state.series[id] = {}
    }

    if (!state.series[id].options) {
      ;(state.series[id] as any).options = {}
    }

    Vue.set(state.series[id].options, key, value)
  },
  REMOVE_SERIE_OPTION(state, { id, key }) {
    if (!state.series[id]) {
      return
    }

    Vue.delete(state.series[id].options, key)
  },
  SET_SERIE_TYPE(state, { id, value }) {
    if (!state.series[id]) {
      state.series[id] = {}
    }

    Vue.set(state.series[id], 'type', value)
  },
  SET_SERIE_INPUT(state, { id, value }) {
    if (!state.series[id]) {
      state.series[id] = {}
    }

    Vue.set(state.series[id], 'input', value)
  },
  CUSTOMIZE_SERIE(state, id) {
    Vue.set(state.series[id], 'options', {})
  },
  REMOVE_SERIE(state, id) {
    Vue.delete(state.series, id)
  }
} as MutationTree<ChartPaneState>

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
} as Module<ChartPaneState, ChartPaneState>
