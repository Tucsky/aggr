import Exchange from '../exchange'

export default class extends Exchange {
  id = 'BINANCE'
  protected endpoints = {
    PRODUCTS: 'https://api.binance.com/api/v3/exchangeInfo'
  }
  protected maxConnectionsPerApi = 100
  protected delayBetweenMessages = 250
  private lastSubscriptionId = 0
  private subscriptions = {}
  private tickersVolumes: { [pair: string]: number } = {}

  async getUrl() {
    return `wss://stream.binance.com:9443/ws`
  }

  formatProducts(data) {
    return data.symbols
      .filter(product => product.status === 'TRADING')
      .map(product => product.symbol.toLowerCase())
  }

  getChannelPayload(pair: string, name: string) {
    if (name === 'ticker') {
      return [pair + '@ticker_1d']
    } else if (name === 'ticks') {
      return [pair + '@trade']
    }

    return [pair + '@aggTrade']
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

    this.subscriptions[channel] = ++this.lastSubscriptionId

    api.send(
      JSON.stringify({
        method: 'SUBSCRIBE',
        id: this.subscriptions[channel],
        params: this.getChannelPayload(pair, name)
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
        method: 'UNSUBSCRIBE',
        id: this.subscriptions[channel],
        params: this.getChannelPayload(pair, name)
      })
    )

    delete this.subscriptions[channel]

    // BINANCE: WebSocket connections have a limit of 5 incoming messages per second.
    return new Promise<boolean>(resolve => setTimeout(resolve, 250))
  }

  formatTicker(json) {
    const output = {
      exchange: this.id,
      pair: json.s.toLowerCase(),
      timestamp: json.E,
      vol: 0,
      price: +json.c
    }

    if (this.tickersVolumes[json.s]) {
      output.vol = Math.max(0, json.q - this.tickersVolumes[json.s])
    }

    this.tickersVolumes[json.s] = json.q

    return output
  }

  onMessage(api, event) {
    const json = JSON.parse(event.data)

    if (json.e === '1dTicker') {
      this.emit('ticker', this.formatTicker(json))
    } else if (json.e === 'aggTrade') {
      return this.emitTrades(api.id, [
        {
          exchange: this.id,
          pair: json.s.toLowerCase(),
          timestamp: json.T,
          price: +json.p,
          size: +json.q,
          count: json.l - json.f + 1,
          side: json.m ? 'sell' : 'buy'
        }
      ])
    } else if (json.e === 'trade') {
      return this.emitTrades(api.id, [
        {
          exchange: this.id,
          pair: json.s.toLowerCase(),
          timestamp: json.T,
          price: +json.p,
          size: +json.q,
          side: json.m ? 'sell' : 'buy'
        }
      ])
    }
  }
}
