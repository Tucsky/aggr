import Exchange from '../exchange'
const INTX_PAIR_REGEX = /-INTX$/

export default class COINBASE extends Exchange {
  id = 'COINBASE'

  protected endpoints = {
    PRODUCTS: [
      'https://api.pro.coinbase.com/products',
      'https://api.coinbase.com/api/v3/brokerage/market/products?product_type=FUTURE&contract_expiry_type=PERPETUAL'
    ]
  }

  async getUrl(pair) {
    if (INTX_PAIR_REGEX.test(pair)) {
      return 'wss://advanced-trade-ws.coinbase.com'
    }

    return 'wss://ws-feed.exchange.coinbase.com'
  }

  formatProducts(response) {
    const products = []

    const [spotResponse, perpResponse] = response

    if (spotResponse && spotResponse.length) {
      for (const product of spotResponse) {
        if (product.status !== 'online') {
          continue
        }

        products.push(product.id)
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

    const isIntx = INTX_PAIR_REGEX.test(pair)

    api.send(
      JSON.stringify({
        type: 'subscribe',
        ...(isIntx
          ? {
              channel: 'market_trades',
              product_ids: [pair]
            }
          : {
              channels: [{ name: 'matches', product_ids: [pair] }]
            })
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

    const isIntx = INTX_PAIR_REGEX.test(pair)

    api.send(
      JSON.stringify({
        type: 'unsubscribe',
        ...(isIntx
          ? {
              channel: 'market_trades',
              product_ids: [pair]
            }
          : {
              channels: [{ name: 'matches', product_ids: [pair] }]
            })
      })
    )

    return true
  }

  onMessage(event, api) {
    const json = JSON.parse(event.data)

    if (json) {
      if (json.type === 'match') {
        return this.emitTrades(api.id, [
          this.formatTrade(json, json.product_id)
        ])
      } else if (json.channel === 'market_trades') {
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
  }

  formatTrade(trade, pair) {
    return {
      exchange: this.id,
      pair: pair,
      timestamp: +new Date(trade.time),
      price: +trade.price,
      size: +trade.size,
      side: trade.side === 'buy' || trade.side === 'BUY' ? 'sell' : 'buy'
    }
  }
}
