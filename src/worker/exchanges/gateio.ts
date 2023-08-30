import Exchange from '../exchange'

export default class GATEIO extends Exchange {
  id = 'GATEIO'
  protected endpoints: { [id: string]: any } = {
    PRODUCTS: [
      'https://api.gateio.ws/api/v4/spot/currency_pairs',
      'https://api.gateio.ws/api/v4/futures/usdt/contracts'
    ]
  }

  private types: { [pair: string]: string } = {}
  private multipliers: { [pair: string]: number } = {}

  async getUrl(pair: string) {
    if (this.types[pair] === 'spot') return 'wss://ws.gate.io/v3/'
    if (this.types[pair] === 'futures')
      return 'wss://fx-ws.gateio.ws/v4/ws/usdt'
  }

  formatProducts(response) {
    const products = []
    const multipliers = {}
    const types = {}

    response.forEach((data: Array<any>, index: number) => {
      const type = ['spot', 'futures'][index]

      data.forEach((product: any) => {
        let pair: string
        switch (type) {
          case 'spot':
            pair = product.id + '_SPOT'
            multipliers[pair] = parseFloat(product.min_base_amount)
            break
          case 'futures':
            pair = product.name + '_FUTURES'
            multipliers[pair] = parseFloat(product.quanto_multiplier)
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
    })
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

    if (this.types[pair] === 'spot') {
      api.send(
        JSON.stringify({
          method: `trades.subscribe`,
          params: [pair.split('_').slice(0, 2).join('_')]
        })
      )
    } else if (this.types[pair] === 'futures') {
      api.send(
        JSON.stringify({
          time: Date.now(),
          channel: `${this.types[pair]}.trades`,
          event: 'subscribe',
          payload: [pair.split('_').slice(0, 2).join('_')]
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

    if (this.types[pair] === 'spot') {
      api.send(
        JSON.stringify({
          method: `trades.unsubscribe`,
          params: [pair.split('_').slice(0, 2).join('_')]
        })
      )
    } else if (this.types[pair] === 'futures') {
      api.send(
        JSON.stringify({
          time: Date.now(),
          channel: `${this.types[pair]}.trades`,
          event: 'unsubscribe',
          payload: [pair.split('_').slice(0, 2).join('_')]
        })
      )
    }

    return true
  }

  onMessage(event: any, api: any) {
    const json = JSON.parse(event.data)

    if (!json) {
      return
    }

    let trades = []

    if (
      json.channel &&
      json.channel.endsWith('.trades') &&
      json.event &&
      json.event === 'update' &&
      json.result &&
      json.result.length
    ) {
      trades = json.result.map((trade: any) => {
        const channel = json.channel.split('.')[0].toUpperCase()
        trade = {
          exchange: this.id,
          pair: trade.contract + '_' + channel,
          timestamp: +new Date(trade.create_time_ms),
          price: +trade.price,
          size: +(
            Math.abs(trade.size) *
            this.multipliers[trade.contract + '_' + channel]
          ),
          side: trade.size > 0 ? 'buy' : 'sell'
        }
        return trade
      })
    } else if (
      json.method &&
      json.method === 'trades.update' &&
      json.params &&
      Array.isArray(json.params)
    ) {
      const [contract, tradesData] = json.params
      trades = tradesData.map((trade: any) => {
        return {
          exchange: this.id,
          pair: contract + '_SPOT',
          timestamp: +new Date(
            parseInt((trade.time * 1000).toString().split('.')[0])
          ),
          price: +trade.price,
          size: +trade.amount,
          side: trade.type
        }
      })
    }
    return this.emitTrades(api.id, trades)
  }
}
