import aggregatorService from '@/services/aggregatorService'
import workspacesService from '@/services/workspacesService'
import { capitalizeFirstLetter, getBucketId, sleep, slugify, uniqueName } from '@/utils/helpers'
import { registerModule, syncState } from '@/utils/store'
import Vue from 'vue'
import { MutationTree, ActionTree, GetterTree, Module } from 'vuex'
import { ModulesState } from '.'
import panesSettings from './panesSettings'
import defaultPanes from './defaultPanes.json'
import { BREAKPOINTS_COLS, BREAKPOINTS_WIDTHS } from '@/utils/constants'
import dialogService from '@/services/dialogService'

export type PaneType = 'trades' | 'chart' | 'stats' | 'counters' | 'prices'
export type MarketsListeners = { [market: string]: number }

export type ResponsiveLayouts = { [breakpoint: string]: GridItem[] }
export interface GridItem {
  x?: number
  y?: number
  w?: number
  h?: number
  i: string
  type: string
  isolated?: boolean
}

export interface Pane {
  type: string
  id: string
  name: string
  zoom?: number
  markets?: string[]
  settings?: any
}

export interface PanesState {
  layouts?: ResponsiveLayouts
  panes: { [paneId: string]: Pane }
  marketsListeners: MarketsListeners
}

const state: PanesState = JSON.parse(JSON.stringify(defaultPanes))

const getters = {
  currentLayout: state => {
    const breakpoints = Object.keys(state.layouts).reduce((cols, breakpoint) => {
      cols[breakpoint] = BREAKPOINTS_WIDTHS[breakpoint]
      return cols
    }, {})

    // sort by layout size
    const keys = Object.keys(breakpoints).sort((a, b) => {
      return BREAKPOINTS_COLS[b] - BREAKPOINTS_COLS[a]
    })

    // ensure smallest is level 0 layout
    breakpoints[keys[keys.length - 1]] = 0

    const width = window.innerWidth

    for (const breakpoint of keys) {
      if (width > breakpoints[breakpoint]) {
        return breakpoint
      }
    }
  }
} as GetterTree<PanesState, ModulesState>

