import Exchange from '../exchange'

export default class AGGR extends Exchange {
  id = 'AGGR'

  protected endpoints = {}
  products = ['SENTIMENTTV', 'SENTIMENTMEX']

  async getUrl() {
    return `wss://sentiment.aggr.trade`
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
        op: 'SUBSCRIBE',
        channel: pair
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
        op: 'UNSUBSCRIBE',
        channel: pair
      })
    )

    return true
  }

  formatTrade(trade, channel) {
    return {
      exchange: this.id,
      pair: channel,
      timestamp: +trade.timestamp,
      price: +trade.price,
      size: +trade.volume,
      side: trade.side
    }
  }

  onMessage(event, api) {
    const json = JSON.parse(event.data)

    return this.emitTrades(api.id, [this.formatTrade(json.data, json.channel)])
  }
}
