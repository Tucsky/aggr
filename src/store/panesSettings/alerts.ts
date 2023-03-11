import { MutationTree, ActionTree, GetterTree, Module } from 'vuex'
import { ModulesState } from '..'

export interface AlertsPaneState {
  _id?: string
}

const getters = {} as GetterTree<AlertsPaneState, ModulesState>

const state = {
  //
} as AlertsPaneState

const actions = {
  //
} as ActionTree<AlertsPaneState, ModulesState>

const mutations = {
  //
} as MutationTree<AlertsPaneState>

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
} as Module<AlertsPaneState, ModulesState>
