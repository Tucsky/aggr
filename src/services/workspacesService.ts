import defaultIndicators from '@/store/defaultIndicators.json'
import defaultPresets from '@/store/defaultPresets.json'
import defaultPanes from '@/store/defaultPanes.json'
import store, { boot } from '@/store'
import { IndicatorSettings } from '@/store/panesSettings/chart'
import { GifsStorage, ImportedSound, MarketAlerts, Preset, PresetType, ProductsStorage, Workspace } from '@/types/test'
import { downloadAnything, parseVersion, randomString, slugify, uniqueName } from '@/utils/helpers'
import { openDB, DBSchema, IDBPDatabase, deleteDB } from 'idb'
import { databaseUpgrades, workspaceUpgrades } from './migrations'
import { PanesState } from '@/store/panes'
import alertService from './alertService'

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
  presets: {
    value: Preset
    key: string
  }
  sounds: {
    value: ImportedSound
    key: string
  }
  colors: {
    value: string
    key: string
  }
  alerts: {
    value: MarketAlerts
    key: string
  }
}

class WorkspacesService {
  db: IDBPDatabase<AggrDB>
  workspace: Workspace
  urlStrategy = 'history'
  previousAppVersion: any
  latestAppVersion: any
  latestDatabaseVersion: any
  latestWorkspaceVersion: any
  defaultInserted = false

  constructor() {
    if (/github\.io/.test(window.location.hostname)) {
      this.urlStrategy = 'hash'
    }

    this.latestDatabaseVersion = Math.max.apply(null, Object.keys(databaseUpgrades))
    this.latestWorkspaceVersion = Math.max.apply(null, Object.keys(workspaceUpgrades))
    this.previousAppVersion = parseVersion(localStorage.getItem('version') || '-1')
    this.latestAppVersion = parseVersion(process.env.VUE_APP_VERSION)
  }

  async initialize() {
    this.db = await this.createDatabase()

    if (!this.defaultInserted) {
      // add default presets and indicators post database creation
      setTimeout(() => {
        this.insertDefault(this.db)
      }, 3000)
    }

    alertService.syncTriggeredAlerts()
  }

