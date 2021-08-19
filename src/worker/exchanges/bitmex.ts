import Exchange from '../exchange'

export default class extends Exchange {
  id = 'BITMEX'
  private currencies: { [pair: string]: string }
  protected endpoints = { PRODUCTS: 'https://www.bitmex.com/api/v1/instrument/active' }

  getUrl() {
    return `wss://www.bitmex.com/realtime`
  }

  formatProducts(data) {
    const products = []
    const currencies = {}

    for (const product of data) {
      currencies[product.symbol] = product.quoteCurrency
      products.push(product.symbol)
    }

    return {
      products,
      currencies
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
        op: 'subscribe',
        args: ['trade:' + pair, 'liquidation:' + pair]
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
        op: 'subscribe',
        args: ['trade:' + pair, 'liquidation:' + pair]
      })
    )

    return true
  }

  onMessage(event, api) {
    const json = JSON.parse(event.data)

    if (json && json.data && json.data.length) {
      if (json.table === 'liquidation' && json.action === 'insert') {
        return this.emitLiquidations(
          api.id,
          json.data.map(trade => ({
            exchange: this.id,
            pair: trade.symbol,
            timestamp: +new Date(),
            price: trade.price,
            size: trade.leavesQty / (this.currencies[trade.symbol] === 'USD' ? trade.price : 1),
            side: trade.side === 'Buy' ? 'buy' : 'sell',
            liquidation: true
          }))
        )
      } else if (json.table === 'trade' && json.action === 'insert') {
        return this.emitTrades(
          api.id,
          json.data.map(trade => ({
            exchange: this.id,
            pair: trade.symbol,
            timestamp: +new Date(trade.timestamp),
            price: trade.price,
            size: trade.homeNotional,
            side: trade.side === 'Buy' ? 'buy' : 'sell'
          }))
        )
      }
    }
  }
}
