import aggregatorService from '@/services/aggregatorService'
import workspacesService from '@/services/workspacesService'
import { getBucketId, slugify, uniqueName } from '@/utils/helpers'
import { registerModule } from '@/utils/store'
import Vue from 'vue'
import { MutationTree, ActionTree, GetterTree, Module } from 'vuex'
import { ModulesState } from '.'
import panesSettings from './panesSettings'
import defaultPanes from './defaultPanes.json'
import { ListenedProduct } from './app'
import { GRID_COLS } from '@/utils/constants'
import { getMarketProduct, parseMarket } from '../services/productsService'

export type PaneType =
  | 'trades'
  | 'chart'
  | 'stats'
  | 'counters'
  | 'prices'
  | 'website'
export type MarketsListeners = { [market: string]: ListenedProduct }
export interface GridItem {
  x?: number
  y?: number
  w?: number
  h?: number
  i: string
  type?: string
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
  locked?: boolean
  layout: GridItem[]
  panes: { [paneId: string]: Pane }
  marketsListeners: MarketsListeners
}

const layoutDesktop = [
  { i: 'chart', type: 'chart', x: 0, y: 0, w: 20, h: 24 },
  { i: 'trades', type: 'trades', x: 20, y: 0, w: 4, h: 20 },
  { i: 'liquidations', type: 'trades', x: 20, y: 20, w: 4, h: 4 }
]

const layoutMobile = [
  { i: 'chart', type: 'chart', x: 0, y: 0, w: 24, h: 16 },
  { i: 'trades', type: 'trades', x: 0, y: 0, w: 24, h: 8 }
]

const state: PanesState = JSON.parse(JSON.stringify(defaultPanes))

const getters = {} as GetterTree<PanesState, ModulesState>

