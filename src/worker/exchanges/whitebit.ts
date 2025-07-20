import Exchange from '../exchange'

export default class WHITEBIT extends Exchange {
  id = 'WHITEBIT'

  protected endpoints = {
    PRODUCTS: [
        'https://whitebit.com/api/v4/public/markets'
    ]
  }

  async getUrl() {
    return 'wss://api.whitebit.com/ws'
  }

  formatProducts(response) {
    const products = [...response.map(p => p.name)];
    // const [collateralResponse, futuresResponse] = response;
    // if (collateralResponse && collateralResponse.result?.length > 0) {
    //     products.push(...collateralResponse.result)
    // }
    // if (futuresResponse && futuresResponse.result?.length > 0) {
    //     products.push(...futuresResponse.result.map(p => p.ticker_id))
    // }
    // // for some reason the collateral endpoint returns data from the futures endpoints too?
    const productsUniqueSet = [...new Set(products)];
    return productsUniqueSet;
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
        id: 8,
        method: 'trades_subscribe',
        params: [pair]
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

    api.send(
      JSON.stringify({
         id: 9,
         method: 'trades_unsubscribe',
         params: [pair]
      })
    )

    return true
  }

  formatTrade(market, trade) {
    const data = {
      exchange: this.id,
      pair: market,
      timestamp: parseInt((trade.time * 1000).toString()),
      price: +parseFloat(trade.price),
      size: parseFloat(trade.amount),
      side: trade.type
    }
    return data;
  }

  onMessage(event, api) {
    const json = JSON.parse(event.data)

    if (!json || json.method !== 'trades_update') {
      return;
    }

    const market = json.params[0]
    const trades = json.params[1]

    return this.emitTrades(
      api.id,
      trades.map(trade => this.formatTrade(market, trade))
    )
  }

  onApiCreated(api) {
    this.startKeepAlive(api, { id: 0, method: 'ping', params: [] }, 30000)
  }

  onApiRemoved(api) {
    this.stopKeepAlive(api)
  }
}
