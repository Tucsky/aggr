import Exchange from '../exchange'

export default class extends Exchange {
  id = 'BYBIT'
  protected endpoints = {
    PRODUCTS: [
      'https://api.bybit.com/spot/v1/symbols',
      'https://api.bybit.com/v2/public/symbols'
    ]
  }

  getUrl(pair) {
    if (/-SPOT$/.test(pair)) {
      return 'wss://stream.bybit.com/spot/quote/ws/v2'
    }

    return pair.indexOf('USDT') !== -1
      ? 'wss://stream.bybit.com/realtime_public'
      : 'wss://stream.bybit.com/realtime'
  }

  formatProducts(response) {
    const products = []

    for (const data of response) {
      const type = ['spot', 'futures'][response.indexOf(data)]

      for (const product of data.result) {
        if (type === 'spot') {
          products.push(product.name + '-SPOT')
        } else {
          if (product.status !== 'Trading') {
            continue
          }

          products.push(product.name)
        }
      }
    }

    return {
      products
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

    if (/-SPOT$/.test(pair)) {
      api.send(
        JSON.stringify({
          topic: 'trade',
          event: 'sub',
          params: { binary: false, symbol: pair.replace(/-SPOT$/, '') }
        })
      )
    } else {
      api.send(
        JSON.stringify({
          op: 'subscribe',
          args: ['trade.' + pair, 'liquidation.' + pair]
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

    if (/-SPOT$/.test(pair)) {
      api.send(
        JSON.stringify({
          topic: 'trade',
          event: 'cancel',
          params: { binary: false, symbol: pair.replace(/-SPOT$/, '') }
        })
      )
    } else {
      api.send(
        JSON.stringify({
          op: 'unsubscribe',
          args: ['trade.' + pair, 'liquidation.' + pair]
        })
      )
    }

    return true
  }

  onMessage(event, api) {
    const json = JSON.parse(event.data)

    if (!json.data || !json.topic) {
      return
    }

    if (json.data.length) {
      return this.emitTrades(
        api.id,
        json.data.map(trade => {
          const size = /USDT$/.test(trade.symbol)
            ? trade.size
            : trade.size / trade.price

          return {
            exchange: this.id,
            pair: trade.symbol,
            timestamp: +new Date(trade.timestamp),
            price: +trade.price,
            size: size,
            side: trade.side === 'Buy' ? 'buy' : 'sell'
          }
        })
      )
    } else if (!json.data.symbol) {
      return this.emitTrades(api.id, [
        {
          exchange: this.id,
          pair: json.params.symbol + '-SPOT',
          timestamp: +json.data.t,
          price: +json.data.p,
          size: +json.data.q,
          side: json.data.m ? 'buy' : 'sell'
        }
      ])
    } else {
      const size = /USDT$/.test(json.data.symbol)
        ? +json.data.qty
        : json.data.qty / json.data.price

      return this.emitLiquidations(api.id, [
        {
          exchange: this.id,
          pair: json.data.symbol,
          timestamp: +json.data.time,
          price: +json.data.price,
          size: size,
          side: json.data.side === 'Buy' ? 'sell' : 'buy',
          liquidation: true
        }
      ])
    }
  }

  onApiCreated(api) {
    this.startKeepAlive(api, { op: 'ping' }, 45000)
  }

  onApiRemoved(api) {
    this.stopKeepAlive(api)
  }
}
