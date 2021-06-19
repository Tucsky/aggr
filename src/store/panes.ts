import aggregatorService from '@/services/aggregatorService'
import workspacesService from '@/services/workspacesService'
import { capitalizeFirstLetter, getBucketId, sleep, slugify, uniqueName } from '@/utils/helpers'
import { registerModule } from '@/utils/store'
import Vue from 'vue'
import { MutationTree, ActionTree, GetterTree, Module } from 'vuex'
import { ModulesState } from '.'
import panesSettings from './panesSettings'
import { mobile, desktop } from './defaultPanes.json'

export type PaneType = 'trades' | 'chart' | 'stats' | 'counters' | 'prices'
export type MarketsListeners = { [market: string]: number }

export interface GridItem {
  x: number
  y: number
  w: number
  h: number
  i: string
  type: PaneType
}

export interface Pane {
  type: PaneType
  id: string
  name: string
  zoom?: number
  markets?: string[]
  settings?: any
}

export interface PanesState {
  layout?: GridItem[]
  panes: { [paneId: string]: Pane }
  marketsListeners: MarketsListeners
}

let state: PanesState

if (window.innerWidth < 640) {
  state = mobile as PanesState
} else {
  state = desktop as PanesState
}

const getters = {
  getNextGridItemCooordinates: state => {
    let x = -1
    let y = 0

    for (const gridItem of state.layout.slice().sort((a, b) => a.x + a.y * 2 - (b.x + b.y * 2))) {
      if (gridItem.x + gridItem.y * 2 - (x + y * 2) >= 4) {
        break
      }

      x = (gridItem.x + gridItem.w) % 24
      y = (gridItem.y + gridItem.h) % 24
    }

    const baseIndex = x + y * 2 + 1

    x = baseIndex % 24
    y = Math.floor(baseIndex / 24)

    return { x, y }
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
  appendPaneGridItem({ commit, getters }, { id, type }: { id: string; type: PaneType }) {
    const { x, y } = getters.getNextGridItemCooordinates

    const gridItem: GridItem = {
      i: id,
      x,
      y,
      w: 4,
      h: 4,
      type
    }

    commit('ADD_GRID_ITEM', gridItem)
  },
  removePaneGridItems({ commit, state }, id: string) {
    const gridItem = state.layout.find(gridItem => gridItem.i === id)

    if (gridItem) {
      const index = state.layout.indexOf(gridItem)
      commit('REMOVE_GRID_ITEM', index)
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
  async resetPane({ state, commit }, { id, data }: { id: string; data?: any }) {
    const gridItem = state.layout.find(item => item.i === id)

    const pane = JSON.parse(JSON.stringify(state.panes[id]))

    commit('REMOVE_GRID_ITEM', state.layout.indexOf(gridItem))

    this.unregisterModule(id)

    await workspacesService.removeState(id)

    if (data && typeof data === 'object') {
      await workspacesService.saveState(id, data)
    }

    await sleep(100)

    await registerModule(id, {}, true, pane)

    commit('ADD_GRID_ITEM', gridItem)
  },
  setZoom({ state, commit }, { id, zoom }: { id: string; zoom: number }) {
    if (zoom) {
      zoom = (state.panes[id].zoom || 1) + zoom
    } else {
      zoom = 1
    }

    commit('SET_PANE_ZOOM', { id, zoom })
  }
} as ActionTree<PanesState, ModulesState>

const mutations = {
  ADD_PANE: (state, pane: Pane) => {
    Vue.set(state.panes, pane.id, pane)
  },
  REMOVE_PANE: (state, id: string) => {
    Vue.delete(state.panes, id)
  },
  ADD_GRID_ITEM: (state, gridItem: GridItem) => {
    state.layout.unshift(gridItem)
  },
  REMOVE_GRID_ITEM: (state, index: number) => {
    state.layout.splice(index, 1)
  },
  UPDATE_LAYOUT: (state, layout: GridItem[]) => {
    state.layout = layout
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
