import Exchange from '../exchange'

export default class extends Exchange {
  id = 'COINBASE'

  protected endpoints = { PRODUCTS: 'https://api.pro.coinbase.com/products' }

  async getUrl() {
    return 'wss://ws-feed.pro.coinbase.com/'
  }

  formatProducts(data) {
    return data.map(product => product.id)
  }

  /**
   * Sub
   * @param {WebSocket} api
   * @param {string} channel
   */
  async subscribe(api, channel) {
    if (!(await super.subscribe(api, channel))) {
      return
    }

    const [pair, name] = this.parseChannel(channel)

    api.send(
      JSON.stringify({
        type: 'subscribe',
        channels: [{ name: 'matches', product_ids: [pair] }]
      })
    )

    return true
  }

  /**
   * Unsub
   * @param {WebSocket} api
   * @param {string} channel
   */
  async unsubscribe(api, channel) {
    if (!(await super.unsubscribe(api, channel))) {
      return
    }

    const [pair, name] = this.parseChannel(channel)

    api.send(
      JSON.stringify({
        type: 'unsubscribe',
        channels: [{ name: 'matches', product_ids: [pair] }]
      })
    )

    return true
  }

  onMessage(api, event) {
    const json = JSON.parse(event.data)

    if (json && json.size > 0) {
      return this.emitTrades(api.id, [
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
