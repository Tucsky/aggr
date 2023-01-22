import { MutationTree, ActionTree, GetterTree, Module } from 'vuex'
import { ModulesState } from '..'

export interface WebsitePaneState {
  _id?: string
  url?: string
  reloadTimer: number
  interactive?: boolean
  invert?: boolean
  locked?: boolean
}

const getters = {} as GetterTree<WebsitePaneState, ModulesState>

const state = {
  url: null,
  reloadTimer: 0,
  interactive: false,
  invert: false,
  locked: false
} as WebsitePaneState

const actions = {
  async boot({ state, dispatch }) {
    setTimeout(() => {
      dispatch('setTitle', state.url)
    })
  },
  setUrl({ dispatch, commit }, url) {
    if (!url) {
      return
    }

    if (!/^http/.test(url)) {
      url = 'https://' + url
    }

    try {
      new URL(url)

      dispatch('setTitle', url)

      commit('SET_URL', url)
    } catch (error) {
      // invalid url
    }
  },
  setTitle({ rootState, state }, url) {
    let previousHostname = ''

    try {
      previousHostname = new URL(state.url).hostname
    } catch (error) {
      // no previous url
    }

    let currentHostname = ''

    try {
      currentHostname = new URL(url).hostname
    } catch (error) {
      // no previous url
    }

    if (
      !rootState.panes.panes[state._id].name ||
      rootState.panes.panes[state._id].name === previousHostname
    ) {
      this.commit('panes/SET_PANE_NAME', {
        id: state._id,
        name: currentHostname
      })
    }
  }
} as ActionTree<WebsitePaneState, ModulesState>

const mutations = {
  SET_URL(state, url) {
    state.url = url
  },
  TOGGLE_INTERACTIVE(state) {
    state.interactive = !state.interactive
  },
  TOGGLE_INVERT(state) {
    state.invert = !state.invert
  },
  UNLOCK_URL(state) {
    state.locked = false
  },
  SET_RELOAD_TIMER(state, value) {
    state.reloadTimer = value
  }
} as MutationTree<WebsitePaneState>

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
} as Module<WebsitePaneState, ModulesState>
