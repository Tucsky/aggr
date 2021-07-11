import { AggregatedTrade, AggregatorPayload, AggregatorSettings, Connection, Trade, Volumes } from '@/types/test'
import { exchanges, getExchangeById } from './exchanges'
import { countDecimals, parseMarket } from './helpers/utils'

const ctx: Worker = self as any

class Aggregator {
  public settings: AggregatorSettings = {
    calculateSlippage: null,
    aggregationLength: null,
    preferQuoteCurrencySize: null,
    buckets: {}
  }
  public connections: { [name: string]: Connection } = {}

  private onGoingAggregations: { [identifier: string]: AggregatedTrade } = {}
  private pendingTrades: Trade[] = []
  private marketsPrices: { [marketId: string]: number } = {}

  activeBuckets: string[] = []
  buckets: { [id: string]: Volumes } = {}
  connectionsCount = 0

  constructor() {
    console.warn(`[worker.aggr] new instance`)

    this.bindExchanges()
    this.startPriceInterval()

    ctx.postMessage({
      op: 'hello'
    })
  }

  bindExchanges() {
    for (const exchange of exchanges) {
      exchange.on('liquidations', this.onLiquidations.bind(this))
      exchange.on('subscribed', this.onSubscribed.bind(this, exchange.id))
      exchange.on('unsubscribed', this.onUnsubscribed.bind(this, exchange.id))
      exchange.on('error', this.onError.bind(this, exchange.id))
    }
  }

  bindTradesEvent() {
    for (const exchange of exchanges) {
      exchange.off('trades')

      if (this.settings.aggregationLength > 0) {
        exchange.on('trades', this.aggregateTrades.bind(this))
      } else {
        exchange.on('trades', this.emitTrades.bind(this))
      }
    }

    if (this.settings.aggregationLength > 0) {
      this.startAggrInterval()
      console.debug(`[worker] bind trades: aggregation`)
    } else {
      if (this['_aggrInterval']) {
        this.clearInterval(this['_aggrInterval'])
        this['_aggrInterval'] = null
        console.debug(`[worker] stopped aggrInterval timer`)
      }

      // clear pending aggregations
      this.timeoutExpiredAggregations()
      this.emitPendingTrades()

      console.debug(`[worker] bind trades: simple`)
    }
  }

  updateBuckets(bucketsDefinition: { [bucketId: string]: string[] }) {
    const activeBuckets = [] // array of buckets IDs
    const bucketEnabledMarkets = [] // array of markets IDs

    console.log('[worker] update buckets using :', bucketsDefinition)
    console.debug('[worker] previous buckets :', { ...this.buckets }, this.activeBuckets)

    for (const bucketId in bucketsDefinition) {
      if (activeBuckets.indexOf(bucketId) === -1) {
        activeBuckets.push(bucketId)
      }

      if (!this.buckets[bucketId]) {
        console.debug('[worker] create bucket', bucketId)
        this.buckets[bucketId] = this.createBucket()
      }

      for (const market of bucketsDefinition[bucketId]) {
        if (bucketEnabledMarkets.indexOf(market) === -1) {
          bucketEnabledMarkets.push(market)
        }

        if (!this.connections[market]) {
          // connection referenced in bucket doesn't exists
          console.warn('attempted to activate bucket on inexistant connection', market)
          continue
        }

        if (this.connections[market].bucket) {
          // bucket already running
          continue
        }

        // create empty bucket for this market
        console.debug('[worker] create market bucket', market)
        this.connections[market].bucket = this.createBucket()
      }
    }

    for (const market in this.connections) {
      if (this.connections[market].bucket && bucketEnabledMarkets.indexOf(market) === -1) {
        // destroy market's bucket (not referenced any buckets anymore)
        console.log('[worker] remove market bucket', market)
        this.connections[market].bucket = null
      }
    }

    for (const oldBucketId in this.buckets) {
      if (activeBuckets.indexOf(oldBucketId) === -1) {
        // destroy bucket (does not exists in settings or was modified by user)
        console.log('[worker] remove bucket', oldBucketId)
        delete this.buckets[oldBucketId]
      }
    }

    console.log('[worker] finished updating buckets (active buckets: ', activeBuckets, ')')

    if (activeBuckets.length && !this.activeBuckets.length) {
      this.startStatsInterval()
    } else if (this.activeBuckets.length && !activeBuckets.length && this['_statsInterval']) {
      this.clearInterval(this['_statsInterval'])
      this['_statsInterval'] = null
      console.debug(`[worker] stopped statsInterval timer`)
    }

    this.activeBuckets = activeBuckets
    this.settings.buckets = bucketsDefinition
  }

