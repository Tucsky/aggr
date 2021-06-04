import { IDBPDatabase } from 'idb'
import { AggrDB } from './workspacesService'

export const v0 = (db: IDBPDatabase<any>) => {
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
}

export const v1 = (db: IDBPDatabase<AggrDB>) => {
  ;(db as any).deleteObjectStore('series')

  const indicatorsStore = db.createObjectStore('indicators', {
    keyPath: 'id'
  })

  indicatorsStore.createIndex('name', 'name')
}
