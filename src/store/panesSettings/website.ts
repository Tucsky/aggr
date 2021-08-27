import { MutationTree, ActionTree, GetterTree, Module } from 'vuex'
import { ModulesState } from '..'

export interface WebsitePaneState {
  _id?: string
  _booted?: boolean
  url?: string
  locked?: boolean
}

const getters = {} as GetterTree<WebsitePaneState, ModulesState>

const state = {
  url:
    'https://cryptopanic.com/widgets/news/?bg_color=FFFFFF&amp;font_family=sans&amp;header_bg_color=30343B&amp;header_text_color=FFFFFF&amp;link_color=0091C2&amp;news_feed=trending&amp;text_color=333333&amp;title=Latest%20News',
  locked: false
} as WebsitePaneState

const actions = {
  async boot({ state, dispatch }) {
    state._booted = true
    setTimeout(() => {
      dispatch('setTitle', state.url)
    })
  },
  setUrl({ state, dispatch, commit }, url) {
    dispatch('setTitle', state.url)

    commit('SET_URL', url)
  },
  setTitle({ rootState, state }, url) {
    try {
      if (!rootState.panes.panes[state._id].name) {
        const { hostname } = new URL(url)
        this.commit('panes/SET_PANE_NAME', { id: state._id, name: hostname })
      }
    } catch (error) {
      const { hostname } = new URL(state.url)

      if (rootState.panes.panes[state._id].name === hostname) {
        this.commit('panes/SET_PANE_NAME', { id: state._id, name: '' })
      }
    }
  }
} as ActionTree<WebsitePaneState, ModulesState>

const mutations = {
  SET_URL(state, url) {
    state.url = url
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
