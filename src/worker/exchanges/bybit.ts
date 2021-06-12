import Exchange from '../exchange'

export default class extends Exchange {
  id = 'BYBIT'
  protected endpoints = { PRODUCTS: 'https://api.bybit.com/v2/public/symbols' }

  getUrl(pair) {
    return pair.indexOf('USDT') !== -1 ? 'wss://stream.bybit.com/realtime_public' : 'wss://stream.bybit.com/realtime'
  }

  formatProducts(data) {
    return data.result.map(product => product.name)
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
        op: 'subscribe',
        args: ['trade.' + pair]
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
        args: ['trade.' + pair]
      })
    )

    return true
  }

  onMessage(event, api) {
    const json = JSON.parse(event.data)

    if (!json.data || !json.topic || !json.data.length) {
      return
    }

    return this.emitTrades(
      api.id,
      json.data.map(trade => {
        const size = /USDT$/.test(trade.symbol) ? trade.size : trade.size / trade.price

        return {
          exchange: this.id,
          pair: trade.symbol,
          timestamp: +new Date(trade.timestamp),
          price: +trade.price,
          size: size,
          side: trade.side === 'Buy' ? 'buy' : 'sell'
        }
      })
    )
  }

  onApiCreated(api) {
    this.startKeepAlive(api, { op: 'ping' }, 45000)
  }

  onApiRemoved(api) {
    this.stopKeepAlive(api)
  }
}
