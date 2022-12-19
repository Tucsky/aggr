import { ProductsData, ProductsStorage } from '@/types/types'
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

type ExchangeEndpoint =
  | string
  | {
      url: string
      method: string
      data: string
      proxy?: boolean
    }

class Exchange extends EventEmitter {
  public id: string
  public pairs: string[] = []
  public products: string[] = null
  protected delayBetweenMessages: number
  protected maxConnectionsPerApi: number
  protected endpoints: { [id: string]: ExchangeEndpoint | ExchangeEndpoint[] }

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
      console.debug(
        `[${this.id}.isMatching] couldn't match ${pair}, exchange has no products`
      )
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
  getUrl(pair: string): Promise<string> {
    throw new Error('Not implemented')
  }

  /**
   * Link exchange to a pair
   * @param {string} channel aka pair as it is name on the exchange + feed (ex: 'btcusd_perp.ticker')
   * @returns {Promise<WebSocket>}
   */
  async link(channel: string) {
    // strip exchange name
    channel = channel.replace(/[^:]*:/, '')

    // only pair
    const pair = channel.replace(/\..*/, '')
    const url = this.getUrl(pair)

    if (!this.isMatching(pair)) {
      return Promise.reject(`${this.id} couldn't match with ${name}`)
    }

    console.debug(`[${this.id}.link] linking ${name}`)

    this.resolveApi(channel, url)
  }

  resolveApi(channel, url) {
    let api = this.getActiveApiByUrl(url)

    if (!api) {
      api = this.createWs(channel, url)
    }

    if (api._pending[channel]) {
      console.warn(
        `[${this.id}.resolveApi] ${channel}'s api is already connecting to ${channel}`
      )
      return
    }

    if (api._connected[channel]) {
      console.warn(
        `[${this.id}.resolveApi] ${channel}'s api is already connected to ${channel}`
      )
      return
    }

    api._pending.push(channel)

    if (api.readyState === WebSocket.OPEN) {
      this.schedule(
        () => {
          this.subscribePendingChannels(api)
        },
        'subscribe-' + api.url,
        1000
      )
    }

    return api
  }

