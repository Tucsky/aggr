import { ProductsData, ProductsStorage } from '@/types/test'
import { EventEmitter } from 'eventemitter3'
import { sleep } from './helpers/utils'
import { dispatchAsync } from './helpers/com'
import { randomString } from './helpers/utils'
interface Api extends WebSocket {
  _id: string
  _pending: string[]
  _connected: string[]
  _timestamp: number
  _reconnecting: boolean
}

class Exchange extends EventEmitter {
  public id: string
  public pairs: string[] = []
  public products: string[] = null
  protected delayBetweenMessages: number
  protected maxConnectionsPerApi: number
  protected endpoints: { [id: string]: string | string[] }

  /**
   * ping timers
   * @type {{[url: string]: number}}
   */
  keepAliveIntervals = {}

  /**
   * active websocket apis
   * @type {WebSocket[]}
   */
  apis = []

  /**
   * promises of ws. opens
   * @type {{[url: string]: {promise: Promise<void>, resolver: Function}}}
   */
  connecting = {}

  /**
   * promises of ws. closes
   * @type {{[url: string]: {promise: Promise<void>, resolver: Function}}}
   */
  disconnecting = {}

  /**
   * Operations timeout delay by operationId
   * @type {{[operationId: string]: number]}}
   */
  scheduledOperations = {}

  /**
   * Operation timeout delay by operationId
   * @type {{[operationId: string]: number]}}
   */
  scheduledOperationsDelays = {}

  /**
   * Clear reconnection delay timeout by apiUrl
   * @type {{[apiUrl: string]: number]}}
   */
  clearReconnectionDelayTimeout = {}

  /*
    Number of messages received since start
  */
  count = 0

  constructor() {
    super()
  }

  get requiresProducts() {
    return !this.products && this.endpoints.PRODUCTS
  }

  /**
   * Get exchange equivalent for a given pair
   * @param {string} pair
   */
  isMatching(pair) {
    if (!this.products || !this.products.length) {
      console.debug(`[${this.id}.isMatching] couldn't match ${pair}, exchange has no products`)
      return false
    }

    if (this.products.indexOf(pair) === -1) {
      console.debug(`[${this.id}.isMatching] couldn't match ${pair}`)

      return false
    }

    return true
  }

  /**
   * Get exchange ws url
   */
  /* eslint-disable @typescript-eslint/no-unused-vars */
  getUrl(pair: string): string {
    throw new Error('Not implemented')
  }

  /**
   * Link exchange to a pair
   * @param {*} pair
   * @returns {Promise<WebSocket>}
   */
  async link(pair) {
    pair = pair.replace(/[^:]*:/, '')

    if (!this.isMatching(pair)) {
      return Promise.reject(`${this.id} couldn't match with ${pair}`)
    }

    console.debug(`[${this.id}.link] linking ${pair}`)

    this.resolveApi(pair)
  }

  resolveApi(pair) {
    let api = this.getActiveApiByUrl(this.getUrl(pair))

    if (!api) {
      api = this.createWs(pair)
    }

    if (api._pending.indexOf(pair) !== -1) {
      console.warn(`[${this.id}.resolveApi] ${pair}'s api is already connecting to ${pair}`)
      return
    }

    if (api._connected.indexOf(pair) !== -1) {
      console.warn(`[${this.id}.resolveApi] ${pair}'s api is already connected to ${pair}`)
      return
    }

    api._pending.push(pair)

    if (api.readyState === WebSocket.OPEN) {
      this.schedule(
        () => {
          this.subscribePendingPairs(api)
        },
        'subscribe-' + api.url,
        1000
      )
    }

    return api
  }

