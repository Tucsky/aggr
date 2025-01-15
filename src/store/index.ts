import { createStore, Module, StoreOptions } from 'vuex'
import { bootPane, registerModule, scheduleSync } from '@/utils/store'

import app, { AppState } from './app'
import settings, { SettingsState } from './settings'
import exchanges, { ExchangesState } from './exchanges'
import panes, { PanesState } from './panes'
import { Workspace } from '@/types/types'
import { resolvePairs } from '../services/productsService'
import panesSettings from './panesSettings'
import { ChartPaneState } from './panesSettings/chart'
import { TradesPaneState } from './panesSettings/trades'
import { PricesPaneState } from './panesSettings/prices'

// Define the module tree
export interface AppModuleTree<R> {
  [key: string]: Module<any, R>
}

export interface ModulesState {
  app: AppState
  settings: SettingsState
  panes: PanesState
  exchanges: ExchangesState
  [key: string]: any;
}

// Create the store instance
const store = createStore<ModulesState>({} as StoreOptions<ModulesState>)

const modules: AppModuleTree<ModulesState> = {
  app,
  settings,
  exchanges,
  panes
}

// Subscribe to store changes
store.subscribe((mutation, state: any) => {
  const moduleId = mutation.type.split('/')[0]

  if (state[moduleId] && typeof state[moduleId]._id !== 'undefined') {
    scheduleSync(state[moduleId])
  }
})

// Boot function for dynamic module registration
export async function boot(workspace?: Workspace, pairsFromURL?: string[]) {
  console.log(
    `[store] booting on workspace "${workspace.name}" (${workspace.id})`
  )

  console.info(`loading core module`)
  await registerModule('app', modules['app'])
  await store.dispatch('app/boot')

  console.info(`setting up workspace`)
  await registerModule('settings', modules['settings'])
  await store.dispatch('settings/boot')

  console.info(`loading panes`)
  await registerModule('panes', modules['panes'])
  await store.dispatch('panes/boot')

  console.info(`registering exchanges`)
  await registerModule('exchanges', modules['exchanges'])

  console.info(`preparing active exchanges`)
  await store.dispatch('exchanges/boot')

  for (const paneId in store.state.panes.panes) {
    if (!panesSettings[store.state.panes.panes[paneId].type]) {
      await store.dispatch('panes/removePane', paneId)
      continue
    }

    console.info(`registering pane module ${paneId}`)

    await registerModule(paneId, {}, false, store.state.panes.panes[paneId])

    await bootPane(paneId)
  }

  store.dispatch('app/setBooted')

  let marketsOverride

  if (pairsFromURL) {
    marketsOverride = await resolvePairs(pairsFromURL)
  }

  await store.dispatch('panes/refreshMarketsListeners', {
    markets: marketsOverride
  })

  store.commit('app/SET_EXCHANGES_READY')
}

export default store