  emitTrades(trades: Trade[]) {
    for (let i = 0; i < trades.length; i++) {
      const trade = trades[i]
      const market = trade.exchange + ':' + trade.pair

      if (!this.connections[market]) {
        continue
      }

      if (this.settings.calculateSlippage) {
        trade.originalPrice = this.marketsPrices[market] || trade.price
      }

      trade.count = 1

      this.marketsPrices[market] = trade.price

      this.processTrade(trade)
    }

    ctx.postMessage({
      op: 'trades',
      data: trades
    })
  }

  aggregateTrades(trades: Trade[]) {
    const now = +new Date()

    for (let i = 0; i < trades.length; i++) {
      const trade = (trades[i] as unknown) as AggregatedTrade
      const market = trade.exchange + trade.pair

      if (!this.connections[market]) {
        continue
      }

      if (this.onGoingAggregations[market]) {
        const aggTrade = this.onGoingAggregations[market]

        if (aggTrade.timestamp + this.settings.aggregationLength > trade.timestamp && aggTrade.side === trade.side) {
          aggTrade.size += trade.size
          aggTrade.prices += trade.price * trade.size
          aggTrade.price = trade.price
          aggTrade.count++
          continue
        } else {
          this.pendingTrades.push(this.processTrade(aggTrade))
        }
      }

      trade.originalPrice = this.marketsPrices[market] || trade.price

      this.marketsPrices[market] = trade.price

      trade.count = 1
      trade.prices = trade.price * trade.size
      trade.timeout = now + 50
      this.onGoingAggregations[market] = trade
    }
  }

  processTrade(trade: Trade): Trade {
    const market = trade.exchange + trade.pair

    if (this.settings.calculateSlippage) {
      if (this.settings.calculateSlippage === 'price') {
        trade.slippage = trade.price - trade.originalPrice
      } else if (this.settings.calculateSlippage === 'bps') {
        if (trade.side === 'buy') {
          trade.slippage = Math.floor(((trade.price - trade.originalPrice) / trade.originalPrice) * 10000)
        } else {
          trade.slippage = Math.floor(((trade.originalPrice - trade.price) / trade.price) * 10000)
        }
      }
    }

    if (this.settings.aggregationLength > 0) {
      trade.price = Math.max(trade.price, trade.originalPrice)
    }

    if (this.connections[market].bucket) {
      const size = (this.settings.preferQuoteCurrencySize ? trade.price : 1) * trade.size

      this.connections[market].bucket['c' + trade.side] += trade.count
      this.connections[market].bucket['v' + trade.side] += size
    }

    return trade
  }

  timeoutExpiredAggregations() {
    const now = +new Date()

    const aggMarkets = Object.keys(this.onGoingAggregations)

    for (let i = 0; i < aggMarkets.length; i++) {
      const aggTrade = this.onGoingAggregations[aggMarkets[i]]

      if (now > aggTrade.timeout) {
        this.pendingTrades.push(this.processTrade(aggTrade))

        delete this.onGoingAggregations[aggMarkets[i]]
      }
    }
  }

  emitPendingTrades() {
    if (this.settings.aggregationLength > 0) {
      this.timeoutExpiredAggregations()
    }

    if (this.pendingTrades.length) {
      ctx.postMessage({ op: 'trades', data: this.pendingTrades })

      this.pendingTrades.splice(0, this.pendingTrades.length)
    }
  }

  emitStats() {
    const timestamp = +new Date()

    for (const bucketId in this.settings.buckets) {
      for (const market of this.settings.buckets[bucketId]) {
        if (!this.connections[market]) {
          continue
        }

        this.buckets[bucketId].vbuy += this.connections[market].bucket.vbuy
        this.buckets[bucketId].vsell += this.connections[market].bucket.vsell
        this.buckets[bucketId].cbuy += this.connections[market].bucket.cbuy
        this.buckets[bucketId].csell += this.connections[market].bucket.csell
        this.buckets[bucketId].lbuy += this.connections[market].bucket.lbuy
        this.buckets[bucketId].lsell += this.connections[market].bucket.lsell
      }

      this.buckets[bucketId].timestamp = timestamp

      ctx.postMessage({ op: 'bucket-' + bucketId, data: this.buckets[bucketId] })

      this.clearBucket(this.buckets[bucketId])
    }

    for (const market in this.connections) {
      if (!this.connections[market].bucket) {
        continue
      }

      this.clearBucket(this.connections[market].bucket)
    }
  }

