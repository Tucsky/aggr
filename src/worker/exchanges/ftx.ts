import { Trade } from '@/types/types'
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

    const trades = []
    const liquidations = []

    for (let i = 0; i < json.data.length; i++) {
      const trade: Trade = {
        exchange: this.id,
        pair: json.market,
        timestamp: +new Date(json.data[i].time),
        price: +json.data[i].price,
        size: json.data[i].size,
        side: json.data[i].side
      }

      if (json.data[i].liquidation) {
        trade.liquidation = true

        liquidations.push(trade)
      } else {
        trades.push(trade)
      }
    }

    if (trades.length) {
      this.emitTrades(api.id, trades)
    }

    if (liquidations.length) {
      this.emitLiquidations(api.id, liquidations)
    }

    return true
  }

  onApiCreated(api) {
    this.startKeepAlive(api, { op: 'ping' }, 15000)
  }

  onApiRemoved(api) {
    this.stopKeepAlive(api)
  }
}
