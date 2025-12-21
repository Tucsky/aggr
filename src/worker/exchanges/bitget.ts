import Exchange from '../exchange'

const SPOT_PAIR_REGEX = /-SPOT$/

export default class BITGET extends Exchange {
  id = 'BITGET'

  protected endpoints = {
    PRODUCTS: [
      'https://api.bitget.com/api/v2/spot/public/symbols',
      'https://api.bitget.com/api/v2/mix/market/contracts?productType=USDT-FUTURES',
      'https://api.bitget.com/api/v2/mix/market/contracts?productType=COIN-FUTURES',
      'https://api.bitget.com/api/v2/mix/market/contracts?productType=USDC-FUTURES'
    ]
  }
  protected delayBetweenMessages = 150

  private types: { [pair: string]: string } = {}

  async getUrl() {
    return 'wss://ws.bitget.com/v2/ws/public'
  }

  formatProducts(responses) {
    const products = []
    const types = {}

    /*
    USDT-FUTURES USDT perpetual futures
    COIN-FUTURES Coin margin futures
    USDC-FUTURES USDC perpetual futures
    */

    for (const response of responses) {
      const type = ['spot', 'USDT-FUTURES', 'COIN-FUTURES', 'USDC-FUTURES'][
        responses.indexOf(response)
      ]

      const data = response.data || []

      for (const product of data) {
        const isSpot = type === 'spot'
        const symbol = `${product.symbol}${isSpot ? '-SPOT' : ''}`

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

    const type = this.types[pair]
    const isSpot = type === 'spot'
    const realPair = isSpot ? pair.replace(SPOT_PAIR_REGEX, '') : pair
    const instType = isSpot ? 'SPOT' : type

    api.send(
      JSON.stringify({
        op: 'subscribe',
        args: [
          {
            instType: instType,
            channel: 'trade',
            instId: realPair
          }
        ]
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

    const type = this.types[pair]
    const isSpot = type === 'spot'
    const realPair = isSpot ? pair.replace(SPOT_PAIR_REGEX, '') : pair
    const instType = isSpot ? 'SPOT' : type

    api.send(
      JSON.stringify({
        op: 'unsubscribe',
        args: [
          {
            instType: instType,
            channel: 'trade',
            instId: realPair
          }
        ]
      })
    )

    return true
  }

  formatTrade(trade, pair) {
    // V2 API trade format
    // spot: { ts: "timestamp", price: "price", size: "size", side: "buy/sell", tradeId: "id" }
    // futures: { ts: "timestamp", px: "price", sz: "size", side: "buy/sell", tradeId: "id" }
    return {
      exchange: this.id,
      pair: pair,
      timestamp: +trade.ts,
      price: +(trade.price || trade.px),
      size: +(trade.size || trade.sz),
      side: trade.side
    }
  }

  onMessage(event, api) {
    if (event.data === 'pong') {
      return
    }

    const json = JSON.parse(event.data)

    if (!json.data || json.data.length === 0) {
      return
    }

    // V2 API uses action: 'update'
    if (json.action !== 'update') {
      return
    }

    const instId = json.arg?.instId
    if (!instId) {
      return
    }

    // Determine if this is a spot pair by checking the instType
    const isSpot = json.arg?.instType === 'SPOT'
    const pair = isSpot ? `${instId}-SPOT` : instId

    return this.emitTrades(
      api.id,
      json.data.map(trade => this.formatTrade(trade, pair))
    )
  }

  onApiCreated(api) {
    this.startKeepAlive(api, 'ping', 30000)
  }

  onApiRemoved(api) {
    this.stopKeepAlive(api)
  }
}
