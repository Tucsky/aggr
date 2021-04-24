import Exchange from '../exchange'

export default class extends Exchange {
  id = 'BINANCE'
  private lastSubscriptionId = 0
  private subscriptions = {}
  protected endpoints = { PRODUCTS: 'https://api.binance.com/api/v3/exchangeInfo' }

  getUrl() {
    return `wss://stream.binance.com:9443/ws`
  }

  formatProducts(data) {
    return data.symbols.filter(product => product.status === 'TRADING').map(product => product.symbol.toLowerCase())
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

    this.subscriptions[pair] = ++this.lastSubscriptionId

    const params = [pair + '@trade']

    api.send(
      JSON.stringify({
        method: 'SUBSCRIBE',
        params,
        id: this.subscriptions[pair]
      })
    )

    // BINANCE: WebSocket connections have a limit of 5 incoming messages per second.
    return new Promise(resolve => setTimeout(resolve, 250))
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

    const params = [pair + '@trade']

    api.send(
      JSON.stringify({
        method: 'UNSUBSCRIBE',
        params,
        id: this.subscriptions[pair]
      })
    )

    delete this.subscriptions[pair]

    // BINANCE: WebSocket connections have a limit of 5 incoming messages per second.
    return new Promise(resolve => setTimeout(resolve, 250))
  }

  onMessage(event, api) {
    const json = JSON.parse(event.data)

    if (json.E) {
      return this.emitTrades(api._id, [
        {
          exchange: this.id,
          pair: json.s.toLowerCase(),
          timestamp: json.E,
          price: +json.p,
          size: +json.q,
          side: json.m ? 'sell' : 'buy'
        }
      ])
    }
  }
}
