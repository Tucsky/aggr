import { MutationTree, ActionTree, GetterTree, Module } from 'vuex'
import { ModulesState } from '..'

export interface WebsitePaneState {
  _id?: string
  url?: string
  interactive?: boolean
  locked?: boolean
}

const getters = {} as GetterTree<WebsitePaneState, ModulesState>

const state = {
  url:
    'https://cryptopanic.com/widgets/news/?bg_color=FFFFFF&amp;font_family=sans&amp;header_bg_color=30343B&amp;header_text_color=FFFFFF&amp;link_color=0091C2&amp;news_feed=trending&amp;text_color=333333&amp;title=Latest%20News',
  interactive: false,
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

    if (!rootState.panes.panes[state._id].name || rootState.panes.panes[state._id].name === previousHostname) {
      this.commit('panes/SET_PANE_NAME', { id: state._id, name: currentHostname })
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
  UNLOCK_URL(state) {
    state.locked = false
  }
} as MutationTree<WebsitePaneState>

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
} as Module<WebsitePaneState, ModulesState>
