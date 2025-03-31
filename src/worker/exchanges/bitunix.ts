import Exchange from '../exchange'

export default class BITUNIX extends Exchange {
  id = 'BITUNIX'
  protected maxConnectionsPerApi = 300
  protected delayBetweenMessages = 100
  protected endpoints = {
    PRODUCTS: ['https://fapi.bitunix.com/api/v1/futures/market/trading_pairs']
  }

  async getUrl() {
    return 'wss://fapi.bitunix.com/public/'
  }

  formatProducts(response) {
    const products = []

    for (const product of response.data) {
      products.push(product.symbol)
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

    if (!api.ignoreWelcomeMessage) {
      api.ignoreWelcomeMessage = {}
    }

    api.ignoreWelcomeMessage[pair] = true

    api.send(
      JSON.stringify({
        op: 'subscribe',
        args: [
          {
            symbol: pair,
            ch: 'trade'
          }
        ]
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

    if (typeof api.ignoreWelcomeMessage[pair] !== 'undefined') {
      delete api.ignoreWelcomeMessage[pair]
    }

    api.send(
      JSON.stringify({
        op: 'unsubscribe',
        args: [
          {
            symbol: pair,
            ch: 'trade'
          }
        ]
      })
    )

    return true
  }

  formatTrade(trade, symbol) {
    return {
      exchange: this.id,
      pair: symbol,
      timestamp: +new Date(trade.t),
      price: +trade.p,
      size: +trade.v,
      side: trade.s
    }
  }

  onMessage(event, api) {
    const json = JSON.parse(event.data)
    if (!json || json.ch !== 'trade') {
      return
    }

    if (api.ignoreWelcomeMessage[json.symbol]) {
      delete api.ignoreWelcomeMessage[json.symbol]
      return
    }

    return this.emitTrades(
      api.id,
      json.data.map(trade => this.formatTrade(trade, json.symbol))
    )
  }

  onApiCreated(api) {
    this.startKeepAlive(
      api,
      () => ({
        op: 'ping',
        ping: Math.round(+new Date() / 1000)
      }),
      20000
    )
  }

  onApiRemoved(api) {
    this.stopKeepAlive(api)
  }
}
