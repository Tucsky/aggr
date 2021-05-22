import { ProductsData, ProductsStorage } from '@/types/test'
import { EventEmitter } from 'eventemitter3'
import { dispatchAsync } from './helpers/com'
import { getHms, randomString } from './helpers/utils'

interface Api extends WebSocket {
  _id: string
  _connected: string[]
  _connecting: string[]
  _timestamp: number
}

class Exchange extends EventEmitter {
  public id: string

  public pairs: string[] = []

  public products: string[] = null

  protected endpoints: { [id: string]: string | string[] }

  protected apis: Api[] = []

  private connecting: { [url: string]: { promise?: Promise<void>; resolver?: (success: boolean) => void } } = {}

  private disconnecting: { [url: string]: { promise?: Promise<void>; resolver?: (success: boolean) => void } } = {}

  private reconnectionDelay: { [apiUrl: string]: number } = {}

  private _keepAliveIntervals: { [url: string]: number } = {}

  constructor() {
    super()
  }

  get requireProducts() {
    return !this.products && this.endpoints.PRODUCTS
  }

  /**
   * Fire when a new websocket connection received something
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onMessage(event, api) {
    return false
  }

  /**
   * Get exchange ws url
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getUrl(pair?: string) {
    return null
  }

  /**
   * Fire when a new websocket connection is created
   * @param {WebSocket} api WebSocket instance
   */
  onApiBinded?(api: Api)

  /**
   * Fire when a new websocket connection has been removed
   * @param {WebSocket} api WebSocket instance
   */
  onApiUnbinded?(api: Api)

  /**
   * Get exchange equivalent for a given pair
   * @param {string} pair
   */
  isMatching(pair) {
    if (!this.products || !this.products.length) {
      console.debug(`[${this.id}] couldn't match ${pair}, exchange has no products`)
      return false
    }

    if (this.products.indexOf(pair) === -1) {
      console.debug(`[${this.id}] couldn't match ${pair}`)
      return false
    }

    return true
  }

  /**
   * Link exchange to a pair
   * @param {*} pair
   * @returns {Promise<WebSocket>}
   */
  async link(pair) {
    console.log('[' + this.id + ']', 'linking pair', pair)
    pair = pair.replace(/[^:]*:/, '')

    if (!this.isMatching(pair)) {
      return Promise.reject(`${this.id} couldn't match with ${pair}`)
    }

    if (this.pairs.indexOf(pair) !== -1) {
      return Promise.reject(`${this.id} already connected to ${pair}`)
    }

    this.pairs.push(pair)

    /*postMessage({
      op: 'connection',
      data: {
        pair,
        exchange: this.id
      }
    })*/

    console.debug(`[${this.id}] linking ${pair}`)

    const api = await this.bindApi(pair)

    await this.subscribe(api, pair)

    return api
  }

  /**
   * Unlink a pair
   * @param {string} pair
   * @returns {Promise<void>}
   */
  unlink(pair) {
    pair = pair.replace(/[^:]*:/, '')

    if (this.pairs.indexOf(pair) === -1) {
      return Promise.resolve()
    }

    const api = this.getActiveApiByPair(pair)

    if (!api) {
      return Promise.reject(new Error(`couldn't find active api for pair ${pair} in exchange ${this.id}`))
    }

    console.debug(`[${this.id}] unlinking ${pair}`)

    // call exchange specific unsubscribe function
    this.unsubscribe(api, pair)

    this.pairs.splice(this.pairs.indexOf(pair), 1)

    if (!api._connected.length) {
      return this.unbindApi(api)
    } else {
      return Promise.resolve()
    }
  }

  /**
   * Get active websocket api by pair
   * @param {string} pair
   * @returns {WebSocket}
   */
  getActiveApiByPair(pair) {
    const url = this.getUrl(pair)

    for (let i = 0; i < this.apis.length; i++) {
      if (this.apis[i].url.replace(/\/$/, '') === url.replace(/\/$/, '')) {
        return this.apis[i]
      }
    }
  }

