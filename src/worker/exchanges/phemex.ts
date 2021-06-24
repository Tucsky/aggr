import Exchange from '../exchange'

export default class extends Exchange {
  id = 'PHEMEX'

  protected endpoints = {
    PRODUCTS: 'https://api.phemex.com/exchange/public/cfg/v2/products'
  }

  private channels: { [id: string]: string } = {}

  getUrl() {
    return 'wss://phemex.com/ws'
  }

  formatProducts(data) {
    console.log(data);
    return data.data.products.map(p => p.symbol);
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
    // console.log(pair);
    api.send(
      JSON.stringify({
        id: 1234,
        method: 'trade.subscribe',
        params: [
          pair
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

    api.send(
      JSON.stringify({
        id: 1234,
        method: 'trade.unsubscribe',
        params: [
          pair
        ]
      })
    )

    return true
  }

  onMessage(event, api) {
    const json = JSON.parse(event.data)
    // Only care about trades
    if (json.trades !== undefined && json.type === 'incremental') {
      const trades = json.trades.map(t => {
        return {
          exchange: this.id,
          pair: json.symbol,
          timestamp: t[0] / 1000000,
          price: +(json.symbol.startsWith( 's' ) ? (t[2] / 100000000) : (t[2] / 10000)),
          size: +(json.symbol.startsWith( 's' ) ? (t[3] / 100000000) : t[3] / (t[2] / 10000)),
          side: t[1] === 'Buy' ? 'buy' : 'sell',
        }
      });
      return this.emitTrades(api.id, trades);
    } else {
      return
    }
  }
  onApiCreated(api) {
    this.startKeepAlive(api, { method: 'server.ping', id: 9000, params: [] }, 5000)
  }

  onApiRemoved(api) {
    this.stopKeepAlive(api)
  }
}