const actions = {
  async boot({ state }) {
    state.marketsListeners = {}
  },
  async addPane({ commit, dispatch, state }, options: Pane & { settings?: any }) {
    if (!options || !options.type) {
      this.dispatch('app/showNotice', {
        title: 'Invalid addPane options',
        type: 'error'
      })
      return
    }

    if (!panesSettings[options.type]) {
      this.dispatch('app/showNotice', {
        title: 'Unrecognized pane type "' + options.type + '"',
        type: 'error'
      })
      return
    }

    const name = options.name || `${capitalizeFirstLetter(options.type)}'s pane`
    const id = uniqueName(slugify(name), Object.keys(state.panes))

    const pane: Pane = {
      id,
      name,
      type: options.type,
      settings: options.settings,
      markets: options.markets || []
    }

    if (!pane.markets.length) {
      pane.markets = Object.keys(state.marketsListeners)
    }

    await registerModule(id, {}, true, pane)

    commit('ADD_PANE', pane)
    dispatch('appendPaneGridItem', { id: pane.id, type: pane.type })
    dispatch('refreshMarketsListeners')

    Vue.nextTick(() => {
      window.scrollTo(0, document.body.scrollHeight)
    })
  },
  async removePane({ commit, state, dispatch }, id: string) {
    const item = state.panes[id]

    if (!item) {
      return
    }

    dispatch('removePaneGridItems', id)
    commit('REMOVE_PANE', id)
    dispatch('refreshMarketsListeners')

    await workspacesService.removeState(id)

    setTimeout(() => {
      this.unregisterModule(id)

      localStorage.removeItem(id)
    })
  },
  appendPaneGridItem({ commit, state }, { id, type }: { id: string; type: PaneType }) {
    const breakpoints = Object.keys(state.layouts)
    for (const breakpoint of breakpoints) {
      const item: GridItem = {
        i: id,
        type
      }

      console.log('add grid item', item.i, 'on layout', breakpoint)
      commit('ADD_GRID_ITEM', { breakpoint, item })
    }
  },
  removePaneGridItems({ commit, state }, id: string) {
    for (const breakpoint in state.layouts) {
      const item = state.layouts[breakpoint].find(item => item.i === id)

      if (item) {
        const index = state.layouts[breakpoint].indexOf(item)
        console.log('remove grid item', item.i, 'on layout', breakpoint, 'at index', index)
        commit('REMOVE_GRID_ITEM', { breakpoint, index })
      }
    }
  },
  async refreshMarketsListeners({ commit, state }) {
    const marketsListeners = {}
    const buckets = {}

    for (const id in state.panes) {
      const markets = state.panes[id].markets

      if (!markets) {
        continue
      }

      if (state.panes[id].type === 'counters' || state.panes[id].type === 'stats') {
        const bucketId = getBucketId(markets)

        if (!buckets[bucketId]) {
          buckets[bucketId] = markets.map(market => market.replace(':', ''))
        }
      }

      for (const market of markets) {
        if (typeof marketsListeners[market] === 'undefined') {
          marketsListeners[market] = 0
        }

        marketsListeners[market]++
      }
    }

    const allUniqueMarkets = Object.keys(marketsListeners)
      .concat(Object.keys(state.marketsListeners))
      .filter((v, i, a) => a.indexOf(v) === i)

    const toConnect = []
    const toDisconnect = []

    console.debug(
      `[panes] refreshMarketsListeners` +
        (toConnect.length ? `\n\tto connect : ${toConnect.join(', ')}` : '') +
        (toDisconnect.length ? `\n\tto disconnect : ${toDisconnect.join(', ')}` : '')
    )

    for (const market of allUniqueMarkets) {
      if (!state.marketsListeners[market] && marketsListeners[market]) {
        toConnect.push(market)
        //await aggregatorService.connect([market])
      } else if (state.marketsListeners[market] && !marketsListeners[market]) {
        toDisconnect.push(market)
        //await aggregatorService.disconnect([market])
      }
    }

    await Promise.all([aggregatorService.connect(toConnect), aggregatorService.disconnect(toDisconnect)])

    aggregatorService.dispatch({
      op: 'buckets',
      data: buckets
    })

    commit('SET_MARKETS_LISTENERS', marketsListeners)
  },
  setMarketsForAll({ commit, state, dispatch }, markets: string[]) {
    for (const id in state.panes) {
      commit('SET_PANE_MARKETS', { id, markets })
    }

    dispatch('refreshMarketsListeners')
  },
  setMarketsForPane({ commit, dispatch }, { id, markets }: { id: string; markets: string[] }) {
    commit('SET_PANE_MARKETS', { id, markets })

    dispatch('refreshMarketsListeners')
  },
  attachMarket({ state, commit, dispatch }, { id, market }: { id: string; market: string }) {
    const markets = state.panes[id].markets

    if (markets.indexOf(market) === -1) {
      commit('ADD_PANE_MARKET', { id, market })

      dispatch('refreshMarketsListeners')
    }
  },
  detachMarket({ state, commit, dispatch }, { id, market }: { id: string; market: string }) {
    const markets = state.panes[id].markets
    const index = markets.indexOf(market)

    if (index !== -1) {
      commit('REMOVE_PAIR_MARKET', { id, index })

      dispatch('refreshMarketsListeners')
    }
  },
  copySettings({ rootState }, id) {
    if (!rootState[id]) {
      this.dispatch('app/showNotice', {
        title: `Pane ${id} doesn't exists`,
        type: 'error'
      })

      return
    }

    const settings = JSON.stringify(rootState[id])

    this.commit('app/SET_PANE_CLIPBOARD', settings)

    this.dispatch('app/showNotice', {
      title: `Settings added to clipboard ✅`
    })
  },
  applySettings({ rootState }, { id, settings }: { id: string; settings: any }) {
    if (!rootState[id]) {
      this.dispatch('app/showNotice', {
        title: `Pane ${id} doesn't exists`,
        type: 'error'
      })

      return
    }

    for (const prop in settings) {
      rootState[id][prop] = settings[prop]
    }

    this.dispatch('app/showNotice', {
      title: `Settings have been applied to pane ${id}`
    })
  },
  duplicatePane({ state, rootState, dispatch }, id: string) {
    if (!state.panes[id] || !rootState[id]) {
      this.dispatch('app/showNotice', {
        title: `Pane ${id} doesn't exists`,
        type: 'error'
      })

      return
    }

    const options = JSON.parse(JSON.stringify(state.panes[id]))
    options.settings = JSON.parse(JSON.stringify(rootState[id]))

    options.name += ' copy'

    dispatch('addPane', options)

    this.dispatch('app/showNotice', {
      title: `Duplicated pane ${id}`
    })
  },
  async resetPane({ state, commit, dispatch, rootState }, { id, data }: { id: string; data?: any }) {
    // copy this pane on every breakpoints
    const breakpointsItems = Object.keys(state.layouts).reduce((items, breakpoint) => {
      const item = state.layouts[breakpoint].find(item => item.i === id)

      items[breakpoint] = item

      return items
    }, {})

    const pane = JSON.parse(JSON.stringify(state.panes[id]))

    let currentPaneState

    if (data && typeof data === 'object') {
      currentPaneState = Object.assign({}, rootState[id], data)
    }

    //dispatch('removePaneGridItems', id)

    rootState[id]._booted = false

    await sleep(100)

    this.unregisterModule(id)

    await workspacesService.removeState(id)

    if (currentPaneState) {
      await workspacesService.saveState(id, currentPaneState)
    }

    await sleep(100)

    await registerModule(id, {}, true, pane)

    // add back pane items
    /*for (const breakpoint in breakpointsItems) {
      commit('ADD_GRID_ITEM', { breakpoint, item: breakpointsItems[breakpoint] })
    }*/
  },
  setZoom({ commit, dispatch }, { id, zoom }: { id: string; zoom: number }) {
    commit('SET_PANE_ZOOM', { id, zoom })

    dispatch('refreshZoom', id)
  },
  changeZoom({ state, commit, dispatch }, { id, zoom }: { id: string; zoom: number }) {
    if (zoom) {
      zoom = (state.panes[id].zoom || 1) + zoom
    } else {
      zoom = 1
    }

    commit('SET_PANE_ZOOM', { id, zoom })

    dispatch('refreshZoom', id)
  },
  refreshZoom({ state }, id: string) {
    const zoom = state.panes[id].zoom
    const el = document.getElementById(id) as HTMLElement

    if (el) {
      const parent = el.parentElement

      parent.style.fontSize = zoom ? zoom + 'rem' : ''

      if (zoom > 1) {
        el.classList.add('-large')
      } else {
        el.classList.remove('-large')
      }
    }
  },
  async toggleResponsive({ state, getters }) {
    const breakpoints = Object.keys(state.layouts)
    const panes = Object.keys(state.panes)
    const currentLayout = getters.currentLayout

    console.log('[toggleResponsive] currentLayout', currentLayout)

    if (breakpoints.length > 1) {
      for (const breakpoint in state.layouts) {
        if (breakpoint !== currentLayout) {
          console.log('delete layout', breakpoint)
          Vue.delete(state.layouts, breakpoint)
        }
      }
    } else {
      let overrideWithResponsiveLayout = false

      if (getBucketId(panes) === getBucketId(['chart', 'liquidations', 'trades'])) {
        overrideWithResponsiveLayout = await dialogService.confirm({
          message: 'Override current layout with official responsive one ?',
          ok: 'Yes override',
          cancel: 'Create layouts using this one as base'
        })

        if (overrideWithResponsiveLayout === null) {
          // cancel toggleResponsive
          return false
        }
      }
      if (overrideWithResponsiveLayout) {
        state.layouts = {
          xl: [
            { i: 'chart', type: 'chart', x: 0, y: 0, w: 28, h: 32, isolated: true },
            { i: 'trades', type: 'trades', x: 28, y: 0, w: 4, h: 26, isolated: true },
            { i: 'liquidations', type: 'trades', x: 28, y: 26, w: 4, h: 6, isolated: true }
          ],
          lg: [
            { i: 'chart', type: 'chart', x: 0, y: 0, w: 20, h: 24, isolated: true },
            { i: 'trades', type: 'trades', x: 20, y: 0, w: 4, h: 20, isolated: true },
            { i: 'liquidations', type: 'trades', x: 20, y: 20, w: 4, h: 4, isolated: true }
          ],
          md: [
            { i: 'chart', type: 'chart', x: 0, y: 0, w: 13, h: 16, isolated: true },
            { i: 'trades', type: 'trades', x: 13, y: 0, w: 3, h: 14, isolated: true },
            { i: 'liquidations', type: 'trades', x: 13, y: 14, w: 3, h: 2, isolated: true }
          ],
          sm: [
            { i: 'chart', type: 'chart', x: 0, y: 0, w: 12, h: 5, isolated: true },
            { i: 'trades', type: 'trades', x: 0, y: 5, w: 8, h: 7, isolated: true },
            { i: 'liquidations', type: 'trades', x: 8, y: 5, w: 4, h: 7, isolated: true }
          ],
          xs: [
            { i: 'chart', type: 'chart', x: 0, y: 0, w: 8, h: 3, isolated: true },
            { i: 'trades', type: 'trades', x: 0, y: 3, w: 8, h: 4, isolated: true },
            { i: 'liquidations', type: 'trades', x: 0, y: 7, w: 8, h: 1, isolated: true }
          ]
        }
      } else {
        for (const breakpoint in BREAKPOINTS_WIDTHS) {
          const cols = BREAKPOINTS_COLS[breakpoint]
          if (breakpoint === currentLayout) {
            continue
          }

          const coeficient = cols / BREAKPOINTS_COLS[currentLayout]
          console.log('create layout', breakpoint, 'at x', coeficient, 'of', currentLayout)

          const layout = JSON.parse(JSON.stringify(state.layouts[currentLayout]))

          for (const pane of layout) {
            pane.x = Math.round(pane.x * coeficient)
            pane.y = Math.round(pane.y * coeficient)
            pane.w = Math.round(pane.w * coeficient)
            pane.h = Math.round(pane.h * coeficient)
          }

          Vue.set(state.layouts, breakpoint, layout)
        }
      }
    }

    await syncState(state)

    return true
  }
} as ActionTree<PanesState, ModulesState>

