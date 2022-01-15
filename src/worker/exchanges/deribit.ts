import { Trade } from '@/types/test'
import Exchange from '../exchange'

export default class extends Exchange {
  id = 'DERIBIT'
  protected endpoints = { PRODUCTS: 'https://www.deribit.com/api/v1/public/getinstruments' }

  getUrl() {
    return `wss://www.deribit.com/ws/api/v2`
  }

  formatProducts(data) {
    return data.result.map(product => product.instrumentName)
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
        method: 'public/subscribe',
        params: {
          channels: ['trades.' + pair + '.100ms']
        }
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
        method: 'public/unsubscribe',
        params: {
          channels: ['trades.' + pair + '.raw']
        }
      })
    )

    return true
  }

  onMessage(event, api) {
    const json = JSON.parse(event.data)

    if (!json || !json.params || !json.params.data || !json.params.data.length) {
      return
    }

    const trades = []
    const liquidations = []

    for (let i = 0; i < json.params.data.length; i++) {
      const trade = json.params.data[i]

      const output: Trade = {
        exchange: this.id,
        pair: trade.instrument_name,
        timestamp: +trade.timestamp,
        price: +trade.price,
        size: trade.amount / trade.price,
        side: trade.direction
      }

      if (trade.liquidation) {
        output.liquidation = true

        liquidations.push(output)
      } else {
        trades.push(output)
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
    this.startKeepAlive(api, { method: 'public/ping' }, 45000)
  }

  onApiRemoved(api) {
    this.stopKeepAlive(api)
  }
}
