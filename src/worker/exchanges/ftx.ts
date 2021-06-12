import { Trade } from '@/types/test'
import Exchange from '../exchange'

export default class extends Exchange {
  id = 'FTX'
  protected endpoints = { PRODUCTS: 'https://ftx.com/api/markets' }

  getUrl() {
    return `wss://ftx.com/ws/`
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
        channel: 'trades',
        market: pair
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
        market: pair
      })
    )

    return true
  }

  onMessage(event, api) {
    const json = JSON.parse(event.data)

    if (!json || !json.data || !json.data.length) {
      return
    }

    return this.emitTrades(
      api.id,
      json.data.map(trade => {
        const output: Trade = {
          exchange: this.id,
          pair: json.market,
          timestamp: +new Date(trade.time),
          price: +trade.price,
          size: trade.size,
          side: trade.side
        }

        if (trade.liquidation) {
          output.liquidation = true
        }

        return output
      })
    )
  }

  onApiCreated(api) {
    this.startKeepAlive(api, { op: 'ping' }, 15000)
  }

  onApiRemoved(api) {
    this.stopKeepAlive(api)
  }
}
