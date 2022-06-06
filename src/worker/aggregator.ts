import { AggregatedTrade, AggregatorPayload, AggregatorSettings, Connection, Trade, Volumes } from '@/types/test'
import { exchanges, getExchangeById } from './exchanges'
import { parseMarket } from './helpers/utils'

const ctx: Worker = self as any

class Aggregator {
  settings: AggregatorSettings = {
    calculateSlippage: null,
    aggregationLength: null,
    preferQuoteCurrencySize: null,
    buckets: {}
  }
  connections: { [name: string]: Connection } = {}

  activeBuckets: string[] = []
  buckets: { [id: string]: Volumes } = {}
  connectionsCount = 0
  connectionChange = 0

  private baseAggregationTimeout = 50
  private onGoingAggregations: { [identifier: string]: AggregatedTrade } = {}
  private aggregationTimeouts: { [identifier: string]: number } = {}
  private pendingTrades: Trade[] = []
  private marketsStats: {
    [marketId: string]: { initialPrice?: number; decimals?: number; price: number; volume?: number; volumeDelta?: number }
  } = {}
  private _connectionChangeNoticeTimeout: number

  constructor() {
    console.info(`new worker instance`)

    this.bindExchanges()
    this.startPriceInterval()

    ctx.postMessage({
      op: 'hello'
    })
  }

  bindExchanges() {
    for (const exchange of exchanges) {
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
        exchange.on('liquidations', this.aggregateLiquidations.bind(this))
      } else {
        exchange.on('trades', this.emitTrades.bind(this))
        exchange.on('liquidations', this.emitLiquidations.bind(this))
      }
    }

