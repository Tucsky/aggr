import Exchange from '../exchange'

export default class extends Exchange {
  id = 'COINBASE'

  protected endpoints = { PRODUCTS: 'https://api.pro.coinbase.com/products' }

  getUrl() {
    return 'wss://ws-feed.pro.coinbase.com/'
  }

  formatProducts(data) {
    return data.map(product => product.id)
  }

  /**
   * Sub
   * @param {WebSocket} api
   * @param {string} pair
   */
  async subscribe(api, pair) {
    if (!super.subscribe.apply(this, [api, pair])) {
      return
    }

    api.send(
      JSON.stringify({
        type: 'subscribe',
        channels: [{ name: 'matches', product_ids: [pair] }]
      })
    )
  }

  /**
   * Sub
   * @param {WebSocket} api
   * @param {string} pair
   */
  async unsubscribe(api, pair) {
    if (!super.unsubscribe.apply(this, [api, pair])) {
      return
    }

    api.send(
      JSON.stringify({
        type: 'unsubscribe',
        channels: [{ name: 'matches', product_ids: [pair] }]
      })
    )
  }

  onMessage(event, api) {
    const json = JSON.parse(event.data)

    if (json && json.size > 0) {
      return this.emitTrades(api._id, [
        {
          exchange: this.id,
          pair: json.product_id,
          timestamp: +new Date(json.time),
          price: +json.price,
          size: +json.size,
          side: json.side === 'buy' ? 'sell' : 'buy'
        }
      ])
    }
  }
}
