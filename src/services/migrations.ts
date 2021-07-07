import { Workspace } from '@/types/test'
import { IDBPDatabase } from 'idb'
import { AggrDB } from './workspacesService'

export const databaseUpgrades = {
  0: (db: IDBPDatabase<any>) => {
    console.debug(`[idb] create idb stores`)

    const workspacesStore = db.createObjectStore('workspaces', {
      keyPath: 'id'
    })

    workspacesStore.createIndex('name', 'name')

    const seriesStore = db.createObjectStore('series', {
      keyPath: 'id'
    })

    seriesStore.createIndex('name', 'name')

    db.createObjectStore('products', {
      keyPath: 'exchange'
    })

    db.createObjectStore('gifs', {
      keyPath: 'slug'
    })
  },
  1: (db: IDBPDatabase<AggrDB>) => {
    ;(db as any).deleteObjectStore('series')

    const indicatorsStore = db.createObjectStore('indicators', {
      keyPath: 'id'
    })

    indicatorsStore.createIndex('name', 'name')
  },
  2: (db: IDBPDatabase<AggrDB>) => {
    db.createObjectStore('presets', {
      keyPath: 'name'
    })
  }
}

export const workspaceUpgrades = {
  1: (workspace: Workspace) => {
    const layout = workspace.states.panes.layout

    workspace.states.panes.layouts = {
      lg: JSON.parse(JSON.stringify(layout)),
    }

    delete workspace.states.panes.layout
  }
}
