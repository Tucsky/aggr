import { defaultChartSeries } from '../components/chart/defaultSeries'
import store from '../store'

export function parseQueryString() {
  let QUERY_STRING

  try {
    QUERY_STRING = JSON.parse(
      '{"' +
        decodeURI(location.search.substring(1))
          .replace(/"/g, '\\"')
          .replace(/&/g, '","')
          .replace(/=/g, '":"') +
        '"}'
    )
  } catch (error) {
    QUERY_STRING = {}
  }

  for (const name in QUERY_STRING) {
    try {
      QUERY_STRING[name] = JSON.parse(QUERY_STRING[name])
    } catch (error) {
      // empty
    }
  }

  return QUERY_STRING
}

export function formatAmount(amount, decimals?: number) {
  const negative = amount < 0

  amount = Math.abs(amount)

  if (amount >= 1000000) {
    amount = +(amount / 1000000).toFixed(isNaN(decimals) ? 1 : decimals) + 'M'
  } else if (amount >= 100000) {
    amount = +(amount / 1000).toFixed(isNaN(decimals) ? 0 : decimals) + 'K'
  } else if (amount >= 1000) {
    amount = +(amount / 1000).toFixed(isNaN(decimals) ? 1 : decimals) + 'K'
  } else if (store.state.settings.decimalPrecision) {
    amount = amount.toFixed(store.state.settings.decimalPrecision)
  } else {
    amount = +amount.toFixed(4)
  }

  if (negative) {
    return '-' + amount
  } else {
    return amount
  }
}

export function countDecimals(value) {
  if (Math.floor(value) === value) return 0
  return value.toString().split('.')[1].length || 0
}

export function formatPrice(price) {
  price = +price || 0

  if (store.state.settings.decimalPrecision) {
    return price.toFixed(store.state.settings.decimalPrecision)
  } else if (store.state.app.optimalDecimal) {
    return price.toFixed(store.state.app.optimalDecimal)
  } else {
    return price.toFixed(2)
  }
}

export function padNumber(num, size) {
  const s = '000000000' + num
  return s.substr(s.length - size)
}

export function ago(timestamp) {
  const seconds = Math.floor((+new Date() - timestamp) / 1000)
  let interval, output

  if ((interval = Math.floor(seconds / 31536000)) > 1) output = interval + 'y'
  else if ((interval = Math.floor(seconds / 2592000)) >= 1) output = interval + 'm'
  else if ((interval = Math.floor(seconds / 86400)) >= 1) output = interval + 'd'
  else if ((interval = Math.floor(seconds / 3600)) >= 1) output = interval + 'h'
  else if ((interval = Math.floor(seconds / 60)) >= 1) output = interval + 'm'
  else output = Math.ceil(seconds) + 's'

  return output
}

export function getHms(timestamp, round = false) {
  if (isNaN(timestamp) || timestamp === null) {
    return null
  }

  const isNegPrefix = timestamp < 0 ? '-' : ''
  timestamp = Math.abs(timestamp)

  const h = Math.floor(timestamp / 1000 / 3600)
  const m = Math.floor(((timestamp / 1000) % 3600) / 60)
  const s = Math.floor(((timestamp / 1000) % 3600) % 60)

  let output = ''

  output += (!round || !output.length) && h > 0 ? isNegPrefix + h + 'h' + (!round && m ? ', ' : '') : ''
  output += (!round || !output.length) && m > 0 ? isNegPrefix + m + 'm' + (!round && s ? ', ' : '') : ''
  output += (!round || !output.length) && s > 0 ? isNegPrefix + s + 's' : ''

  if (!output.length || (!round && timestamp < 60 * 1000 && timestamp > s * 1000))
    output += (output.length ? ', ' : '') + isNegPrefix + (timestamp - s * 1000) + 'ms'

  return output.trim()
}

export function randomString(length = 16, characters = 'abcdefghijklmnopqrstuvwxyz0123456789') {
  let output = ``

  const charactersLength = characters.length

  for (let i = 0; i < length; i++) {
    output += characters.charAt(Math.floor(Math.random() * charactersLength))
  }

  return output
}

export function uniqueName(name, names) {
  const base = name.substr()
  let variante = 1

  while (names.indexOf(name) !== -1) {
    name = base + ++variante
  }

  return name
}

export function movingAverage(accumulator, newValue, alpha) {
  return alpha * newValue + (1.0 - alpha) * accumulator
}

export function formatTime(time) {
  const date = new Date(time * 1000)

  return date.getDate() + '/' + (date.getMonth() + 1) + ' ' + date.toTimeString().split(' ')[0]
}

export function camelToSentence(str) {
  str = str.replace(/([A-Z])/g, ' $1')
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function snakeToSentence(str) {
  str = str.replace(/_/g, ' ')
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export const setValueByDotNotation = (object, path, value) => {
  if (path.length === 1) object[path[0]] = value
  else if (path.length === 0) throw 'error'
  else {
    if (object[path[0]]) return setValueByDotNotation(object[path[0]], path.slice(1), value)
    else {
      object[path[0]] = {}
      return setValueByDotNotation(object[path[0]], path.slice(1), value)
    }
  }
}

export const slugify = string => {
  const a = 'àáâäæãåāăąçćčđďèéêëēėęěğǵḧîïíīįìłḿñńǹňôöòóœøōõőṕŕřßśšşșťțûüùúūǘůűųẃẍÿýžźż·/_,:;'
  const b = 'aaaaaaaaaacccddeeeeeeeegghiiiiiilmnnnnoooooooooprrsssssttuuuuuuuuuwxyyzzz------'
  const p = new RegExp(a.split('').join('|'), 'g')

  return string
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(p, c => b.charAt(a.indexOf(c))) // Replace special characters
    .replace(/&/g, '-and-') // Replace & with 'and'
    .replace(/[^\w-]+/g, '') // Remove all non-word characters
    .replace(/--+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, '') // Trim - from end of text
}

export const downloadJson = (json, filename) => {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(json, null, 2))
  const downloadAnchorNode = document.createElement('a')
  downloadAnchorNode.setAttribute('href', dataStr)
  downloadAnchorNode.setAttribute('download', filename + '.json')
  document.body.appendChild(downloadAnchorNode) // required for firefox
  downloadAnchorNode.click()
  downloadAnchorNode.remove()
}

export function sleep(duration = 1000): Promise<void> {
  return new Promise(resolve => {
    setTimeout(() => resolve(), duration)
  })
}

export function array_move(arr, old_index, new_index) {
  if (new_index >= arr.length) {
    let k = new_index - arr.length + 1
    while (k--) {
      arr.push(undefined)
    }
  }

  arr.splice(new_index, 0, arr.splice(old_index, 1)[0])
}

export function getSerieSettings(paneId: string, serieId: string) {
  const serieSettings = store.state[paneId].series[serieId] || {}
  const defaultSerieSettings = defaultChartSeries[serieId] || {}

  return {
    ...defaultSerieSettings,
    ...serieSettings,
    options: Object.assign({}, defaultSerieSettings.options || {}, serieSettings.options || {}),
    id: serieId
  }
}

export function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

/*
export function getAllSeries() {
  const ids = Object.keys(store.state.settings.series)
    .concat(Object.keys(defaultChartSeries))
    .filter((x, i, a) => a.indexOf(x) == i)

  return ids.reduce((series, id) => {
    series.push(getSerieSettings(id))

    return series
  }, [])
}
*/

export function getErrorMessage(error: Error | string) {
  let errorMessage = 'Something wrong happened.'

  if (error instanceof Error) {
    errorMessage = error.message
  } else if (typeof error === 'string') {
    errorMessage = error
  }

  return errorMessage
}

export function getBucketId(markets: string[]) {
  return markets
    .map(m => m.replace(/[^a-zA-Z]+/gi, ''))
    .sort(function(mA, mB) {
      return mA.localeCompare(mB)
    })
    .join('')
}

export function parseMarket(market: string) {
  return market.match(/([^:]*):(.*)/).slice(1, 3)
}
