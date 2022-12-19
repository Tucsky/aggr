import Exchange from '../exchange'

export default class extends Exchange {
  id = 'HITBTC'
  protected endpoints = {
    PRODUCTS: 'https://api.hitbtc.com/api/2/public/symbol'
  }

  async getUrl() {
    return 'wss://api.hitbtc.com/api/2/ws'
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
        method: 'subscribeTrades',
        params: {
          symbol: pair
        }
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
        method: 'unsubscribeTrades',
        params: {
          symbol: pair
        }
      })
    )

    return true
  }

  onMessage(api, event) {
    const json = JSON.parse(event.data)

    if (
      !json ||
      json.method !== 'updateTrades' ||
      !json.params ||
      !json.params.data ||
      !json.params.data.length
    ) {
      return
    }

    return this.emitTrades(
      api.id,
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
