import { boot } from '@/store'
import { GifsStorage, ProductsStorage, Workspace } from '@/types/test'
import { downloadJson, randomString, slugify, uniqueName } from '@/utils/helpers'
import { openDB, DBSchema, IDBPDatabase, deleteDB } from 'idb'

interface AggrDB extends DBSchema {
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
    indexes: { createdAt: number; updatedAt: number }
  }
}

class WorkspacesService {
  db: IDBPDatabase<AggrDB>

  workspace: Workspace

  async createDatabase() {
    console.log(`[workspaces.db] openDB 'aggr'`)

    return openDB<AggrDB>('aggr', 1, {
      upgrade: (db, oldVersion, newVersion) => {
        console.debug(`[workspaces.db] upgrade received`, oldVersion, '->', newVersion)
        console.debug(`[workspaces.db] create idb stores`)

        const workspacesStore = db.createObjectStore('workspaces', {
          keyPath: 'id'
        })

        const index = workspacesStore.createIndex('updatedAt', 'updatedAt')

        console.log(index)

        db.createObjectStore('products', {
          keyPath: 'exchange'
        })

        db.createObjectStore('gifs', {
          keyPath: 'slug'
        })
        // …
      },
      blocked() {
        console.log(`[workspaces.db] blocked received`)
        // …
      },
      blocking() {
        console.log(`[workspaces.db] blocking received`)
        // …
      },
      terminated() {
        console.log(`[workspaces.db] terminated received`)
        // …
      }
    })
  }

  async initialize() {
    this.db = await this.createDatabase()

    console.log(`[storage.db] database initialized`, this.db)
  }

  async getCurrentWorkspace() {
    let id = window.location.pathname.substring(1)

    if (!id.length || !/^[a-zA-Z0-9]{8}$/.test(id)) {
      id = localStorage.getItem('workspace')
    }

    let workspace: Workspace

    if (!id || !(workspace = await this.getWorkspace(id))) {
      workspace = await this.createWorkspace()
    }

    return workspace
  }

  async setWorkspace(workspace: Workspace) {
    this.workspace = workspace

    window.history.replaceState('Object', 'Title', '/' + this.workspace.id)
    localStorage.setItem('workspace', this.workspace.id)

    await boot(workspace)

    return workspace
  }

  getWorkspace(id: string) {
    console.debug(`[workspaces] get workspace ${id}`)

    return this.db.get('workspaces', id)
  }

  async createWorkspace() {
    const timestamp = +new Date()

    const workspace: Workspace = {
      createdAt: timestamp,
      updatedAt: timestamp,
      name: null,
      id: null,
      states: {}
    }

    await this.makeUnique(workspace)

    console.debug(`[workspaces] create new workspace ${workspace.name} (${workspace.id})`)

    await this.db.add('workspaces', workspace)

    return await this.getWorkspace(workspace.id)
  }

  getWorkspaces() {
    return this.db.getAllFromIndex('workspaces', 'updatedAt')
  }

  async saveState(stateId, state: any) {
    if (!this.workspace) {
      throw new Error(`There is no current workspace`)
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

  async importWorkspace(workspace: Workspace) {
    const timestamp = +new Date()

    await this.makeUnique(workspace)

    await this.db.add('workspaces', {
      ...workspace,
      createdAt: timestamp,
      updatedAt: timestamp
    })

    return this.getWorkspace(workspace.id)
  }

  async makeUnique(workspace: Workspace) {
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

  async reset() {
    this.db.close()
    this.db = null
    this.workspace = null

    localStorage.removeItem('workspace')

    await deleteDB('aggr')
  }
}

export default new WorkspacesService()
