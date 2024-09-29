import settings from '../settings'

export function randomString(
  length = 16,
  characters = 'abcdefghijklmnopqrstuvwxyz0123456789'
) {
  let output = ``

  const charactersLength = characters.length

  for (let i = 0; i < length; i++) {
    output += characters.charAt(Math.floor(Math.random() * charactersLength))
  }

  return output
}

export function parseMarket(market: string) {
  return market.match(/([^:]*):(.*)/).slice(1, 3)
}

export function getHms(timestamp, round = false, divider = ',') {
  if (isNaN(timestamp) || timestamp === null) {
    return null
  }

  const isNegPrefix = timestamp < 0 ? '-' : ''
  timestamp = Math.abs(timestamp)

  const d = Math.floor(timestamp / 1000 / 86400)
  const h = Math.floor(((timestamp / 1000) % 86400) / 3600)
  const m = Math.floor(((timestamp / 1000) % 3600) / 60)
  const s = Math.floor(((timestamp / 1000) % 3600) % 60)

  let output = ''

  output +=
    (!round || !output.length) && d > 0
      ? (output.length ? `${divider} ` : '') + isNegPrefix + d + 'd'
      : ''
  output +=
    (!round || !output.length) && h > 0
      ? (output.length ? `${divider} ` : '') + isNegPrefix + h + 'h'
      : ''
  output +=
    (!round || !output.length) && m > 0
      ? (output.length ? `${divider} ` : '') + isNegPrefix + m + 'm'
      : ''
  output +=
    (!round || !output.length) && s > 0
      ? (output.length ? `${divider} ` : '') + isNegPrefix + s + 's'
      : ''

  if (
    !output.length ||
    (!round && timestamp < 60 * 1000 && timestamp > s * 1000)
  )
    output +=
      (output.length ? `${divider} ` : '') +
      isNegPrefix +
      (timestamp - s * 1000) +
      'ms'

  return output.trim()
}

export function sleep(duration = 1000): Promise<void> {
  return new Promise(resolve => {
    setTimeout(() => resolve(), duration)
  })
}

export function calculateSlippage(previousPrice, currentPrice) {
  if (settings.calculateSlippage === 'price') {
    return currentPrice - previousPrice
  } else if (settings.calculateSlippage === 'bps') {
    if (currentPrice > previousPrice) {
      return ((currentPrice - previousPrice) / previousPrice) * 10000
    } else {
      return ((previousPrice - currentPrice) / currentPrice) * 10000
    }
  }

  return 0
}