  createWs(pair) {
    const url = this.getUrl(pair)

    const api = new WebSocket(url) as Api
    api._id = randomString()

    console.debug(`[${this.id}] initiate new ws connection ${url} (${api._id}) for pair ${pair}`)

    api.binaryType = 'arraybuffer'

    api._connected = []
    api._pending = []

    this.apis.push(api)

    api.onmessage = event => {
      this.count++

      if (this.onMessage(event, api) === true) {
        api._timestamp = Date.now()
      }
    }

    api.onopen = event => {
      if (typeof this.scheduledOperationsDelays[url] !== 'undefined') {
        this.clearReconnectionDelayTimeout[url] = setTimeout(() => {
          delete this.clearReconnectionDelayTimeout[url]
          console.debug(`[${this.id}.createWs] clear reconnection delay (${url})`)
          delete this.scheduledOperationsDelays[url]

          api._reconnecting = false
        }, 10000)
      }

      this.markLoadingAsCompleted(this.connecting, api._id, true)

      this.subscribePendingPairs(api)

      this.onOpen(event, api._connected)
    }

    api.onclose = async event => {
      if (this.clearReconnectionDelayTimeout[url]) {
        clearTimeout(this.clearReconnectionDelayTimeout[url])
        delete this.clearReconnectionDelayTimeout[url]
      }

      this.markLoadingAsCompleted(this.connecting, api._id, false)

      this.onClose(event, api._connected)
      // resolve disconnecting (as success)
      this.markLoadingAsCompleted(this.disconnecting, api._id, true)

      const pairsToReconnect = [...api._pending, ...api._connected]

      if (pairsToReconnect.length) {
        const pairsToDisconnect = api._connected.slice()

        if (pairsToDisconnect.length) {
          for (const pair of pairsToDisconnect) {
            await this.unlink(this.id + ':' + pair)
          }
        }

        console.error(`[${this.id}] connection closed unexpectedly, schedule reconnection (${pairsToReconnect.join(',')})`)

        api._reconnecting = true

        this.scheduledOperationsDelays[api.url] = this.schedule(
          () => {
            this.reconnectPairs(pairsToReconnect)
          },
          api.url,
          500,
          1.5,
          1000 * 60
        )
      }
    }

    api.onerror = event => {
      this.onError(event, api._connected)
    }

    this.connecting[api._id] = {}

    this.connecting[api._id].promise = new Promise((resolve, reject) => {
      this.connecting[api._id].resolver = success => {
        if (success) {
          this.onApiCreated(api)

          resolve(api)
        } else {
          reject()
        }
      }
    })

    return api
  }

  async subscribePendingPairs(api) {
    console.debug(`[${this.id}.subscribePendingPairs] subscribe to ${api._pending.length} pairs of api ${api.url} (${api._pending.join(', ')})`)

    const pairsToConnect = api._pending.slice()

    for (const pair of pairsToConnect) {
      await this.subscribe(api, pair)
    }
  }

  /**
   * Unlink a pair
   * @param {string} pair
   * @returns {Promise<void>}
   */
  async unlink(pair) {
    pair = pair.replace(/[^:]*:/, '')

    const api = this.getActiveApiByPair(pair)

    if (!api) {
      return
    }

    if (api._connected.indexOf(pair) === -1) {
      console.debug(`[${this.id}.unlink] "${pair}" does not exist on exchange ${this.id} (resolved immediately)`)
      return
    }

    console.debug(`[${this.id}.unlink] unlinking ${pair}`)

    await this.unsubscribe(api, pair)

    if (!api._connected.length) {
      console.debug(`[${this.id}.unlink] ${pair}'s api is now empty (trigger close api)`)
      return this.removeWs(api)
    } else {
      return
    }
  }

  /**
   * Get active websocket api by pair
   * @param {string} pair
   * @returns {WebSocket}
   */
  getActiveApiByPair(pair) {
    for (let i = 0; i < this.apis.length; i++) {
      if (this.apis[i]._connected.indexOf(pair) !== -1) {
        return this.apis[i]
      }
    }
  }

  /**
   * Get active websocket api by url
   * @param {string} url
   * @returns {WebSocket}
   */
  getActiveApiByUrl(url) {
    for (let i = 0; i < this.apis.length; i++) {
      if (
        this.apis[i].url === url &&
        (!this.maxConnectionsPerApi || this.apis[i]._connected.length + this.apis[i]._pending.length < this.maxConnectionsPerApi)
      ) {
        return this.apis[i]
      }
    }
  }

  /**
   * Close websocket api
   * @param {WebSocket} api
   * @returns {Promise<void>}
   */
  removeWs(api: Api) {
    let promiseOfClose

    if (api.readyState !== WebSocket.CLOSED) {
      if (api._connected.length) {
        throw new Error(`Cannot unbind api that still has pairs linked to it`)
      }

      console.debug(`[${this.id}.removeWs] close api ${api.url}`)

      this.disconnecting[api._id] = {}

      this.disconnecting[api._id].promise = new Promise<void>((resolve, reject) => {
        if (api.readyState < WebSocket.CLOSING) {
          api.close()
        }

        this.disconnecting[api._id].resolver = success => (success ? resolve() : reject())
      })

      promiseOfClose = this.disconnecting[api._id].promise
    } else {
      promiseOfClose = Promise.resolve()
    }

    return promiseOfClose.then(() => {
      console.debug(`[${this.id}] remove api ${api.url}`)
      this.onApiRemoved(api)
      this.apis.splice(this.apis.indexOf(api), 1)
    })
  }

