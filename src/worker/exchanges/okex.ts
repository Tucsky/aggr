import Exchange from '../exchange'
import pako from 'pako'

export default class extends Exchange {
  id = 'OKEX'
  private specs: { [pair: string]: number }
  private types: { [pair: string]: string }
  private inversed: { [pair: string]: boolean }

  protected endpoints = {
    PRODUCTS: [
      'https://www.okex.com/api/spot/v3/instruments',
      'https://www.okex.com/api/futures/v3/instruments',
      'https://www.okex.com/api/swap/v3/instruments'
    ]
  }

  getUrl() {
    return 'wss://real.okex.com:8443/ws/v3'
  }

  formatProducts(response) {
    const products = []
    const specs = {}
    const types = {}
    const inversed = {}

    for (const data of response) {
      for (const product of data) {
        const pair = product.instrument_id

        if (product.alias) {
          // futures

          specs[pair] = +product.contract_val
          types[pair] = 'futures'

          if (product.is_inverse === 'true') {
            inversed[pair] = true
          }
        } else if (/-SWAP/.test(product.instrument_id)) {
          // swap

          specs[pair] = +product.contract_val
          types[pair] = 'swap'

          if (product.is_inverse === 'true') {
            inversed[pair] = true
          }
        } else {
          types[pair] = 'spot'
        }

        products.push(pair)
      }
    }

    return {
      products,
      specs,
      types,
      inversed
    }
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

    const type = this.types[pair]

    api.send(
      JSON.stringify({
        op: 'subscribe',
        args: [`${type}/trade:${pair}`]
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

    const type = this.types[pair]

    api.send(
      JSON.stringify({
        op: 'unsubscribe',
        args: [`${type}/trade:${pair}`]
      })
    )

    return true
  }

  onMessage(event, api) {
    let json

    try {
      if (typeof event === 'string') {
        json = JSON.parse(event)
      } else {
        json = JSON.parse(pako.inflateRaw(event.data, { to: 'string' }))
      }
    } catch (error) {
      return
    }

    if (!json || !json.data || !json.data.length) {
      return
    }

    return this.emitTrades(
      api.id,
      json.data.map(trade => {
        let size
        const name = this.id

        if (typeof this.specs[trade.instrument_id] !== 'undefined') {
          size = ((trade.size || trade.qty) * this.specs[trade.instrument_id]) / (this.inversed[trade.instrument_id] ? trade.price : 1)
          // name += '_futures'
        } else {
          size = trade.size
        }

        return {
          exchange: name,
          pair: trade.instrument_id,
          timestamp: +new Date(trade.timestamp),
          price: +trade.price,
          size: +size,
          side: trade.side
        }
      })
    )
  }
}