const actions = {
  async boot({ state, dispatch }) {
    if (!state.layout) {
      dispatch('setupLayout')
    }

    for (const market in state.marketsListeners) {
      if (typeof state.marketsListeners[market] === 'number') {
        delete state.marketsListeners[market]
      } else {
        state.marketsListeners[market].listeners = 0
      }
    }
  },
  async addPane(
    { commit, dispatch, state },
    options: Pane & { settings?: any; originalGridItem?: any }
  ) {
    if (!panesSettings[options.type]) {
      this.dispatch('app/showNotice', {
        title: 'Unrecognized pane type "' + options.type + '"',
        type: 'error'
      })
      return
    }

    const name = options.name || ''
    const id = uniqueName(
      slugify(name || options.type),
      Object.keys(state.panes)
    )

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
    dispatch('appendPaneGridItem', {
      id: pane.id,
      type: pane.type,
      originalGridItem: options.originalGridItem
    })
    dispatch('refreshMarketsListeners')

    Vue.nextTick(() => {
      window.scrollTo(0, document.body.scrollHeight)
    })
  },
  async removePane({ commit, state, dispatch, rootState }, id: string) {
    const item = state.panes[id]

    if (!item) {
      return
    }

    dispatch('removePaneGridItems', id)
    commit('REMOVE_PANE', id)
    dispatch('refreshMarketsListeners')

    if (rootState.app.focusedPaneId === id) {
      this.commit('app/SET_FOCUSED_PANE', null)
    }

    await workspacesService.removeState(id)

    setTimeout(() => {
      this.unregisterModule(id)

      localStorage.removeItem(id)
    })
  },
  appendPaneGridItem(
    { commit },
    {
      id,
      type,
      originalGridItem
    }: { id: string; type: PaneType; originalGridItem?: GridItem }
  ) {
    const item: GridItem = {
      i: id,
      type
    }

    if (originalGridItem) {
      item.w = originalGridItem.w
      item.h = originalGridItem.h
    }

    commit('ADD_GRID_ITEM', item)
  },
  removePaneGridItems({ commit, state }, id: string) {
    const item = state.layout.find(item => item.i === id)

    if (item) {
      const index = state.layout.indexOf(item)
      commit('REMOVE_GRID_ITEM', index)
    }
  },
  async refreshMarketsListeners({ commit, state }, { markets, id } = {}) {
    // cache original listeners (market: n listeners)
    const originalListeners: { [marketKey: string]: number } = Object.keys(
      state.marketsListeners
    ).reduce((listenersByMarkets, marketKey) => {
      listenersByMarkets[marketKey] =
        state.marketsListeners[marketKey].listeners

      return listenersByMarkets
    }, {})

    // new listeners stored here
    const marketsListeners: MarketsListeners = {}

    // bucketed markets stored here
    const buckets = {}

    for (const paneId in state.panes) {
      let paneMarkets = state.panes[paneId].markets
      if (markets && (!id || paneId === id)) {
        paneMarkets = markets
      }

      if (
        state.panes[paneId].type === 'counters' ||
        state.panes[paneId].type === 'stats'
      ) {
        // market used in a bucket
        const bucketId = getBucketId(paneMarkets)

        if (!buckets[bucketId]) {
          buckets[bucketId] = paneMarkets
        }
      }

      for (const marketKey of paneMarkets) {
        if (typeof marketsListeners[marketKey] === 'undefined') {
          if (state.marketsListeners[marketKey]) {
            marketsListeners[marketKey] = state.marketsListeners[marketKey]
            marketsListeners[marketKey].listeners = 0
          } else {
            const [exchange, pair] = parseMarket(marketKey)

            marketsListeners[marketKey] = getMarketProduct(exchange, pair, true)

            marketsListeners[marketKey].listeners = 0
          }
        }

        if (typeof marketsListeners[marketKey] !== 'undefined') {
          marketsListeners[marketKey].listeners++
        }
      }
    }

    const allUniqueMarkets = Object.keys(marketsListeners)
      .concat(Object.keys(state.marketsListeners))
      .filter((v, i, a) => a.indexOf(v) === i)

    const toConnect = []
    const toDisconnect = []

    for (const market of allUniqueMarkets) {
      const previousListeners = originalListeners[market]
      const currentListeners =
        marketsListeners[market] && marketsListeners[market].listeners

      if (!previousListeners && currentListeners) {
        toConnect.push(market)
      } else if (previousListeners && !currentListeners) {
        toDisconnect.push(market)

        if (state.marketsListeners[market]) {
          // dlete market from store
          delete state.marketsListeners[market]
        }
      }
    }

    await Promise.all([
      aggregatorService.connect(toConnect),
      aggregatorService.disconnect(toDisconnect)
    ])

    aggregatorService.dispatch({
      op: 'updateBuckets',
      data: buckets
    })

    commit('SET_MARKETS_LISTENERS', marketsListeners)

    if (markets) {
      for (const paneId in state.panes) {
        if (!id || paneId === id) {
          commit('SET_PANE_MARKETS', { id: paneId, markets })
        }
      }
    }
  },
  setMarketsForAll({ dispatch }, markets: string[]) {
    return dispatch('refreshMarketsListeners', { markets })
  },
  setMarketsForPane(
    { dispatch },
    { id, markets }: { id: string; markets: string[] }
  ) {
    return dispatch('refreshMarketsListeners', { id, markets })
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
    options.originalGridItem = state.layout.find(a => a.i === id)
    dispatch('addPane', options)

    this.dispatch('app/showNotice', {
      title: `Duplicated pane ${id}`
    })
  },
  async resetPane(
    { state, rootState },
    { id, data }: { id: string; data?: any }
  ) {
    const pane = JSON.parse(JSON.stringify(state.panes[id]))

    let currentPaneState

    if (data && typeof data === 'object') {
      currentPaneState = Object.assign({}, rootState[id], data)
    }

    const layoutItem = state.layout.find(a => a.i === id)

    const originalPaneType = layoutItem.type

    layoutItem.type = 'div'

    this.unregisterModule(id)

    await workspacesService.removeState(id)

    if (currentPaneState) {
      await workspacesService.saveState(id, currentPaneState)
    }

    await registerModule(id, {}, true, pane)

    layoutItem.type = originalPaneType
  },
  setZoom({ commit, dispatch }, { id, zoom }: { id: string; zoom: number }) {
    commit('SET_PANE_ZOOM', { id, zoom })

    dispatch('refreshZoom', id)
  },
  refreshZoom({ state }, id: string) {
    const zoom = state.panes[id].zoom ? Math.max(0.1, state.panes[id].zoom) : 1
    const el = document.getElementById(id) as HTMLElement

    if (el) {
      const parent = el.parentElement

      parent.style.fontSize = zoom ? zoom + 'rem' : ''
      el.classList.remove('-large', '-extra-large', '-small', '-extra-small')

      if (zoom > 1) {
        el.classList.add('-large')
        if (zoom >= 2) {
          el.classList.add('-extra-large')
        }
      } else {
        el.classList.add('-small')
        if (zoom < 0.87) {
          el.classList.add('-extra-small')
        }
      }
    }
  },
  setupLayout({ state }) {
    // first time load
    // app not even loaded yet

    let initialZoom = 1
    const innerWidth = window.innerWidth

    console.info('[panes/setupLayout] @' + innerWidth)

    if (innerWidth >= 768) {
      // start with desktop layout
      state.layout = layoutDesktop

      if (innerWidth >= 1920) {
        initialZoom = 1.25
      }
    } else {
      // start with mobile layout
      state.layout = layoutMobile
      initialZoom = 1.25

      delete state.panes.liquidations
    }

    if (initialZoom > 1) {
      for (const paneId in state.panes) {
        state.panes[paneId].zoom = initialZoom
      }
    }
  }
} as ActionTree<PanesState, ModulesState>

