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
    if (!super.subscribe.apply(this, [api, pair])) {
      return
    }

    api.send(
      JSON.stringify({
        method: 'public/subscribe',
        params: {
          channels: ['trades.' + pair + '.raw']
        }
      })
    )
  }

  /**
   * Sub
   * @param {WebSocket} api
   * @param {string} pair
   */
  async unsubscribe(api, pair) {
    if (!super.unsubscribe.apply(this, [api, pair])) {
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
  }

  onMessage(event, api) {
    const json = JSON.parse(event.data)

    if (!json || !json.params || !json.params.data || !json.params.data.length) {
      return
    }

    const trades: Trade[] = []
    const liquidations: Trade[] = []

    for (let i = 0; i < json.params.data.length; i++) {
      const trade: Trade = {
        exchange: this.id,
        pair: json.params.data[i].instrument_name,
        timestamp: json.params.data[i].timestamp,
        price: json.params.data[i].price,
        size: json.params.data[i].amount / json.params.data[i].price,
        side: json.params.data[i].direction
      }

      if (trade.liquidation) {
        liquidations.push({ ...trade, liquidation: true })
      }

      trades.push(trade)
    }

    if (liquidations.length) {
      this.emitLiquidations(api._id, liquidations)
    }

    if (trades.length) {
      this.emitTrades(api._id, trades)
    }

    return true
  }

  onApiBinded(api) {
    this.startKeepAlive(api, { method: 'public/ping' }, 45000)
  }

  onApiUnbinded(api) {
    this.stopKeepAlive(api)
  }
}
