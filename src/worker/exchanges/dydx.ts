import { Trade } from '@/types/test'
import Exchange from '../exchange'

export default class extends Exchange {
  id = 'DYDX'

  pendingHistoricalTrades: Trade[]

  protected endpoints = { PRODUCTS: 'https://api.dydx.exchange/v3/markets' }

  getUrl() {
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

  formatTrade(trade, pair) {
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
        if (!this.pendingHistoricalTrades) {
          this.pendingHistoricalTrades = []
        }

        Array.prototype.push.apply(
          this.pendingHistoricalTrades,
          json.contents.trades.map(trade => this.formatTrade(trade, json.id))
        )

        return
      }

      if (this.pendingHistoricalTrades) {
        this.emitPendingHistoricalTrades()
      }

      return this.emitTrades(
        api.id,
        json.contents.trades.map(trade => this.formatTrade(trade, json.id))
      )
    }
  }

  emitPendingHistoricalTrades() {
    this.emitTrades(
      null,
      this.pendingHistoricalTrades.sort((a, b) => a.timestamp - b.timestamp)
    )

    this.pendingHistoricalTrades = null
  }
}
