import {
  AggregatedTrade,
  Connection,
  Trade,
  Volumes
} from '@/types/types'
import { exchanges, getExchangeById } from './exchanges'
import { getHms, parseMarket } from './helpers/utils'
import settings from './settings'

class Aggregator {
  ctx: Worker
  connections: { [name: string]: Connection } = {}

  activeBuckets: string[] = []
  buckets: { [id: string]: Volumes } = {}
  connectionsCount = 0
  connectionChange = 0

  private tickerDelay = 10
  private baseAggregationTimeout = 50
  private onGoingAggregations: { [identifier: string]: AggregatedTrade } = {}
  private aggregationTimeouts: { [identifier: string]: number } = {}
  private pendingTrades: Trade[] = []
  private marketsStats: {
    [marketId: string]: {
      initialPrice?: number
      decimals?: number
      price: number
      volume?: number
      volumeDelta?: number
    }
  } = {}
  private _connectionChangeNoticeTimeout: number

  constructor(worker: Worker) {
    this.bindExchanges()
    this.startPriceInterval()
    this.ctx = worker
    this.ctx.postMessage({
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
      exchange.off('liquidations')

      if (settings.aggregationLength > 0) {
        exchange.on('trades', this.aggregateTrades.bind(this))
        exchange.on('liquidations', this.aggregateLiquidations.bind(this))
      } else {
        exchange.on('trades', this.emitTrades.bind(this))
        exchange.on('liquidations', this.emitLiquidations.bind(this))
      }
    }

    if (settings.aggregationLength > 0) {
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
      console.debug(
        '[worker] previous buckets :',
        { ...this.buckets },
        this.activeBuckets
      )
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
          console.warn(
            'attempted to activate bucket on inexistant connection',
            market
          )
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
      if (
        this.connections[market].bucket &&
        bucketEnabledMarkets.indexOf(market) === -1
      ) {
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
      console.log(
        '[worker] finished updating buckets (active buckets: ',
        activeBuckets,
        ')'
      )
    }

    if (activeBuckets.length && !this.activeBuckets.length) {
      this.startStatsInterval()
    } else if (
      this.activeBuckets.length &&
      !activeBuckets.length &&
      this['_statsInterval']
    ) {
      this.clearInterval('stats')
      this['_statsInterval'] = null
      console.debug(`[worker] stopped statsInterval timer`)
    }

    this.activeBuckets = activeBuckets
    settings.buckets = bucketsDefinition
  }

  emitTrades(trades: Trade[]) {
    for (let i = 0; i < trades.length; i++) {
      const trade = trades[i]
      const marketKey = trade.exchange + ':' + trade.pair

      if (!this.connections[marketKey]) {
        continue
      }

      if (settings.calculateSlippage) {
        trade.originalPrice = this.marketsStats[marketKey].price || trade.price
      }

      trade.count = trade.count || 1

      this.processTrade(trade)
    }

    this.ctx.postMessage({
      op: 'trades',
      data: trades
    })
  }

  aggregateTrades(trades: Trade[]) {
    const now = Date.now()

    for (let i = 0; i < trades.length; i++) {
      const trade = trades[i] as unknown as AggregatedTrade
      const marketKey = trade.exchange + ':' + trade.pair

      if (!this.connections[marketKey]) {
        continue
      }

      if (this.onGoingAggregations[marketKey]) {
        const aggTrade = this.onGoingAggregations[marketKey]

        if (
          aggTrade.timestamp + settings.aggregationLength > trade.timestamp &&
          aggTrade.side === trade.side
        ) {
          aggTrade.size += trade.size
          aggTrade.price = trade.price
          aggTrade.count += trade.count || 1
          continue
        } else {
          this.pendingTrades.push(this.processTrade(aggTrade))
        }
      }

      trade.originalPrice = this.marketsStats[marketKey].price || trade.price

      trade.count = trade.count || 1
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

    this.ctx.postMessage({
      op: 'trades',
      data: trades
    })
  }

  aggregateLiquidations(trades: Trade[]) {
    const now = Date.now()

    for (let i = 0; i < trades.length; i++) {
      const trade = trades[i] as unknown as AggregatedTrade
      const marketKey = trade.exchange + ':' + trade.pair
      const tradeKey = 'liq_' + marketKey

      if (!this.connections[marketKey]) {
        continue
      }

      if (this.onGoingAggregations[tradeKey]) {
        const aggTrade = this.onGoingAggregations[tradeKey]

        if (
          aggTrade.timestamp + settings.aggregationLength > trade.timestamp &&
          aggTrade.side === trade.side
        ) {
          aggTrade.size += trade.size
          aggTrade.count++
          continue
        } else {
          this.pendingTrades.push(this.processLiquidation(aggTrade))
        }
      }

      trade.count = 1
      this.aggregationTimeouts[tradeKey] = now + this.baseAggregationTimeout
      this.onGoingAggregations[tradeKey] = trade
    }
  }

  processTrade(trade: Trade): Trade {
    const marketKey = trade.exchange + ':' + trade.pair

    if (settings.calculateSlippage) {
      if (settings.calculateSlippage === 'price') {
        trade.slippage =
          Math.round(
            (trade.price - trade.originalPrice + Number.EPSILON) * 10
          ) / 10
        if (Math.abs(trade.slippage) / trade.price < 0.00025) {
          trade.slippage = null
        }
      } else if (settings.calculateSlippage === 'bps') {
        if (trade.side === 'buy') {
          trade.slippage = Math.floor(
            ((trade.price - trade.originalPrice) / trade.originalPrice) * 10000
          )
        } else {
          trade.slippage = Math.floor(
            ((trade.originalPrice - trade.price) / trade.price) * 10000
          )
        }
      }
    }

    trade.amount =
      (settings.preferQuoteCurrencySize ? trade.price : 1) * trade.size

    this.marketsStats[marketKey].volume += trade.amount
    this.marketsStats[marketKey].volumeDelta +=
      trade.amount * (trade.side === 'buy' ? 1 : -1)

    this.marketsStats[marketKey].price = trade.price

    if (this.marketsStats[marketKey].initialPrice === null) {
      this.emitInitialPrice(marketKey, trade.price)
    }

    if (settings.aggregationLength > 0) {
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

    trade.amount =
      (settings.preferQuoteCurrencySize ? trade.price : 1) * trade.size

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

    this.ctx.postMessage({
      op: 'price',
      data: {
        market: marketKey,
        price: price
      }
    })
  }

  emitPendingTrades() {
    if (settings.aggregationLength > 0) {
      this.timeoutExpiredAggregations()
    }

    if (this.pendingTrades.length) {
      this.ctx.postMessage({ op: 'trades', data: this.pendingTrades })

      this.pendingTrades.splice(0, this.pendingTrades.length)
    }
  }

  emitStats() {
    const timestamp = Date.now()

    for (const bucketId in settings.buckets) {
      for (const market of settings.buckets[bucketId]) {
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

      this.ctx.postMessage({
        op: 'bucket-' + bucketId,
        data: this.buckets[bucketId]
      })

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
    if (this.connectionsCount) {
      this.ctx.postMessage({ op: 'prices', data: this.marketsStats })
    }

    this['_priceInterval'] = self.setTimeout(
      () => this.emitPrices(),
      this.tickerDelay
    )
  }

  onSubscribed(exchangeId, pair, url) {
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

    for (const bucketId in settings.buckets) {
      if (settings.buckets[bucketId].indexOf(marketKey) !== -1) {
        console.debug(`[worker] create bucket for new connection ${marketKey}`)
        this.connections[marketKey].bucket = this.createBucket()
        break
      }
    }

    this.ctx.postMessage({
      op: 'connection',
      data: {
        pair,
        url,
        exchangeId
      }
    })

    this.noticeConnectionChange(1)

    this.refreshTickerDelay()
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

      this.ctx.postMessage({
        op: 'disconnection',
        data: {
          pair,
          exchangeId
        }
      })

      this.noticeConnectionChange(-1)

      this.refreshTickerDelay()
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
        this.ctx.postMessage({
          op: 'notice',
          data: {
            id: 'connections',
            type: 'success',
            title:
              this.connectionsCount +
              ' connections (' +
              (this.connectionChange > 0 ? '+' : '') +
              this.connectionChange +
              ')'
          }
        })
      }

      this.connectionChange = 0
    }, 3000) as unknown as number
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
    bucket.cbuy =
      bucket.csell =
      bucket.vbuy =
      bucket.vsell =
      bucket.lbuy =
      bucket.lsell =
        0
  }

  onError(exchangeId, event) {
    let message: string

    if (typeof event === 'string') {
      message = event
    } else if (event.message) {
      message = event.message
    }

    if (message) {
      this.ctx.postMessage({
        op: 'notice',
        data: {
          id: exchangeId + '-error',
          type: 'error',
          title: `${exchangeId} disconnected unexpectedly (${message})`
        }
      })
    }

    const api = event && event.target

    this.ctx.postMessage({
      op: 'error',
      data: {
        exchangeId,
        wasOpened: api ? api._wasOpened : null,
        originalUrl: api ? api._originalUrl : null,
        wasErrored: api ? api._wasErrored : null,
        url: api ? api.url : null
      }
    })
  }

  /**
   * Connect to a set of markets
   * @param {string[]} markets
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

        const estimatedTimeToConnectThemAll =
          exchange.getEstimatedTimeToConnect(
            marketsByExchange[exchangeId].length
          )

        if (estimatedTimeToConnectThemAll > 1000 * 20) {
          this.ctx.postMessage({
            op: 'notice',
            data: {
              id: exchangeId + '-connection-delay',
              type: 'warning',
              timeout: estimatedTimeToConnectThemAll,
              title: `Connecting to ${
                marketsByExchange[exchangeId].length
              } markets on ${exchangeId}\nThis will take about ${getHms(
                estimatedTimeToConnectThemAll,
                undefined,
                ' and '
              )}`
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
      this.ctx.postMessage({
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
      this.ctx.postMessage({
        op: 'connect',
        trackingId
      })
    }
  }

  startPriceInterval() {
    if (this['_priceInterval']) {
      return
    }
    this.emitPrices()
  }

  startAggrInterval() {
    if (this['_aggrInterval']) {
      return
    }
    this['_aggrInterval'] = self.setInterval(
      this.emitPendingTrades.bind(this),
      50
    )
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

  async fetchExchangeProducts(
    { exchangeId, forceFetch }: { exchangeId: string; forceFetch?: boolean },
    trackingId
  ) {
    const productsData = await getExchangeById(exchangeId).getProducts(
      forceFetch
    )

    this.ctx.postMessage({
      op: 'fetchExchangeProducts',
      data: productsData,
      trackingId: trackingId
    })
  }

  formatExchangeProducts({ exchangeId, response }, trackingId: string) {
    let productsData = null

    try {
      productsData = getExchangeById(exchangeId).formatProducts(response)
    } catch (error) {
      console.error(error.message)

      this.ctx.postMessage({
        op: 'notice',
        data: {
          id: exchangeId + '-products',
          type: 'error',
          title: `Failed to format ${exchangeId}'s products`
        }
      })
    }

    this.ctx.postMessage({
      op: 'formatExchangeProducts',
      data: productsData,
      trackingId: trackingId
    })
  }

  configureAggregator({ key, value }) {
    if (typeof settings[key] === 'undefined' || settings[key] === value) {
      return
    }

    settings[key] = value

    if (key === 'aggregationLength') {
      this.baseAggregationTimeout = value
      // update trades event handler (if 0 mean simple trade emit else group inc trades)
      this.bindTradesEvent()
    }
  }

  getHits(data, trackingId: string) {
    this.ctx.postMessage({
      op: 'getHits',
      trackingId: trackingId,
      data: exchanges.reduce((hits, exchanges) => hits + exchanges.count, 0)
    })
  }

  refreshTickerDelay() {
    const count = Object.keys(this.connections).length

    this.tickerDelay = Math.log(Math.exp(count / 20 + 1) * 200) * 100
    return this.tickerDelay
  }
}

// addEventListener('message', (event: any) => {
//   const payload = event.data as AggregatorPayload

//   if (typeof aggregator[payload.op] === 'function') {
//     aggregator[payload.op](payload.data, payload.trackingId)
//   }
// })

export default Aggregator
