import Exchange from '../exchange'

export default class extends Exchange {
  id = 'OKEX'
  private specs: { [pair: string]: number }
  private inversed: { [pair: string]: boolean }

  protected endpoints = {
    PRODUCTS: [
      'https://www.okex.com/api/v5/public/instruments?instType=SPOT',
      'https://www.okex.com/api/v5/public/instruments?instType=FUTURES',
      'https://www.okex.com/api/v5/public/instruments?instType=SWAP'
    ]
  }

  getUrl() {
    return 'wss://ws.okex.com:8443/ws/v5/public'
  }

  formatProducts(response) {
    const products = []
    const specs = {}
    const aliases = {}
    const inversed = {}

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

        products.push(pair)
      }
    }

    return {
      products,
      specs,
      aliases,
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

  onMessage(event, api) {
    const json = JSON.parse(event.data)

    if (!json || !json.data) {
      return
    }

    return this.emitTrades(
      api.id,
      json.data.map(trade => this.formatTrade(trade))
    )
  }
}
