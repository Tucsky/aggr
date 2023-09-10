import Exchange from '../exchange'
import { inflateRaw } from 'pako'

export default class extends Exchange {
  id = 'BITMART'
  protected endpoints: { [id: string]: any } = {
    PRODUCTS: [
      'https://api-cloud.bitmart.com/spot/v1/symbols/details',
      'https://api-cloud.bitmart.com/contract/public/details'
    ]
  }

  private specs: { [pair: string]: number } = {}

  async getUrl(pair: string) {
    if (this.specs[pair]) {
      return 'wss://openapi-ws.bitmart.com/api?protocol=1.1'
    }
    
    return 'wss://ws-manager-compress.bitmart.com/api?protocol=1.1'
  }

  validateProducts(data) {
    if (!data.specs) {
      return false
    }

    return true
  }

  formatProducts(responses) {
    const products = []
    const specs = {}
    const types = {}

    for (const response of responses) {
      for (const product of response.data.symbols) {
        products.push(product.symbol)

        if (product.contract_size) {
          specs[product.symbol] = +product.contract_size
        }
      }
    }

    return { products, specs, types }
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

    const isContract = !!this.specs[pair]

    const typeImpl = isContract ? { 
      prefix: 'futures',
      arg: 'action'
    } : {
      prefix: 'spot',
      arg: 'op',
    }

    api.send(
      JSON.stringify({
        [typeImpl.arg]: `subscribe`,
        args: [
          `${typeImpl.prefix}/trade:${pair}`
        ]
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

    const isContract = !!this.specs[pair]

    const typeImpl = isContract ? { 
      prefix: 'futures',
      arg: 'action'
    } : {
      prefix: 'spot',
      arg: 'op',
    }

    api.send(
      JSON.stringify({
        [typeImpl.arg]: `unsubscribe`,
        args: [
          `${typeImpl.prefix}/trade:${pair}`
        ]
      })
    )

    return true
  }

  formatTrade(trade) {
    if (this.specs[trade.symbol]) {
      return {
        exchange: this.id,
        pair: trade.symbol,
        timestamp: trade.create_time_mill,
        price: +trade.deal_price,
        size: (trade.deal_vol * this.specs[trade.symbol]) / (this.specs[trade.symbol] > 1 ? trade.deal_price : 1),
        side: trade.way < 4 ? 'buy' : 'sell'
      }
    } else {
      return {
        exchange: this.id,
        pair: trade.symbol,
        timestamp: trade.s_t * 1000,
        price: +trade.price,
        size: +trade.size,
        side: trade.side
      }
    }
  }

  onMessage(event: any, api: any) {
    let data = event.data

    if (typeof data !== 'string') {
      data = inflateRaw(event.data, { to: 'string' })
    }

    const json = JSON.parse(data)

    if (!json || !json.data) {
      return
    }
    
    return this.emitTrades(api.id,
      json.data.map(trade => this.formatTrade(trade))
    )
  }
}
