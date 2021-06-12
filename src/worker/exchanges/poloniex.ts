import Exchange from '../exchange'

export default class extends Exchange {
  id = 'POLONIEX'

  protected endpoints = {
    PRODUCTS: 'https://www.poloniex.com/public?command=returnTicker'
  }

  private channels: { [id: string]: string } = {}

  getUrl() {
    return 'wss://api2.poloniex.com/'
  }

  formatProducts(data) {
    return Object.keys(data)
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
        command: 'subscribe',
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
        command: 'unsubscribe',
        channel: pair
      })
    )

    return true
  }

  onMessage(event, api) {
    const json = JSON.parse(event.data)

    if (!json || json.length !== 3) {
      return
    }

    if (json[2] && json[2].length) {
      if (json[2][0][0] === 'i') {
        this.channels[json[0]] = json[2][0][1].currencyPair
      } else {
        return this.emitTrades(
          api.id,
          json[2]
            .filter(result => result[0] === 't')
            .map(trade => ({
              exchange: this.id,
              pair: this.channels[json[0]],
              timestamp: +new Date(trade[5] * 1000),
              price: +trade[3],
              size: +trade[4],
              side: trade[2] ? 'buy' : 'sell'
            }))
        )
      }
    }
  }
}