  emitPrices() {
    if (!this.connectionsCount) {
      return
    }

    ctx.postMessage({ op: 'prices', data: this.marketsPrices })
  }

  onLiquidations(trades: Trade[]) {
    if (this.activeBuckets.length) {
      for (let i = 0; i < trades.length; i++) {
        const trade = trades[i]
        const market = trade.exchange + trade.pair

        if (this.connections[market] && this.connections[market].bucket) {
          this.connections[market].bucket['l' + trade.side] += (this.settings.preferQuoteCurrencySize ? trade.price : 1) * trade.size
        }
      }
    }

    ctx.postMessage({ op: 'trades', data: trades })
  }

  onSubscribed(exchangeId, pair) {
    const market = exchangeId + pair

    if (this.connections[market]) {
      return
    }

    this.connections[market] = {
      exchange: exchangeId,
      pair: pair,
      hit: 0,
      timestamp: null
    }

    this.connectionsCount = Object.keys(this.connections).length

    for (const bucketId in this.settings.buckets) {
      if (this.settings.buckets[bucketId].indexOf(market) !== -1) {
        console.debug(`[worker] create bucket for new connection ${market}`)
        this.connections[market].bucket = this.createBucket()
        break
      }
    }

    ctx.postMessage({
      op: 'connection',
      data: {
        pair,
        exchange: exchangeId
      }
    })

    ctx.postMessage({
      op: 'notice',
      data: {
        id: exchangeId + pair,
        type: 'success',
        title: `Subscribed to ${exchangeId + ':' + pair}`
      }
    })
  }

  createBucket(): Volumes {
    return {
      timestamp: null,
      vbuy: 0,
      vsell: 0,
      cbuy: 0,
      csell: 0,
      lbuy: 0,
      lsell: 0
    }
  }

  clearBucket(bucket: Volumes) {
    bucket.cbuy = bucket.csell = bucket.vbuy = bucket.vsell = bucket.lbuy = bucket.lsell = 0
  }

  onUnsubscribed(exchangeId, pair) {
    const identifier = exchangeId + pair

    console.log('worker DELETE', identifier)

    if (this.onGoingAggregations[identifier]) {
      console.info('DELETE onGoingAggregations', identifier)
      delete this.onGoingAggregations[identifier]
    }

    if (this.connections[identifier]) {
      console.info('DELETE connections', identifier)
      delete this.connections[identifier]

      this.connectionsCount = Object.keys(this.connections).length

      ctx.postMessage({
        op: 'disconnection',
        data: {
          pair,
          exchange: exchangeId
        }
      })

      ctx.postMessage({
        op: 'notice',
        data: {
          id: exchangeId + pair,
          type: 'info',
          title: `Unsubscribed from ${exchangeId + ':' + pair}`
        }
      })
    }
  }

  onError(exchangeId, reason) {
    let message: string

    if (typeof reason === 'string') {
      message = reason
    } else if (reason.message) {
      message = reason.message
    }

    if (message) {
      ctx.postMessage({
        op: 'notice',
        data: {
          id: exchangeId + '-error',
          type: 'error',
          title: `${exchangeId} disconnected unexpectedly (${message})`
        }
      })
    }
  }

  /**
   * Trigger subscribe to pairs (settings.pairs) on all enabled exchanges
   * @param {string[]} pairs eg ['BTCUSD', 'FTX:BTC-PERP']
   * @returns {Promise<any>} promises of connections
   * @memberof Server
   */
  async connect(markets: string[]) {
    console.log(`[aggregator] connect`, markets)

    const marketsByExchange = markets.reduce((output, market) => {
      const [exchangeId, pair] = parseMarket(market)

      if (!exchangeId || !pair) {
        return {}
      }

      if (!output[exchangeId]) {
        output[exchangeId] = []
      }

      if (output[exchangeId].indexOf(market) === -1) {
        output[exchangeId].push(market)
      }

      return output
    }, {})

    const promises: Promise<any>[] = []

    for (const exchangeId in marketsByExchange) {
      const exchange = getExchangeById(exchangeId)

      if (exchange) {
        if (exchange.requireProducts) {
          await exchange.getProducts()
        }

        promises.push(
          (async () => {
            for (const market of marketsByExchange[exchangeId]) {
              await exchange.link(market)
            }
          })()
        )
      } else {
        console.error(`[worker.connect] unknown exchange ${exchange}`)
      }
    }

    return Promise.all(promises)
  }

