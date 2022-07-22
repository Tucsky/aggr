import store from '@/store'

const DAY = 60 * 60 * 24

export function ago(timestamp) {
  if (!timestamp) {
    return '0s'
  }

  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  let interval, output

  if ((interval = Math.floor(seconds / 31536000)) > 1) {
    output = interval + 'yr'
  } else if ((interval = Math.floor(seconds / 2592000)) >= 1) {
    output = interval + 'mo'
  } else if ((interval = Math.floor(seconds / 86400)) >= 1) {
    output = interval + 'd'
  } else if ((interval = Math.floor(seconds / 3600)) >= 1) {
    output = interval + 'h'
  } else if ((interval = Math.floor(seconds / 60)) >= 1) {
    output = interval + 'm'
  } else {
    output = Math.ceil(seconds) + 's'
  }
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

  output +=
    (!round || !output.length) && d > 0
      ? (output.length ? ', ' : '') + isNegPrefix + d + 'd'
      : ''
  output +=
    (!round || !output.length) && h > 0
      ? (output.length ? ', ' : '') + isNegPrefix + h + 'h'
      : ''
  output +=
    (!round || !output.length) && m > 0
      ? (output.length ? ', ' : '') + isNegPrefix + m + 'm'
      : ''
  output +=
    (!round || !output.length) && s > 0
      ? (output.length ? ', ' : '') + isNegPrefix + s + 's'
      : ''

  if (
    !output.length ||
    (!round && timestamp < 60 * 1000 && timestamp > s * 1000)
  )
    output +=
      (output.length ? ', ' : '') + isNegPrefix + (timestamp - s * 1000) + 'ms'

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

export const slugify = string => {
  const a =
    'àáâäæãåāăąçćčđďèéêëēėęěğǵḧîïíīįìłḿñńǹňôöòóœøōõőṕŕřßśšşșťțûüùúūǘůűųẃẍÿýžźż·/_,:;'
  const b =
    'aaaaaaaaaacccddeeeeeeeegghiiiiiilmnnnnoooooooooprrsssssttuuuuuuuuuwxyyzzz------'
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

export const downloadAnything = (data, filename) => {
  const downloadAnchorNode = document.createElement('a')

  let href

  if (!data) {
    return
  }

  if (data instanceof Blob) {
    href = URL.createObjectURL(data)
  } else if (typeof data === 'object') {
    href =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(data, null, 2))
  } else if (typeof data === 'string') {
    href = 'data:text/json;charset=utf-8,' + encodeURIComponent(data)
  }

  downloadAnchorNode.setAttribute('href', href)
  downloadAnchorNode.setAttribute('download', filename + '.txt')
  document.body.appendChild(downloadAnchorNode)
  downloadAnchorNode.click()
  downloadAnchorNode.remove()
}

export function uniqueName(name, names, slug?: boolean, suffix = ' copy 1') {
  while (!name || names.indexOf(name) !== -1) {
    if (!name) {
      // random alphanum
      name = randomString(4)
    } else {
      // id + 1 (myworkspace1 then myworkspace2 then myworkspace3 etc)
      if (!/\d$/.test(name)) {
        name = name + suffix
      } else {
        name = name.replace(
          /\d+$/,
          (+((name.match(/\d+$/) as string[]) || ['0'])[0] + 1).toString()
        )
      }
    }
  }

  return slug ? slugify(name) : name
}

export function sleep(duration = 1000): Promise<void> {
  return new Promise(resolve => {
    setTimeout(() => resolve(), duration)
  })
}

export function getBucketId(markets: string[]) {
  return markets
    .map(m => m.replace(/[^a-zA-Z]+/gi, ''))
    .sort(function(mA, mB) {
      return mA.localeCompare(mB)
    })
    .join('')
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

export function findClosingBracketMatchIndex(
  str,
  pos,
  open = /\(/,
  close = /\)/
) {
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

export function parseFunctionArguments(
  str,
  trimArguments = true,
  maxIterations = 100
) {
  const PARANTHESIS_REGEX = /\(|{|\[/g
  let paranthesisMatch
  let iteration = 0
  do {
    if ((paranthesisMatch = PARANTHESIS_REGEX.exec(str))) {
      iteration++
      const closingParenthesisIndex = findClosingBracketMatchIndex(
        str,
        paranthesisMatch.index,
        /\(|{|\[/,
        /\)|}|\]/
      )
      const contentWithinParenthesis = str
        .slice(paranthesisMatch.index + 1, closingParenthesisIndex)
        .replace(/,/g, '#COMMA#')
      str =
        str.slice(0, paranthesisMatch.index + 1) +
        contentWithinParenthesis +
        str.slice(closingParenthesisIndex, str.length)
    }
  } while (paranthesisMatch && iteration < maxIterations)

  if (iteration >= maxIterations) {
    throw new Error('Maxiumum parseFunctionArguments iteration reached')
  }

  return str.split(',').map(arg => {
    if (trimArguments) {
      arg = arg.trim()
    }

    return arg.replace(/#COMMA#/g, ',')
  })
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
}

export function browseFile(): Promise<File> {
  const input = document.createElement('input') as HTMLInputElement
  input.type = 'file'

  return new Promise(resolve => {
    input.onchange = (event: any) => {
      if (!event.target.files.length) {
        resolve(null)
      }

      resolve(event.target.files[0])
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
  if (timeframe === null) {
    return 'ERR'
  }

  const normalized = timeframe.toString().trim()

  if (normalized[normalized.length - 1] === 't') {
    return parseInt(normalized) + ' ticks'
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
  return Array.prototype.filter.call(elem.parentNode.children, function(
    sibling
  ) {
    return sibling !== elem
  })
}

export function isOddTimeframe(timeframe) {
  return DAY % timeframe !== 0 && timeframe < DAY
}

export function floorTimestampToTimeframe(
  timestamp: number,
  timeframe: number,
  isOdd?: boolean
) {
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

export function parseVersion(version: string): number {
  if (!version) {
    return 0
  }

  return +version
    .split('.')
    .map(n => n.padStart(2, '0'))
    .join('')
}

export function handleFetchError(err): void {
  if (err instanceof Error) {
    const hasSomethingToSay = err.message && err.message !== 'Failed to fetch'

    if (hasSomethingToSay) {
      store.dispatch('app/showNotice', {
        title: err.message,
        type: 'error',
        timeout: 10000
      })
    } else {
      if (/aggr\.trade$/.test(location.hostname)) {
        store.dispatch('app/showNotice', {
          title: `Aggr server seems down 💀`,
          type: 'error',
          timeout: 10000
        })
      } else {
        store.dispatch('app/showNotice', {
          id: 'fetch-error',
          html: true,
          title: `Failed to reach api<br><a href="https://github.com/Tucsky/aggr-server">Configure aggr-server</a> <strong>to use your own data</strong>`,
          type: 'error',
          timeout: 10000
        })
      }
    }
  }
}

export function getApiUrl(path: string): string {
  let base = process.env.VUE_APP_API_URL

  if (!/\/$/.test(base)) {
    base += '/'
  }

  return base + path
}

export function getEventCords(event) {
  if (event.type.match(/^touch/i)) {
    const touch = event.touches[0]
    return { x: touch.clientX, y: touch.clientY }
  }
  if (event.type.match(/^mouse/i)) {
    return { x: event.clientX, y: event.clientY }
  }
  return { x: 0, y: 0 }
}

export function debounce(func, immediate = false) {
  let timeout
  return function(...args) {
    const later = (...args) => {
      timeout = null

      if (!immediate) {
        func(...args)
      }
    }

    const callNow = immediate && !timeout

    window.cancelAnimationFrame(timeout)

    timeout = window.requestAnimationFrame(later)

    if (callNow) {
      func(...args)
    }
  }
}

export function getClosestValue(array, value) {
  return array.reduce((prev, curr) => {
    return Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
  })
}
