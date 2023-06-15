import Exchange from '../exchange'

export default class extends Exchange {
  id = 'CRYPTOCOM'
  protected endpoints = {
    PRODUCTS: 'https://api.crypto.com/exchange/v1/public/get-instruments'
  }

  async getUrl() {
    return `wss://stream.crypto.com/v2/market`
  }

  formatProducts(response) {
    return response.result.data.map(s => s.symbol)
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

    const params = {
      channels: [`trade.${pair}`]
    }

    api.send(
      JSON.stringify({
        method: 'subscribe',
        params,
        id: Date.now()
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

    const params = {
      channels: [`trade.${pair}`]
    }

    api.send(
      JSON.stringify({
        method: 'unsubscribe',
        params,
        id: Date.now()
      })
    )

    return true
  }

  onMessage(event, api) {
    const json = JSON.parse(event.data)
    if (json.result) {
      return this.emitTrades(
        api.id,
        json.result.data.map(t => this.formatResponse(t))
      )
    }
  }

  formatResponse(t) {
    return {
      exchange: this.id,
      pair: t.i,
      timestamp: +new Date(t.t),
      price: +t.p,
      size: +t.q,
      side: t.s.toLowerCase()
    }
  }
}
