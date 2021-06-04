import EventEmitter from 'eventemitter3'

import store from '../store'

class HistoricalService extends EventEmitter {
  getHistoricalMarktets(markets: string[]) {
    return markets.filter(market => store.state.app.historicalMarkets.indexOf(market) !== -1)
  }

  getApiUrl(from, to, timeframe, markets) {
    let url = store.state.app.apiUrl

    url = url.replace(/\{from\}/, from)
    url = url.replace(/\{to\}/, to)
    url = url.replace(/\{timeframe\}/, (timeframe * 1000).toString())
    url = url.replace(/\{markets\}/, markets.join('+'))

    return url
  }
  fetch(from: number, to: number, timeframe: number, markets: string[]) {
    const url = this.getApiUrl(from, to, timeframe, markets)
    store.commit('app/TOGGLE_LOADING', true)

    return new Promise((resolve, reject) => {
      fetch(url)
        .then(response => response.json())
        .then(json => {
          if (!json || typeof json !== 'object') {
            return reject('invalid-data')
          }

          const format = json.format
          let data = json.results

          if (!data.length) {
            return reject('no-more-data')
          }

          switch (json.format) {
            case 'point':
              ;({ from, to, data } = this.normalisePoints(data, markets))
              break
            default:
              break
          }

          const output = {
            format: format,
            data: data,
            from: from,
            to: to
          }

          resolve(output)
        })
        .catch(err => {
          err &&
            store.dispatch('app/showNotice', {
              type: 'error',
              title: `API error (${
                err.response && err.response.data && err.response.data.error ? err.response.data.error : err.message || 'unknown error'
              })`
            })

          reject()
        })
        .then(() => {
          store.commit('app/TOGGLE_LOADING', false)
        })
    })
  }
  normalisePoints(data, markets: string[]) {
    if (!data || !data.length) {
      return data
    }

    const initialTs = +new Date(data[0].time) / 1000
    markets = [...markets]

    const refs = {}

    for (let i = 0; i < data.length; i++) {
      data[i].timestamp = +new Date(data[i].time) / 1000

      if (typeof refs[data[i].market] !== 'number') {
        refs[data[i].market] = data[i].open
      }

      if (data[i].timestamp === initialTs) {
        const marketIndex = markets.indexOf(data[i].market)

        markets.splice(marketIndex, 1)
      }

      const market: string[] = data[i].market.split(':')
      data[i].exchange = market.shift()
      data[i].pair = market.join(':')
      delete data[i].market
    }

    markets.length && console.warn('missing markets', markets.join(', '))

    for (const id of markets) {
      const market: string[] = id.split(':')

      if (!refs[id]) {
        console.warn(`Server did not send anything about ${id} but client expected it (check if server is tracking this market)`)

        continue
      }

      data.unshift({
        timestamp: initialTs,
        exchange: market.shift(),
        pair: market.join(':'),
        open: refs[id],
        high: refs[id],
        low: refs[id],
        close: refs[id],
        vbuy: 0,
        vsell: 0,
        lbuy: 0,
        lsell: 0,
        cbuy: 0,
        csell: 0
      })
    }

    return {
      data,
      from: data[0].timestamp,
      to: data[data.length - 1].timestamp
    }
  }
}

export default new HistoricalService()
