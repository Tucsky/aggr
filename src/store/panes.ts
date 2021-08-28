import aggregatorService from '@/services/aggregatorService'
import workspacesService from '@/services/workspacesService'
import { getBucketId, parseMarket, sleep, slugify, uniqueName } from '@/utils/helpers'
import { registerModule, syncState } from '@/utils/store'
import Vue from 'vue'
import { MutationTree, ActionTree, GetterTree, Module } from 'vuex'
import { ModulesState } from '.'
import panesSettings from './panesSettings'
import defaultPanes from './defaultPanes.json'
import defaultLayouts from './defaultLayouts.json'
import { BREAKPOINTS_COLS, BREAKPOINTS_WIDTHS } from '@/utils/constants'
import dialogService from '@/services/dialogService'
import { ListenedProduct } from './app'

export type PaneType = 'trades' | 'chart' | 'stats' | 'counters' | 'prices' | 'website'
export type MarketsListeners = { [market: string]: ListenedProduct }

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
    for (const market in state.marketsListeners) {
      state.marketsListeners[market].listeners = 0
    }

    if (!Object.keys(state.layouts).length) {
      state.layouts = {
        lg: defaultLayouts.lg
      }
    }
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

    const name = options.name || ''
    const id = uniqueName(slugify(name || options.type), Object.keys(state.panes))

    const pane: Pane = {
      id,
      name,
      type: options.type,
      zoom: options.zoom,
      settings: options.settings,
      markets: options.markets || Object.keys(state.marketsListeners)
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
  async refreshMarketsListeners({ commit, state, rootState }) {
    // cache original listeners (market: n listeners)
    const originalListeners: { [market: string]: number } = Object.keys(state.marketsListeners).reduce((listenersByMarkets, market) => {
      listenersByMarkets[market] = state.marketsListeners[market].listeners

      return listenersByMarkets
    }, {})

    // new listeners stored here
    const marketsListeners: MarketsListeners = {}

    // bucketed markets stored here
    const buckets = {}

    for (const id in state.panes) {
      const markets = state.panes[id].markets

      if (!markets) {
        continue
      }

      if (state.panes[id].type === 'counters' || state.panes[id].type === 'stats') {
        // market used in a bucket
        const bucketId = getBucketId(markets)

        if (!buckets[bucketId]) {
          buckets[bucketId] = markets.map(market => market.replace(':', ''))
        }
      }

      for (const market of markets) {
        if (typeof marketsListeners[market] === 'undefined') {
          if (state.marketsListeners[market]) {
            marketsListeners[market] = state.marketsListeners[market]
            marketsListeners[market].listeners = 0
          } else {
            const [exchange, pair] = parseMarket(market)

            if (!rootState.app.indexedProducts[exchange]) {
              // this shouldn't happen since **ALL** exchanges got their products fetched on boot
              console.error(`[panes/refreshMarketsListeners] products required for exchange`, exchange, '(critical)')
              continue
            }

            const indexedProduct = rootState.app.indexedProducts[exchange].find(indexedMarket => indexedMarket.pair === pair)

            if (!indexedProduct) {
              // this can happen if a product has been added before, but been delisted and product got automatically refreshed
              console.error(`[panes/refreshMarketsListeners] market not found in exchange's product`, exchange, '(warning)')
              continue
            }

            if (indexedProduct) {
              marketsListeners[market] = indexedProduct

              marketsListeners[market].listeners = 0
            }
          }
        }

        if (typeof marketsListeners[market] !== 'undefined') {
          marketsListeners[market].listeners++
        }
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
      const previousListeners = originalListeners[market]
      const currentListeners = marketsListeners[market] && marketsListeners[market].listeners

      if (!previousListeners && currentListeners) {
        toConnect.push(market)
      } else if (previousListeners && !currentListeners) {
        toDisconnect.push(market)

        if (state.marketsListeners[market].listeners) {
          // clear listeners for that market
          state.marketsListeners[market].listeners = 0
          debugger
        }
      }
    }

    await Promise.all([aggregatorService.connect(toConnect), aggregatorService.disconnect(toDisconnect)])

    aggregatorService.dispatch({
      op: 'updateBuckets',
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

    dispatch('addPane', options)

    this.dispatch('app/showNotice', {
      title: `Duplicated pane ${id}`
    })
  },
  async resetPane({ state, rootState }, { id, data }: { id: string; data?: any }) {
    const pane = JSON.parse(JSON.stringify(state.panes[id]))

    let currentPaneState

    if (data && typeof data === 'object') {
      currentPaneState = Object.assign({}, rootState[id], data)
    }

    rootState[id]._booted = false

    await sleep(100)

    this.unregisterModule(id)

    await workspacesService.removeState(id)

    if (currentPaneState) {
      await workspacesService.saveState(id, currentPaneState)
    }

    await sleep(100)

    await registerModule(id, {}, true, pane)
  },
  setZoom({ commit, dispatch }, { id, zoom }: { id: string; zoom: number }) {
    commit('SET_PANE_ZOOM', { id, zoom })

    dispatch('refreshZoom', id)
  },
  changeZoom({ state, commit, dispatch }, { id, zoom }: { id: string; zoom: number }) {
    if (zoom) {
      zoom = Math.max(0.1, (state.panes[id].zoom || 1) + zoom)
    } else {
      zoom = 1
    }

    commit('SET_PANE_ZOOM', { id, zoom })

    dispatch('refreshZoom', id)
  },
  refreshZoom({ state }, id: string) {
    const zoom = Math.max(0.1, state.panes[id].zoom)
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
          message: 'Override current layout with official responsive ?<br>(chart + trades + rekts)',
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

    for (const _breakpoint in state.layouts) {
      const _item = state.layouts[_breakpoint].find(_item => item.i === _item.i)

      const layoutCols = BREAKPOINTS_COLS[_breakpoint]
      const coeficient = layoutCols / targetCols
      const isCurrent = coeficient === 1

      if (!isCurrent && _item.isolated) {
        continue
      }
      // const index = state.layouts[_breakpoint].indexOf(_item)

      _item.x = Math.floor(item.x * coeficient)
      _item.y = Math.floor(item.y * coeficient)
      _item.w = Math.floor(item.w * coeficient)
      _item.h = Math.floor(item.h * coeficient)

      if (isCurrent && !_item.isolated) {
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