  createWs(channel, url) {
    const api = new WebSocket(url) as Api
    ;(api as any)._send = api.send
    api.send = payload => {
      console.log('send', payload, 'to', api.url)
      ;(api as any)._send(payload)
    }
    api._id = randomString()

    console.debug(
      `[${this.id}] initiate new ws connection ${url} (${api._id}) for pair ${channel}`
    )

    api.binaryType = 'arraybuffer'

    api._connected = []
    api._pending = []

    this.apis.push(api)

    api.onmessage = this.onMessage.bind(this, api)

    api.onopen = event => {
      if (typeof this.scheduledOperationsDelays[url] !== 'undefined') {
        this.clearReconnectionDelayTimeout[url] = setTimeout(() => {
          delete this.clearReconnectionDelayTimeout[url]
          console.debug(
            `[${this.id}.createWs] clear reconnection delay (${url})`
          )
          delete this.scheduledOperationsDelays[url]

          api._reconnecting = false
        }, 10000)
      }

      this.markLoadingAsCompleted(this.connecting, api._id, true)

      this.subscribePendingChannels(api)

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

      const channelsToReconnect = [...api._pending, ...api._connected]

      if (channelsToReconnect.length) {
        const pairsToDisconnect = api._connected.slice()

        if (pairsToDisconnect.length) {
          for (const pair of pairsToDisconnect) {
            await this.unlink(this.id + ':' + pair)
          }
        }

        console.error(
          `[${
            this.id
          }] connection closed unexpectedly, schedule reconnection (${channelsToReconnect.join(
            ','
          )})`
        )

        api._reconnecting = true

        this.scheduledOperationsDelays[api.url] = this.schedule(
          () => {
            this.reconnectChannels(channelsToReconnect)
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

  async subscribePendingChannels(api) {
    console.debug(
      `[${this.id}.subscribePendingChannels] subscribe to ${
        api._pending.length
      } pairs of api ${api.url} (${api._pending.join(', ')})`
    )

    const channelsToConnect = api._pending.slice()

    for (const channel of channelsToConnect) {
      await this.subscribe(api, channel)
    }
  }

  /**
   * Unlink a pair
   * @param {string} pair as it is name on the exchange + feed (ex: 'btcusd_perp.ticker')
   * @returns {Promise<void>}
   */
  async unlink(channel: string) {
    // strip exchange name
    channel = channel.replace(/[^:]*:/, '')

    const api = this.getActiveApiByChannel(channel)

    if (!api) {
      return
    }

    if (api._connected.indexOf(channel) === -1) {
      console.debug(
        `[${this.id}.unlink] "${channel}" does not exist on exchange ${this.id} (resolved immediately)`
      )
      return
    }

    console.debug(`[${this.id}.unlink] unlinking ${channel}`)

    await this.unsubscribe(api, channel)

    if (!api._connected.length && !api._pending.length) {
      console.debug(
        `[${this.id}.unlink] ${channel}'s api is now empty (trigger close api)`
      )
      return this.removeWs(api)
    } else {
      return
    }
  }

  /**
   * Get active websocket api by channel
   * @param {string} channel
   * @returns {WebSocket}
   */
  getActiveApiByChannel(channel) {
    for (let i = 0; i < this.apis.length; i++) {
      if (this.apis[i]._connected.indexOf(channel) !== -1) {
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
        this.apis[i].readyState < 2 &&
        this.apis[i].url === url &&
        (!this.maxConnectionsPerApi ||
          this.apis[i]._connected.length + this.apis[i]._pending.length <
            this.maxConnectionsPerApi)
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
        throw new Error(
          `Cannot unbind api that still has channel(s) linked to it`
        )
      }

      console.debug(`[${this.id}.removeWs] close api ${api.url}`)

      this.disconnecting[api._id] = {}

      this.disconnecting[api._id].promise = new Promise<void>(
        (resolve, reject) => {
          if (api.readyState < WebSocket.CLOSING) {
            api.close()
          }

          this.disconnecting[api._id].resolver = success =>
            success ? resolve() : reject()
        }
      )

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
      `[${this.id}.reconnectApi] reconnect api (url: ${
        api.url
      }, _connected: ${api._connected.join(
        ', '
      )}, _pending: ${api._connected.join(', ')})`
    )

    const channelsToReconnect = [...api._pending, ...api._connected]

    this.reconnectChannels(channelsToReconnect)
  }

  /**
   * Reconnect channels
   * @param {string[]} channels
   * @returns {Promise<any>}
   */
  async reconnectChannels(channels) {
    const channelsToReconnect = channels.slice(0, channels.length)

    console.info(
      `[${
        this.id
      }.reconnectChannels] reconnect pairs ${channelsToReconnect.join(',')}`
    )

    for (const channel of channelsToReconnect) {
      console.debug(
        `[${this.id}.reconnectChannels] unlinking market ${
          this.id + ':' + channel
        }`
      )
      await this.unlink(channel)
    }

    await new Promise(resolve => setTimeout(resolve, 500))

    for (const channel of channelsToReconnect) {
      console.debug(
        `[${this.id}.reconnectChannels] linking market ${
          this.id + ':' + channel
        }`
      )
      await this.link(this.id + ':' + channel)
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

    if (
      typeof productsData === 'object' &&
      Object.prototype.hasOwnProperty.call(productsData, 'products')
    ) {
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

  async getProducts(forceFetch?: boolean): Promise<any> {
    console.debug(
      `[${this.id}] request product ${forceFetch ? '(force fetching)' : ''}`
    )

    if (!this.endpoints.PRODUCTS) {
      return this.products
    }

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

    return storage.data
  }

  parseChannel(channel: string): string[] {
    return channel.split('.')
  }

  getChannelPayload(pair: string, name: string): any {
    return {
      channel: name,
      pair
    }
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
   * Fire when a new websocket connection opened
   * @param {Event} event
   * @param {string[]} channels attached to ws at opening
   */
  onOpen(event, channels) {
    console.debug(`[${this.id}.onOpen] ${channels.join(',')}'s api connected`)

    this.emit('open', event)
  }

  /**
   * Fire when a new websocket connection received something
   * @param {Event} event
   * @param {WebSocket} api WebSocket instance
   */
  onMessage(api, event): boolean {
    throw new Error('Not implemented')
  }

  /**
   * Fire when a new websocket connection reported an error
   * @param {Event} event
   * @param {string[]} channels
   */
  onError(event, channels) {
    console.debug(
      `[${this.id}.onError] ${channels.join(',')}'s api errored`,
      event
    )
    this.emit('error', event)
  }

  /**
   * Fire when a new websocket connection closed
   * @param {Event} event
   * @param {string[]} channels
   */
  onClose(event, channels) {
    console.debug(`[${this.id}] ${channels.join(',')}'s api closed`)
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
   * @param {string} channel
   */
  async subscribe(api, channel) {
    if (!this.markChannelAsConnected(api, channel)) {
      // channel is already attached
      return false
    }

    this.emit('subscribed', channel, api._reconnecting)

    if (api.readyState !== WebSocket.OPEN) {
      return false
    }

    if (this.delayBetweenMessages) {
      await sleep(this.delayBetweenMessages)
    }

    return true
  }

  /**
   * UnUnsub
   * @param {WebSocket} api
   * @param {string} channel
   */
  async unsubscribe(api, channel) {
    if (!this.markChannelAsDisconnected(api, channel)) {
      // pair is already detached
      return false
    }

    this.emit('unsubscribed', channel, api._id)

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
   * Emit trade to aggregator
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
    payload: {
      type?: string
      event?: string
      op?: string
      method?: string
      id?: number
      params?: Array<any>
    } = { event: 'ping' },
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

  markLoadingAsCompleted(
    type: {
      [id: string]: {
        promise?: Promise<any>
        resolver?: (success: boolean) => void
      }
    },
    id: string,
    success: boolean
  ) {
    if (type[id]) {
      type[id].resolver(success)
      delete type[id]
    }
  }

  schedule(
    operationFunction,
    operationId,
    minDelay,
    delayMultiplier?,
    maxDelay?,
    currentDelay?
  ) {
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

  markChannelAsConnected(api, channel) {
    const pendingIndex = api._pending.indexOf(channel)

    if (pendingIndex !== -1) {
      api._pending.splice(pendingIndex, 1)
    } else {
      console.warn(
        `[${this.id}.markChannelAsConnected] ${channel} appears to be NOT connecting anymore (prevent undesired subscription)`
      )
      return false
    }

    const connectedIndex = api._connected.indexOf(channel)

    if (connectedIndex !== -1) {
      console.debug(
        `[${this.id}.markChannelAsConnected] ${channel} is already in the _connected list (prevent double subscription)`
      )
      return false
    }

    api._connected.push(channel)

    return true
  }

  markChannelAsDisconnected(api, channel) {
    const pendingIndex = api._pending.indexOf(channel)

    if (pendingIndex !== -1) {
      // this shouldn't happen most of the time
      // but unlink(channel) can be called before during a ws.open which is the case we handle here

      console.debug(
        `[${this.id}.markChannelAsDisconnected] ${channel} was NOT yet connected to api (prevent unsubscription of non connected pair)`
      )

      api._pending.splice(pendingIndex, 1)

      return false
    }

    const connectedIndex = api._connected.indexOf(channel)

    if (connectedIndex === -1) {
      console.debug(
        `[${this.id}.markChannelAsDisconnected] ${channel} was NOT found in in the _connected list (prevent double unsubscription)`
      )
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
