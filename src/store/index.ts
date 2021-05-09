import Vue from 'vue'
import Vuex, { Module, StoreOptions } from 'vuex'
import { registerModule, scheduleSync } from '@/utils/store'

import app, { AppState } from './app'
import settings, { SettingsState } from './settings'
import exchanges, { ExchangesState } from './exchanges'
import panes, { PanesState } from './panes'
import { sleep } from '@/utils/helpers'
import { Workspace } from '@/types/test'

Vue.use(Vuex)

export interface AppModuleTree<R> {
  [key: string]: Module<any, R>
}

export interface ModulesState {
  app: AppState
  settings: SettingsState
  panes: PanesState
  exchanges: ExchangesState
}

const store = new Vuex.Store({} as StoreOptions<ModulesState>)
const modules = { app, settings, panes, exchanges } as AppModuleTree<ModulesState>

store.subscribe((mutation, state: any) => {
  const moduleId = mutation.type.split('/')[0]

  console.debug(`[store] ${mutation.type}`)

  if (state[moduleId] && state[moduleId]._id) {
    scheduleSync(state[moduleId])
  }
})

export async function boot(workspace?: Workspace) {
  console.log(`[store] booting on workspace "${workspace.name}" (${workspace.id})`)

  if (store.state.app) {
    console.log(`[store] app exists, unload current workspace`)

    store.dispatch('app/setBooted', false)

    await sleep(500)

    for (const id in store.state) {
      console.log(`[store] unloading module ${id}`)
      store.unregisterModule(id)
    }
  }

  for (const id in modules) {
    await registerModule(id, modules[id])
  }

  for (const paneId in modules.panes.state.panes) {
    await registerModule(paneId, {}, false, modules.panes.state.panes[paneId])
  }

  const promises = []

  for (const id in store.state) {
    promises.push(store.dispatch(id + '/boot'))
  }

  try {
    await Promise.all(promises)
  } catch (error) {
    console.log(error)
  }

  store.dispatch('app/setBooted')
}

export default store
