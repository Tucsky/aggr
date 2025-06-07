import Exchange from '../exchange'

export default class PHEMEX extends Exchange {
  id = 'PHEMEX'
  isInverse = {}
  isV1 = {}
  priceScales = {}
  valueScales = {}
  protected endpoints = {
    PRODUCTS: 'https://api.phemex.com/public/products'
  }

  async getUrl() {
    return 'wss://ws.phemex.com'
  }

  formatProducts(data) {
    const valueScales = {}
    const priceScales = {}
    const isV1 = {}
    const isInverse = {}
    const products = []
    const mergedProducts = data.data.products.concat(data.data.perpProductsV2)
    const currencies = data.data.currencies.reduce((acc, currency) => {
      acc[currency.currency] = currency
      return acc
    }, {})

    for (const product of mergedProducts) {
      if (product.status === 'Delisted') {
        continue
      }

      const isPerpetual =
        product.type === 'Perpetual' || product.type === 'PerpetualV2'

      products.push(product.symbol)
      if (product.priceScale) {
        priceScales[product.symbol] = product.priceScale
      }
      if (isPerpetual && product.settleCurrency !== product.quoteCurrency) {
        isInverse[product.symbol] = true
      }
      if (product.type !== 'PerpetualV2') {
        isV1[product.symbol] = true
      }
      if (product.type === 'Spot') {
        valueScales[product.symbol] =
          currencies[product.quoteCurrency].valueScale
      }
    }
    return {
      valueScales,
      priceScales,
      isInverse,
      isV1,
      products
    }
  }

  /**
   * Sub
   * @param {WebSocket} api
   * @param {string} pair
   */
  async subscribe(api, pair) {
    if (!(await super.subscribe(api, pair))) {
      return
    }

    api.send(
      JSON.stringify({
        id: 1234,
        method: `${this.isV1[pair] ? 'trade' : 'trade_p'}.subscribe`,
        params: [pair]
      })
    )

    return true
  }

  /**
   * Sub
   * @param {WebSocket} api
   * @param {string} pair
   */
  async unsubscribe(api, pair) {
    if (!(await super.unsubscribe(api, pair))) {
      return
    }

    api.send(
      JSON.stringify({
        id: 1234,
        method: `${this.isV1[pair] ? 'trade' : 'trade_p'}.unsubscribe`,
        params: [pair]
      })
    )

    return true
  }

  formatTradeV1(trade, symbol) {
    const [timestamp, side, priceEp, qty] = trade // [1749293708168720600, "Buy", 15190000000, 1300000]

    const price = priceEp / Math.pow(10, this.priceScales[symbol])
    const size =
      (this.valueScales[symbol]
        ? qty / Math.pow(10, this.valueScales[symbol])
        : qty) / (this.isInverse[symbol] ? price : 1)

    return {
      exchange: this.id,
      pair: symbol,
      timestamp: timestamp / 1000000,
      price: price,
      size: size,
      side: side === 'Buy' ? 'buy' : 'sell'
    }
  }

  formatTrade(trade, symbol) {
    const [timestamp, side, price, size] = trade // [1749293662722182400, "Sell", "151.86", "0.01"]

    return {
      exchange: this.id,
      pair: symbol,
      timestamp: timestamp / 1000000,
      price: +price,
      size: +size,
      side: side === 'Buy' ? 'buy' : 'sell'
    }
  }

  onMessage(event, api) {
    const json = JSON.parse(event.data)

    if (json.type === 'incremental') {
      if (json.trades && json.trades.length) {
        return this.emitTrades(
          api.id,
          json.trades.map(trade => this.formatTradeV1(trade, json.symbol))
        )
      } else if (json.trades_p && json.trades_p.length) {
        return this.emitTrades(
          api.id,
          json.trades_p.map(trade => this.formatTrade(trade, json.symbol))
        )
      }
    }
  }

  onApiCreated(api) {
    this.startKeepAlive(
      api,
      { method: 'server.ping', id: 9000, params: [] },
      5000
    )
  }

  onApiRemoved(api) {
    this.stopKeepAlive(api)
  }
}
