import Exchange from '../exchange'

export default class extends Exchange {
  id = 'POLONIEX'

  protected endpoints = {
    PRODUCTS: 'https://api.poloniex.com/markets'
  }

  async getUrl() {
    return 'wss://ws.poloniex.com/ws/public'
  }

  formatProducts(data) {
    return data.map(product => product.symbol)
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
        event: 'subscribe',
        channel: ['trades'],
        symbols: [pair]
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
        event: 'unsubscribe',
        channel: ['trades'],
        symbols: [pair]
      })
    )

    return true
  }

  formatTrade(trade) {
    return {
      exchange: this.id,
      pair: trade.symbol,
      timestamp: trade.createTime,
      price: +trade.price,
      size: trade.amount / trade.price,
      side: trade.takerSide
    }
  }

  onMessage(event, api) {
    const json = JSON.parse(event.data)

    if (!json || !json.data) {
      return
    }

    return this.emitTrades(
      api.id,
      json.data.map(trade => this.formatTrade(trade))
    )
  }
}
