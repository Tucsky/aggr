import { defaultIndicators } from '@/components/chart/defaultIndicators'
import store, { boot } from '@/store'
import { IndicatorSettings } from '@/store/panesSettings/chart'
import { GifsStorage, ProductsStorage, Workspace } from '@/types/test'
import { downloadJson, randomString, slugify, uniqueName } from '@/utils/helpers'
import { openDB, DBSchema, IDBPDatabase, deleteDB } from 'idb'
import * as migrations from './migrations'

export interface AggrDB extends DBSchema {
  products: {
    value: ProductsStorage
    key: string
  }
  gifs: {
    value: GifsStorage
    key: string
  }
  workspaces: {
    value: Workspace
    key: string
    indexes: { name: string }
  }
  indicators: {
    value: IndicatorSettings
    key: string
    indexes: { name: string }
  }
}

class WorkspacesService {
  db: IDBPDatabase<AggrDB>
  workspace: Workspace
  urlStrategy = 'history'

  constructor() {
    if (/github\.io/.test(window.location.hostname)) {
      this.urlStrategy = 'hash'
    }
  }

  async createDatabase() {
    console.log(`[idb] openDB 'aggr'`)

    let promiseOfUpgrade: Promise<void>

    return new Promise<IDBPDatabase<AggrDB>>(resolve => {
      openDB<AggrDB>('aggr', 1, {
        upgrade: (db, oldVersion, newVersion, tx) => {
          console.debug(`[idb] upgrade received`, oldVersion, '->', newVersion)

          promiseOfUpgrade = new Promise(resolve => {
            tx.oncomplete = async () => {
              console.debug(`[idb] upgrade completed`)

              await this.insertDefault(db)
              resolve()
            }
          })

          for (let i = oldVersion; i <= newVersion; i++) {
            console.debug(`[idb] migrating v${i}`)
            migrations['v' + i](db)
          }
        },
        blocked() {
          console.log(`[idb] blocked received`)
          // …
        },
        blocking() {
          console.log(`[idb] blocking received`)
          // …
        },
        terminated() {
          console.log(`[idb] terminated received`)
          // …
        }
      })
        .then(db => {
          if (promiseOfUpgrade) {
            return promiseOfUpgrade.then(() => resolve(db))
          }

          return resolve(db)
        })
        .catch(err => console.error(err))
    })
  }

  async initialize() {
    this.db = await this.createDatabase()

    if (Object.values((this.db as any).objectStoreNames).indexOf('series') !== -1) {
      await this.reset()

      window.location.reload()
    }
  }

  async insertDefault(db: IDBPDatabase<AggrDB>) {
    console.log(`[idb] insert default`)

    const now = +new Date()
    const tx = db.transaction('indicators', 'readwrite')

    for (const id in defaultIndicators) {
      const serie: IndicatorSettings = defaultIndicators[id]

      tx.store.add({ ...serie, id, createdAt: now, updatedAt: null })
    }

    console.debug(`[idb] ${Object.keys(defaultIndicators).length} default indicators added`)

    await tx.done
  }

  async getCurrentWorkspace() {
    let id

    if (this.urlStrategy === 'hash') {
      id = location.hash.substring(1)
    } else {
      id = location.pathname.substring(1)
    }

    if (!id.length || !/^[a-zA-Z0-9]{4}$/.test(id)) {
      id = localStorage.getItem('workspace')
    }

    let workspace: Workspace

    if (!id || !(workspace = await this.getWorkspace(id))) {
      workspace = await this.createWorkspace()
    }

    return workspace
  }

  async setCurrentWorkspace(workspace: Workspace) {
    this.workspace = workspace

    if (this.urlStrategy === 'hash') {
      location.hash = this.workspace.id
    } else {
      window.history.replaceState('Object', 'Title', '/' + this.workspace.id)
    }

    localStorage.setItem('workspace', this.workspace.id)

    await boot(workspace)

    return workspace
  }

  async saveState(stateId, state: any) {
    if (!this.workspace) {
      throw new Error(`There is no current workspace`)
    }

    state = JSON.parse(JSON.stringify(state))

    for (const prop in state) {
      if (prop[0] === '_' && prop !== '_id') {
        delete state[prop]
      }
    }

    this.workspace.states[stateId] = state

    return this.saveWorkspace()
  }

  downloadWorkspace() {
    downloadJson(this.workspace, this.workspace.id + '_' + slugify(this.workspace.name))
  }

