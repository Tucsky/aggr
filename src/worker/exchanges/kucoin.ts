import Exchange from '../exchange'

export default class extends Exchange {
  id = 'KUCOIN'

  protected endpoints: { [id: string]: any } = {
    PRODUCTS: 'https://api.kucoin.com/api/v1/symbols'
  }

  getUrl() {
    if (this.endpoints.WS) {
      return this.endpoints.WS
    }

    return fetch(
      process.env.VUE_APP_PROXY_URL +
        'https://api.kucoin.com/api/v1/bullet-public',
      {
        method: 'POST'
      }
    )
      .then(res => res.json())
      .then(data => {
        this.endpoints.WS = 'wss://ws-api.kucoin.com/endpoint'

        if (data.data.instanceServers.length) {
          this.endpoints.WS = data.data.instanceServers[0].endpoint
        }

        this.endpoints.WS += '?token=' + data.data.token

        return this.endpoints.WS
      })
      .catch(err => {
        console.log(err)
      })
  }

  formatProducts(response) {
    return response.data.map(a => a.symbol)
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
        topic: '/market/match:' + pair
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
        topic: '/market/match:' + pair
      })
    )

    return true
  }

  formatTrade(trade) {
    return {
      exchange: this.id,
      pair: trade.symbol,
      timestamp: trade.time / 1000000,
      price: +trade.price,
      size: +trade.size,
      side: trade.side === 'buy' ? 'buy' : 'sell'
    }
  }

  onMessage(event, api) {
    const json = JSON.parse(event.data)

    if (!json || !json.data) {
      return
    }

    return this.emitTrades(api.id, [this.formatTrade(json.data)])
  }

  onApiCreated(api) {
    this.startKeepAlive(api, { type: 'ping' }, 18000)
  }

  onApiRemoved(api) {
    this.stopKeepAlive(api)
  }
}
