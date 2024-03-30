import Exchange from '../exchange'
import pako from 'pako'

export default class HUOBI extends Exchange {
  id = 'HUOBI'

  liquidationOrdersSubscriptions = {}

  protected endpoints = {
    PRODUCTS: [
      'https://api.htx.com/v1/settings/common/symbols',
      'https://api.hbdm.com/api/v1/contract_contract_info',
      'https://api.hbdm.com/swap-api/v1/swap_contract_info',
      'https://api.hbdm.com/linear-swap-api/v1/swap_contract_info'
    ]
  }

  private contractTypesAliases = {
    this_week: 'CW',
    next_week: 'NW',
    quarter: 'CQ',
    next_quarter: 'NQ'
  }

  private types: { [pair: string]: string } = {}
  private specs: { [pair: string]: number } = {}
  private prices: { [pair: string]: number } = {}

  async getUrl(pair: string) {
    if (this.types[pair] === 'futures') {
      return 'wss://www.hbdm.com/ws'
    } else if (this.types[pair] === 'swap') {
      return 'wss://api.hbdm.com/swap-ws'
    } else if (this.types[pair] === 'linear') {
      return 'wss://api.hbdm.com/linear-swap-ws'
    } else {
      return 'wss://api.htx.com/ws'
    }
  }

  formatProducts(response) {
    const products = []
    const specs = {}
    const types = {}

    for (const data of response) {
      const type = ['spot', 'futures', 'swap', 'linear'][response.indexOf(data)]

      for (const product of data.data) {
        let pair: string

        switch (type) {
          case 'spot':
            pair = product.symbol
            break
          case 'futures':
            pair =
              product.symbol +
              '_' +
              this.contractTypesAliases[product.contract_type]
            specs[pair] = product.contract_size
            break
          case 'swap':
          case 'linear':
            pair = product.contract_code
            specs[pair] = product.contract_size
            break
        }

        types[pair] = type

        products.push(pair)
      }
    }

    return {
      products,
      specs,
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
        sub: `market.${pair}.trade.detail`,
        id: pair
      })
    )

    this.subscribeLiquidations(api, pair)

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
        unsub: 'market.' + pair + '.trade.detail',
        id: pair
      })
    )

    return true
  }

  onMessage(event, api) {
    const json = JSON.parse(pako.inflate(event.data, { to: 'string' }))

    if (!json) {
      return
    }

    if (json.ping) {
      api.send(JSON.stringify({ pong: json.ping }))
      return
    } else if (json.tick && json.tick.data && json.tick.data.length) {
      const pair = json.ch.replace(/market.(.*).trade.detail/, '$1')

      this.emitTrades(
        api.id,
        json.tick.data.map(trade => this.formatTrade(trade, pair))
      )

      return true
    }
  }

  formatTrade(trade, pair) {
    let size = +trade.amount

    if (typeof this.specs[pair] === 'number') {
      size =
        (size * this.specs[pair]) /
        (this.types[pair] === 'linear' ? 1 : trade.price)
    }

    this.prices[pair] = +trade.price

    return {
      exchange: this.id,
      pair: pair,
      timestamp: trade.ts,
      price: +trade.price,
      size: size,
      side: trade.direction
    }
  }

  formatLiquidation(trade, pair) {
    const price = this.prices[pair] || trade.price

    return {
      exchange: this.id,
      pair: pair,
      timestamp: +new Date(),
      price,
      size: +trade.amount,
      side: trade.direction,
      liquidation: true
    }
  }

  subscribeLiquidations(api, pair, unsubscribe = false) {
    if (
      api._marketDataApi &&
      api._marketDataApi.readyState === WebSocket.OPEN &&
      (this.types[pair] === 'futures' ||
        this.types[pair] === 'swap' ||
        this.types[pair] === 'linear')
    ) {
      const symbol =
        this.types[pair] === 'futures'
          ? pair.replace(/\d+/, '').replace(/(-|_).*/, '')
          : pair

      api._marketDataApi.send(
        JSON.stringify({
          op: unsubscribe ? 'unsub' : 'sub',
          topic: 'public.' + symbol + '.liquidation_orders'
        })
      )
    }
  }

  onApiRemoved(api) {
    if (api._marketDataApi) {
      if (api._marketDataApi.readyState === WebSocket.OPEN) {
        console.debug(
          `[${this.id}] close market data api ${api._marketDataApi.url} (associated with ${api.id})`
        )
        api._marketDataApi.close()
      }
    }
  }

  onApiCreated(api) {
    this.liquidationOrdersSubscriptions[api.id] = []

    this.openMarketDataApi(api)
  }

  openMarketDataApi(api) {
    if (api.url === 'wss://api.hbdm.com/swap-ws') {
      api._marketDataApi = new WebSocket('wss://api.hbdm.com/swap-notification') // coin margined
    } else if (api.url === 'wss://api.hbdm.com/linear-swap-ws') {
      api._marketDataApi = new WebSocket(
        'wss://api.hbdm.com/linear-swap-notification'
      ) // usdt margined
    }

    if (api._marketDataApi) {
      api._marketDataApi.binaryType = 'arraybuffer'

      // coin/linear swap & futures contracts
      console.debug(
        `[${this.id}] opened market data api ${api._marketDataApi.url} (associated with ${this.id})`
      )

      api._marketDataApi.onmessage = event => {
        const json = JSON.parse(pako.inflate(event.data, { to: 'string' }))
        if (json.op === 'ping') {
          api._marketDataApi.send(JSON.stringify({ op: 'pong', ts: json.ts }))
        } else if (json.data) {
          const pair = json.topic.replace(
            /public.(.*).liquidation_orders/,
            '$1'
          )

          this.emitLiquidations(
            api.id,
            json.data.map(trade => this.formatLiquidation(trade, pair))
          )
        }
      }

      api._marketDataApi.onopen = () => {
        for (const pair of api._connected) {
          this.subscribeLiquidations(api, pair)
        }
      }

      api._marketDataApi.onerror = event => {
        console.error(`[${this.id}] market data api errored ${event.message}`)
      }

      api._marketDataApi.onclose = event => {
        console.error(`[${this.id}] market data api closed ${event.message}`)
        api._marketDataApi = null

        setTimeout(() => {
          if (api.readyState === WebSocket.OPEN) {
            this.openMarketDataApi(api)
          }
        }, 1000)
      }
    }
  }
}