  async getState(stateId: string) {
    if (!this.workspace) {
      throw new Error(`There is no current workspace`)
    }

    if (this.workspace.states[stateId]) {
      console.debug(`[workspaces] get state ${stateId}`)

      return this.workspace.states[stateId]
    }

    console.debug(`[workspaces] couldn't retrieve workspace's state "${stateId}" (unknown state)`)

    return null
  }

  async removeState(stateId: string) {
    if (!this.workspace) {
      throw new Error(`There is no current workspace`)
    }

    console.debug(`[workspaces] remove state ${stateId}`)

    delete this.workspace.states[stateId]

    return this.saveWorkspace()
  }

  async importWorkspace(workspace: Workspace) {
    const timestamp = +new Date()

    await this.makeUniqueWorkspace(workspace)

    await this.db.add('workspaces', {
      ...workspace,
      createdAt: timestamp,
      updatedAt: null
    })

    return this.getWorkspace(workspace.id)
  }

  async makeUniqueWorkspace(workspace: Workspace) {
    const workspaces = await this.getWorkspaces()

    const names = workspaces.map(w => w.name)
    const ids = workspaces.map(w => w.id)

    if (!workspace.name) {
      workspace.name = 'Untitled'
    }

    workspace.name = uniqueName(workspace.name, names)

    let id = workspace.id

    while (!id || ids.indexOf(id) !== -1) {
      id = randomString(4)
    }

    workspace.id = id
  }

  getWorkspace(id: string) {
    console.debug(`[workspaces] get workspace ${id}`)

    return this.db.get('workspaces', id)
  }

  async createWorkspace() {
    const timestamp = +new Date()

    const workspace: Workspace = {
      createdAt: timestamp,
      updatedAt: null,
      name: null,
      id: null,
      states: {}
    }

    await this.makeUniqueWorkspace(workspace)

    console.debug(`[workspaces] create new workspace ${workspace.name} (${workspace.id})`)

    await this.db.add('workspaces', workspace)

    return await this.getWorkspace(workspace.id)
  }

  async duplicateWorkspace() {
    const timestamp = +new Date()

    const workspace: Workspace = JSON.parse(JSON.stringify(this.workspace))

    workspace.createdAt = timestamp
    workspace.updatedAt = null

    await this.makeUniqueWorkspace(workspace)

    console.debug(`[workspaces] copy current workspace into ${workspace.name} (${workspace.id})`)

    await this.db.add('workspaces', workspace)

    return await this.setCurrentWorkspace(await this.getWorkspace(workspace.id))
  }

  getWorkspaces() {
    return this.db.getAllFromIndex('workspaces', 'name')
  }

  async renameWorkspace(name: string) {
    if (!this.workspace) {
      throw new Error(`There is no current workspace`)
    }

    console.debug(`[workspaces] rename workspace ${this.workspace.name} -> ${name}`)

    this.workspace.name = name

    return this.saveWorkspace()
  }

  async saveWorkspace() {
    if (!this.workspace) {
      throw new Error(`There is no current workspace`)
    }

    this.workspace.updatedAt = +new Date()

    return this.db.put('workspaces', JSON.parse(JSON.stringify(this.workspace)))
  }

  removeWorkspace(id: string) {
    return this.db.delete('workspaces', id)
  }

  saveProducts(storage: ProductsStorage) {
    return this.db.put('products', storage)
  }

  getProducts(exchangeId: string) {
    return this.db.get('products', exchangeId)
  }

  deleteProducts(exchangeId: string) {
    return this.db.delete('products', exchangeId)
  }

  saveGifs(storage: GifsStorage) {
    return this.db.put('gifs', storage)
  }

  getGifs(slug: string) {
    return this.db.get('gifs', slug)
  }

  deleteGifs(slug: string) {
    return this.db.delete('gifs', slug)
  }

  async saveIndicator(indicator: IndicatorSettings) {
    const now = +new Date()

    if (!indicator.createdAt) {
      indicator.createdAt = now
    }

    indicator.updatedAt = now

    store.dispatch('app/showNotice', {
      type: 'info',
      title: `Saved indicator ${indicator.id}`
    })

    return this.db.put('indicators', indicator)
  }

  getIndicator(id: string) {
    return this.db.get('indicators', id)
  }

  getIndicators() {
    return this.db.getAllFromIndex('indicators', 'name')
  }

  deleteIndicator(id: string) {
    return this.db.delete('indicators', id)
  }

  async reset() {
    this.db.close()
    this.db = null
    this.workspace = null

    localStorage.removeItem('workspace')

    await deleteDB('aggr')
  }
}

export default new WorkspacesService()
