import Exchange from '../exchange'

export default class extends Exchange {
  id = 'SERUM'

  protected endpoints = {
    // point this to the serum-vial address
    PRODUCTS: 'http://localhost:8000/v1/markets'
  }

  private channels: { [id: string]: string } = {}

  getUrl() {
    return 'ws://localhost:8000/v1/ws'
  }

  formatProducts(data) {
    return data.map(x => x.name)
  }

  async subscribe(api, pair) {
    if (!(await super.subscribe(api, pair))) {
      return
    }

    api.send(
      JSON.stringify({
        op: 'subscribe',
        channel: 'trades',
        markets: [pair]
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
        op: 'unsubscribe',
        channel: 'trades',
        markets: [pair]
      })
    )

    return true
  }

  onMessage(event, api) {
    const json = JSON.parse(event.data)

    if (!json || json.type === undefined) {
      return
    } else if (json.type === 'trade') {
      return this.emitTrades(api.id, [
        {
          exchange: this.id,
          pair: json.market,
          timestamp: +new Date(Date.parse(json.timestamp)),
          price: +json.price,
          size: +json.size,
          side: json.side
        }
      ])
    } else if (json.type === 'recent_trades') {
      return this.emitTrades(
        api.id,
        json.trades.map(t => ({
          exchange: this.id,
          pair: t.market,
          timestamp: +new Date(Date.parse(t.timestamp)),
          price: +t.price,
          size: +t.size,
          side: t.side
        }))
      )
    }
  }
}
