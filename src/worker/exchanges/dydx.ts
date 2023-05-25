import { Trade } from '../../types/types'
import Exchange from '../exchange'

export default class DYDX extends Exchange {
  id = 'DYDX'

  protected endpoints = { PRODUCTS: 'https://api.dydx.exchange/v3/markets' }

  async getUrl() {
    return `wss://api.dydx.exchange/v3/ws`
  }

  formatProducts(data) {
    return Object.keys(data.markets)
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
        type: 'subscribe',
        channel: 'v3_trades',
        id: pair
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
        type: 'unsubscribe',
        channel: 'v3_trades',
        id: pair
      })
    )

    return true
  }

  formatTrade(trade, pair): Trade {
    return {
      exchange: this.id,
      pair: pair,
      timestamp: +new Date(trade.createdAt),
      price: +trade.price,
      size: +trade.size,
      side: trade.side === 'BUY' ? 'buy' : 'sell'
    }
  }

  onMessage(event, api) {
    const json = JSON.parse(event.data)

    if (json.channel === 'v3_trades') {
      if (json.type === 'subscribed') {
        return
      }

      const trades = []
      const liquidations = []

      for (let i = 0; i < json.contents.trades.length; i++) {
        const trade = this.formatTrade(json.contents.trades[i], json.id)

        if (json.contents.trades[i].liquidation) {
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
  }
}
