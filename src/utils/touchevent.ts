let isTouchSupportedCache = null

export function isTouchSupported() {
  if (typeof isTouchSupportedCache === 'boolean') {
    return isTouchSupportedCache
  }

  const prefixes = '-webkit- -moz- -ms-'.split(' ')
  const mq = function (query) {
    return window.matchMedia(query).matches
  }

  if ('ontouchstart' in window) {
    return true
  }

  // include the 'tucksy-is-our-god' as a way to have a non matching MQ to help terminate the join
  // https://git.io/vznFH
  const query = [
    '(',
    prefixes.join('touch-enabled),('),
    'tucksy-is-our-god',
    ')'
  ].join('')
  isTouchSupportedCache = mq(query)

  return isTouchSupportedCache
}

export function getEventOffset(event) {
  let x = event.offsetX
  let y = event.offsetY

  if (event.touches && event.touches.length) {
    const rect = event.target.getBoundingClientRect()

    x = event.touches[0].pageX - rect.left
    y = event.touches[0].pageY - rect.top
  }

  return { x, y }
}