  /**
   * Create or attach a pair subscription to active websocket api
   * @param {*} pair
   * @returns {Promise<WebSocket>}
   */
  bindApi(pair) {
    let api = this.getActiveApiByPair(pair)

    let toResolve

    if (!api) {
      const url = this.getUrl(pair)

      api = new WebSocket(url) as Api
      api._id = randomString()

      console.debug(`[${this.id}] initiate new ws connection ${url} (${api._id}) for pair ${pair}`)

      api.binaryType = 'arraybuffer'

      api._connected = []
      api._connecting = [pair]

      this.apis.push(api)

      api.onmessage = event => {
        if (this.onMessage(event, api) === true) {
          api._timestamp = +new Date()
        }
      }

      api.onopen = event => {
        if (typeof this.reconnectionDelay[url] !== 'undefined') {
          console.debug(`[${this.id}] clear reconnection delay (${url})`)
          delete this.reconnectionDelay[url]
        }

        this.markLoadingAsCompleted(this.connecting, url, true)

        this.onOpen(event, api._connected)
      }

      api.onclose = event => {
        // resolve connecting (as failed)
        this.markLoadingAsCompleted(this.connecting, url, false)

        this.onClose(event, api._connected)

        if (event.reason) {
          console.error(event.reason, [...api._connecting, ...api._connected])
          this.emit('error', event.reason)
        }

        // resolve disconnecting (as success)
        this.markLoadingAsCompleted(this.disconnecting, url, true)

        if (api._connected.length) {
          const pairsToReconnect = [...api._connecting, ...api._connected]

          console.log(`[${this.id}] connection closed unexpectedly, schedule reconnection (${pairsToReconnect.join(',')})`)

          Promise.all(api._connected.map(pair => this.unlink(pair))).then(() => {
            const delay = this.reconnectionDelay[api.url] || 10000

            setTimeout(() => {
              this.reconnectPairs(pairsToReconnect)
            }, delay)

            this.reconnectionDelay[api.url] = Math.min(1000 * 30, (delay || 1000) * 1.5)
            console.debug(`[${this.id}] increment reconnection delay (${url}) = ${getHms(this.reconnectionDelay[api.url])}`)
          })
        }
      }

      api.onerror = event => {
        this.onError(event, api._connected)
      }

      this.connecting[url] = {}

      toResolve = new Promise((resolve, reject) => {
        this.connecting[url].resolver = success => (success ? resolve(api) : reject())
      })

      this.connecting[url].promise = toResolve

      if (typeof this.onApiBinded !== 'undefined') {
        this.onApiBinded(api)
      }
    } else {
      api._connecting.push(pair)

      if (this.connecting[api.url]) {
        console.debug(`[${this.id}] attach ${pair} to connecting api ${api.url}`)
        toResolve = this.connecting[api.url].promise
      } else {
        console.debug(`[${this.id}] attach ${pair} to connected api ${api.url}`)
        toResolve = Promise.resolve(api)
      }
    }

    return toResolve
  }

  /**
   * Close websocket api
   * @param {WebSocket} api
   * @returns {Promise<void>}
   */
  unbindApi(api): Promise<void> {
    console.debug(`[${this.id}] unbind api ${api.url}`)

    if (api._connected.length) {
      throw new Error(`cannot unbind api that still has pairs linked to it`)
    }

    let promiseOfClose: Promise<void>

    if (api.readyState !== WebSocket.CLOSED) {
      this.disconnecting[api.url] = {}

      promiseOfClose = new Promise((resolve, reject) => {
        if (api.readyState < WebSocket.CLOSING) {
          api.close()
        }

        this.disconnecting[api.url].resolver = success => {
          if (success) {
            resolve()
          } else {
            reject()
          }
        }
      })

      this.disconnecting[api.url].promise = promiseOfClose
    } else {
      promiseOfClose = Promise.resolve()
    }

    return promiseOfClose.then(() => {
      console.debug(`[${this.id}] splice api ${api.url} from exchange`)

      if (typeof this.onApiUnbinded !== 'undefined') {
        this.onApiUnbinded(api)
      }

      this.apis.splice(this.apis.indexOf(api), 1)
    })
  }

