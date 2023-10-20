import Exchange from '../exchange'

const SPOT_PAIR_REGEX = /-SPOT$/
const TRADE_TOPIC_REGEX = /^publicTrade\./
const SPOT_WS = 'wss://stream.bybit.com/v5/public/spot'
const LINEAR_WS = 'wss://stream.bybit.com/v5/public/linear'
const INVERSE_WS = 'wss://stream.bybit.com/v5/public/inverse'

export default class BYBIT extends Exchange {
  id = 'BYBIT'

  private types: { [pair: string]: 'spot' | 'linear' | 'inverse' }

  protected endpoints = {
    PRODUCTS: [
      'https://api.bybit.com/v5/market/instruments-info?category=spot', // BTCUSDT -> BTCUSDT-SPOT
      'https://api.bybit.com/v5/market/instruments-info?category=linear', // BTCUSDT, BTCPERP, BTC-03NOV23
      'https://api.bybit.com/v5/market/instruments-info?category=inverse' // BTCUSD, BTCUSDH24
    ]
  }

  async getUrl(pair) {
    if (this.types[pair] === 'spot') {
      return SPOT_WS
    }

    if (this.types[pair] === 'linear') {
      return LINEAR_WS
    }

    return INVERSE_WS
  }

  validateProducts(data) {
    if (!data.types) {
      return false
    }

    return true
  }

  formatProducts(response) {
    const products = []
    const types = {}

    for (const data of response) {
      const type = ['spot', 'linear', 'inverse'][response.indexOf(data)]

      for (const product of data.result.list) {
        const symbol = `${product.symbol}${type === 'spot' ? '-SPOT' : ''}`

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

    const isSpot = this.types[pair] === 'spot'
    const realPair = isSpot ? pair.replace(SPOT_PAIR_REGEX, '') : pair
    const topics = [`publicTrade.${realPair}`]

    if (!isSpot) {
      topics.push(`liquidation.${realPair}`)
    }

    api.send(
      JSON.stringify({
        op: 'subscribe',
        args: topics
      })
    )

    return true
  }

  /**
   * Unsub
   * @param {WebSocket} api
   * @param {string} pair
   */
  async unsubscribe(api, pair) {
    if (!(await super.unsubscribe(api, pair))) {
      return
    }

    const isSpot = this.types[pair] === 'spot'
    const realPair = isSpot ? pair.replace(SPOT_PAIR_REGEX, '') : pair
    const topics = [`publicTrade.${realPair}`]

    if (!isSpot) {
      topics.push(`liquidation.${realPair}`)
    }

    api.send(
      JSON.stringify({
        op: 'unsubscribe',
        args: topics
      })
    )

    return true
  }

  formatTrade(trade, isSpot) {
    let size = +trade.v
    let pair = trade.s

    if (!isSpot && this.types[trade.s] === 'inverse') {
      size /= trade.p
    } else if (isSpot) {
      pair += '-SPOT'
    }

    return {
      exchange: this.id,
      pair,
      timestamp: +trade.T,
      price: +trade.p,
      size,
      side: trade.S === 'Buy' ? 'buy' : 'sell'
    }
  }

  formatLiquidation(liquidation) {
    let size = +liquidation.size

    if (this.types[liquidation.symbol] === 'inverse') {
      size /= liquidation.price
    }

    return {
      exchange: this.id,
      pair: liquidation.symbol,
      timestamp: +liquidation.updateTime,
      size,
      price: +liquidation.price,
      side: liquidation.side === 'Buy' ? 'sell' : 'buy',
      liquidation: true
    }
  }

  onMessage(event, api) {
    const json = JSON.parse(event.data)

    if (!json.data || !json.topic) {
      return
    }

    if (json.data.length) {
      if (TRADE_TOPIC_REGEX.test(json.topic)) {
        const isSpot = api.url === SPOT_WS

        return this.emitTrades(
          api.id,
          json.data.map(trade => this.formatTrade(trade, isSpot))
        )
      } else {
        return this.emitLiquidations(
          api.id,
          json.data.map(liquidation => this.formatLiquidation(liquidation))
        )
      }
    }
  }

  onApiCreated(api) {
    this.startKeepAlive(api, { op: 'ping' }, 20000)
  }

  onApiRemoved(api) {
    this.stopKeepAlive(api)
  }
}