  /**
   * Reconnect api
   * @param {WebSocket} api
   */
  reconnectApi(api) {
    console.debug(
      `[${this.id}.reconnectApi] reconnect api (url: ${api.url}, _connected: ${api._connected.join(', ')}, _pending: ${api._connected.join(', ')})`
    )

    const pairsToReconnect = [...api._pending, ...api._connected]

    this.reconnectPairs(pairsToReconnect)
  }

  /**
   * Reconnect pairs
   * @param {string[]} pairs (local)
   * @returns {Promise<any>}
   */
  async reconnectPairs(pairs) {
    const pairsToReconnect = pairs.slice(0, pairs.length)

    console.info(`[${this.id}.reconnectPairs] reconnect pairs ${pairsToReconnect.join(',')}`)

    for (const pair of pairsToReconnect) {
      console.debug(`[${this.id}.reconnectPairs] unlinking market ${this.id + ':' + pair}`)
      await this.unlink(this.id + ':' + pair)
    }

    await new Promise(resolve => setTimeout(resolve, 500))

    for (const pair of pairsToReconnect) {
      console.debug(`[${this.id}.reconnectPairs] linking market ${this.id + ':' + pair}`)
      await this.link(this.id + ':' + pair)
    }
  }

  /**
   * Inject formatted products into exchange model
   * @param productsData
   * @returns {boolean} true if success, false if invalid, null if no product
   */
  setProducts(productsData: ProductsData): boolean {
    if (!productsData) {
      console.debug(`[${this.id}] set products with no data (setting null)`)
      // worker will ask for products next time the market connect
      this.products = null
      return null
    }

    if (!this.validateProducts(productsData)) {
      this.products = null
      return false
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

    return true
  }

  async getProducts(forceFetch?: boolean): Promise<void> {
    console.debug(`[${this.id}] request product ${forceFetch ? '(force fetching)' : ''}`)

    // ask client for exchange's products
    // will either retrieve stored or fetch new
    // fetched product will be sent back to worker for formatting then back to client
    const storage = (await dispatchAsync({
      op: 'getExchangeProducts',
      data: {
        exchangeId: this.id,
        endpoints: this.endpoints.PRODUCTS,
        forceFetch: forceFetch
      }
    })) as ProductsStorage

    if (this.setProducts(storage.data) === false) {
      return this.getProducts(true)
    }

    // this.setProducts(storage.data)
  }

  /**
   * Fire when a new websocket connection opened
   * @param {Event} event
   * @param {string[]} pairs pairs attached to ws at opening
   */
  onOpen(event, pairs) {
    console.debug(`[${this.id}.onOpen] ${pairs.join(',')}'s api connected`)

    this.emit('open', event)
  }

  /**
   * Fire when a new websocket connection is created
   * @param {WebSocket} api WebSocket instance
   */
  onApiCreated(api) {
    // should be overrided by exchange class
  }

  /**
   * Fire when a new websocket connection has been removed
   * @param {WebSocket} api WebSocket instance
   */
  onApiRemoved(api) {
    // should be overrided by exchange class
  }

  /**
   * Fire when a new websocket connection received something
   * @param {Event} event
   * @param {WebSocket} api WebSocket instance
   */
  onMessage(event, api): boolean {
    throw new Error('Not implemented')
  }

  /**
   * Fire when a new websocket connection reported an error
   * @param {Event} event
   * @param {string[]} pairs
   */
  onError(event, pairs) {
    console.debug(`[${this.id}.onError] ${pairs.join(',')}'s api errored`, event)
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
    // should be overrided by exchange class

    return data
  }

  validateProducts(data) {
    // should be overrided by exchange class

    return true
  }

  /**
   * Sub
   * @param {WebSocket} api
   * @param {string} pair
   */
  async subscribe(api, pair) {
    if (!this.markPairAsConnected(api, pair)) {
      // pair is already attached
      return false
    }

    this.emit('subscribed', pair, api._reconnecting)

    if (api.readyState !== WebSocket.OPEN) {
      // webSocket is in CLOSING or CLOSED state
      return false
    }

    if (this.delayBetweenMessages) {
      await sleep(this.delayBetweenMessages)
    }

    return true
  }

  /**
   * Unsub
   * @param {WebSocket} api
   * @param {string} pair
   */
  async unsubscribe(api, pair) {
    if (!this.markPairAsDisconnected(api, pair)) {
      // pair is already detached
      return false
    }

    this.emit('unsubscribed', pair, api._id)

    if (api.readyState !== WebSocket.OPEN) {
      // webSocket is in CLOSING or CLOSED state
      return false
    }

    if (this.delayBetweenMessages) {
      await sleep(this.delayBetweenMessages)
    }

    return api.readyState === WebSocket.OPEN
  }

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

  startKeepAlive(
    api,
    payload: { event?: string; op?: string; method?: string; id?: number; params?: Array<any> } = { event: 'ping' },
    every = 30000
  ) {
    if (this.keepAliveIntervals[api.url]) {
      this.stopKeepAlive(api)
    }

    this.keepAliveIntervals[api.url] = setInterval(() => {
      if (api.readyState === WebSocket.OPEN) {
        api.send(JSON.stringify(payload))
      }
    }, every)
  }

  stopKeepAlive(api) {
    if (!this.keepAliveIntervals[api.url]) {
      return
    }

    console.debug(`[${this.id}] stop keepalive for ws ${api.url}`)

    clearInterval(this.keepAliveIntervals[api.url])
    delete this.keepAliveIntervals[api.url]
  }

  markLoadingAsCompleted(type: { [id: string]: { promise?: Promise<any>; resolver?: (success: boolean) => void } }, id: string, success: boolean) {
    if (type[id]) {
      type[id].resolver(success)
      delete type[id]
    }
  }

  schedule(operationFunction, operationId, minDelay, delayMultiplier?, maxDelay?, currentDelay?) {
    if (this.scheduledOperations[operationId]) {
      clearTimeout(this.scheduledOperations[operationId])
    }

    if (typeof currentDelay === 'undefined') {
      currentDelay = this.scheduledOperationsDelays[operationId]
    }

    currentDelay = Math.max(minDelay, currentDelay || 0)

    this.scheduledOperations[operationId] = setTimeout(() => {
      console.debug(`[${this.id}] schedule timer fired`)

      delete this.scheduledOperations[operationId]

      operationFunction()
    }, currentDelay)

    currentDelay *= delayMultiplier || 1

    if (typeof maxDelay === 'number' && minDelay > 0) {
      currentDelay = Math.min(maxDelay, currentDelay)
    }

    return currentDelay
  }

  markPairAsConnected(api, pair) {
    const pendingIndex = api._pending.indexOf(pair)

    if (pendingIndex !== -1) {
      api._pending.splice(pendingIndex, 1)
    } else {
      console.warn(`[${this.id}.markPairAsConnected] ${pair} appears to be NOT connecting anymore (prevent undesired subscription)`)
      return false
    }

    const connectedIndex = api._connected.indexOf(pair)

    if (connectedIndex !== -1) {
      console.debug(`[${this.id}.markPairAsConnected] ${pair} is already in the _connected list (prevent double subscription)`)
      return false
    }

    api._connected.push(pair)

    return true
  }

  markPairAsDisconnected(api, pair) {
    const pendingIndex = api._pending.indexOf(pair)

    if (pendingIndex !== -1) {
      // this shouldn't happen most of the time
      // but unlink(pair) can be called before during a ws.open which is the case we handle here

      console.debug(`[${this.id}.markPairAsDisconnected] ${pair} was NOT yet connected to api (prevent unsubscription of non connected pair)`)

      api._pending.splice(pendingIndex, 1)

      return false
    }

    const connectedIndex = api._connected.indexOf(pair)

    if (connectedIndex === -1) {
      console.debug(`[${this.id}.markPairAsDisconnected] ${pair} was NOT found in in the _connected list (prevent double unsubscription)`)
      return false
    }

    api._connected.splice(connectedIndex, 1)

    return true
  }

  getEstimatedTimeToConnect(count) {
    if (!this.delayBetweenMessages) {
      return count
    }

    const delay = count * this.delayBetweenMessages

    if (this.maxConnectionsPerApi && count > this.maxConnectionsPerApi) {
      return delay / Math.ceil(count / this.maxConnectionsPerApi)
    }

    return delay
  }
}

export default Exchange
