import Exchange from '../exchange'

export default class extends Exchange {
  id = 'HITBTC'
  protected endpoints = { PRODUCTS: 'https://api.hitbtc.com/api/2/public/symbol' }

  getUrl() {
    return 'wss://api.hitbtc.com/api/2/ws'
  }

  formatProducts(data) {
    return data.map(product => product.id)
  }

  /**
   * Sub
   * @param {WebSocket} api
   * @param {string} pair
   */
  async subscribe(api, pair): Promise<void> {
    if (!this.canSubscribe(api, pair)) {
      return
    }

    api.send(
      JSON.stringify({
        method: 'subscribeTrades',
        params: {
          symbol: pair
        }
      })
    )
  }

  /**
   * Sub
   * @param {WebSocket} api
   * @param {string} pair
   */
  async unsubscribe(api, pair): Promise<void> {
    if (!this.canUnsubscribe(api, pair)) {
      return
    }

    api.send(
      JSON.stringify({
        method: 'unsubscribeTrades',
        params: {
          symbol: pair
        }
      })
    )
  }

  onMessage(event, api) {
    const json = JSON.parse(event.data)

    if (!json || json.method !== 'updateTrades' || !json.params || !json.params.data || !json.params.data.length) {
      return
    }

    return this.emitTrades(
      api._id,
      json.params.data.map(trade => ({
        exchange: this.id,
        pair: json.params.symbol,
        timestamp: +new Date(trade.timestamp),
        price: +trade.price,
        size: +trade.quantity,
        side: trade.side
      }))
    )
  }
}
