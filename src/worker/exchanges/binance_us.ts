import Exchange from '../exchange'
import { sleep } from '../helpers/utils'

export default class extends Exchange {
  id = 'BINANCE_US'
  private lastSubscriptionId = 0
  private subscriptions = {}
  protected endpoints = {
    PRODUCTS: 'https://api.binance.us/api/v3/exchangeInfo'
  }

  async getUrl() {
    return `wss://stream.binance.us:9443/ws`
  }

  formatProducts(data) {
    return data.symbols
      .filter(product => product.status === 'TRADING')
      .map(product => product.symbol.toLowerCase())
  }

  getChannelPayload(pair: string, name: string) {
    if (name === 'ticker') {
      return [pair + '@miniTicker']
    }

    return [pair + '@trade']
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

    this.subscriptions[pair] = ++this.lastSubscriptionId

    api.send(
      JSON.stringify({
        method: 'SUBSCRIBE',
        ...this.getChannelPayload(pair, name)
      })
    )

    // BINANCE: WebSocket connections have a limit of 5 incoming messages per second.
    await sleep(250)

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
        ...this.getChannelPayload(pair, name)
      })
    )

    delete this.subscriptions[pair]

    // BINANCE: WebSocket connections have a limit of 5 incoming messages per second.
    return new Promise<boolean>(resolve => setTimeout(resolve, 250))
  }

  onMessage(api, event) {
    const json = JSON.parse(event.data)

    if (json.E) {
      return this.emitTrades(api.id, [
        {
          exchange: this.id,
          pair: json.s.toLowerCase(),
          timestamp: json.E,
          price: +json.p,
          size: +json.q,
          side: json.m ? 'sell' : 'buy'
        }
      ])
    }
  }
}
