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

  private types: { [pair: string]: string } = {}
  private multipliers: { [pair: string]: number } = {}

  async getUrl(pair: string) {
    if (this.types[pair] === 'spot')
      return 'wss://ws-manager-compress.bitmart.com/api?protocol=1.1'
    if (this.types[pair] === 'futures')
      return 'wss://openapi-ws.bitmart.com/api?protocol=1.1'
  }

  formatProducts(responses) {
    const products = []
    const multipliers = {}
    const types = {}

    responses.forEach(
      (
        response: {
          message: string
          code: number
          data: { symbols: Array<any> }
        },
        index: number
      ) => {
        const type = ['spot', 'futures'][index]

        response.data.symbols.forEach((product: any) => {
          let pair: string
          switch (type) {
            case 'spot':
              pair = product.symbol + '_SPOT'
              // multipliers[pair] = parseFloat(product.min_base_amount)
              break
            case 'futures':
              pair = product.symbol + '_FUTURES'
              multipliers[pair] = parseFloat(product.contract_size)
              break
          }

          if (products.find(a => a.toLowerCase() === pair.toLowerCase())) {
            throw new Error(
              'Duplicate pair detected on gateio exchange (' + pair + ')'
            )
          }

          types[pair] = type
          products.push(pair)
        })
      }
    )
    return { products, multipliers, types }
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

    const pairSplit = pair.split('_')

    if (this.types[pair] === 'spot') {
      api.send(
        JSON.stringify({
          op: `subscribe`,
          args: [
            this.types[pair] +
              '/trade:' +
              pairSplit.slice(0, pairSplit.length - 1).join('_')
          ]
        })
      )
    } else if (this.types[pair] === 'futures') {
      api.send(
        JSON.stringify({
          action: 'subscribe',
          args: [
            this.types[pair] +
              '/trade:' +
              pair
                .split('_')
                .slice(0, pairSplit.length - 1)
                .join('_')
          ]
        })
      )
    }

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

    const pairSplit = pair.split('_')

    if (this.types[pair] === 'spot') {
      api.send(
        JSON.stringify({
          op: `unsubscribe`,
          args: [
            this.types[pair] +
              '/trade:' +
              pairSplit.slice(0, pairSplit.length - 1).join('_')
          ]
        })
      )
    } else if (this.types[pair] === 'futures') {
      api.send(
        JSON.stringify({
          action: 'unsubscribe',
          args: [
            this.types[pair] +
              '/trade:' +
              pair
                .split('_')
                .slice(0, pairSplit.length - 1)
                .join('_')
          ]
        })
      )
    }

    return true
  }

  onMessage(event: any, api: any) {
    let data = event.data
    if (typeof data !== 'string')
      data = inflateRaw(event.data, { to: 'string' })
    if (!data.startsWith('{')) return
    const json = JSON.parse(data)

    if (!json) {
      return
    }

    let trades = []

    if (
      json.group &&
      json.group.includes('futures/trade:') &&
      json.data &&
      Array.isArray(json.data)
    ) {
      trades = json.data.map((trade: any) => {
        if (trade.way === 5) {
          console.log(5, trade, 'long liquidation I think')
        } else if (trade.way === 1) {
          console.log(1, trade, 'short liquidation I think')
        } else if (trade.way !== 2 && trade.way !== 6) {
          console.log(trade.way, trade)
        }
        trade = {
          exchange: this.id,
          pair: trade.symbol + '_FUTURES',
          timestamp: +new Date(trade.created_at),
          price: +parseFloat(trade.deal_price),
          size: +(
            parseFloat(trade.deal_vol) *
            (this.multipliers[trade.symbol + '_FUTURES']
              ? this.multipliers[trade.symbol + '_FUTURES']
              : 1)
          ),
          side: trade.way === 2 ? 'buy' : trade.way === 6 ? 'sell' : 'na'
        }
        return trade
      })
    } else if (
      json.table &&
      json.table === 'spot/trade' &&
      json.data &&
      Array.isArray(json.data)
    ) {
      trades = json.data.map((trade: any) => {
        return {
          exchange: this.id,
          pair: trade.symbol + '_SPOT',
          timestamp: +new Date(trade.s_t * 1000),
          price: +parseFloat(trade.price),
          size:
            +parseFloat(trade.size) *
            (this.multipliers[trade.symbol + '_SPOT']
              ? this.multipliers[trade.symbol + '_SPOT']
              : 1),
          side: trade.side
        }
      })
    }
    // console.log(trades)
    return this.emitTrades(api.id, trades)
  }
}