  async createDatabase() {
    console.info(`openDB 'aggr' (latest database v${this.latestDatabaseVersion} workspace v${this.latestWorkspaceVersion})`)

    let promiseOfUpgrade: Promise<void>

    return new Promise<IDBPDatabase<AggrDB>>(resolve => {
      openDB<AggrDB>('aggr', this.latestDatabaseVersion, {
        upgrade: (db, oldVersion, newVersion, tx) => {
          console.debug(`[idb] upgrade received`, oldVersion, '->', newVersion)

          promiseOfUpgrade = new Promise(resolve => {
            tx.oncomplete = async () => {
              console.debug(`[idb] upgrade completed`)

              await this.insertDefault(db)
              resolve()
            }
            tx.onerror = async error => {
              console.error(`[idb] upgrade error`, error)
              resolve()
            }
          })

          for (let i = oldVersion ? oldVersion + 1 : oldVersion; i <= newVersion; i++) {
            console.debug(`[idb] migrating v${i}`)

            if (typeof databaseUpgrades[i] === 'function') {
              databaseUpgrades[i](db, tx)
            }
          }
        },
        blocked() {
          alert('Aggr is trying to upgrade.\nClose any other window with aggr open in order to allow it to upgrade.')
          console.log(`[idb] blocked received`)
          // …
        },
        blocking() {
          console.log(`[idb] blocking received`)
          // …
        },
        terminated() {
          alert('Browser abnormally terminated the connection with aggr db.')
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
        .catch(err => {
          console.log(err)
          alert(
            err.message +
              '\n\nEither reset the browser data on this site or contact the devs on the github :\nhttps://github.com/Tucsky/aggr/issues/new'
          )
        })
    })
  }

  upgradeWorkspace(workspace: Workspace) {
    if (typeof workspace.version === 'undefined') {
      workspace.version = 0
    }

    while (workspace.version < this.latestWorkspaceVersion) {
      console.log(`[workspace] upgrade workspace ${workspace.id} (${workspace.version} -> ${workspace.version + 1})`)

      workspace.version++

      if (typeof workspaceUpgrades[workspace.version] === 'function') {
        workspaceUpgrades[workspace.version](workspace)
      }
    }
  }

  async insertDefault(db: IDBPDatabase<AggrDB>) {
    this.defaultInserted = true

    await this.insertDefaultIndicators(db)
    await this.insertDefaultPresets(db)

    localStorage.setItem('version', process.env.VUE_APP_VERSION)
  }

  async insertDefaultIndicators(db: IDBPDatabase<AggrDB>) {
    const now = Date.now()
    const tx = db.transaction('indicators', 'readwrite')

    const existing = await tx.store.getAllKeys()
    let added = 0

    for (const id in defaultIndicators) {
      const indicator: IndicatorSettings = defaultIndicators[id]

      if (parseVersion(indicator.version) <= this.previousAppVersion || existing.indexOf(id) !== -1) {
        continue
      }

      console.log(`[idb/defaultIndicators] insert default indicator ${id}`)

      try {
        await tx.store.add({ ...indicator, id, createdAt: now, updatedAt: null })
      } catch (error) {
        console.error(error)
        throw error
      }

      added++
    }

    if (added) {
      console.debug(`[idb/defaultIndicators] ${added} indicators added`)
    }

    await tx.done
  }

  async insertDefaultPresets(db: IDBPDatabase<AggrDB>) {
    const tx = db.transaction('presets', 'readwrite')

    const existing = await tx.store.getAllKeys()
    let added = 0

    for (const preset of defaultPresets as Preset[]) {
      if (parseVersion(preset.version) < this.previousAppVersion || existing.indexOf(preset.name) !== -1) {
        continue
      }

      console.log(`[idb/defaultPresets] insert default preset ${preset.name}`)

      await tx.store.add(preset)

      added++
    }

    if (added) {
      console.debug(`[idb/defaultPresets] ${added} presets added`)
    }

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
    let previousWorkspaceId

    if (this.workspace) {
      previousWorkspaceId = this.workspace.id

      window.location.href = window.location.href.replace(previousWorkspaceId, workspace.id)

      if (this.urlStrategy === 'hash') {
        window.location.reload()
      }

      return
    }

    this.upgradeWorkspace(workspace)

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

  async addAndSetWorkspace(workspace) {
    await this.setCurrentWorkspace(await this.addWorkspace(workspace))

    this.getWorkspaces()
  }

  async saveState(stateId, state: any) {
    if (!this.workspace) {
      throw new Error(`There is no current workspace`)
    }

    state = this.cleanState(state)

    this.workspace.states[stateId] = state

    return this.saveWorkspace()
  }

  cleanState(state) {
    state = JSON.parse(JSON.stringify(state))

    for (const prop in state) {
      if (prop[0] === '_' && prop !== '_id') {
        delete state[prop]
      }
    }

    return state
  }

  downloadWorkspace() {
    if (this.workspace.states.panes) {
      delete (this.workspace.states.panes as PanesState).marketsListeners
    }

    downloadAnything(this.workspace, this.workspace.id + '_' + slugify(this.workspace.name))
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

    if (this.workspace.states[stateId]) {
      delete this.workspace.states[stateId]
    }

    return this.saveWorkspace()
  }

  async addWorkspace(workspace: Workspace) {
    const timestamp = Date.now()

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
    const timestamp = Date.now()

    const panes = JSON.parse(JSON.stringify(defaultPanes))

    const workspace: Workspace = {
      version: this.latestWorkspaceVersion,
      createdAt: timestamp,
      updatedAt: null,
      name: null,
      id: null,
      states: {
        panes
      }
    }

    await this.makeUniqueWorkspace(workspace)

    console.debug(`[workspaces] create new workspace ${workspace.name} (${workspace.id})`)

    await this.db.add('workspaces', workspace)

    return await this.getWorkspace(workspace.id)
  }

  async duplicateWorkspace() {
    const timestamp = Date.now()

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

    this.workspace.updatedAt = Date.now()

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

  getGifsKeywords() {
    return this.db.getAllKeys('gifs')
  }

  deleteGifs(slug: string) {
    return this.db.delete('gifs', slug)
  }

  async saveIndicator(indicator: IndicatorSettings) {
    const now = Date.now()

    if (indicator.createdAt) {
      indicator.updatedAt = now
    } else {
      indicator.createdAt = now
    }

    store.dispatch('app/showNotice', {
      type: 'info',
      title: `Saved indicator ${indicator.id}`
    })

    return this.db.put('indicators', indicator)
  }

  async incrementIndicatorUsage(id: string): Promise<string> {
    const indicator = await this.getIndicator(id)

    if (!indicator) {
      return
    }

    if (!indicator.uses) {
      indicator.uses = 0
    }

    indicator.uses++

    return this.saveIndicator(indicator)
  }

  getIndicator(id: string): Promise<IndicatorSettings> {
    return this.db.get('indicators', id)
  }

  getIndicators(): Promise<IndicatorSettings[]> {
    return this.db.getAllFromIndex('indicators', 'name')
  }

  deleteIndicator(id: string) {
    return this.db.delete('indicators', id)
  }

  savePreset(preset: Preset) {
    return this.db.put('presets', preset)
  }

  async getPreset(id: string): Promise<Preset> {
    return this.db.get('presets', id)
  }

  getPresetsKeysByType(type: PresetType) {
    return this.db.getAllKeys('presets', IDBKeyRange.bound(type, type + '|', true, true))
  }

  removePreset(id) {
    return this.db.delete('presets', id)
  }

  saveSound(sound: ImportedSound) {
    return this.db.put('sounds', sound)
  }

  async getSound(id: string): Promise<ImportedSound> {
    return this.db.get('sounds', id)
  }

  removeSound(id) {
    return this.db.delete('sounds', id)
  }

  saveColor(color: string) {
    return this.db.put('colors', color)
  }

  async getColors(): Promise<string[]> {
    return this.db.getAll('colors')
  }

  removeColor(color: string) {
    return this.db.delete('colors', color)
  }

  async getAlerts(market: string) {
    const marketAlerts = await this.db.get('alerts', market)

    if (marketAlerts) {
      return marketAlerts.alerts
    }

    return []
  }

  saveAlerts(marketAlerts: MarketAlerts) {
    if (!marketAlerts.alerts.length) {
      return this.db.delete('alerts', marketAlerts.market)
    }

    return this.db.put('alerts', marketAlerts)
  }

  async reset() {
    if (this.db) {
      this.db.close()
      this.db = null
      this.workspace = null
    }

    await deleteDB('aggr')

    localStorage.removeItem('workspace')
    localStorage.removeItem('version')
  }

  async exportDatabase() {
    const { Dexie } = (await import('dexie')) as any
    const { exportDB } = await import('dexie-export-import')

    const db = await new Dexie('aggr').open()
    const blob = await exportDB(db, {
      filter: tableName => {
        if (tableName === 'products' || tableName === 'gifs') {
          return false
        }

        return true
      }
    })

    const workspaces = (await this.getWorkspaces()).sort((a, b) => b.updatedAt - a.updatedAt).map(a => a.id)

    downloadAnything(blob, 'aggr-' + workspaces.join('-'))
  }
}

export default new WorkspacesService()