const mutations = {
  ADD_PANE: (state, pane: Pane) => {
    Vue.set(state.panes, pane.id, pane)
  },
  REMOVE_PANE: (state, id: string) => {
    Vue.delete(state.panes, id)
  },
  ADD_GRID_ITEM: (state, item) => {
    if (typeof item.x === 'undefined') {
      const cols = GRID_COLS
      const size =
        window.innerWidth <= 500 ? 16 : window.innerWidth < 768 ? 8 : 4
      const width = item.w || size
      const height = item.h || size

      const items = state.layout
        .slice()
        .sort((a, b) => a.x + a.y * 2 - (b.x + b.y * 2))

      const columns = []

      for (let x = 0; x < cols; x += width) {
        let y = 0
        for (const item of items) {
          if (
            (item.x >= x && item.x < x + width) ||
            (item.x + item.w > x && item.x + item.w < x + width) ||
            (item.x < x && item.x + item.w >= x + width)
          ) {
            y = Math.max(y, item.y + item.h)
            continue
          }
        }

        columns.push(y)
      }

      item.y = Math.min.apply(null, columns)
      item.x = columns.indexOf(Math.min.apply(null, columns)) * width

      if (item.y >= cols) {
        for (const item of state.layout) {
          item.y += height
        }

        item.y = 0
        item.x = 0
      }

      item.w = width
      item.h = height
    }

    state.layout.push(item)
  },
  REMOVE_GRID_ITEM: (state, index) => {
    state.layout.splice(index, 1)
  },
  UPDATE_LAYOUT: (state, items: GridItem[]) => {
    state.layout = items
  },
  TOGGLE_LAYOUT: state => {
    state.locked = !state.locked
  },
  SET_MARKETS_LISTENERS: (state, marketsListeners: MarketsListeners) => {
    state.marketsListeners = marketsListeners
  },
  SET_PANE_MARKETS: (
    state,
    { id, markets }: { id: string; markets: string[] }
  ) => {
    state.panes[id].markets = markets
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
