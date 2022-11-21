export function isTouchSupported() {
  const prefixes = ' -webkit- -moz- -o- -ms- '.split(' ')
  const mq = function (query) {
    return window.matchMedia(query).matches
  }

  if ('ontouchstart' in window) {
    return true
  }

  // include the 'heartz' as a way to have a non matching MQ to help terminate the join
  // https://git.io/vznFH
  const query = ['(', prefixes.join('touch-enabled),('), 'heartz', ')'].join('')
  return mq(query)
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
