import store from '@/store'
import { AggregatorPayload } from '@/types/test'
import { randomString } from '@/utils/helpers'
import EventEmitter from 'eventemitter3'

import Worker from 'worker-loader!@/worker/aggregator'
import { countDecimals, marketDecimals, getStoredProductsOrFetch, parseMarket, formatStablecoin } from './productsService'
import workspacesService from './workspacesService'

class AggregatorService extends EventEmitter {
  public worker: Worker
  private _normalizeDecimalsTimeout: number

  constructor() {
    super()

    this.worker = new Worker()

    this.worker.addEventListener('message', event => {
      this.emit(event.data.op, event.data.data, event.data.trackingId)
    })

    this.listenUtilityEvents()
  }

  listenUtilityEvents() {
    this.once('hello', async () => {
      await workspacesService.initialize()

      const workspace = await workspacesService.getCurrentWorkspace()

      workspacesService.setCurrentWorkspace(workspace)
    })

    this.on('price', ({ market, price }: { market: string; price: number }) => {
      marketDecimals[market] = countDecimals(price)

      if (this._normalizeDecimalsTimeout) {
        clearTimeout(this._normalizeDecimalsTimeout)
      }

      this._normalizeDecimalsTimeout = setTimeout(this.normalizeDecimals.bind(this), 1000)
    })

    this.on(
      'getExchangeProducts',
      async ({ exchangeId, endpoints, forceFetch }: { exchangeId: string; endpoints: string[]; forceFetch?: boolean }, trackingId: string) => {
        console.debug(
          `[${exchangeId}] aggregator requested ${exchangeId}'s products (${forceFetch ? 'force fetch products' : 'get stored or fetch'})`
        )
        const productsData = await getStoredProductsOrFetch(exchangeId, endpoints, forceFetch)

        this.dispatch({
          op: 'getExchangeProducts',
          data: {
            exchangeId,
            data: productsData
          },
          trackingId
        })
      }
    )
  }

  dispatch(payload: AggregatorPayload) {
    this.worker.postMessage(payload)
  }

  dispatchAsync(payload: AggregatorPayload) {
    const trackingId = randomString(8)

    return new Promise(resolve => {
      const listener = ({ data }: { data: AggregatorPayload }) => {
        if (data.trackingId === payload.trackingId) {
          this.worker.removeEventListener('message', listener)
          resolve(data.data)
        }
      }

      this.worker.addEventListener('message', listener)

      payload.trackingId = trackingId

      this.worker.postMessage(payload)
    })
  }

  async connect(markets: string[]): Promise<any> {
    if (!markets.length) {
      return
    }

    for (let i = 0; i < markets.length; i++) {
      const [exchange] = parseMarket(markets[i])

      if (store.state.exchanges[exchange].disabled) {
        const panes = []
        for (const paneId in store.state.panes.panes) {
          if (store.state.panes.panes[paneId].markets.indexOf(markets[i]) !== -1) {
            panes.push(paneId)
          }
        }

        markets.splice(i, 1)
        i--
      }
    }

    await this.dispatchAsync({
      op: 'connect',
      data: markets
    })
  }

  async disconnect(markets: string[]): Promise<any> {
    if (!markets.length) {
      return
    }

    await this.dispatchAsync({
      op: 'disconnect',
      data: markets
    })
  }

  normalizeDecimals() {
    this._normalizeDecimalsTimeout = null
    const decimalsByLocalMarkets = {}

    for (const marketKey in marketDecimals) {
      if (!store.state.panes.marketsListeners[marketKey]) {
        continue
      }

      const localPair = store.state.panes.marketsListeners[marketKey].local.replace('USDT', 'USD').replace('USDC', 'USD')

      if (!decimalsByLocalMarkets[localPair]) {
        decimalsByLocalMarkets[localPair] = []
      }

      decimalsByLocalMarkets[localPair].push(marketDecimals[marketKey])
    }

    for (const marketKey in marketDecimals) {
      if (!store.state.panes.marketsListeners[marketKey]) {
        continue
      }

      const localPair = formatStablecoin(store.state.panes.marketsListeners[marketKey].local)

      if (!decimalsByLocalMarkets[localPair]) {
        continue
      }

      const averageDecimals = Math.round(decimalsByLocalMarkets[localPair].reduce((a, b) => a + b) / decimalsByLocalMarkets[localPair].length)

      marketDecimals[marketKey] = marketDecimals[localPair] = averageDecimals
    }

    this.emit('decimals')
  }
}

export default new AggregatorService()
