import Exchange from '../exchange'

export default class BITSTAMP extends Exchange {
  id = 'BITSTAMP'
  protected endpoints = {
    PRODUCTS: 'https://www.bitstamp.net/api/v2/trading-pairs-info/'
  }

  async getUrl() {
    return `wss://ws.bitstamp.net/`
  }

  formatProducts(data) {
    return data.map(a => a.url_symbol)
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
        event: 'bts:subscribe',
        data: {
          channel: 'live_trades_' + pair
        }
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
        event: 'bts:unsubscribe',
        data: {
          channel: 'live_trades_' + pair
        }
      })
    )

    return true
  }

  onMessage(event, api) {
    const json = JSON.parse(event.data)

    if (!json || !json.data || !json.data.amount) {
      return
    }

    const trade = json.data

    return this.emitTrades(api.id, [
      {
        exchange: this.id,
        pair: json.channel.split('_').pop(),
        timestamp: +new Date(trade.microtimestamp / 1000),
        price: trade.price,
        size: trade.amount,
        side: trade.type === 0 ? 'buy' : 'sell'
      }
    ])
  }
}
