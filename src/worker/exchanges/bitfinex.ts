import Exchange from '../exchange'

export default class BITFINEX extends Exchange {
  id = 'BITFINEX'
  protected maxConnectionsPerApi = 24
  private channels = {}
  private prices = {}
  protected endpoints = { PRODUCTS: 'https://api.bitfinex.com/v1/symbols' }

  async getUrl() {
    return 'wss://api-pub.bitfinex.com/ws/2/'
  }

  formatProducts(pairs) {
    return pairs.map(product => product.toUpperCase())
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
        event: 'subscribe',
        channel: 'trades',
        symbol: 't' + pair
      })
    )

    if (api._connected.length === 1) {
      api.send(
        JSON.stringify({
          event: 'subscribe',
          channel: 'status',
          key: 'liq:global'
        })
      )
    }

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

    if (api._connected.length === 0) {
      const chanId = Object.keys(this.channels[api._id]).find(
        id => this.channels[api._id][id].name === 'status'
      )

      if (chanId) {
        api.send(
          JSON.stringify({
            event: 'unsubscribe',
            chanId: chanId
          })
        )

        delete this.channels[api._id][chanId]
      }

      return true
    }

    const channelsToUnsubscribe = Object.keys(this.channels[api._id]).filter(
      chanId => this.channels[api._id][chanId].pair === pair
    )

    if (!channelsToUnsubscribe.length) {
      console.log(
        `[${this}.id}/unsubscribe] no channel to unsubscribe to, but server called unsubscibr(${pair}). Here is the active channels on bitfinex exchange :`,
        this.channels[api._id]
      )
      return
    }

    for (const chanId of channelsToUnsubscribe) {
      api.send(
        JSON.stringify({
          event: 'unsubscribe',
          chanId
        })
      )

      delete this.channels[api._id][chanId]
    }
  }

  onMessage(event, api) {
    const json = JSON.parse(event.data)

    if (json.event === 'subscribed' && json.chanId) {
      this.channels[api._id][json.chanId] = {
        name: json.channel,
        pair: json.pair
      }
      return
    }

    const chanId = json[0]

    if (!this.channels[api._id][chanId] || json[1] === 'hb') {
      if (json[1] !== 'hb' && json.event !== 'info') {
        console.warn(`[${this.id}] received unknown event ${event.data}`)
      }
      return
    }

    const channel = this.channels[api._id][chanId]

    if (!channel.hasSentInitialMessage) {
      channel.hasSentInitialMessage = true
      return
    }

    if (channel.name === 'trades' && json[1] === 'te') {
      this.prices[channel.pair] = +json[2][3]

      return this.emitTrades(api._id, [
        {
          exchange: this.id,
          pair: channel.pair,
          timestamp: +new Date(json[2][1]),
          price: +json[2][3],
          size: Math.abs(json[2][2]),
          side: json[2][2] < 0 ? 'sell' : 'buy'
        }
      ])
    } else if (channel.name === 'status' && json[1]) {
      return this.emitLiquidations(
        api._id,
        json[1]
          .filter(
            liquidation =>
              !liquidation[8] &&
              !liquidation[10] &&
              !liquidation[11] &&
              api._connected.indexOf(liquidation[4].substring(1)) !== -1
          )
          .map(a => {
            const pair = a[4].substring(1)

            return {
              exchange: this.id,
              pair: a[4].substring(1),
              timestamp: parseInt(a[2]),
              price: this.prices[pair],
              size: Math.abs(a[5]),
              side: a[5] > 1 ? 'sell' : 'buy',
              liquidation: true
            }
          })
      )
    }
  }

  onApiCreated(api) {
    this.channels[api._id] = {}
  }

  onApiRemoved(api: any): void {
    delete this.channels[api._id]
  }
}
