import store from '@/store'
import { AggregatorPayload } from '@/types/test'
import { parseMarket, randomString } from '@/utils/helpers'
import EventEmitter from 'eventemitter3'

import Worker from 'worker-loader!@/worker/aggregator'
import { getProducts } from './productsService'
import workspacesService from './workspacesService'

class AggregatorService extends EventEmitter {
  public worker: Worker

  constructor() {
    super()

    this.worker = new Worker()

    this.worker.addEventListener('message', event => {
      this.emit(event.data.op, event.data.data, event.data.trackingId)
    })

    this.listenUtilityEvents()
  }

  dispatch(payload: AggregatorPayload) {
    this.worker.postMessage(payload)
  }

  async connect(markets: string[]): Promise<any> {
    if (!markets.length) {
      return
    }

    for (let i = 0; i < markets.length; i++) {
      const [exchange, pair] = parseMarket(markets[i])

      if (!store.state.exchanges[exchange]) {
        store.dispatch('app/showNotice', {
          type: 'warning',
          timeout: 10000,
          title: `⚠️ Not connecting to ${exchange}:${pair} because ${exchange} doesn't exist`
        })
        continue
      }

      if (store.state.exchanges[exchange].disabled) {
        const panes = []
        for (const paneId in store.state.panes.panes) {
          if (store.state.panes.panes[paneId].markets.indexOf(markets[i]) !== -1) {
            panes.push(paneId)
          }
        }

        store.dispatch('app/showNotice', {
          type: 'warning',
          timeout: 10000,
          title: `⚠️ Not connecting to ${exchange}:${pair} because ${exchange} is disabled<br><small>Found market in ${panes.join(', ')}.</small>`
        })

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

  listenUtilityEvents() {
    this.once('hello', async () => {
      await workspacesService.initialize()

      const workspace = await workspacesService.getCurrentWorkspace()

      workspacesService.setCurrentWorkspace(workspace)
    })

    this.on('connection', ({ exchangeId, pair }: { exchangeId: string; pair: string }) => {
      store.commit('app/ADD_ACTIVE_MARKET', {
        exchangeId,
        pair
      })
    })

    this.on('disconnection', ({ exchangeId, pair }: { exchangeId: string; pair: string }) => {
      store.commit('app/REMOVE_ACTIVE_MARKET', {
        exchangeId,
        pair
      })
    })

    this.on(
      'getExchangeProducts',
      async ({ exchangeId, endpoints, forceFetch }: { exchangeId: string; endpoints: string[]; forceFetch?: boolean }, trackingId: string) => {
        const productsData = await getProducts(exchangeId, endpoints, forceFetch)

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
}

export default new AggregatorService()
