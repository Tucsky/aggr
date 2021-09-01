import { parseMarket } from '@/utils/helpers'
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
              ;({ from, to, data, markets } = this.normalisePoints(data, timeframe, markets))
              break
            default:
              break
          }

          const output = {
            format: format,
            data: data,
            from: from,
            to: to,
            markets: markets
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
  normalisePoints(data, timeframe, markets: string[]) {
    const lastClosedBars = {}

    markets = markets.slice()

    if (!data || !data.length) {
      return data
    }

    // base timestamp of results
    let firstBarTimestamp: number

    if (Array.isArray(data[0])) {
      firstBarTimestamp = data[0][0]
    } else {
      firstBarTimestamp = +new Date(data[0].time) / 1000
    }

    markets = [...markets]

    const refs = {}

    for (let i = 0; i < data.length; i++) {
      if (!data[i].time && data[i][0]) {
        // new format is array, transform into objet
        data[i] = {
          time: data[i][0],
          cbuy: data[i][1],
          close: data[i][2],
          csell: data[i][3],
          high: data[i][4],
          lbuy: data[i][5],
          low: data[i][6],
          lsell: data[i][7],
          market: data[i][8],
          open: data[i][9],
          vbuy: data[i][10],
          vsell: data[i][11]
        }
        data[i].timestamp = data[i].time
      } else {
        // pending bar was sent
        if (!lastClosedBars[data[i].market]) {
          // get latest bar for that market
          for (let j = i - 1; j >= 0; j--) {
            if (data[j].market === data[i].market) {
              lastClosedBars[data[i].market] = data[j]
              break
            }

            if (i - j > 25) {
              debugger
              console.warn('[historical/mergePendingBars] going back TOO FAR in the result array!!')
            }
          }
        }

        // format pending bar time floored to timeframe
        data[i].timestamp = Math.floor(+new Date(data[i].time) / 1000 / timeframe) * timeframe

        if (!lastClosedBars[data[i].market] || lastClosedBars[data[i].market].timestamp < data[i].timestamp) {
          // store reference bar for this market (either because it didn't exist or because reference bar time is < than pending bar time)
          lastClosedBars[data[i].market] = data[i]
        } else if (lastClosedBars[data[i].market] !== data[i]) {
          lastClosedBars[data[i].market].vbuy += data[i].vbuy
          lastClosedBars[data[i].market].vsell += data[i].vsell
          lastClosedBars[data[i].market].cbuy += data[i].cbuy
          lastClosedBars[data[i].market].csell += data[i].csell
          lastClosedBars[data[i].market].lbuy += data[i].lbuy
          lastClosedBars[data[i].market].lsell += data[i].lsell
          lastClosedBars[data[i].market].high = Math.max(data[i].high, lastClosedBars[data[i].market].high)
          lastClosedBars[data[i].market].low = Math.min(data[i].low, lastClosedBars[data[i].market].low)
          lastClosedBars[data[i].market].close = data[i].close

          data.splice(i, 1)
          i--
          continue
        }
      }

      if (typeof refs[data[i].market] !== 'number') {
        refs[data[i].market] = data[i].open
      }

      if (data[i].timestamp === firstBarTimestamp) {
        const marketIndex = markets.indexOf(data[i].market)

        markets.splice(marketIndex, 1)
      }

      const [exchange, pair] = parseMarket(data[i].market)
      data[i].exchange = exchange
      data[i].pair = pair
    }

    // markets.length && console.warn('missing markets', markets.join(', '))

    for (const id of markets) {
      // const market: string[] = id.split(':')

      if (!refs[id]) {
        console.warn(`Server did not send anything about ${id} but client expected it (check if server is tracking this market)`)

        continue
      }
    }

    return {
      data,
      markets,
      from: data[0].timestamp,
      to: data[data.length - 1].timestamp
    }
  }
}

export default new HistoricalService()