  /**
   * Reconnect api
   * @param {WebSocket} api
   */
  reconnectApi(api) {
    console.debug(`[${this.id}] reconnect api (url: ${api.url}, apiPairs: ${api._connected.join(', ')})`)

    this.reconnectPairs(api._connected)
  }

  /**
   * Reconnect pairs
   * @param {string[]} pairs (local)
   * @returns {Promise<any>}
   */
  async reconnectPairs(pairs) {
    const pairsToReconnect = pairs.slice(0, pairs.length)

    console.debug(`[${this.id}] reconnect pairs ${pairsToReconnect.join(',')}`)

    for (const pair of pairsToReconnect) {
      await this.unlink(pair)
    }

    for (const pair of pairsToReconnect) {
      await this.link(pair)
    }
  }

  setProducts(productsData: ProductsData): void {
    if (!productsData) {
      console.debug(`[${this.id}] set products (null)`)
      // worker will ask for products next time the market connect
      this.products = null
      return
    }

    if (typeof productsData === 'object' && Object.prototype.hasOwnProperty.call(productsData, 'products')) {
      console.debug(`[${this.id}] set products (products data)`)
      for (const key in productsData) {
        this[key] = productsData[key]
      }
    } else if (Array.isArray(productsData)) {
      console.debug(`[${this.id}] set products (array of markets)`)
      this.products = productsData
    }
  }

  async getProducts(): Promise<void> {
    console.debug(`[${this.id}] request product`)

    const storage = (await dispatchAsync({
      op: 'products',
      data: {
        exchange: this.id,
        endpoints: this.endpoints.PRODUCTS
      }
    })) as ProductsStorage

    this.setProducts(storage.data)
  }

  /**
   * Fire when a new websocket connection opened
   * @param {Event} event
   * @param {string[]} pairs pairs attached to ws at opening
   */
  onOpen(event, pairs) {
    console.debug(`[${this.id}] ${pairs.join(',')}'s api connected`)

    this.emit('open', event)
  }

  /**
   * Fire when a new websocket connection reported an error
   * @param {Event} event
   * @param {string[]} pairs
   */
  onError(event, pairs) {
    console.debug(`[${this.id}] ${pairs.join(',')}'s api errored`, event)
    this.emit('error', event)
  }

  /**
   * Fire when a new websocket connection closed
   * @param {Event} event
   * @param {string[]} pairs
   */
  onClose(event, pairs) {
    console.debug(`[${this.id}] ${pairs.join(',')}'s api closed`)
    this.emit('close', event)
  }

  /**
   *
   * @param {any} data products from HTTP response
   */
  formatProducts(data) {
    return data
  }

  /**
   * Sub
   * @param {WebSocket} api
   * @param {string} pair
   */
  canSubscribe(api, pair) {
    if (!this.markPairAsConnected(api, pair)) {
      console.log(pair, 'is already connected')

      // pair is already attached
      return false
    }

    this.emit('subscribed', pair, api._id)

    if (api.readyState !== WebSocket.OPEN) {
      console.log('(subscribe ' + pair + ') ws connection api', api._id, 'is in opening/closing state')
      // webSocket is in CLOSING or CLOSED state
      return false
    }

    return true
  }

  /**
   * Unsub
   * @param {WebSocket} api
   * @param {string} pair
   */
  canUnsubscribe(api, pair) {
    if (!this.markPairAsDisconnected(api, pair)) {
      console.log(pair, 'pair is already detached')
      // pair is already detached
      return false
    }

    this.emit('unsubscribed', pair, api._id)

    if (api.readyState !== WebSocket.OPEN) {
      console.log('(unsubscribe ' + pair + ') ws connection api', api._id, 'is in opening/closing state')
      // webSocket is in CLOSING or CLOSED state
      return false
    }

    return true
  }

