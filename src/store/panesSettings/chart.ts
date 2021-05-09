import workspacesService from '@/services/workspacesService'
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
  options?: SeriesOptions<SeriesType>
  createdAt?: number
  updatedAt?: number
}

export interface ChartPaneState {
  _id?: string
  series?: { [id: string]: SerieSettings }
  timeframe: number
  seriesErrors: { [serieId: string]: string }
  refreshRate?: number
}

const getters = {} as GetterTree<ChartPaneState, ChartPaneState>

const state = {
  seriesErrors: {},
  series: {},
  timeframe: 10,
  refreshRate: 500
} as ChartPaneState

const actions = {
  async boot({ state }) {
    if (!Object.keys(state.series).length) {
      const series = await workspacesService.getSeries()

      for (const serie of series) {
        if ((serie as any).enabled === false) {
          continue
        }

        Vue.set(state.series, serie.id, serie)
      }

      scheduleSync(state)
    }
  },
  addSerie({ commit, state }, serie) {
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

    commit('ADD_SERIE', serie)

    return id
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
      // sync scale margins
      const currentPriceScaleId = state.series[id].options.priceScaleId

      if (currentPriceScaleId) {
        for (const _id in state.series) {
          const serieOptions = state.series[_id].options
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
  removeSerie({ commit }, id): Promise<void> {
    commit('REMOVE_SERIE', id)
    return new Promise(resolve => {
      setTimeout(() => {
        resolve()
      }, 100)
    })
  },
  async renameSerie({ commit, state, dispatch }, { id, name }) {
    const newId = uniqueName(slugify(name), Object.keys(state.series))

    const serieSource = getSerieSettings(state._id, id)

    const serie = { ...serieSource, name, id: newId }

    commit('ADD_SERIE', serie)

    dispatch('removeSerie', id)

    return newId
  }
} as ActionTree<ChartPaneState, ChartPaneState>

const mutations = {
  SET_REFRESH_RATE(state, value) {
    state.refreshRate = +value || 0
  },
  SET_SERIE_ERROR(state, { id, error }) {
    if (error) {
      Vue.set(state.seriesErrors, id, error)
    } else {
      Vue.set(state.seriesErrors, id, null)
    }
  },
  SET_TIMEFRAME(state, value) {
    state.timeframe = value
  },

  ADD_SERIE(state, serie) {
    Vue.set(state.series, serie.id, serie)
  },
  REMOVE_SERIE(state, id) {
    Vue.delete(state.series, id)
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
  }
} as MutationTree<ChartPaneState>

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
} as Module<ChartPaneState, ChartPaneState>
