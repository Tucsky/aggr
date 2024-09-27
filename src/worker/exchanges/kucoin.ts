import Exchange from '../exchange'

export default class KUCOIN extends Exchange {
  id = 'KUCOIN'

  protected endpoints: { [id: string]: any } = {
    PRODUCTS: [
      'https://api.kucoin.com/api/v1/symbols',
      'https://api-futures.kucoin.com/api/v1/contracts/active'
    ]
  }

  private multipliers: { [pair: string]: number } = {}

  getUrl() {
    if (this.endpoints.WS) {
      return this.endpoints.WS
    }

    return fetch(
      import.meta.env.VITE_APP_PROXY_URL +
        'https://api.kucoin.com/api/v1/bullet-public',
      {
        method: 'POST'
      }
    )
      .then(res => res.json())
      .then(data => {
        this.endpoints.WS = 'wss://ws-api.kucoin.com/endpoint'

        if (data.data.instanceServers.length) {
          this.endpoints.WS = data.data.instanceServers[0].endpoint
        }

        this.endpoints.WS += '?token=' + data.data.token

        return this.endpoints.WS
      })
      .catch(err => {
        console.log(err)
      })
  }

  formatProducts(responses) {
    const products = []
    const multipliers = {}

    for (const response of responses) {
      const type = ['spot', 'futures'][responses.indexOf(response)]
      for (const product of response.data) {
        const symbol = product.symbolName || product.symbol

        products.push(product.symbol)

        if (type === 'futures') {
          multipliers[symbol] = product.multiplier
        }
      }
    }

    return {
      products,
      multipliers
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

    let topic

    if (this.multipliers[pair]) {
      topic = `/contractMarket/execution:${pair}`
    } else {
      topic = `/market/match:${pair}`
    }

    api.send(
      JSON.stringify({
        type: 'subscribe',
        topic
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

    let topic

    if (this.multipliers[pair]) {
      topic = `/contractMarket/execution:${pair}`
    } else {
      topic = `/market/match:${pair}`
    }

    api.send(
      JSON.stringify({
        type: 'unsubscribe',
        topic
      })
    )

    return true
  }

  formatTrade(trade) {
    let timestamp
    let size

    if (this.multipliers[trade.symbol]) {
      timestamp = trade.ts / 1000000
      if (this.multipliers[trade.symbol] < 0) {
        size = trade.size / trade.price
      } else {
        size = trade.size * this.multipliers[trade.symbol]
      }
    } else {
      timestamp = trade.time / 1000000
      size = +trade.size
    }

    return {
      exchange: this.id,
      pair: trade.symbol,
      price: +trade.price,
      side: trade.side === 'buy' ? 'buy' : 'sell',
      timestamp,
      size
    }
  }

  onMessage(event, api) {
    const json = JSON.parse(event.data)

    if (!json || !json.data || json.type !== 'message') {
      return
    }

    return this.emitTrades(api.id, [this.formatTrade(json.data)])
  }

  onApiCreated(api) {
    this.startKeepAlive(api, { type: 'ping' }, 18000)
  }

  onApiRemoved(api) {
    this.stopKeepAlive(api)
  }
}
