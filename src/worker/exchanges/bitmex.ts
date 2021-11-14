import Exchange from '../exchange'

export default class extends Exchange {
  id = 'BITMEX'
  private xbtPrice = 48000
  private types: { [pair: string]: 'quanto' | 'inverse' | 'linear' }
  private multipliers: { [pair: string]: number }
  protected endpoints = { PRODUCTS: 'https://www.bitmex.com/api/v1/instrument/active' }

  getUrl() {
    return `wss://www.bitmex.com/realtime`
  }

  formatProducts(data) {
    const products = []
    const types = {}
    const multipliers = {}

    for (const product of data) {
      types[product.symbol] = product.isInverse ? 'inverse' : product.isQuanto ? 'quanto' : 'linear'
      multipliers[product.symbol] = product.multiplier
      products.push(product.symbol)
    }

    return {
      products,
      types,
      multipliers
    }
  }

  validateProducts(data) {
    if (!data || !data.multipliers || !data.types) {
      return false
    }

    return true
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

  onApiCreated(api) {
    api.send(
      JSON.stringify({
        op: 'subscribe',
        args: ['instrument:XBTUSD']
      })
    )
  }

  onMessage(event, api) {
    const json = JSON.parse(event.data)

    if (json && json.data && json.data.length) {
      if (json.table === 'liquidation' && json.action === 'insert') {
        return this.emitLiquidations(
          api.id,
          json.data.map(trade => {
            let size

            if (this.types[trade.symbol] === 'quanto') {
              size = (this.multipliers[trade.symbol] / 100000000) * trade.leavesQty * this.xbtPrice
            } else if (this.types[trade.symbol] === 'inverse') {
              size = trade.leavesQty / trade.price
            } else if (this.types[trade.symbol] === 'linear') {
              size = 0.000001 * trade.leavesQty * trade.price
            }

            return {
              exchange: this.id,
              pair: trade.symbol,
              timestamp: +new Date(),
              price: trade.price,
              size: size,
              side: trade.side === 'Buy' ? 'buy' : 'sell',
              liquidation: true
            }
          })
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
      } else if (json.table === 'instrument' && json.data[0].lastPrice) {
        this.xbtPrice = json.data[0].lastPrice
      }
    }
  }
}
