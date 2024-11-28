import Exchange from '../exchange'
const INTX_PAIR_REGEX = /-INTX$/

export default class COINBASE extends Exchange {
  id = 'COINBASE'

  protected endpoints = {
    PRODUCTS: [
      'https://api.coinbase.com/api/v3/brokerage/market/products?product_type=SPOT',
      'https://api.coinbase.com/api/v3/brokerage/market/products?product_type=FUTURE&contract_expiry_type=PERPETUAL'
    ]
  }

  async getUrl() {
    return 'wss://advanced-trade-ws.coinbase.com'
  }

  formatProducts(response) {
    const products = []

    const [spotResponse, perpResponse] = response

    if (spotResponse && spotResponse.products && spotResponse.products.length) {
      for (const product of spotResponse.products) {
        if (product.status !== 'online') {
          continue
        }

        products.push(product.product_id)
      }
    }

    if (perpResponse && perpResponse.products && perpResponse.products.length) {
      for (const product of perpResponse.products) {
        products.push(product.product_id)
      }
    }

    return {
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
        type: 'subscribe',
        channel: 'market_trades',
        product_ids: [pair]
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
        type: 'unsubscribe',
        ...{
          channel: 'market_trades',
          product_ids: [pair]
        }
      })
    )

    return true
  }

  onMessage(event, api) {
    const json = JSON.parse(event.data)

    if (json && json.channel === 'market_trades') {
      return this.emitTrades(
        api.id,
        json.events.reduce((acc, event) => {
          if (event.type === 'update') {
            acc.push(
              ...event.trades.map(trade =>
                this.formatTrade(trade, trade.product_id)
              )
            )
          }

          return acc
        }, [])
      )
    }
  }

  formatTrade(trade, pair) {
    return {
      exchange: this.id,
      pair: pair,
      timestamp: +new Date(trade.time),
      price: +trade.price,
      size: +trade.size,
      side: trade.side === 'BUY' ? 'sell' : 'buy'
    }
  }
}
