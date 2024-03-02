import defaultIndicators from '@/store/defaultIndicators.json'
import defaultPresets from '@/store/defaultPresets.json'
import defaultPanes from '@/store/defaultPanes.json'
import store, { boot } from '@/store'
import { IndicatorSettings } from '@/store/panesSettings/chart'
import {
  GifsStorage,
  ImportedSound,
  Preset,
  ProductsStorage,
  Workspace
} from '@/types/types'
import {
  downloadAnything,
  parseVersion,
  randomString,
  slugify,
  uniqueName
} from '@/utils/helpers'
import { openDB, DBSchema, IDBPDatabase, deleteDB } from 'idb'
import { databaseUpgrades, workspaceUpgrades } from './migrations'
import { PanesState } from '@/store/panes'
import alertService, { MarketAlerts } from './alertService'
import dialogService from './dialogService'
import { stripStablePair } from './productsService'
import notificationService from './notificationService'

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
  pairsFromURL: string[]
  defaultInserted = false

  constructor() {
    if (/github\.io/.test(window.location.hostname)) {
      this.urlStrategy = 'hash'
    }

    this.latestDatabaseVersion = Math.max.apply(
      null,
      Object.keys(databaseUpgrades)
    )
    this.latestWorkspaceVersion = Math.max.apply(
      null,
      Object.keys(workspaceUpgrades)
    )
    this.previousAppVersion = parseVersion(
      localStorage.getItem('version') || '-1'
    )
    this.latestAppVersion = parseVersion(import.meta.env.VITE_APP_VERSION)
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

    const workspace = await this.getCurrentWorkspace()

    this.setCurrentWorkspace(workspace)
  }

  async createDatabase() {
    console.info(
      `openDB 'aggr' (latest database v${this.latestDatabaseVersion} workspace v${this.latestWorkspaceVersion})`
    )

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

          for (
            let i = oldVersion ? oldVersion + 1 : oldVersion;
            i <= newVersion;
            i++
          ) {
            console.debug(`[idb] migrating v${i}`)

            if (typeof databaseUpgrades[i] === 'function') {
              databaseUpgrades[i](db, tx)
            }
          }
        },
        blocked() {
          alert(
            'Aggr is trying to upgrade.\nClose any other window with aggr open in order to allow it to upgrade.'
          )
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
      console.log(
        `[workspace] upgrade workspace ${workspace.id} (${
          workspace.version
        } -> ${workspace.version + 1})`
      )

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

    localStorage.setItem('version', import.meta.env.VITE_APP_VERSION)
  }

  async insertDefaultIndicators(db: IDBPDatabase<AggrDB>) {
    const now = Date.now()
    const tx = db.transaction('indicators', 'readwrite')

    const existing = await tx.store.getAllKeys()
    let added = 0

    for (const id in defaultIndicators) {
      const indicator: IndicatorSettings = defaultIndicators[id]

      if (
        parseVersion(indicator.version) <= this.previousAppVersion ||
        existing.indexOf(id) !== -1
      ) {
        continue
      }

      console.log(`[idb/defaultIndicators] insert default indicator ${id}`)

      try {
        await tx.store.add({
          ...indicator,
          id,
          createdAt: now,
          updatedAt: null
        })
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
      if (
        parseVersion(preset.version) < this.previousAppVersion ||
        existing.indexOf(preset.name) !== -1
      ) {
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

  /**
   * Use url params or local storage to retrieve current workspace
   * If markets are passed in the url, mutate the workspace with new markets before return
   * @returns {Workspace} workspace ready to be set on
   */
  async getCurrentWorkspace() {
    const lastWorkspaceId = localStorage.getItem('workspace')
    let urlWorkspaceId: string
    let urlPairs: string
    let workspace: Workspace

    if (this.urlStrategy === 'hash') {
      urlWorkspaceId = location.hash.substring(1)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-extra-semi
      ;[, urlWorkspaceId, urlPairs] = decodeURIComponent(
        location.pathname
      ).split('/')
    }

    if (urlWorkspaceId) {
      // try get workspace from id in the url
      workspace = await this.getWorkspace(urlWorkspaceId)
    }

    if (!workspace && lastWorkspaceId) {
      // try get workspace from id in the localStorage
      workspace = await this.getWorkspace(lastWorkspaceId)
    }

    if (!workspace) {
      if (
        localStorage.getItem('settings') &&
        /aggr.trade$/.test(window.location.hostname) &&
        !notificationService.hasDismissed('legacy-redirection-notice')
      ) {
        this.showLegacyNotice()
      }

      // create workspace, name it from url (or generate one)
      workspace = await this.createWorkspace(urlWorkspaceId)

      if (!urlPairs && urlWorkspaceId) {
        // workspace is new and user passed an id in the url, maybe this id is a pair
        urlPairs = urlWorkspaceId
      }
    } else if (!urlPairs && urlWorkspaceId && urlWorkspaceId !== workspace.id) {
      // workspace existed but id in the url does not match with it, maybe that's a pair
      urlPairs = urlWorkspaceId
    }

    if (urlPairs && urlPairs.trim().length > 4) {
      this.pairsFromURL = urlPairs
        .split(/\+|,/)
        .map(pair => stripStablePair(pair.toUpperCase()))
    }

    return workspace
  }

  async setCurrentWorkspace(workspace: Workspace) {
    let previousWorkspaceId

    if (this.workspace) {
      previousWorkspaceId = this.workspace.id

      window.location.href = window.location.href.replace(
        previousWorkspaceId,
        workspace.id
      )

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

    await boot(workspace, this.pairsFromURL)

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

    return this.saveWorkspace(this.workspace)
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

  async downloadWorkspace(id?: string | Workspace) {
    const workspace = await this.getWorkspace(id)

    if (!workspace) {
      return
    }

    if (workspace.states.panes) {
      delete (workspace.states.panes as PanesState).marketsListeners
    }

    downloadAnything(workspace, workspace.id + '_' + slugify(workspace.name))
  }

  async getState(stateId: string) {
    if (!this.workspace) {
      throw new Error(`There is no current workspace`)
    }

    if (this.workspace.states[stateId]) {
      console.debug(`[workspaces] get state ${stateId}`)

      return this.workspace.states[stateId]
    }

    console.debug(
      `[workspaces] couldn't retrieve workspace's state "${stateId}" (unknown state)`
    )

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

    return this.saveWorkspace(this.workspace)
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

    workspace.name = uniqueName(
      workspace.name || randomString(4),
      workspaces.map(w => w.name)
    )

    workspace.id = uniqueName(
      slugify(workspace.name),
      workspaces.map(w => w.id),
      true,
      'copy 1'
    )
  }

  async getWorkspace(id?: string | Workspace): Promise<Workspace> {
    let workspace

    if (!id || (this.workspace && id === this.workspace.id)) {
      workspace = this.workspace
    } else if (typeof id === 'string') {
      workspace = await this.db.get('workspaces', id)
    } else if (typeof id === 'object') {
      workspace = id
    }

    if (!workspace) {
      return
    }

    return workspace
  }

  async createWorkspace(name) {
    const timestamp = Date.now()

    const panes = JSON.parse(JSON.stringify(defaultPanes))

    const workspace: Workspace = {
      version: this.latestWorkspaceVersion,
      createdAt: timestamp,
      updatedAt: null,
      name: name,
      id: null,
      states: {
        panes
      }
    }

    await this.makeUniqueWorkspace(workspace)

    console.debug(
      `[workspaces] create new workspace ${workspace.name} (${workspace.id})`
    )

    await this.db.add('workspaces', workspace)

    return await this.getWorkspace(workspace.id)
  }

  async duplicateWorkspace(id?: string | Workspace) {
    const workspace = await this.getWorkspace(id)

    if (!workspace) {
      return
    }

    const timestamp = Date.now()

    const workspaceCopy: Workspace = JSON.parse(JSON.stringify(workspace))

    workspaceCopy.createdAt = timestamp
    workspaceCopy.updatedAt = null

    await this.makeUniqueWorkspace(workspaceCopy)

    console.debug(
      `[workspaces] copy current workspace into ${workspaceCopy.name} (${workspaceCopy.id})`
    )

    await this.db.add('workspaces', workspaceCopy)

    return await this.setCurrentWorkspace(
      await this.getWorkspace(workspaceCopy.id)
    )
  }

  getWorkspaces() {
    return this.db.getAllFromIndex('workspaces', 'name')
  }

  async renameWorkspace(workspace: Workspace, name: string) {
    await this.removeWorkspace(workspace.id)

    workspace.name = name

    await this.makeUniqueWorkspace(workspace)

    return this.db.add('workspaces', workspace)
  }

  async saveWorkspace(workspace: Workspace) {
    workspace.updatedAt = Date.now()

    return this.db.put('workspaces', JSON.parse(JSON.stringify(workspace)))
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

  async saveIndicator(indicator: IndicatorSettings, silent = false) {
    const now = Date.now()

    if (!indicator.libraryId) {
      if (indicator.id && indicator.id[0] !== '_') {
        indicator.libraryId = indicator.id
      } else {
        indicator.libraryId = uniqueName(
          slugify(indicator.name),
          await this.getIndicatorsIds(),
          true,
          '2'
        )
      }
    }

    const originalIndicator: IndicatorSettings =
      (await this.db.get('indicators', indicator.libraryId)) || {}

    indicator.createdAt =
      indicator.createdAt || originalIndicator.createdAt || now
    indicator.updatedAt = silent
      ? indicator.updatedAt || originalIndicator.updatedAt || now
      : now

    const payload = JSON.parse(
      JSON.stringify({
        id: indicator.libraryId,
        name: indicator.name || originalIndicator.name,
        options: indicator.options || originalIndicator.options,
        script: indicator.script || originalIndicator.script,
        createdAt: indicator.createdAt,
        updatedAt: indicator.updatedAt,
        preview: indicator.preview
      })
    )

    const optionals = ['displayName', 'description', 'enabled', 'author', 'pr']

    for (const key of optionals) {
      if (typeof indicator[key] !== 'undefined') {
        payload[key] = indicator[key]
      } else if (typeof originalIndicator[key] !== 'undefined') {
        payload[key] = originalIndicator[key]
      }
    }

    payload.preview =
      typeof indicator.preview !== 'undefined'
        ? indicator.preview
        : originalIndicator.preview

    await this.db.put('indicators', payload)

    if (!originalIndicator) {
      store.dispatch('app/showNotice', {
        type: 'info',
        title: `Saved indicator ${payload.id}`
      })
    }

    return payload
  }

  async saveIndicatorPreview(indicatorId: string, blob: Blob) {
    const originalIndicator = await this.db.get('indicators', indicatorId)

    if (originalIndicator.preview instanceof File) {
      return
    }

    originalIndicator.preview = blob

    await this.db.put('indicators', originalIndicator)
  }

  async incrementIndicatorUsage(id: string): Promise<IndicatorSettings> {
    const indicator = await this.getIndicator(id)

    if (!indicator) {
      return
    }

    indicator.updatedAt = Date.now()

    await this.saveIndicator(indicator)

    return indicator
  }

  getIndicator(id: string): Promise<IndicatorSettings> {
    return this.db.get('indicators', id)
  }

  getIndicators(): Promise<IndicatorSettings[]> {
    return this.db.getAllFromIndex('indicators', 'name')
  }

  getIndicatorsIds() {
    return this.db.getAllKeys('indicators')
  }

  async deleteIndicator(id: string) {
    await this.db.delete('indicators', id)

    store.dispatch('app/showNotice', {
      type: 'info',
      title: `Deleted indicator ${id}`
    })
  }

  async savePreset(preset: Preset, type?: string, confirmOverride = true) {
    if (type) {
      // ex indicator:price

      const inputType = preset.name.split(':')[0]
      const targetType = type.split(':')[0]

      if (targetType !== inputType) {
        throw new Error(
          `Preset doesn't match with pane type (${inputType} is not ${targetType})`
        )
      }

      preset.name = type + ':' + preset.name.split(':').pop()
    }

    if (
      confirmOverride &&
      (await this.getPreset(preset.name)) &&
      !(await dialogService.confirm({
        message: `This preset "${preset.name}" already exists.`,
        ok: 'Continue anyway',
        cancel: 'Cancel'
      }))
    ) {
      return
    }

    return this.db.put('presets', {
      ...preset,
      type: 'preset'
    })
  }

  async getPreset(id: string): Promise<Preset> {
    return this.db.get('presets', id)
  }

  getPresetsKeysByType(type: string) {
    return this.db.getAllKeys(
      'presets',
      IDBKeyRange.bound(type, type + '|', true, true)
    )
  }

  getAllPresets(type: string) {
    return this.db.getAll(
      'presets',
      IDBKeyRange.bound(type, type + '|', true, true)
    )
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

  getAllAlerts() {
    return this.db.getAll('alerts')
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
        if (
          tableName === 'products' ||
          tableName === 'gifs' ||
          tableName === 'sounds'
        ) {
          return false
        }

        return true
      }
    })

    const workspaces = (await this.getWorkspaces())
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map(a => a.id)

    downloadAnything(blob, 'aggr-' + workspaces.join('-'))
  }

  async showLegacyNotice() {
    const stay = await dialogService.confirm({
      title: 'Update notice',
      message: `Welcome to aggr.trade ${
        import.meta.env.VITE_APP_VERSION
      }.<br>We are replacing the old version with the new on the main app.<br><br>If for some reasons you don't like it,<br>legacy app can still be found on <a href="https://legacy.aggr.trade">legacy.aggr.trade</a> ☺️`,
      ok: 'Stay ',
      cancel: 'Go back',
      html: true
    })

    if (stay === false) {
      window.location.href = 'https://legacy.aggr.trade/'
    } else if (stay === true) {
      notificationService.dismiss('legacy-redirection-notice')
    }
  }
}

export default new WorkspacesService()
