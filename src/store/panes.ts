import aggregatorService from '@/services/aggregatorService'
import workspacesService from '@/services/workspacesService'
import { getBucketId, parseMarket, sleep, slugify, uniqueName } from '@/utils/helpers'
import { registerModule } from '@/utils/store'
import Vue from 'vue'
import { MutationTree, ActionTree, GetterTree, Module } from 'vuex'
import { ModulesState } from '.'
import panesSettings from './panesSettings'
import defaultPanes from './defaultPanes.json'
import { ListenedProduct } from './app'
import { GRID_COLS } from '@/utils/constants'

export type PaneType = 'trades' | 'chart' | 'stats' | 'counters' | 'prices' | 'website'
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

const state: PanesState = JSON.parse(JSON.stringify(defaultPanes))

const getters = {} as GetterTree<PanesState, ModulesState>

const actions = {
  async boot({ state }) {
    for (const market in state.marketsListeners) {
      if (typeof state.marketsListeners[market] === 'number') {
        delete state.marketsListeners[market]
      } else {
        state.marketsListeners[market].listeners = 0
      }
    }
  },
  async addPane({ commit, dispatch, state }, options: Pane & { settings?: any; originalGridItem?: any }) {
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
    dispatch('appendPaneGridItem', { id: pane.id, type: pane.type, originalGridItem: options.originalGridItem })
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
  appendPaneGridItem({ commit }, { id, type, originalGridItem }: { id: string; type: PaneType; originalGridItem?: GridItem }) {
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
    options.originalGridItem = state.layout.find(a => a.i === id)
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
      const width = item.w || 4
      const height = item.h || 4

      const items = state.layout.slice().sort((a, b) => a.x + a.y * 2 - (b.x + b.y * 2))

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
