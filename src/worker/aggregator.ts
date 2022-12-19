import {
  AggregatedTrade,
  AggregatorPayload,
  AggregatorSettings,
  Connection,
  Trade,
  Ticker
} from '@/types/types'
import { exchanges, getExchangeById } from './exchanges'
import { parseMarket } from './helpers/utils'

const ctx: Worker = self as any

class Aggregator {
  settings: AggregatorSettings = {
    calculateSlippage: null,
    aggregationLength: null,
    preferQuoteCurrencySize: null
  }
  connections: { [name: string]: Connection } = {}

  connectionsCount = 0
  connectionChange = 0

  private onGoingAggregations: { [marketKey: string]: AggregatedTrade } = {}
  private pendingTrades: { [marketKey: string]: Trade[] } = {}
  private marketsTickers: {
    [marketId: string]: {
      market: string
      exchange: string
      pair: string
      type?: string
      empty: boolean
      timestamp?: number
      initialPrice: number
      price: number
      vol?: number
      high?: number
      low?: number
      vbuy?: number
      vsell?: number
      lbuy?: number
      lsell?: number
      cbuy?: number
      csell?: number
    }
  } = {}
  private _connectionChangeNoticeTimeout: number

  constructor() {
    this.bindExchanges()
    this.startTickerInterval()
    this.startAggrInterval()

    ctx.postMessage({
      op: 'hello'
    })
  }

  bindExchanges() {
    for (const exchange of exchanges) {
      exchange.on('subscribed', this.onSubscribed.bind(this, exchange.id))
      exchange.on('unsubscribed', this.onUnsubscribed.bind(this, exchange.id))
      exchange.on('error', this.onError.bind(this, exchange.id))
      exchange.on('trades', this.emitTrades.bind(this))
      exchange.on('ticker', this.processTicker.bind(this))
      exchange.on('liquidations', this.emitLiquidations.bind(this))
    }
  }

