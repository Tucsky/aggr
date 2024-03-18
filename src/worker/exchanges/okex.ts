import Exchange from '../exchange'

export default class OKEX extends Exchange {
  id = 'OKEX'
  private specs: { [pair: string]: number }
  private inversed: { [pair: string]: boolean }
  private types: { [pair: string]: 'SPOT' | 'SWAP' | 'FUTURE' }

  protected endpoints = {
    PRODUCTS: [
      'https://www.okx.com/api/v5/public/instruments?instType=SPOT',
      'https://www.okx.com/api/v5/public/instruments?instType=FUTURES',
      'https://www.okx.com/api/v5/public/instruments?instType=SWAP'
    ]
  }

  async getUrl() {
    return 'wss://ws.okx.com:8443/ws/v5/public'
  }

  validateProducts(data: any) {
    if (!data.types) {
      return false
    }

    return true
  }

  formatProducts(response) {
    const products = []
    const specs = {}
    const aliases = {}
    const inversed = {}
    const types = {}

    for (const data of response) {
      for (const product of data.data) {
        const type = product.instType
        const pair = product.instId

        if (type === 'FUTURES') {
          // futures

          specs[pair] = +product.ctVal
          aliases[pair] = product.alias

          if (product.ctType === 'inverse') {
            inversed[pair] = true
          }
        } else if (type === 'SWAP') {
          // swap

          specs[pair] = +product.ctVal

          if (product.ctType === 'inverse') {
            inversed[pair] = true
          }
        }

        types[pair] = type
        products.push(pair)
      }
    }

    return {
      products,
      specs,
      aliases,
      inversed,
      types
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

    api.send(
      JSON.stringify({
        op: 'subscribe',
        args: [
          {
            channel: 'trades',
            instId: pair
          }
        ]
      })
    )

    if (this.types[pair] !== 'SPOT') {
      api.send(
        JSON.stringify({
          op: 'subscribe',
          args: [
            {
              channel: 'liquidation-orders',
              instType: this.types[pair]
            }
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

    api.send(
      JSON.stringify({
        op: 'unsubscribe',
        args: [
          {
            channel: 'trades',
            instId: pair
          }
        ]
      })
    )

    if (this.types[pair] !== 'SPOT') {
      api.send(
        JSON.stringify({
          op: 'subscribe',
          args: [
            {
              channel: 'liquidation-orders',
              instType: this.types[pair]
            }
          ]
        })
      )
    }

    return true
  }

  formatTrade(trade) {
    let size

    if (typeof this.specs[trade.instId] !== 'undefined') {
      size =
        (trade.sz * this.specs[trade.instId]) /
        (this.inversed[trade.instId] ? trade.px : 1)
    } else {
      size = trade.sz
    }

    return {
      exchange: this.id,
      pair: trade.instId,
      timestamp: +trade.ts,
      price: +trade.px,
      size: +size,
      side: trade.side
    }
  }

  formatLiquidation(liquidation, pair) {
    const size =
      (liquidation.sz * this.specs[pair]) /
      (this.inversed[pair] ? liquidation.bkPx : 1)

    return {
      exchange: this.id,
      pair: pair,
      timestamp: +liquidation.ts,
      price: +liquidation.bkPx,
      size: size,
      side: liquidation.side,
      liquidation: true
    }
  }

  onMessage(event, api) {
    const json = JSON.parse(event.data)

    if (!json || !json.data) {
      return
    }

    if (json.arg.channel === 'liquidation-orders') {
      return this.emitLiquidations(
        api.id,
        json.data.reduce((acc, pairData) => {
          if (api._connected.indexOf(pairData.instId) === -1) {
            return acc
          }

          return acc.concat(
            pairData.details.map(liquidation =>
              this.formatLiquidation(liquidation, pairData.instId)
            )
          )
        }, [])
      )
    }

    return this.emitTrades(
      api.id,
      json.data.map(trade => this.formatTrade(trade))
    )
  }
}
