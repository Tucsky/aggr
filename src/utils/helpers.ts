import dialogService from '@/services/dialogService'
import store from '../store'

const DAY = 60 * 60 * 24

export function formatAmount(amount, decimals?: number) {
  const negative = amount < 0

  amount = Math.abs(amount)

  if (amount >= 1000000000) {
    amount = +(amount / 1000000000).toFixed(isNaN(decimals) ? 1 : decimals) + 'B'
  } else if (amount >= 1000000) {
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

export function ago(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
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

  const d = Math.floor(timestamp / 1000 / 86400)
  const h = Math.floor(((timestamp / 1000) % 86400) / 3600)
  const m = Math.floor(((timestamp / 1000) % 3600) / 60)
  const s = Math.floor(((timestamp / 1000) % 3600) % 60)

  let output = ''

  output += (!round || !output.length) && d > 0 ? (output.length ? ', ' : '') + isNegPrefix + d + 'd' : ''
  output += (!round || !output.length) && h > 0 ? (output.length ? ', ' : '') + isNegPrefix + h + 'h' : ''
  output += (!round || !output.length) && m > 0 ? (output.length ? ', ' : '') + isNegPrefix + m + 'm' : ''
  output += (!round || !output.length) && s > 0 ? (output.length ? ', ' : '') + isNegPrefix + s + 's' : ''

  if (!output.length || (!round && timestamp < 60 * 1000 && timestamp > s * 1000))
    output += (output.length ? ', ' : '') + isNegPrefix + (timestamp - s * 1000) + 'ms'

  return output.trim()
}

export function getHmsFull(timestamp, round = false) {
  let output = getHms(timestamp, round)
  output = output.replace(/\b1s\b/, '1 second')
  output = output.replace(/(\d)s\b/, '$1 seconds')
  output = output.replace(/\b1m\b/, '1 minute')
  output = output.replace(/(\d)m\b/, '$1 minutes')
  output = output.replace(/\b1h\b/, '1 hour')
  output = output.replace(/(\d)h\b/, '$1 hours')
  output = output.replace(/\b1d\b/, '1 day')
  output = output.replace(/(\d)d\b/, '$1 days')

  return output
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

export function formatTime(time) {
  const date = new Date(time * 1000)

  return date.getDate() + '/' + (date.getMonth() + 1) + ' ' + date.toTimeString().split(' ')[0]
}

export const deepSet = (object, path, value) => {
  if (path.length === 1) object[path[0]] = value
  else if (path.length === 0) throw 'error'
  else {
    if (object[path[0]]) return deepSet(object[path[0]], path.slice(1), value)
    else {
      object[path[0]] = {}
      return deepSet(object[path[0]], path.slice(1), value)
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

export function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

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

export function openBase64InNewTab(data, mimeType) {
  const byteCharacters = atob(data)
  const byteNumbers = new Array(byteCharacters.length)
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }
  const byteArray = new Uint8Array(byteNumbers)
  const file = new Blob([byteArray], { type: mimeType + ';base64' })
  const fileURL = URL.createObjectURL(file)
  window.open(fileURL)
}

export function findClosingBracketMatchIndex(str, pos, open = /\(/, close = /\)/) {
  if (!open.test(str[pos])) {
    throw new Error('No ' + open.toString() + ' at index ' + pos)
  }

  let depth = 1

  for (let i = pos + 1; i < str.length; i++) {
    if (close.test(str[i])) {
      if (--depth == 0) {
        return i
      }
    } else if (open.test(str[i])) {
      depth++
    }
  }
  return -1 // No matching closing parenthesis
}

export function parseFunctionArguments(str) {
  const PARANTHESIS_REGEX = /\(|{|\[/g
  let paranthesisMatch
  let iteration = 0
  do {
    if ((paranthesisMatch = PARANTHESIS_REGEX.exec(str))) {
      iteration++
      const closingParenthesisIndex = findClosingBracketMatchIndex(str, paranthesisMatch.index, /\(|{|\[/, /\)|}|\]/)
      const contentWithinParenthesis = str.slice(paranthesisMatch.index + 1, closingParenthesisIndex).replace(/,/g, '#COMMA#')
      str = str.slice(0, paranthesisMatch.index + 1) + contentWithinParenthesis + str.slice(closingParenthesisIndex, str.length)
    }
  } while (paranthesisMatch && iteration < 100)

  if (iteration >= 100) {
    throw new Error('maxiumum parseFunctionArguments iteration reached')
  }

  return str.split(',').map(arg => arg.trim().replace(/#COMMA#/g, ','))
}

export function camelize(str) {
  return str.replace(/-([a-z])/g, function(g) {
    return g[1].toUpperCase()
  })
}

export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

export function getDiff(obj, model) {
  if (typeof model === 'undefined' || typeof obj === 'undefined') {
    return obj
  }

  const isArray = Array.isArray(obj)

  for (const prop in obj) {
    if (Array.isArray(obj) && obj[prop] && model[prop] && obj[prop].id !== model[prop].id) {
      continue
    }

    if (!isArray && prop !== '_id' && obj[prop] === model[prop]) {
      delete obj[prop]
      continue
    }

    if (obj[prop] && typeof obj[prop] === 'object') {
      obj[prop] = getDiff(obj[prop], model[prop])
    }
  }

  return obj
}

export function isElementInteractive(el: HTMLElement) {
  while (el) {
    if (el.tagName === 'A' || el.tagName === 'BUTTON') {
      return true
    }

    el = el.parentElement
  }

  return false
}

export function fallbackCopyTextToClipboard(text) {
  const textArea = document.createElement('textarea')
  textArea.value = text

  // Avoid scrolling to bottom
  textArea.style.top = '0'
  textArea.style.left = '0'
  textArea.style.position = 'fixed'

  document.body.appendChild(textArea)
  textArea.focus()
  textArea.select()

  try {
    const successful = document.execCommand('copy')
    const msg = successful ? 'successful' : 'unsuccessful'
    console.log('Fallback: Copying text command was ' + msg)
  } catch (err) {
    console.error('Fallback: Oops, unable to copy', err)
  }

  document.body.removeChild(textArea)
}

export function browseFile(): Promise<string | ArrayBuffer> {
  const input = document.createElement('input') as HTMLInputElement
  input.type = 'file'

  return new Promise(resolve => {
    input.onchange = (event: any) => {
      if (!event.target.files.length) {
        throw new Error('Invalid selection')
      }

      const file = event.target.files[0]
      const reader = new FileReader()
      reader.readAsText(file, 'UTF-8')

      reader.onload = async readerEvent => {
        return dialogService
          .confirm({
            title: 'Disclaimer',
            message: `Aggr disclaims all liability for damages , consequential or otherwise,<br>arising out of or in connection with the current import.`,
            ok: 'I understand',
            cancel: 'Cancel import'
          })
          .then(accepted => {
            if (accepted) {
              resolve(readerEvent.target.result)
            } else {
              throw new Error('Rejected disclaimer')
            }
          })
      }
    }

    input.click()
  })
}

export function copyTextToClipboard(text) {
  if (!navigator.clipboard) {
    fallbackCopyTextToClipboard(text)
    return Promise.resolve()
  }

  return navigator.clipboard.writeText(text)
}

export function getTimeframeForHuman(timeframe, full?: boolean) {
  const normalized = timeframe.toString().trim()

  if (normalized[normalized.length - 1] === 't') {
    return parseInt(normalized) + ' TICKS'
  } else if (!isNaN(normalized) && normalized > 0) {
    return full ? getHmsFull(normalized * 1000) : getHms(normalized * 1000)
  }

  return null
}

export function getScrollParent(node) {
  if (node == null) {
    return null
  }

  if (node.id === 'app') {
    return node
  }

  const overflowY = window.getComputedStyle(node).overflowY
  const isScrollable = overflowY !== 'visible' && overflowY !== 'hidden'

  if (isScrollable && node.scrollHeight > node.clientHeight) {
    return node
  } else {
    return getScrollParent(node.parentNode)
  }
}

export function getSiblings(elem) {
  return Array.prototype.filter.call(elem.parentNode.children, function(sibling) {
    return sibling !== elem
  })
}

export function isOddTimeframe(timeframe) {
  return DAY % timeframe !== 0 && timeframe < DAY
}

export function floorTimestampToTimeframe(timestamp: number, timeframe: number, isOdd?: boolean) {
  if (typeof isOdd === 'undefined') {
    isOdd = isOddTimeframe(timeframe)
  }

  if (isOdd) {
    const dayOpen = Math.floor(timestamp / DAY) * DAY
    return dayOpen + Math.floor((timestamp - dayOpen) / timeframe) * timeframe
  } else {
    return Math.floor(timestamp / timeframe) * timeframe
  }
}