  processTrade(trade: Trade): Trade {
    trade.count = trade.count || 1

    if (this.settings.calculateSlippage) {
      trade.originalPrice =
        this.marketsTickers[trade.market].price || trade.price

      if (this.settings.calculateSlippage === 'price') {
        trade.slippage =
          Math.round(
            (trade.price - trade.originalPrice + Number.EPSILON) * 10
          ) / 10
        if (Math.abs(trade.slippage) / trade.price < 0.00025) {
          trade.slippage = null
        }
      } else if (this.settings.calculateSlippage === 'bps') {
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
      (this.settings.preferQuoteCurrencySize ? trade.price : 1) * trade.size

    if (this.marketsTickers[trade.market].empty) {
      this.marketsTickers[trade.market].empty = false
      this.marketsTickers[trade.market].timestamp = trade.timestamp

      if (this.marketsTickers[trade.market].initialPrice === null) {
        this.emitInitialPrice(trade.market, trade.price)
      }
    }

    this.marketsTickers[trade.market]['v' + trade.side] += trade.amount
    this.marketsTickers[trade.market]['c' + trade.side] += trade.count
    this.marketsTickers[trade.market].price = trade.price
    this.marketsTickers[trade.market].high = Math.max(
      this.marketsTickers[trade.market].high,
      trade.price
    )
    this.marketsTickers[trade.market].low = Math.min(
      this.marketsTickers[trade.market].low,
      trade.price
    )

    return trade
  }

  processLiquidation(trade: Trade): Trade {
    trade.count = trade.count || 1
    trade.amount =
      (this.settings.preferQuoteCurrencySize ? trade.price : 1) * trade.size

    if (this.marketsTickers[trade.market].empty) {
      this.marketsTickers[trade.market].empty = false
      this.marketsTickers[trade.market].timestamp = trade.timestamp
    }
    this.marketsTickers[trade.market]['l' + trade.side] += trade.amount

    return trade
  }

  processTicker(ticker: Ticker) {
    const marketKey = ticker.exchange + ':' + ticker.pair
    this.marketsTickers[marketKey].vol += ticker.vol
    this.marketsTickers[marketKey].price = ticker.price
    this.marketsTickers[marketKey].empty = false

    if (this.marketsTickers[marketKey].initialPrice === null) {
      this.emitInitialPrice(marketKey, ticker.price)
    }
  }

  emitTrades(trades: Trade[]) {
    for (let i = 0; i < trades.length; i++) {
      trades[i].market = trades[i].exchange + ':' + trades[i].pair

      if (!this.connections[trades[i].market]) {
        continue
      }

      this.pendingTrades[trades[i].market].push(this.processTrade(trades[i]))
    }
  }

  emitLiquidations(trades: Trade[]) {
    for (let i = 0; i < trades.length; i++) {
      trades[i].market = trades[i].exchange + ':' + trades[i].pair

      if (!this.connections[trades[i].market]) {
        continue
      }

      this.pendingTrades[trades[i].market].push(
        this.processLiquidation(trades[i])
      )
    }
  }

  emitInitialPrice(marketKey: string, price: number) {
    this.marketsTickers[marketKey].initialPrice = price

    ctx.postMessage({
      op: 'price',
      data: {
        market: marketKey,
        price: price
      }
    })
  }

  emitPendingTrades() {
    for (const market in this.pendingTrades) {
      if (this.pendingTrades[market].length) {
        ctx.postMessage({
          op: market + '.trades',
          data: this.pendingTrades[market]
        })
        this.pendingTrades[market].splice(0, this.pendingTrades[market].length)
      }
    }
  }

  emitTickers() {
    if (!this.connectionsCount) {
      return
    }

    for (const market in this.marketsTickers) {
      if (this.marketsTickers[market].empty) {
        continue
      }

      ctx.postMessage({
        op: market + '.ticker',
        data: this.marketsTickers[market]
      })

      if (this.marketsTickers[market].type === 'ticker') {
        this.marketsTickers[market].vol = 0
      } else if (this.marketsTickers[market].type === 'trades') {
        this.marketsTickers[market].vbuy = 0
        this.marketsTickers[market].vsell = 0
        this.marketsTickers[market].lbuy = 0
        this.marketsTickers[market].lsell = 0
        this.marketsTickers[market].cbuy = 0
        this.marketsTickers[market].csell = 0
        this.marketsTickers[market].high = this.marketsTickers[market].low =
          this.marketsTickers[market].price
      }

      this.marketsTickers[market].empty = true
    }
  }

  onSubscribed(exchangeId, channel) {
    const [pair, feed] = channel.split('.')
    const marketKey = exchangeId + ':' + pair

    if (!this.connections[marketKey]) {
      this.connections[marketKey] = {
        exchange: exchangeId,
        pair: pair,
        hit: 0,
        timestamp: null,
        feeds: []
      }
    }

    this.connections[marketKey].feeds.push(feed)

    if (!this.marketsTickers[marketKey]) {
      this.marketsTickers[marketKey] = {
        market: marketKey,
        exchange: exchangeId,
        pair: pair,
        initialPrice: null,
        empty: true,
        price: null
      }
    }

    this.marketsTickers[marketKey].type = feed

    if (this.marketsTickers[marketKey].type === 'ticker') {
      this.marketsTickers[marketKey].vol = 0
    } else {
      this.marketsTickers[marketKey].vbuy = 0
      this.marketsTickers[marketKey].vsell = 0
      this.marketsTickers[marketKey].lbuy = 0
      this.marketsTickers[marketKey].lsell = 0
      this.marketsTickers[marketKey].cbuy = 0
      this.marketsTickers[marketKey].csell = 0
      this.marketsTickers[marketKey].high = -Infinity
      this.marketsTickers[marketKey].low = Infinity
    }

    this.pendingTrades[marketKey] = []

    this.connectionsCount = Object.keys(this.connections).length

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
    const marketKey = exchangeId + ':' + pair

    if (this.onGoingAggregations[marketKey]) {
      delete this.onGoingAggregations[marketKey]
    }

    if (this.connections[marketKey]) {
      delete this.connections[marketKey]
      delete this.marketsTickers[marketKey]
      delete this.pendingTrades[marketKey]

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
    }, 3000)
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
   * Trigger subscribe to feed
   * @param {string[]} markets + feed eg ['COINBASE:BTC-USD.ticker', 'BINANCE:btcusdt.trades']
   * @returns {Promise<any>} promises of connections
   */
  async subscribe(markets: string[], trackingId?: string) {
    console.log(`[aggregator] subscribe`, markets)

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
          ctx.postMessage({
            op: 'notice',
            data: {
              id: exchangeId + '-connection-delay',
              type: 'warning',
              timeout: estimatedTimeToConnectThemAll,
              title: `Connecting to ${
                marketsByExchange[exchangeId].length
              } markets on ${exchangeId}\nThis could take some time (about ${Math.round(
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
   * Trigger unsubscribe from feeds
   * @param {string[]} markets + feed eg ['COINBASE:BTC-USD.ticker', 'BINANCE:btcusdt.trades']
   * @returns {Promise<void>} promises of disconnection
   * @memberof Server
   */
  async unsubscribe(markets: string[], trackingId?: string) {
    console.log(`[aggregator] unsubscribe`, markets)

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

  startTickerInterval() {
    if (this['_tickerInterval']) {
      return
    }
    this['_tickerInterval'] = self.setInterval(this.emitTickers.bind(this), 500)
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

  async fetchExchangeProducts(
    { exchangeId, forceFetch }: { exchangeId: string; forceFetch?: boolean },
    trackingId
  ) {
    const productsData = await getExchangeById(exchangeId).getProducts(
      forceFetch
    )

    ctx.postMessage({
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
