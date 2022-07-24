/* eslint-disable @typescript-eslint/no-unused-vars */
import { IndicatorFunction } from './chart'

/**
 * Close ohlc bar (all props to close value for smooth transition, but also fake opens)
 * @param fn
 */
function closeOHLC(fn: IndicatorFunction) {
  fn.state.open = fn.state.close
  fn.state.high = fn.state.close
  fn.state.low = fn.state.close
}

/**
 * Save (unaltered) copy of ohlc in state.point
 * @param fn
 */
function copyOHLC(fn: IndicatorFunction) {
  fn.state.point = {
    open: fn.state.open,
    high: fn.state.high,
    low: fn.state.low,
    close: fn.state.close
  }
}

/**
 * Close ohlc (without keeping memory of previous close, making for real ohlc bars)
 * @param fn
 */
function closeOHLCWithGaps(fn: IndicatorFunction) {
  fn.state.open = null
  fn.state.high = null
  fn.state.low = null
}

/**
 * Adds current fn value to point array when candle close
 * @param fn
 */
function accumulatePoints(fn: IndicatorFunction) {
  fn.state.points.push(fn.state.output)
  fn.state.count++

  if (fn.state.count > fn.length - 1) {
    fn.state.points.shift()
    fn.state.count--
  }
}

/**
 * Adds current fn value to point array when candle close
 * + store sum & count for easy access (& not having to loop through)
 * @param fn
 */
function accumulatePointsAverage(fn: IndicatorFunction) {
  fn.state.points.push(fn.state.output)

  fn.state.sum += fn.state.output
  fn.state.count++

  if (fn.state.count > fn.length - 1) {
    fn.state.sum -= fn.state.points.shift()
    fn.state.count--
  }
}

/**
 * Adds current fn value to point array when candle close
 * + store sum & count for easy access (& not having to loop through)
 * @param fn
 */
function accumulateStoch(fn: IndicatorFunction) {
  fn.state.lows.push(fn.state.low)
  fn.state.highs.push(fn.state.high)
  fn.state.count++

  if (fn.state.count > fn.length - 1) {
    fn.state.lows.shift()
    fn.state.highs.shift()
    fn.state.count--
  }
}

