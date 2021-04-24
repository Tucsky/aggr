export default function() {
  const prefixes = ' -webkit- -moz- -o- -ms- '.split(' ')
  const mq = function(query) {
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
