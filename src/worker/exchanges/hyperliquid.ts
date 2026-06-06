import Exchange, { Api } from '../exchange'

type SpotMeta = {
  tokens: { name: string }[]
  universe: { name: string; tokens: number[]; isDelisted?: boolean }[]
}

function buildSpotPairLabels(spotMeta: SpotMeta) {
  const labels: { [pair: string]: string } = {}

  if (!spotMeta?.tokens?.length || !spotMeta?.universe?.length) {
    return labels
  }

  for (const product of spotMeta.universe) {
    if (product.isDelisted) {
      continue
    }

    const base = spotMeta.tokens[product.tokens[0]]
    const quote = spotMeta.tokens[product.tokens[1]]

    if (base && quote) {
      labels[product.name] = `${base.name}/${quote.name}`
    }
  }

  return labels
}

export default class HYPERLIQUID extends Exchange {
  id = 'HYPERLIQUID'
  spotPairLabels: { [pair: string]: string } = {}

  protected endpoints: { [id: string]: any } = {
    PRODUCTS: [
      {
        url: 'https://api.hyperliquid.xyz/info',
        method: 'POST',
        data: JSON.stringify({ type: 'meta' }),
        proxy: false
      },
      {
        url: 'https://api.hyperliquid.xyz/info',
        method: 'POST',
        data: JSON.stringify({ type: 'spotMeta' }),
        proxy: false
      }
    ]
  }

  async getUrl() {
    return 'wss://api.hyperliquid.xyz/ws'
  }

  formatProducts(responses) {
    const products = []
    const perpResponse = Array.isArray(responses) ? responses[0] : responses
    const spotResponse = Array.isArray(responses) ? responses[1] : null

    if (perpResponse?.universe?.length) {
      for (const product of perpResponse.universe) {
        if (!product.isDelisted) {
          products.push(product.name)
        }
      }
    }

    if (spotResponse?.universe?.length) {
      this.spotPairLabels = buildSpotPairLabels(spotResponse)

      for (const product of spotResponse.universe) {
        if (!product.isDelisted) {
          products.push(product.name)
        }
      }
    }

    return {
      products,
      spotPairLabels: this.spotPairLabels
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
        method: 'subscribe',
        subscription: {
          type: 'trades',
          coin: pair
        }
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
        method: 'unsubscribe',
        subscription: {
          type: 'trades',
          coin: pair
        }
      })
    )

    return true
  }

  onMessage(event, api) {
    const json = JSON.parse(event.data)

    if (json && json.channel === 'trades') {
      return this.emitTrades(
        api.id,
        json.data.map(t => this.formatResponse(t))
      )
    }
  }

  formatResponse(t) {
    return {
      exchange: this.id,
      pair: t.coin,
      timestamp: +new Date(t.time),
      price: +t.px,
      size: +t.sz,
      side: t.side === 'B' ? 'buy' : 'sell'
    }
  }

  onApiCreated(api: Api) {
    this.startKeepAlive(api, { method: 'ping' }, 20000)
  }

  onApiRemoved(api: Api) {
    this.stopKeepAlive(api)
  }
}
