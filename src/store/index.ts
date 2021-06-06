import Vue from 'vue'
import Vuex, { Module, StoreOptions } from 'vuex'
import { registerModule, scheduleSync } from '@/utils/store'

import app, { AppState } from './app'
import settings, { SettingsState } from './settings'
import exchanges, { ExchangesState } from './exchanges'
import panes, { PanesState } from './panes'
import { progress, sleep } from '@/utils/helpers'
import { Workspace } from '@/types/test'
import aggregatorService from '@/services/aggregatorService'

Vue.use(Vuex)

/* console.debug = function() {
  //
} */

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
const modules = { app, settings, exchanges, panes } as AppModuleTree<ModulesState>

store.subscribe((mutation, state: any) => {
  const moduleId = mutation.type.split('/')[0]

  // console.debug(`[store] ${mutation.type}`)

  if (state[moduleId] && state[moduleId]._id) {
    scheduleSync(state[moduleId])
  }
})

export async function boot(workspace?: Workspace) {
  await progress(true)

  console.log(`[store] booting on workspace "${workspace.name}" (${workspace.id})`)

  if (store.state.app) {
    console.log(`[store] app exists, unload current workspace`)

    store.dispatch('app/setBooted', false)

    await progress(`unload workspace`)

    await sleep(500)

    const markets = Object.keys(store.state.panes.marketsListeners)

    if (markets.length) {
      await progress(`disconnect from ` + markets.slice(0, 3).join(', ') + (markets.length - 3 > 0 ? ' + ' + (markets.length - 3) + ' others' : ''))

      await aggregatorService.disconnect(markets)
    }

    for (const id in store.state) {
      console.log(`[store] unloading module ${id}`)
      store.unregisterModule(id)
    }
  }

  await progress(`loading core module`)
  registerModule('app', modules['app'])
  await sleep(100)
  await store.dispatch('app/boot')

  await progress(`setting up workspace`)
  registerModule('settings', modules['settings'])
  await sleep(100)
  await store.dispatch('settings/boot')

  await progress(`loading panes`)
  registerModule('panes', modules['panes'])
  await sleep(100)
  await store.dispatch('panes/boot')

  for (const paneId in modules.panes.state.panes) {
    await progress(`registering pane module ${paneId}`)
    await registerModule(paneId, {}, false, modules.panes.state.panes[paneId])
  }

  store.dispatch('app/setBooted')

  await progress(`registering exchanges`)
  await registerModule('exchanges', modules['exchanges'])

  for (const paneId in modules.panes.state.panes) {
    await progress(`booting module ${paneId}`)

    try {
      await store.dispatch(paneId + '/boot')
    } catch (error) {
      console.error(error)
    }
  }

  await progress(`loading exchanges`)
  await store.dispatch('exchanges/boot')

  await progress(false)
}

export default store
