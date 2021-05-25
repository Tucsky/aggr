/**
 * get 1 ohlc bar out of actives exchanges in bar
 * simple average
 * @param {Renderer} renderer
 */
export function avg_ohlc$(state, renderer) {
  let nbSources = 0
  let setOpen = false

  if (typeof state.open === 'undefined') {
    setOpen = true
    state.open = 0
  }

  state.high = 0
  state.low = 0
  state.close = 0

  for (const identifier in renderer.sources) {
    if (setOpen) {
      state.open += renderer.sources[identifier].open
    }

    state.high += renderer.sources[identifier].high
    state.low += renderer.sources[identifier].low
    state.close += renderer.sources[identifier].close

    nbSources++
  }

  if (!nbSources) {
    nbSources = 1
  }

  if (setOpen) {
    state.open /= nbSources
  }

  state.high /= nbSources
  state.low /= nbSources
  state.close /= nbSources
  if (isNaN(state.close)) {
    throw new Error('is NaN!')
  }

  return { open: state.open, high: state.high, low: state.low, close: state.close }
}

/**
 * get 1 ohlc bar out of actives exchanges in bar
 * simple average
 * @param {Renderer} renderer
 */
export function avg_close$(state, renderer) {
  let nbSources = 0

  state.close = 0

  for (const identifier in renderer.sources) {
    state.close += renderer.sources[identifier].close

    nbSources++
  }

  if (!nbSources) {
    nbSources = 1
  }

  state.close /= nbSources
  if (isNaN(state.close)) {
    throw new Error('is NaN!')
  }

  return state.close
}

/**
 * get 1 ohlc bar out of actives exchanges in bar
 * simple average
 * @param {Renderer} renderer
 */
export function ohlc$(state, value) {
  if (typeof state.open === 'undefined') {
    state.open = value
    state.high = value
    state.low = value
  }

  state.high = Math.max(state.high, value)
  state.low = Math.min(state.low, value)
  state.close = value

  return { open: state.open, high: state.high, low: state.low, close: state.close }
}

/**
 * get 1 ohlc bar out of actives exchanges in bar
 * simple average
 * @param {Renderer} renderer
 */
export function cum_ohlc$(state, value) {
  if (typeof state.open === 'undefined') {
    state.open = value
    state.high = value
    state.low = value
  } else {
    value = state.open + value
  }

  state.high = Math.max(state.high, value)
  state.low = Math.min(state.low, value)
  state.close = value

  return { open: state.open, high: state.high, low: state.low, close: state.close }
}

/**
 * get 1 ohlc bar out of actives exchanges in bar
 * simple average
 * @param {Renderer} renderer
 */
export function cum$(state, value) {
  if (typeof state.open === 'undefined') {
    state.open = value
  }

  state.close = state.open + value

  return state.close
}

/**
 * exponential moving average
 * @param {SerieMemory} memory
 * @param {number} value
 */
export function ema$(state, value, length) {
  const k = 2 / (length + 1)

  if (state.count) {
    const last = state.points[state.points.length - 1]
    state.output = (value - last) * k + last
  } else {
    state.output = value
  }

  return state.output
}

/**
 * get highest
 * @param {SerieMemory} memory
 * @param {number} value
 */
export function highest$(state, value, length) {
  state.output = value

  if (state.count) {
    return Math.max.apply(null, state.points)
  } else {
    return value
  }
}

/**
 * get lowest
 * @param {SerieMemory} memory
 * @param {number} value
 */
export function lowest$(state, value, length) {
  state.output = value

  if (state.count) {
    return Math.min.apply(null, state.points)
  } else {
    return value
  }
}

export function linreg$(state, values) {
  if (values.length <= 1) {
    return null
  }

  let per = 0
  let sumX = 0
  let sumY = 0
  let sumXSqr = 0
  let sumXY = 0

  for (let i = values.length - 1; i >= 0; i--) {
    per = (values.length - i) + 1.0
    sumX += per
    sumY += values[i]
    sumXSqr += per * per
    sumXY += values[i] * per
  }

  const slope = (values.length * sumXY - sumX * sumY) / (values.length * sumXSqr - sumX * sumX)
  const average = sumY / values.length
  const intercept = average - (slope * sumX) / values.length + slope

  return intercept + slope * (values.length - 1)
}

/**
 * get avg
 * @param {SerieMemory} memory
 * @param {number[]} values
 */
export function avg$(state, values) {
  const count = values.length
  let sum = 0
  for (let i = 0; i < values.length; i++) {
    sum += values[i]
  }

  return sum / count
}

/**
 * simple moving average
 * @param {SerieMemory} memory
 * @param {number} value
 */
export function sma$(state, value) {
  const average = (state.sum + value) / (state.count + 1)
  state.output = value
  return average
}

/**
 * cumulative moving average
 * @param {SerieMemory} memory
 * @param {number} value
 */
export function cma$(state, value) {
  state.output = (state.sum + value) / (state.count + 1)
  return state.output
}
