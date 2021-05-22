export function countDecimals(value) {
  if (Math.floor(value) === value) return 0
  return value.toString().split('.')[1].length || 0
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

export function parseMarket(market: string) {
  return market.match(/([^:]*):(.*)/).slice(1, 3)
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
  } else {
    amount = +amount.toFixed(4)
  }

  if (negative) {
    return '-' + amount
  } else {
    return amount
  }
}

export function sleep(duration = 1000): Promise<void> {
  return new Promise(resolve => {
    setTimeout(() => resolve(), duration)
  })
}