import store from '../store/index'
import { Module } from 'vuex'
import merge from 'lodash.merge'
import { Pane } from '@/store/panes'
import panesSettings from '@/store/panesSettings'
import workspacesService from '@/services/workspacesService'

const persistModulesTimers = {}

export async function syncState(state): Promise<any> {
  if (!state._id) {
    // unsupported module?
    return
  }

  if (typeof persistModulesTimers[state._id] === 'number') {
    clearTimeout(persistModulesTimers[state._id])
    delete persistModulesTimers[state._id]
  }

  console.debug(`[store] saving state ${state._id}`)

  await workspacesService.saveState(state._id, state)
}

export function scheduleSync(state, delay = 500): Promise<void> {
  if (!state._id) {
    // unsupported module?
    return
  }

  if (typeof persistModulesTimers[state._id] === 'number') {
    clearTimeout(persistModulesTimers[state._id])
  }

  return new Promise<void>(resolve => {
    persistModulesTimers[state._id] = setTimeout(async () => {
      await syncState(state)

      resolve()
    }, delay)
  })
}

export async function mergeStoredState(state: any) {
  try {
    const storedState = await workspacesService.getState(state._id)

    if (storedState) {
      console.debug(`[store] retrieved stored state for module ${state._id}`)

      return Object.assign({}, state, storedState)
    }
  } catch (error) {
    console.error(`[store] error retrieving stored state for module ${state._id}`, error)
    workspacesService.removeState(state._id)
  }

  return Object.assign({}, state)
}

export async function registerModule(id, module: Module<any, any>, boot?: boolean, pane?: Pane) {
  console.debug(`[store] registering module ${id}`)

  if (pane) {
    module = { ...panesSettings[pane.type], state: JSON.parse(JSON.stringify(panesSettings[pane.type].state)) }

    module.state._id = id
    module.state._booted = false

    console.debug(`[store] module created using pane's type "${pane.type}"`)

    if (typeof pane.settings === 'object') {
      console.debug(`[store] found default settings in pane's definition -> merge into pane's module`)

      if (pane.settings._id) {
        delete pane.settings._id
      }

      merge(module.state, pane.settings)

      //delete pane.settings

      syncState(module.state)
    }
  }

  if (module.state._id) {
    console.debug(`[store] get stored state for module ${id}`)
    module.state = await mergeStoredState(module.state)
  }

  console.debug(`[store] store.registerModule ${id}`, module)
  store.registerModule(id, module)

  if (boot && typeof module.actions.boot !== 'undefined') {
    console.debug(`[store] booting module ${id}`)
    await store.dispatch(id + '/boot')
  }
}

export const normalizeSymbol = (symbol: string) => {
  return symbol.replace(/(?:%7F)+/g, '_').trim()
}

export function dumpSettings(): { [id: string]: any } {
  return JSON.parse(
    JSON.stringify(
      Object.keys(store.state).reduce((states, id) => {
        if (store.state[id]._id) {
          states[id] = store.state[id]
        }

        return states
      }, {})
    )
  )
}