  /**
   * Subscribe to channel (overrided by exchange class)
   * @param api
   * @param pair
   * @returns
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  subscribe(api, pair) {}

  /**
   * Unsubscribe from channel (overrided by exchange class)
   * @param api
   * @param pair
   * @returns
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  unsubscribe(api, pair) {}

  /**
   * Emit trade to server
   * @param {string} source api id
   * @param {Trade[]} trades
   */
  emitTrades(source, trades) {
    if (!trades || !trades.length) {
      return
    }

    this.emit('trades', trades)

    return true
  }

  /**
   * Emit liquidations to server
   * @param {string} source api id
   * @param {Trade[]} trades
   */
  emitLiquidations(source, trades) {
    if (!trades || !trades.length) {
      return
    }

    this.emit('liquidations', trades)

    return true
  }

  startKeepAlive(api, payload: any = { event: 'ping' }, every = 30000) {
    if (this._keepAliveIntervals[api._id]) {
      this.stopKeepAlive(api)
    }

    console.debug(`[${this.id}] setup keepalive for ws ${api._id}`)

    this._keepAliveIntervals[api._id] = self.setInterval(() => {
      if (api.readyState === WebSocket.OPEN) {
        api.send(JSON.stringify(payload))
      }
    }, every)
  }

  stopKeepAlive(api) {
    if (!this._keepAliveIntervals[api._id]) {
      return
    }

    console.debug(`[${this.id}] stop keepalive for ws ${api._id}`)

    clearInterval(this._keepAliveIntervals[api._id])
    delete this._keepAliveIntervals[api._id]
  }

  markLoadingAsCompleted(type: { [url: string]: { promise?: Promise<any>; resolver?: (success: boolean) => void } }, url: string, success: boolean) {
    if (type[url]) {
      type[url].resolver(success)
      delete type[url]
    }
  }

  async linkAll(pairs: string[]) {
    if (!pairs.length) {
      return Promise.resolve()
    }

    console.log(`[${this.id}] connecting to ${pairs.join(', ')}`)

    for (const pair of pairs) {
      await this.link(pair)
    }
  }

  unlinkAll(pairs?: string[], autoPairsOnEmpty = true) {
    if (!pairs || !pairs.length) {
      pairs = []

      if (autoPairsOnEmpty) {
        pairs = this.pairs.slice()
      }
    }

    if (!pairs.length) {
      return Promise.resolve()
    }

    console.log(`[${this.id}] disconnecting from ${pairs.join(', ')}`)

    const promises: Promise<void>[] = []

    for (const pair of pairs) {
      promises.push(this.unlink(pair))
    }

    return Promise.all(promises)
  }

  markPairAsConnected(api, pair) {
    const connectingIndex = api._connecting.indexOf(pair)

    if (connectingIndex !== -1) {
      console.debug(`[${this.id}.markPairAsConnected] ${pair} was connecting indeed. move from _connecting to _connected`)

      api._connecting.splice(connectingIndex, 1)
    } else {
      console.debug(`[${this.id}.markPairAsConnected] ${pair} appears to be NOT connecting anymore`)
    }

    const connectedIndex = api._connected.indexOf(pair)

    if (connectedIndex !== -1) {
      console.debug(`[${this.id}.markPairAsConnected] ${pair} is already in the _connected list -> prevent double subscription`)
      return false
    }

    api._connected.push(pair)

    console.debug(`[${this.id}.markPairAsConnected] ${pair} added to _connected list at index ${api._connected.length - 1}`)

    return true
  }

  markPairAsDisconnected(api, pair) {
    const connectedIndex = api._connected.indexOf(pair)

    if (connectedIndex === -1) {
      console.debug(`[${this.id}.markPairAsDisconnected] ${pair} was NOT found in in the _connected list -> prevent double unsubscription`)
      return false
    }

    api._connected.splice(connectedIndex, 1)

    console.debug(`[${this.id}.markPairAsDisconnected] ${pair} removed from _connected list (current length after remove : ${api._connected.length})`)

    return true
  }
}

export default Exchange
