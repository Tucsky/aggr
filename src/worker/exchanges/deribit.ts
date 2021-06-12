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
          channels: ['trades.' + pair + '.raw']
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

    return this.emitTrades(
      api.id,
      json.params.data.map(a => {
        const trade: Trade = {
          exchange: this.id,
          pair: a.instrument_name,
          timestamp: +a.timestamp,
          price: +a.price,
          size: a.amount / a.price,
          side: a.direction
        }

        if (a.liquidation) {
          trade.liquidation = true
        }

        return trade
      })
    )
  }

  onApiCreated(api) {
    this.startKeepAlive(api, { method: 'public/ping' }, 45000)
  }

  onApiRemoved(api) {
    this.stopKeepAlive(api)
  }
}