    if (this.settings.aggregationLength > 0) {
      this.startAggrInterval()
      console.debug(`[worker] bind trades: aggregation`)
    } else {
      this.clearInterval('aggr')

      // clear pending aggregations
      this.timeoutExpiredAggregations()
      this.emitPendingTrades()

      console.debug(`[worker] bind trades: simple`)
    }
  }

  updateBuckets(bucketsDefinition: { [bucketId: string]: string[] }) {
    const activeBuckets = [] // array of buckets IDs
    const bucketEnabledMarkets = [] // array of markets IDs

    if (bucketsDefinition.length) {
      console.log('[worker] update buckets using :', bucketsDefinition)
      console.debug('[worker] previous buckets :', { ...this.buckets }, this.activeBuckets)
    }

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

    if (activeBuckets.length) {
      console.log('[worker] finished updating buckets (active buckets: ', activeBuckets, ')')
    }

    if (activeBuckets.length && !this.activeBuckets.length) {
      this.startStatsInterval()
    } else if (this.activeBuckets.length && !activeBuckets.length && this['_statsInterval']) {
      this.clearInterval('stats')
      this['_statsInterval'] = null
      console.debug(`[worker] stopped statsInterval timer`)
    }

    this.activeBuckets = activeBuckets
    this.settings.buckets = bucketsDefinition
  }

  emitTrades(trades: Trade[]) {
    for (let i = 0; i < trades.length; i++) {
      const trade = trades[i]
      const marketKey = trade.exchange + ':' + trade.pair

      if (!this.connections[marketKey]) {
        continue
      }

      if (this.settings.calculateSlippage) {
        trade.originalPrice = this.marketsStats[marketKey].price || trade.price
      }

      trade.count = 1

      this.processTrade(trade)
    }

    ctx.postMessage({
      op: 'trades',
      data: trades
    })
  }

  aggregateTrades(trades: Trade[]) {
    const now = Date.now()

    for (let i = 0; i < trades.length; i++) {
      const trade = (trades[i] as unknown) as AggregatedTrade
      const marketKey = trade.exchange + ':' + trade.pair

      if (!this.connections[marketKey]) {
        continue
      }

      if (this.onGoingAggregations[marketKey]) {
        const aggTrade = this.onGoingAggregations[marketKey]

        if (aggTrade.timestamp + this.settings.aggregationLength > trade.timestamp && aggTrade.side === trade.side) {
          aggTrade.size += trade.size
          aggTrade.price = trade.price
          aggTrade.count++
          continue
        } else {
          this.pendingTrades.push(this.processTrade(aggTrade))
        }
      }

      trade.originalPrice = this.marketsStats[marketKey].price || trade.price

      trade.count = 1
      this.aggregationTimeouts[marketKey] = now + this.baseAggregationTimeout
      this.onGoingAggregations[marketKey] = trade
    }
  }

  emitLiquidations(trades: Trade[]) {
    for (let i = 0; i < trades.length; i++) {
      const trade = trades[i]
      const marketKey = trade.exchange + ':' + trade.pair

      if (!this.connections[marketKey]) {
        continue
      }

      this.processLiquidation(trade)
    }

    ctx.postMessage({
      op: 'trades',
      data: trades
    })
  }

  aggregateLiquidations(trades: Trade[]) {
    const now = Date.now()

    for (let i = 0; i < trades.length; i++) {
      const trade = (trades[i] as unknown) as AggregatedTrade
      const marketKey = trade.exchange + ':' + trade.pair
      const tradeKey = 'liq_' + marketKey

      if (!this.connections[marketKey]) {
        continue
      }

      if (this.onGoingAggregations[tradeKey]) {
        const aggTrade = this.onGoingAggregations[tradeKey]

        if (aggTrade.timestamp + this.settings.aggregationLength > trade.timestamp && aggTrade.side === trade.side) {
          aggTrade.size += trade.size
          aggTrade.count++
          continue
        } else {
          this.pendingTrades.push(this.processLiquidation(aggTrade))
        }
      }

      trade.count = 1
      this.aggregationTimeouts[tradeKey] = now + 50
      this.onGoingAggregations[tradeKey] = trade
    }
  }

  processTrade(trade: Trade): Trade {
    const marketKey = trade.exchange + ':' + trade.pair

    if (this.settings.calculateSlippage) {
      if (this.settings.calculateSlippage === 'price') {
        trade.slippage = Math.round((trade.price - trade.originalPrice + Number.EPSILON) * 10) / 10
        if (Math.abs(trade.slippage) / trade.price < 0.00025) {
          trade.slippage = null
        }
      } else if (this.settings.calculateSlippage === 'bps') {
        if (trade.side === 'buy') {
          trade.slippage = Math.floor(((trade.price - trade.originalPrice) / trade.originalPrice) * 10000)
        } else {
          trade.slippage = Math.floor(((trade.originalPrice - trade.price) / trade.price) * 10000)
        }
      }
    }

    trade.amount = (this.settings.preferQuoteCurrencySize ? trade.price : 1) * trade.size

    this.marketsStats[marketKey].volume += trade.amount
    this.marketsStats[marketKey].volumeDelta += trade.amount * (trade.side === 'buy' ? 1 : -1)

    this.marketsStats[marketKey].price = trade.price

    if (this.marketsStats[marketKey].initialPrice === null) {
      this.emitInitialPrice(marketKey, trade.price)
    }

    if (this.settings.aggregationLength > 0) {
      trade.price = Math.max(trade.price, trade.originalPrice)
    }

    if (this.connections[marketKey].bucket) {
      this.connections[marketKey].bucket['c' + trade.side] += trade.count
      this.connections[marketKey].bucket['v' + trade.side] += trade.amount
    }

    return trade
  }

  processLiquidation(trade: Trade): Trade {
    const marketKey = trade.exchange + ':' + trade.pair

    trade.amount = (this.settings.preferQuoteCurrencySize ? trade.price : 1) * trade.size

    if (this.connections[marketKey].bucket) {
      this.connections[marketKey].bucket['l' + trade.side] += trade.amount
    }

    return trade
  }

  timeoutExpiredAggregations() {
    const now = Date.now()

    const tradeKeys = Object.keys(this.onGoingAggregations)

    for (let i = 0; i < tradeKeys.length; i++) {
      const aggTrade = this.onGoingAggregations[tradeKeys[i]]

      if (now > this.aggregationTimeouts[tradeKeys[i]]) {
        if (aggTrade.liquidation) {
          this.pendingTrades.push(this.processLiquidation(aggTrade))
        } else {
          this.pendingTrades.push(this.processTrade(aggTrade))
        }

        delete this.onGoingAggregations[tradeKeys[i]]
      }
    }
  }

  emitInitialPrice(marketKey: string, price: number) {
    this.marketsStats[marketKey].initialPrice = price

    ctx.postMessage({
      op: 'price',
      data: {
        market: marketKey,
        price: price
      }
    })
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
    const timestamp = Date.now()

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

    ctx.postMessage({ op: 'prices', data: this.marketsStats })
  }

  onSubscribed(exchangeId, pair) {
    const marketKey = exchangeId + ':' + pair

    if (this.connections[marketKey]) {
      return
    }

    this.connections[marketKey] = {
      exchange: exchangeId,
      pair: pair,
      hit: 0,
      timestamp: null
    }

    this.marketsStats[marketKey] = {
      volume: 0,
      volumeDelta: 0,
      initialPrice: null,
      price: null
    }

    this.connectionsCount = Object.keys(this.connections).length

    for (const bucketId in this.settings.buckets) {
      if (this.settings.buckets[bucketId].indexOf(marketKey) !== -1) {
        console.debug(`[worker] create bucket for new connection ${marketKey}`)
        this.connections[marketKey].bucket = this.createBucket()
        break
      }
    }

    ctx.postMessage({
      op: 'connection',
      data: {
        pair,
        exchangeId
      }
    })

    this.noticeConnectionChange(1)
  }

  onUnsubscribed(exchangeId, pair) {
    const identifier = exchangeId + ':' + pair

    if (this.onGoingAggregations[identifier]) {
      delete this.onGoingAggregations[identifier]
    }

    if (this.connections[identifier]) {
      delete this.connections[identifier]
      delete this.marketsStats[identifier]

      this.connectionsCount = Object.keys(this.connections).length

      ctx.postMessage({
        op: 'disconnection',
        data: {
          pair,
          exchangeId
        }
      })

      this.noticeConnectionChange(-1)
    }
  }

  noticeConnectionChange(change) {
    this.connectionChange += change

    if (this._connectionChangeNoticeTimeout) {
      clearTimeout(this._connectionChangeNoticeTimeout)
    }

    this._connectionChangeNoticeTimeout = setTimeout(() => {
      this._connectionChangeNoticeTimeout = null

      if (this.connectionChange) {
        ctx.postMessage({
          op: 'notice',
          data: {
            id: 'connections',
            type: 'success',
            title: this.connectionsCount + ' connections (' + (this.connectionChange > 0 ? '+' : '') + this.connectionChange + ')'
          }
        })
      }

      this.connectionChange = 0
    }, 3000)
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
  async connect(markets: string[], trackingId?: string) {
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
        if (exchange.requiresProducts) {
          // shouldn't happen, products are ensured on the client before we get to this point
          await exchange.getProducts()
        }

        const estimatedTimeToConnectThemAll = exchange.getEstimatedTimeToConnect(marketsByExchange[exchangeId].length)

        if (estimatedTimeToConnectThemAll > 1000 * 20) {
          ctx.postMessage({
            op: 'notice',
            data: {
              id: exchangeId + '-connection-delay',
              type: 'warning',
              timeout: estimatedTimeToConnectThemAll,
              title: `Connecting to ${marketsByExchange[exchangeId].length} markets on ${exchangeId}\nThis could take some time (about ${Math.round(
                estimatedTimeToConnectThemAll / 1000
              )}s)`
            }
          })
        }

        promises.push(
          (async () => {
            for (const market of marketsByExchange[exchangeId]) {
              try {
                await exchange.link(market)
              } catch (error) {
                console.error(error)
              }
            }
          })()
        )
      } else {
        console.error(`[worker.connect] unknown exchange ${exchangeId}`)
      }
    }

    await Promise.all(promises)

    if (trackingId) {
      ctx.postMessage({
        op: 'connect',
        trackingId
      })
    }
  }

  /**
   * Trigger unsubscribe to pairs on all activated exchanges
   * @param {string[]} pairs
   * @returns {Promise<void>} promises of disconnection
   * @memberof Server
   */
  async disconnect(markets: string[], trackingId?: string) {
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

    await Promise.all(promises)

    if (trackingId) {
      ctx.postMessage({
        op: 'connect',
        trackingId
      })
    }
  }

  startPriceInterval() {
    if (this['_priceInterval']) {
      return
    }
    this['_priceInterval'] = self.setInterval(this.emitPrices.bind(this), 1000)
  }

  startAggrInterval() {
    if (this['_aggrInterval']) {
      return
    }
    this['_aggrInterval'] = self.setInterval(this.emitPendingTrades.bind(this), 50)
  }

  startStatsInterval() {
    if (this['_statsInterval']) {
      return
    }
    this['_statsInterval'] = self.setInterval(this.emitStats.bind(this), 500)
  }

  clearInterval(name: string) {
    if (this['_' + name + 'Interval']) {
      clearInterval(this['_' + name + 'Interval'])
      this['_' + name + 'Interval'] = null
    }
  }

  async fetchExchangeProducts({ exchangeId, forceFetch }: { exchangeId: string; forceFetch?: boolean }, trackingId) {
    await getExchangeById(exchangeId).getProducts(forceFetch)

    ctx.postMessage({
      op: 'fetchExchangeProducts',
      trackingId: trackingId
    })
  }

  formatExchangeProducts({ exchangeId, response }, trackingId: string) {
    let productsData = null

    try {
      productsData = getExchangeById(exchangeId).formatProducts(response)
    } catch (error) {
      console.error(error.message)

      ctx.postMessage({
        op: 'notice',
        data: {
          id: exchangeId + '-products',
          type: 'error',
          title: `Failed to format ${exchangeId}'s products`
        }
      })
    }

    ctx.postMessage({
      op: 'formatExchangeProducts',
      data: productsData,
      trackingId: trackingId
    })
  }

  configureAggregator({ key, value }) {
    if (this.settings[key] === value) {
      return
    }

    this.settings[key] = value

    if (key === 'aggregationLength') {
      this.baseAggregationTimeout = Math.max(50, value)
      // update trades event handler (if 0 mean simple trade emit else group inc trades)
      this.bindTradesEvent()
    }
  }

  getHits(data, trackingId: string) {
    ctx.postMessage({
      op: 'getHits',
      trackingId: trackingId,
      data: exchanges.reduce((hits, exchanges) => hits + exchanges.count, 0)
    })
  }
}

const aggregator = new Aggregator()

self.addEventListener('message', (event: any) => {
  const payload = event.data as AggregatorPayload

  if (typeof aggregator[payload.op] === 'function') {
    aggregator[payload.op](payload.data, payload.trackingId)
  }
})

export default null