// built-int functions are composed of the following
// - a name (the keys)
// - a update function (is called every time the chart is getting new data)
// - a state object (the memory of the function, it's optional but most have one)
// - a next function (called when on new bar - usualy to mutate the state and store current value somewhere safe)
export default {
  /**
   * produce averaged ohlc of active sources bars contained in the renderer bar
   * use classic aggr printing (last close = next open)
   * @param renderer the full bar object
   * @returns {object} close
   */
  avg_ohlc: {
    state: {
      open: null,
      high: null,
      low: null,
      close: null
    },
    next: closeOHLC,
    update(state, renderer) {
      let nbSources = 0
      let setOpen = false

      let open
      let high = 0
      let low = 0
      let close = 0

      if (state.open === null) {
        setOpen = true
        open = 0
      }

      for (const identifier in renderer.sources) {
        if (
          !renderer.sources[identifier].active ||
          renderer.sources[identifier].open === null
        ) {
          continue
        }

        if (setOpen) {
          open += renderer.sources[identifier].open
        }

        high += renderer.sources[identifier].high
        low += renderer.sources[identifier].low
        close += renderer.sources[identifier].close

        nbSources++
      }

      if (!nbSources) {
        return { time: renderer.localTimestamp }
      }

      if (setOpen) {
        state.open = open / nbSources
      }

      state.high = Math.max(state.open, high / nbSources)
      state.low = Math.min(state.open, low / nbSources)
      state.close = close / nbSources

      return {
        time: renderer.localTimestamp,
        open: state.open,
        high: state.high,
        low: state.low,
        close: state.close
      }
    }
  },
  /**
   * produce averaged ohlc of active sources bars contained in the renderer bar
   * use Heikin-Ashi technique (means "average bar" in Japanese)
   * @param renderer the full bar object
   * @returns {object} close
   */
  avg_heikinashi: {
    state: {
      open: null,
      high: null,
      low: null,
      close: null
    },
    next: copyOHLC,
    update(state, renderer) {
      let nbSources = 0

      state.open = 0
      state.high = 0
      state.low = 0
      state.close = 0

      for (const identifier in renderer.sources) {
        if (
          !renderer.sources[identifier].active ||
          renderer.sources[identifier].open === null
        ) {
          continue
        }

        state.open += renderer.sources[identifier].open
        state.high += renderer.sources[identifier].high
        state.low += renderer.sources[identifier].low
        state.close += renderer.sources[identifier].close

        nbSources++
      }

      if (!nbSources) {
        nbSources = 1
      }

      state.high /= nbSources
      state.low /= nbSources
      state.open /= nbSources
      state.close =
        (state.open + state.high + state.low + state.close / nbSources) / 4

      if (typeof state.point !== 'undefined') {
        state.open = (state.point.open + state.point.close) / 2
      } else {
        state.open = (state.open + state.close) / 2
      }

      state.low = Math.min(state.open, state.low, state.close)
      state.high = Math.max(state.open, state.high, state.close)

      return {
        time: renderer.localTimestamp,
        open: state.open,
        high: state.high,
        low: state.low,
        close: state.close
      }
    }
  },
  /**
   * produce averaged ohlc of active sources bars contained in the renderer bar
   * calculate average open on every candle
   * @param renderer the full bar object
   * @returns {object} close
   */
  avg_ohlc_with_gaps: {
    state: {
      open: null,
      high: null,
      low: null,
      close: null
    },
    next: closeOHLCWithGaps,
    update(state, renderer) {
      let nbSources = 0

      let open = 0
      let high = 0
      let low = 0
      let close = 0

      for (const identifier in renderer.sources) {
        if (
          !renderer.sources[identifier].active ||
          renderer.sources[identifier].open === null
        ) {
          continue
        }

        open += renderer.sources[identifier].open
        high += renderer.sources[identifier].high
        low += renderer.sources[identifier].low
        close += renderer.sources[identifier].close

        nbSources++
      }

      if (!nbSources) {
        return { time: renderer.localTimestamp }
      }

      state.open = open / nbSources
      state.high = Math.max(
        state.high === null ? -Infinity : state.high,
        high / nbSources
      )
      state.low = Math.min(
        state.low === null ? Infinity : state.low,
        low / nbSources
      )
      state.close = close / nbSources

      return {
        time: renderer.localTimestamp,
        open: state.open,
        high: state.high,
        low: state.low,
        close: state.close
      }
    }
  },
  /**
   * produce averaged close of active sources bars contained in the renderer bar
   * simple average (sum / count)
   * @param renderer the full bar object
   * @returns {Number} close
   */
  avg_close: {
    update(state, renderer) {
      let nbSources = 0

      state.close = 0

      for (const identifier in renderer.sources) {
        if (renderer.sources[identifier].open === null) {
          continue
        }

        state.close += renderer.sources[identifier].close

        nbSources++
      }

      if (!nbSources) {
        nbSources = 1
      }

      state.close /= nbSources

      return state.close
    }
  },
  ohlc: {
    args: [
      {
        instruction: 'renderer.localTimestamp',
        injected: true
      }
    ],
    next: closeOHLC,
    update(state, time, value) {
      if (typeof state.open === 'undefined') {
        state.open = value
        state.high = value
        state.low = value
      }

      state.high = Math.max(state.high, value)
      state.low = Math.min(state.low, value)
      state.close = value

      return {
        time: time,
        open: state.open,
        high: state.high,
        low: state.low,
        close: state.close
      }
    }
  },
  /**
   * output cumulative of a value as ohlc
   * previous bar value + current value
   * high & low are produced from the fluctuations within the bar (100% client side and so depends on chart refresh rate)
   * @param {Number} value value to cumulate
   * @param {Number} time time is required for ohlc (just use bar.localTimestamp)
   * @returns {Object} ohlc
   */
  cum_ohlc: {
    args: [
      {
        instruction: 'renderer.localTimestamp',
        injected: true
      }
    ],
    next: closeOHLC,
    update(state, time, value) {
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

      return {
        time: time,
        open: state.open,
        high: state.high,
        low: state.low,
        close: state.close
      }
    }
  },
  /**
   * output cumulative of a value
   * @param {Number} value value to cumulate
   * @returns {Number} previous bar value + current value
   */
  cum: {
    next: closeOHLC,
    update(state, value) {
      if (typeof state.open === 'undefined') {
        state.open = value
      }

      state.close = state.open + value

      return state.close
    }
  },
  /**
   * returns price of the pivot high point
   * the highest value of all the bars from lengthBefore & lengthAfter
   * @param {Number} value value to get pivot from
   * @param {Number} lengthBefore number of bars to check on left
   * @param {Number} lengthAfter number of bars to check on right
   * @returns {Number} pivot high found (will return null if no pivot found)
   */
  pivot_high: {
    args: [
      {},
      {
        length: true
      },
      {
        length: true
      }
    ],
    state: {
      points: [],
      count: 0
    },
    next: accumulatePoints,
    update(state, value, lengthBefore, lengthAfter) {
      state.output = value

      let middle = state.points[lengthBefore]

      if (typeof middle === 'undefined') {
        middle = value
      }

      const length = lengthBefore + lengthAfter

      for (let i = 0; i <= length; i++) {
        const current = i < length - 1 ? state.points[i] : value

        if (current > middle) {
          return null
        }
      }

      return middle
    }
  },
  /**
   * returns price of the pivot low point
   * the lowest value of all the bars from lengthBefore & lengthAfter
   * @param {Number} value value to get pivot from
   * @param {Number} lengthBefore number of bars to check on left
   * @param {Number} lengthAfter number of bars to check on right
   * @returns {Number} pivot low found (will return null if no pivot found)
   */
  pivot_low: {
    args: [
      {},
      {
        length: true
      },
      {
        length: true
      }
    ],
    state: {
      points: [],
      count: 0
    },
    next: accumulatePoints,
    update(state, value, lengthBefore, lengthAfter) {
      state.output = value

      let middle = state.points[lengthBefore]

      if (typeof middle === 'undefined') {
        middle = value
      }

      const length = lengthBefore + lengthAfter

      for (let i = 0; i <= length; i++) {
        const current = i < length - 1 ? state.points[i] : value

        if (current < middle) {
          return null
        }
      }

      return middle
    }
  },
  /**
   * the highest value within a set of bars
   * @param {Number} value
   * @param {Number} length number of bars to keep in the set
   * @returns {Number} highest value
   */
  highest: {
    args: [
      {},
      {
        length: true
      }
    ],
    state: {
      points: [],
      count: 0
    },
    next: accumulatePoints,
    update(state, value, length) {
      state.output = value

      if (state.count > 1) {
        return Math.max.apply(null, state.points)
      } else {
        return value
      }
    }
  },
  /**
   * the lowest value within a set of bars
   * @param {Number} value
   * @param {Number} length number of bars to keep in the set
   * @returns {Number} highest value
   */
  lowest: {
    args: [
      {},
      {
        length: true
      }
    ],
    state: {
      points: [],
      count: 0
    },
    next: accumulatePoints,
    update(state, value, length) {
      state.output = value

      if (state.count > 1) {
        return Math.min.apply(null, state.points)
      } else {
        return value
      }
    }
  },
  linreg: {
    args: [
      {},
      {
        length: true
      }
    ],
    state: {
      points: [],
      count: 0
    },
    next: accumulatePoints,
    update(state, value, length) {
      state.output = value

      if (state.count < 1) {
        return null
      }

      let count = 0
      let per = 0
      let sumX = 0
      let sumY = 0
      let sumXSqr = 0
      let sumXY = 0

      for (let i = 0; i <= state.points.length; i++) {
        const val = i === state.points.length ? value : state.points[i]
        per = i + 1
        sumX += per
        sumY += val
        sumXSqr += per * per
        sumXY += val * per
        count++
      }

      const slope =
        (count * sumXY - sumX * sumY) / (count * sumXSqr - sumX * sumX)
      const average = sumY / count
      const intercept = average - (slope * sumX) / length + slope

      return intercept + slope * (count - 1)
    }
  },
  avg: {
    update(state, values) {
      let count = 0
      let sum = 0

      for (let i = 0; i < values.length; i++) {
        if (values[i] === null) {
          continue
        }
        sum += values[i]
        count++
      }

      return sum / count
    }
  },
  sum: {
    args: [
      {},
      {
        length: true
      }
    ],
    state: {
      count: 0,
      sum: 0,
      points: []
    },
    next: accumulatePointsAverage,
    update(state, value) {
      state.output = value
      return state.sum + value
    }
  },
  sma: {
    args: [
      {},
      {
        length: true
      }
    ],
    state: {
      count: 0,
      sum: 0,
      points: []
    },
    next: accumulatePointsAverage,
    update(state, value) {
      const average = (state.sum + value) / (state.count + 1)
      state.output = value
      return average
    }
  },
  cma: {
    args: [
      {},
      {
        length: true
      }
    ],
    state: {
      count: 0,
      sum: 0,
      points: []
    },
    next: accumulatePointsAverage,
    update(state, value) {
      state.output = (state.sum + value) / (state.count + 1)
      return state.output
    }
  },
  ema: {
    args: [
      {},
      {
        length: true
      }
    ],
    state: {
      count: 0,
      sum: 0,
      points: []
    },
    next: accumulatePointsAverage,
    update(state, value, length) {
      const k = 2 / (length + 1)

      if (state.count) {
        const last = state.points[state.points.length - 1]
        state.output = (value - last) * k + last
      } else {
        state.output = value
      }

      return state.output
    }
  },
  last: {
    args: [
      {},
      {
        length: true
      }
    ],
    state: {
      points: [],
      count: 0
    },
    next: accumulatePoints,
    update(state, value) {
      state.output = value

      return state.count ? state.points[0] : value
    }
  },
  rma: {
    args: [
      {},
      {
        length: true
      }
    ],
    state: {
      count: 0,
      sum: 0,
      points: []
    },
    next: accumulatePointsAverage,
    update(state, value, length) {
      const k = 1 / length

      if (state.count) {
        const last = state.points[state.points.length - 1]
        state.output = k * value + (1 - k) * last
      } else {
        state.output = 1
      }

      return state.output
    }
  },
  merge_overlapping_intervals: {
    update(state, intervals) {
      return intervals
        .sort((a, b) => a[0] - b[0])
        .reduce(
          (acc, range) => {
            const indexOfLast = acc.length - 1
            const prevRange = acc[indexOfLast]
            const end = prevRange[1]
            const start = range[0]

            if (end >= start) {
              acc[indexOfLast][1] = Math.max(end, range[1])
            } else {
              acc.push(range)
            }

            return acc
          },
          [intervals[0]]
        )
    }
  },
  reverse_intervals: {
    update(state, intervals) {
      return intervals.reduce((acc, range, i, arr) => {
        if (i > 0) {
          acc[i - 1][1] = range[0]
        }

        if (i < arr.length - 1) {
          acc.push([range[1]])
        }

        return acc
      }, [])
    }
  },
  stoch: {
    args: [
      null,
      null,
      null,
      {
        length: true
      }
    ],
    state: {
      count: 0,
      lows: [],
      highs: []
    },
    next: accumulateStoch,
    update(state, close, high, low) {
      state.low = low
      const lowest =
        state.count > 0 ? Math.min(Math.min.apply(null, state.lows), low) : low

      state.high = high
      const highest =
        state.count > 0
          ? Math.max(Math.max.apply(null, state.highs), high)
          : high

      state.output = (100 * (close - lowest)) / (highest - lowest || 1)

      return state.output
    }
  }
}
