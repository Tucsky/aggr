import aggregatorService from '@/services/aggregatorService'
import { getProducts, showIndexedProductsCount } from '@/services/productsService'
import { capitalizeFirstLetter, getBucketId, slugify, uniqueName } from '@/utils/helpers'
import { registerModule } from '@/utils/store'
import Vue from 'vue'
import { MutationTree, ActionTree, GetterTree, Module } from 'vuex'
import { ModulesState } from '.'
import panesSettings from './panesSettings'

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
  markets?: string[]
  settings?: any
}

export interface PanesState {
  layout?: GridItem[]
  panes: { [paneId: string]: Pane }
  marketsListeners: MarketsListeners
}

const getters = {
  getNextGridItemCooordinates: state => {
    let x = -1
    let y = 0

    for (const gridItem of state.layout.slice().sort((a, b) => a.x + a.y * 2 - (b.x + b.y * 2))) {
      if (gridItem.x + gridItem.y * 2 - (x + y * 2) > 1) {
        break
      }

      x = gridItem.x
      y = gridItem.y
    }

    const baseIndex = x + y * 2 + 1

    x = baseIndex % 8
    y = Math.floor(baseIndex / 8)

    return { x, y }
  }
} as GetterTree<PanesState, ModulesState>

const defaultMarkets = {
  spot: [
    'BITFINEX:BTCUSD',
    'BINANCE:btcusdt',
    'OKEX:BTC-USDT',
    'KRAKEN:XBT/USD',
    'COINBASE:BTC-USD',
    'POLONIEX:USDT_BTC',
    'HUOBI:btcusdt',
    'BITSTAMP:btcusd'
  ],
  perp: [
    'BITMEX:XBTUSD',
    'BITFINEX:BTCF0:USTF0',
    'OKEX:BTC-USD-SWAP',
    'OKEX:BTC-USDT-SWAP',
    'BINANCE_FUTURES:btcusdt',
    'BINANCE_FUTURES:btcusd_perp',
    'HUOBI:BTC-USD',
    'KRAKEN:PI_XBTUSD',
    'DERIBIT:BTC-PERPETUAL',
    'FTX:BTC-PERP',
    'BYBIT:BTCUSD'
  ]
}

const state = {
  _id: 'panes',
  layout: [
    { x: 0, y: 0, w: 15, h: 24, i: 'pane-chart-1', type: 'chart' },
    { x: 15, y: 0, w: 3, h: 24, i: 'spot-trades', type: 'trades' },
    { x: 18, y: 0, w: 3, h: 24, i: 'perp-trades', type: 'trades' },
    { x: 21, y: 0, w: 3, h: 24, i: 'liquidations', type: 'trades' }
  ],
  panes: {
    'pane-chart-1': {
      id: 'pane-chart-1',
      name: 'Pane chart 1',
      type: 'chart',
      markets: [...defaultMarkets.spot, ...defaultMarkets.perp]
    },
    'spot-trades': {
      id: 'spot-trades',
      name: 'BTCUSD (SPOT)',
      type: 'trades',
      markets: defaultMarkets.spot,
      settings: {
        thresholds: [
          {
            amount: 100000
          }
        ]
      }
    },
    'perp-trades': {
      id: 'perp-trades',
      name: 'BTCUSD (PERP)',
      type: 'trades',
      markets: defaultMarkets.perp
    },
    liquidations: {
      id: 'liquidations',
      name: 'REKTS',
      type: 'trades',
      markets: defaultMarkets.perp,
      settings: {
        liquidationsOnly: true,
        thresholds: [
          {
            id: 'threshold',
            amount: 10000,
            buyColor: 'rgba(236,64,122,0.5)',
            sellColor: 'rgba(255,152,0,0.5)'
          },
          {
            id: 'significant',
            amount: 25000,
            buyColor: 'rgba(236,64,122,0.6)',
            sellColor: 'rgba(255,152,0,0.7)'
          },
          {
            id: 'huge',
            amount: 100000,
            gif: 'rekt',
            buyColor: 'rgba(236,64,122,0.7)',
            sellColor: 'rgba(255,152,0,0.8)'
          },
          {
            id: 'rare',
            amount: 1000000,
            gif: 'explosion',
            buyColor: 'rgb(236,64,122)',
            sellColor: 'rgb(255,152,0)'
          }
        ]
      }
    }
  },
  marketsListeners: {}
} as PanesState

const actions = {
  async boot({ dispatch, state }) {
    state.marketsListeners = {}

    await Promise.all(this.getters['exchanges/getExchanges'].map(id => getProducts(id)))
    await dispatch('refreshMarketsListeners')

    showIndexedProductsCount()
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
  removePane({ commit, state, dispatch }, id: string) {
    const item = state.panes[id]

    if (!item) {
      return
    }

    dispatch('removePaneGridItems', id)
    commit('REMOVE_PANE', id)
    dispatch('refreshMarketsListeners')

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
        console.log('! err no markets for pane', id)
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
    console.log('!allUniqueMarke', allUniqueMarkets)

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
  }
} as MutationTree<PanesState>

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
} as Module<PanesState, ModulesState>
