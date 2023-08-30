import Exchange from '../exchange'

export default class BITGET extends Exchange {
  id = 'BITGET'

  protected endpoints = {
    PRODUCTS: [
      'https://api.bitget.com/api/spot/v1/public/products',
      'https://api.bitget.com/api/mix/v1/market/contracts?productType=umcbl',
      'https://api.bitget.com/api/mix/v1/market/contracts?productType=dmcbl',
      'https://api.bitget.com/api/mix/v1/market/contracts?productType=cmcbl'
    ]
  }
  protected delayBetweenMessages = 150

  private types: { [pair: string]: string } = {}

  async getUrl(pair) {
    if (this.types[pair] === 'spot') {
      return 'wss://ws.bitget.com/spot/v1/stream'
    }

    return 'wss://ws.bitget.com/mix/v1/stream'
  }

  formatProducts(responses) {
    const products = []
    const types = {}

    /*
    umcbl USDT perpetual contract
    dmcbl Universal margin perpetual contract
    cmcbl USDC perpetual contract
    */

    for (const response of responses) {
      const type = ['spot', 'umcbl', 'dmcbl', 'cmcbl'][
        responses.indexOf(response)
      ]

      for (const product of response.data) {
        let symbol

        if (type === 'spot') {
          symbol = product.symbolName
        } else {
          symbol = product.symbol
        }

        products.push(symbol)

        types[symbol] = type
      }
    }

    return {
      products,
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
            instType: this.types[pair] === 'spot' ? 'sp' : 'mc',
            channel: 'trade',
            instId: pair.replace(/_.*/, '')
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
            instType: this.types[pair] === 'spot' ? 'sp' : 'mc',
            channel: 'trade',
            instId: pair.replace(/_.*/, '')
          }
        ]
      })
    )

    return true
  }

  formatTrade(trade, pair) {
    return {
      exchange: this.id,
      pair: pair,
      timestamp: +trade[0],
      price: +trade[1],
      size: +trade[2],
      side: trade[3]
    }
  }

  onMessage(event, api) {
    if (event.data === 'pong') {
      return
    }

    const json = JSON.parse(event.data)

    if (json.action !== 'update') {
      return
    }

    if (json.data.length) {
      if (json.arg.instType === 'mc') {
        if (/USDT$/.test(json.arg.instId)) {
          json.arg.instId += '_UMCBL'
        } else if (/USD$/.test(json.arg.instId)) {
          json.arg.instId += '_DMCBL'
        } else if (/PERP$/.test(json.arg.instId)) {
          json.arg.instId += '_CMCBL'
        }
      }

      return this.emitTrades(
        api.id,
        json.data.map(trade => this.formatTrade(trade, json.arg.instId))
      )
    }
  }

  onApiCreated(api) {
    this.startKeepAlive(api, 'ping', 30000)
  }

  onApiRemoved(api) {
    this.stopKeepAlive(api)
  }
}
