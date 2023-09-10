import { Trade } from '../../types/types'
import Exchange from '../exchange'

interface Pool {
  id: string
  pair: string
  timestamp?: number
}

interface Swap {
  timestamp: string
  amount1: string
  sqrtPriceX96: string
}

export default class UNISWAP extends Exchange {
  id = 'UNISWAP'

  protected endpoints = {
    PRODUCTS: {
      url: 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3',
      method: 'POST',
      proxy: false,
      data: `{"query":"
          {
                pools(first: 1000, orderBy: volumeUSD, orderDirection: desc){
                  id
                  volumeUSD
                  token0 {
                    symbol 
                  }   
                  token1 {
                    symbol 
                  }    
            }
        }
      "}`.replace(/\n/g, '\\n')
    }
  }

  protected pools: string[]
  private activePools: Pool[] = []
  private refreshingPools = false
  private refreshIndex = 0

  async getUrl() {
    return null
  }

  formatProducts(response) {
    const products = []
    const pools = {}

    for (const pool of response.data.pools) {
      const pair = pool.token0.symbol + pool.token1.symbol

      if (products.indexOf(pair) !== -1) {
        // only list first for now
        continue
      }

      pools[pair] = pool.id
      products.push(pair)
    }

    return {
      products,
      pools
    }
  }

  /**
   * Sub
   * @param {WebSocket} api
   * @param {string} pair
   */
  async subscribe(api, pair) {
    const id = this.pools[pair]

    const index = this.activePools.findIndex(pool => pool.id === id)

    if (index === -1) {
      this.emit('subscribed', pair)
      this.activePools.push({
        id,
        pair
      })

      if (!this.refreshingPools) {
        this.refreshNextPool()
      }
    }

    return true
  }

  /**
   * Sub
   * @param {WebSocket} api
   * @param {string} pair
   */
  async unsubscribe(api, pair) {
    const id = this.pools[pair]

    const index = this.activePools.findIndex(pool => pool.id === id)

    if (index !== -1) {
      this.emit('unsubscribed', pair)
      this.activePools.splice(index, 1)
    }

    return true
  }

  formatTrade(pool: Pool, swap: Swap): Trade {
    const size = Math.abs(+swap.amount1)
    const side = +swap.amount1 > 0 ? 'buy' : 'sell'

    const trade: Trade = {
      exchange: this.id,
      pair: pool.pair,
      timestamp: +swap.timestamp * 1000,
      price: +((+swap.sqrtPriceX96 / 2 ** 96) ** 2).toFixed(6),
      size,
      side
    }

    return trade
  }

  async refreshNextPool() {
    if (!this.activePools.length) {
      this.refreshingPools = false
      return
    }

    setTimeout(
      this.refreshNextPool.bind(this),
      Math.max(1000, 15000 / this.activePools.length)
    )

    const pool = this.activePools[this.refreshIndex++ % this.activePools.length]

    this.refreshingPools = true

    const { data } = await fetch(
      'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3',
      {
        method: 'post',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: `{
            swaps(orderBy: timestamp, orderDirection: desc, where: {
              pool: "${pool.id}"
              ${pool.timestamp ? `timestamp_gt: ${pool.timestamp}` : ''}
            }) {
              id
              amount1
              sqrtPriceX96
              timestamp
            }
          }`
        })
      }
    ).then(res => res.json())

    if (data.swaps.length) {
      pool.timestamp = +data.swaps[0].timestamp

      const trades: Trade[] = []

      for (let i = data.swaps.length - 1; i >= 0; i--) {
        trades.push(this.formatTrade(pool, data.swaps[i]))
      }

      this.emitTrades(null, trades)
    }
  }

  async resolveApi(pair) {
    await this.subscribe(null, pair)
  }

  async unlink(pair) {
    await this.unsubscribe(null, pair.replace(/[^:]*:/, ''))
  }
}
