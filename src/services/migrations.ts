import panesSettings from '@/store/panesSettings'
import { Workspace } from '@/types/test'
import { IDBPDatabase } from 'idb'
import { AggrDB } from './workspacesService'
import defaultPanes from '@/store/defaultPanes.json'
import { TradesPaneState } from '@/store/panesSettings/trades'

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
      lg: JSON.parse(JSON.stringify(layout))
    }

    delete workspace.states.panes.layout

    const normalTradesSettings = JSON.parse(JSON.stringify(panesSettings.trades.state))
    const liquidationsTradesSettings = JSON.parse(JSON.stringify(defaultPanes.panes.liquidations.settings))

    const upgradeThreshold = (threshold, paneId) => {
      let buyAudio: string = null
      let sellAudio: string = null
      let settings: TradesPaneState

      if (paneId === 'liquidations') {
        settings = liquidationsTradesSettings
      } else {
        settings = normalTradesSettings
      }

      if (threshold.id === 'liquidations') {
        buyAudio = normalTradesSettings.liquidations.buyAudio
        sellAudio = normalTradesSettings.liquidations.sellAudio
      } else {
        const defaultThreshold = settings.thresholds.find(t => t.id === threshold.id)

        if (defaultThreshold) {
          buyAudio = defaultThreshold.buyAudio
          sellAudio = defaultThreshold.sellAudio
        }
      }

      if (buyAudio !== null && sellAudio !== null) {
        threshold.buyAudio = buyAudio
        threshold.sellAudio = sellAudio
      } else {
        console.log(`[idb/upgrade/workspace] couldn't find default threshold audio script for threshold ${threshold.id} of pane ${paneId}`)
      }
    }

    for (const paneId in workspace.states.panes.panes) {
      if (workspace.states.panes.panes[paneId].type !== 'trades') {
        continue
      }

      console.log(`[idb/upgrade/workspace] set default audio scripts for pane ${paneId}`)

      upgradeThreshold(workspace.states[paneId].liquidations, paneId)

      for (const threshold of workspace.states[paneId].thresholds) {
        upgradeThreshold(threshold, paneId)
      }
    }
  }
}