const mutations = {
  ADD_PANE: (state, pane: Pane) => {
    Vue.set(state.panes, pane.id, pane)
  },
  REMOVE_PANE: (state, id: string) => {
    Vue.delete(state.panes, id)
  },
  ADD_GRID_ITEM: (state, { breakpoint, item }) => {
    if (typeof item.x === 'undefined') {
      const cols = BREAKPOINTS_COLS[breakpoint]
      const size = 4

      const items = state.layouts[breakpoint].slice().sort((a, b) => a.x + a.y * 2 - (b.x + b.y * 2))

      console.log('add grid item', 'layout', breakpoint, 'breakpoint cols', cols, 'optimal width', size)

      const columns = []

      for (let x = 0; x < cols; x += size) {
        console.log('looking for max y in col', x, '(size', size, ')')
        let y = 0
        for (const item of items) {
          if (
            (item.x >= x && item.x < x + size) ||
            (item.x + item.w > x && item.x + item.w < x + size) ||
            (item.x < x && item.x + item.w >= x + size)
          ) {
            y = Math.max(y, item.y + item.h)
            console.log('item', item.i, item.x, item.y, item.w, item.h, 'is in, min y for this col is now', y)
            continue
          }
        }

        columns.push(y)
      }

      item.y = Math.min.apply(null, columns)
      item.x = columns.indexOf(Math.min.apply(null, columns)) * size

      if (item.y >= cols) {
        for (const item of state.layouts[breakpoint]) {
          item.y += size
        }

        item.y = 0
        item.x = 0
      }

      item.w = size
      item.h = size
    }

    state.layouts[breakpoint].push(item)
    Vue.set(state.layouts, breakpoint, state.layouts[breakpoint])
  },
  REMOVE_GRID_ITEM: (state, { breakpoint, index }) => {
    state.layouts[breakpoint].splice(index, 1)
  },
  UPDATE_ITEM: (state, { breakpoint, item }: { breakpoint: string; item: GridItem }) => {
    const targetCols = BREAKPOINTS_COLS[breakpoint]
    console.log('update item', item.i, item)

    for (const _breakpoint in state.layouts) {
      const _item = state.layouts[_breakpoint].find(_item => item.i === _item.i)

      const layoutCols = BREAKPOINTS_COLS[_breakpoint]
      const coeficient = layoutCols / targetCols
      const isCurrent = coeficient === 1

      if (!isCurrent && _item.isolated) {
        console.log('item', _item.i, 'on layout', _breakpoint, 'is isolated: abort')
        continue
      }
      // const index = state.layouts[_breakpoint].indexOf(_item)

      console.log('update item', _item.i, 'on layout', _breakpoint, 'coef', coeficient, item === _item ? 'is original' : '')

      _item.x = Math.floor(item.x * coeficient)
      _item.y = Math.floor(item.y * coeficient)
      _item.w = Math.floor(item.w * coeficient)
      _item.h = Math.floor(item.h * coeficient)

      if (isCurrent && !_item.isolated) {
        console.log('flag item as "isolated"')
        _item.isolated = true
      }
    }
  },
  SET_MARKETS_LISTENERS: (state, marketsListeners: MarketsListeners) => {
    state.marketsListeners = marketsListeners
  },
  SET_PANE_MARKETS: (state, { id, markets }: { id: string; markets: string[] }) => {
    state.panes[id].markets = markets
  },
  REMOVE_PAIR_MARKET: (state, { id, index }: { id: string; index: number }) => {
    state.panes[id].markets.splice(index, 1)
  },
  ADD_PAIR_MARKET: (state, { id, market }: { id: string; market: string }) => {
    state.panes[id].markets.push(market)
  },
  SET_PANE_NAME: (state, { id, name }: { id: string; name: string }) => {
    state.panes[id].name = name
  },
  SET_PANE_ZOOM: (state, { id, zoom }: { id: string; zoom: number }) => {
    Vue.set(state.panes[id], 'zoom', zoom)
  }
} as MutationTree<PanesState>

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
} as Module<PanesState, ModulesState>
