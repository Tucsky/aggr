import Exchange from '../exchange'

export default class extends Exchange {
  id = 'PHEMEX'
  leverages = []
  currencies = []
  riskLimits = []
  specs = {}
  products = []
  protected endpoints = {
    PRODUCTS: 'https://api.phemex.com/exchange/public/cfg/v2/products'
  }

  private channels: { [id: string]: string } = {}

  getUrl() {
    return 'wss://phemex.com/ws'
  }

  formatProducts(data) {
    const specs = {}
    const products = []
    const leverages = data.data.leverages;
    const currencies = data.data.currencies;
    const riskLimits = data.data.riskLimits;
    for (const product of data.data.products) {
      if (product.type === 'Perpetual') {
        specs[product.symbol] = {
          type: product.type,
          contractSize: product.contractSize,
          settleCurrency: product.settleCurrency,
          quoteCurrency: product.quoteCurrency,
          valueScale: currencies.filter(c => c.currency === product.settleCurrency)[0].valueScale,
          priceScale: currencies.filter(c => c.currency === product.quoteCurrency)[0].valueScale,
          ratioScale: data.data.ratioScale,
          riskLimits: riskLimits.filter(rl => rl.symbol === product.symbol).map(rl => ({ steps: rl.steps, riskLimits: rl.riskLimits })),
          minPriceEp: product.minPricEp,
          maxPriceEp: product.maxPriceEp,
          lotSize: product.lotSize,
          pricePrecision: product.pricePrecision,
          maxOrderQty: product.maxOrderQty
        }
      } else if (product.type === 'Spot') {
        specs[product.symbol] = {
          type: product.type,
          maxBaseOrderSizeEv: product.maxBaseOrderSizeEv,
          minOrderValueEv: product.minOrderValueEv,
          valueScale: currencies.filter(c => c.currency === product.quoteCurrency)[0].valueScale,
          priceScale: currencies.filter(c => c.currency === product.baseCurrency)[0].valueScale,
          ratioScale: data.data.ratioScale,

        }
      }

      products.push(product.symbol)
    }
    // console.log(products, specs);
    return {
      specs,
      products,
      leverages,
      currencies,
      riskLimits
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
    // console.log(pair);
    api.send(
      JSON.stringify({
        id: 1234,
        method: 'trade.subscribe',
        params: [
          pair
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
        id: 1234,
        method: 'trade.unsubscribe',
        params: [
          pair
        ]
      })
    )

    return true
  }

  onMessage(event, api) {
    const json = JSON.parse(event.data)
    // Only care about trades
    if (json.trades !== undefined && json.type === 'incremental') {
      const tradeType = this.specs[json.symbol].type
      const trades = json.trades.map(t => {
        const trade = {
          exchange: this.id,
          pair: json.symbol,
          timestamp: t[0] / 1000000,
          side: t[1] === 'Buy' ? 'buy' : 'sell',
          price: 0,
          size: 0
        }
        if (tradeType === 'Perpetual') {
          trade.price = +(t[2] / Math.pow(10, this.specs[json.symbol].priceScale))
          trade.size = +( t[3] * this.specs[json.symbol].contractSize )
          if (this.specs[json.symbol].settleCurrency !== this.specs[json.symbol].quoteCurrency) {
            trade.size /= trade.price
          }
          
        } else if (tradeType === 'Spot') {
          trade.price = +(t[2] / Math.pow(10, this.specs[json.symbol].priceScale)),
          trade.size = +(t[3] / Math.pow(10, this.specs[json.symbol].valueScale))
        }
        return trade
      });
      return this.emitTrades(api.id, trades)
    } else {
      return
    }
  }
  onApiCreated(api) {
    this.startKeepAlive(api, { method: 'server.ping', id: 9000, params: [] }, 5000)
  }

  onApiRemoved(api) {
    this.stopKeepAlive(api)
  }
}
