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
      if (workspace.states.panes.panes[paneId].type !== 'trades' || !workspace.states[paneId]) {
        continue
      }

      console.log(`[idb/upgrade/workspace] set default audio scripts for pane ${paneId}`)

      upgradeThreshold(workspace.states[paneId].liquidations, paneId)

      for (const threshold of workspace.states[paneId].thresholds) {
        upgradeThreshold(threshold, paneId)
      }
    }
  },
  2: (workspace: Workspace) => {
    if (!workspace.states.settings) {
      return
    }

    workspace.states.settings.audioFilters = {
      HighPassFilter: !!workspace.states.settings.audioFilter,
      LowPassFilter: false,
      Compressor: !!workspace.states.settings.audioCompressor,
      Delay: !!workspace.states.settings.audioDelay,
      PingPongDelay: !!workspace.states.settings.audioPingPong,
      Chorus: false
    }

    delete workspace.states.settings.audioFilter
    delete workspace.states.settings.audioCompressor
    delete workspace.states.settings.audioPingPong
    delete workspace.states.settings.audioDelay
  },
  3: (workspace: Workspace) => {
    // remove alternative layouts, keep only the one fitting current screen size
    const breakpointsWidth = { xl: 1400, lg: 1024, md: 768, sm: 480, xs: 0 }
    const breakpointsCols = { xl: 32, lg: 24, md: 16, sm: 12, xs: 8 }
    const layouts = workspace.states.panes.layouts
    const breakpoints = Object.keys(layouts).reduce((cols, breakpoint) => {
      cols[breakpoint] = breakpointsWidth[breakpoint]
      return cols
    }, {})

    // sort by layout size
    const keys = Object.keys(breakpoints).sort((a, b) => {
      return breakpointsCols[b] - breakpointsCols[a]
    })

    // ensure smallest is level 0 layout
    breakpoints[keys[keys.length - 1]] = 0

    const width = window.innerWidth

    let currentBreakpoint

    for (currentBreakpoint of keys) {
      if (width > breakpoints[currentBreakpoint]) {
        break
      }
    }

    const currentLayout = workspace.states.panes.layouts[currentBreakpoint]

    if (currentBreakpoint !== 'lg') {
      const cols = breakpointsCols[currentBreakpoint]
      const coeficient = breakpointsCols.lg / cols

      for (const pane of currentLayout) {
        pane.x = Math.floor(pane.x * coeficient)
        pane.y = Math.floor(pane.y * coeficient)
        pane.w = Math.floor(pane.w * coeficient)
        pane.h = Math.floor(pane.h * coeficient)
      }
    }

    workspace.states.panes.layout = currentLayout
    delete workspace.states.panes.layouts

    for (const paneId in workspace.states.panes.panes) {
      if (workspace.states.panes.panes[paneId].type !== 'chart' || !workspace.states[paneId]) {
        continue
      }

      let scaleMargins = {
        top: 0.1,
        bottom: 0.2
      }

      if (workspace.states[paneId].indicators) {
        const rightIndicatorId = Object.keys(workspace.states[paneId].indicators).find(id => {
          return (
            workspace.states[paneId].indicators[id].options &&
            workspace.states[paneId].indicators[id].options.scaleMargins &&
            workspace.states[paneId].indicators[id].options.priceScaleId === 'right'
          )
        }) as string

        if (rightIndicatorId) {
          scaleMargins = workspace.states[paneId].indicators[rightIndicatorId].options.scaleMargins
        }
      }

      workspace.states[paneId].priceScales = {
        right: {
          mode: 0,
          scaleMargins
        }
      }
    }
  }
}
