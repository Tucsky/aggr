import store from '../store/index'
import { Module } from 'vuex'
import merge from 'lodash.merge'
import { Pane } from '@/store/panes'
import panesSettings from '@/store/panesSettings'
import workspacesService from '@/services/workspacesService'

const persistModulesTimers = {}

export async function syncState(state): Promise<any> {
  if (typeof state._id === 'undefined') {
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

export function scheduleSync(state): Promise<void> {
  if (typeof state._id === 'undefined') {
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
    }, 500)
  })
}

export async function mergeStoredState(state: any) {
  try {
    const storedState = await workspacesService.getState(state._id)

    if (storedState) {
      return Object.assign({}, state, storedState)
    }
  } catch (error) {
    console.error(
      `[store] error retrieving stored state for module ${state._id}`,
      error
    )
    workspacesService.removeState(state._id)
  }

  return state
}

/**
 * Prepare pane state if needed
 * Not all panes type have a boot method
 * @param paneId
 */
export async function bootPane(paneId, firstTime = false) {
  console.info(`booting pane ${paneId}`)
  if ((store as any)._actions[paneId + '/boot']) {
    try {
      await store.dispatch(paneId + '/boot', firstTime)
    } catch (error) {
      console.error(error)
    }
  }
}

export async function registerModule(
  id,
  module: Module<any, any>,
  boot?: boolean,
  pane?: Pane
) {
  console.debug(`[store] registering module ${id}`)

  if (pane) {
    // module is a pane
    module = {
      ...panesSettings[pane.type],
      state: JSON.parse(JSON.stringify(panesSettings[pane.type].state))
    }

    module.state._id = id

    console.debug(`[store] module created using pane's type "${pane.type}"`)

    if (typeof pane.settings === 'object') {
      if (pane.settings._id) {
        delete pane.settings._id
      }

      merge(module.state, pane.settings)
    }
  } else {
    module = { ...module, state: JSON.parse(JSON.stringify(module.state)) }
  }

  if (typeof module.state._id !== 'undefined') {
    console.debug(`[store] get stored state for module ${id}`)
    module.state = await mergeStoredState(module.state)
  }

  store.registerModule(id, module)

  if (boot && pane) {
    await bootPane(id, true)
  }

  if (store.state.app.isBooted) {
    syncState(module.state)
  }
}

export function subscribeOnce(type: string): Promise<any> {
  return new Promise(resolve => {
    const unsubscribe = store.subscribe(mutation => {
      if (mutation.type === type) {
        resolve(mutation.payload)
        unsubscribe()
      }
    })
  })
}

export function waitForStateMutation(getter): Promise<any> {
  return new Promise(resolve => {
    const unsubscribe = store.watch(getter, value => {
      resolve(value)
      unsubscribe()
    })
  })
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