  /**
   * Trigger unsubscribe to pairs on all activated exchanges
   * @param {string[]} pairs
   * @returns {Promise<void>} promises of disconnection
   * @memberof Server
   */
  disconnect(markets: string[]) {
    console.log(`[aggregator] disconnect`, markets)

    const marketsByExchange = markets.reduce((output, market) => {
      const [exchangeId, pair] = parseMarket(market)

      if (!exchangeId || !pair) {
        return {}
      }

      if (!output[exchangeId]) {
        output[exchangeId] = []
      }

      if (output[exchangeId].indexOf(market) === -1) {
        output[exchangeId].push(market)
      }

      return output
    }, {})

    const promises: Promise<void>[] = []

    for (const exchangeId in marketsByExchange) {
      const exchange = getExchangeById(exchangeId)

      if (exchange) {
        promises.push(
          (async () => {
            for (const market of marketsByExchange[exchangeId]) {
              await exchange.unlink(market)
            }
          })()
        )
      }
    }

    return Promise.all(promises)
  }

  startPriceInterval() {
    if (this['_priceInterval']) {
      console.warn('timer _priceInterval was already started')
      return
    }
    console.debug(`[worker] started _priceInterval timer`)
    this['_priceInterval'] = self.setInterval(this.emitPrices.bind(this), 1000)
  }

  startAggrInterval() {
    if (this['_aggrInterval']) {
      console.warn('timer _aggrInterval was already started')
      return
    }
    console.debug(`[worker] started _aggrInterval timer`)
    this['._aggrInterval'] = self.setInterval(this.emitPendingTrades.bind(this), 50)
  }

  startStatsInterval() {
    if (this['_statsInterval']) {
      console.warn('timer _statsInterval was already started')
      return
    }
    console.debug(`[worker] started _statsInterval timer`)
    this['_statsInterval'] = self.setInterval(this.emitStats.bind(this), 500)
  }

  clearInterval(name: string) {
    if (this['_' + name + 'Interval']) {
      clearInterval(this['_' + name + 'Interval'])
      this['_' + name + 'Interval'] = null
    }
  }

  requestOptimalDecimal() {
    const _optimalDecimalLookupInterval: number = self.setInterval(() => {
      const prices = Object.values(this.marketsPrices)
      const markets = Object.keys(this.connections)

      if (prices.length > markets.length / 2) {
        const optimalDecimal = Math.ceil(prices.map(price => countDecimals(price)).reduce((a, b) => a + b, 0) / prices.length)

        ctx.postMessage({
          op: 'notice',
          data: {
            type: 'info',
            title: `Precision set to ${optimalDecimal}`,
            timeout: 5000
          }
        })

        ctx.postMessage({ op: 'optimal-decimal', data: optimalDecimal })

        clearInterval(_optimalDecimalLookupInterval)
      }
    }, 3333)
  }
}

const aggregator = new Aggregator()

self.addEventListener('message', (event: any) => {
  const payload = event.data as AggregatorPayload
  console.debug('[worker] received message from service', event.data)

  switch (payload.op) {
    case 'connect':
    case 'disconnect':
      aggregator[payload.op as 'connect' | 'disconnect'](payload.data).finally(() => {
        if (payload.trackingId) {
          ctx.postMessage({
            op: payload.op,
            trackingId: payload.trackingId
          })
        }
      })
      break
    case 'products':
      getExchangeById(payload.data.exchange).setProducts(payload.data.data)
      break
    case 'buckets':
      aggregator.updateBuckets(payload.data)
      break
    case 'format-products':
      ctx.postMessage({
        op: 'format-products',
        data: getExchangeById(payload.data.exchange).formatProducts(payload.data.data),
        trackingId: payload.trackingId
      })
      break
    case 'fetch-products':
      Promise.all(exchanges.filter(exchange => !payload.data || payload.data === exchange.id).map(exchange => exchange.getProducts())).finally(() => {
        ctx.postMessage({
          op: 'fetch-products',
          trackingId: payload.trackingId
        })
      })
      break
    case 'settings.calculateSlippage':
      aggregator.settings.calculateSlippage = payload.data
      break
    case 'settings.preferQuoteCurrencySize':
      aggregator.settings.preferQuoteCurrencySize = payload.data
      break
    case 'settings.aggregationLength':
      if (aggregator.settings.aggregationLength !== payload.data) {
        aggregator.settings.aggregationLength = payload.data
        aggregator.bindTradesEvent()
      }
      break
    case 'hits':
      ctx.postMessage({
        op: 'hits',
        trackingId: payload.trackingId,
        data: exchanges.reduce((hits, exchanges) => hits + exchanges.count, 0)
      })
      break
    case 'unload':
      console.log(`[worker] unloading port`)
      break
  }
})

export default null
