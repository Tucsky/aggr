import store from '@/store'
import { AggregatorPayload } from '@/types/test'
import { parseMarket, randomString } from '@/utils/helpers'
import EventEmitter from 'eventemitter3'

import Worker from 'worker-loader!@/worker/aggregator.worker'
import { getProducts } from './productsService'
import workspacesService from './workspacesService'

class AggregatorService extends EventEmitter {
  public worker: Worker
  public pending = 0

  constructor() {
    super()

    this.worker = new Worker()

    this.worker.addEventListener('message', event => {
      this.emit(event.data.op, event.data.data, event.data.trackingId)
    })

    this.listenUtilityEvents()

    window.addEventListener('beforeunload', () => {
      this.worker.postMessage({
        op: 'unload'
      })
    })
  }

  dispatch(payload: AggregatorPayload) {
    console.debug('[service] send to worker', payload)
    this.worker.postMessage(payload)
  }

  async connect(markets: string[]): Promise<any> {
    if (!markets.length) {
      return
    }

    for (let i = 0; i < markets.length; i++) {
      const [exchange, pair] = parseMarket(markets[i])

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
          title: `⚠️ Not connecting to ${pair} because exchange is disabled<br><small>Pair is currently selected in ${panes.join(', ')}.</small>`
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

    if (this.pending > 5) {
      console.warn(`[service.dispatchAsync] there is ${this.pending} messages still waiting answer from worker.`)
    }

    this.pending++

    return new Promise(resolve => {
      console.debug(`[service.dispatchAsync] send to worker (with tracking)`, payload, trackingId)

      const listener = ({ data }: { data: AggregatorPayload }) => {
        if (data.trackingId === payload.trackingId) {
          this.pending--
          console.debug(`[service.dispatchAsync] tracking message match`, 'resolving', trackingId)
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

    this.on('connection', ({ exchange, pair }: { exchange: string; pair: string }) => {
      console.log('worker reported connection', exchange, pair)
      store.commit('app/ADD_ACTIVE_MARKET', {
        exchange,
        pair
      })
    })

    this.on('disconnection', ({ exchange, pair }: { exchange: string; pair: string }) => {
      console.log('worker reported disconnection', exchange, pair)
      store.commit('app/REMOVE_ACTIVE_MARKET', {
        exchange,
        pair
      })
    })

    this.on('products', async ({ exchange, endpoints }: { exchange: string; endpoints: string[] }, trackingId: string) => {
      const productsData = await getProducts(exchange, endpoints)

      this.dispatch({
        op: 'products',
        data: {
          exchange,
          data: productsData
        },
        trackingId
      })
    })
  }
}

export default new AggregatorService()
