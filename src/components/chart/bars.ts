import { Bar, Renderer } from './chart.d'
import { PrependState, registerPrependFromRealtime } from './prepend'

/**
 * fresh start for the renderer bar (and all its sources / markets)
 * @param {Renderer} bar bar to clear for next timestamp
 */
export function resetRendererBar(renderer: Renderer) {
  renderer.bar = {
    ...renderer.bar,
    vbuy: 0,
    vsell: 0,
    cbuy: 0,
    csell: 0,
    lbuy: 0,
    lsell: 0,
    empty: true
  }

  if (typeof renderer.sources !== 'undefined') {
    for (const identifier in renderer.sources) {
      resetBar(renderer.sources[identifier])
    }
  }
}

/**
 * preparing bar for next
 * @param {Bar} bar
 */
export function resetBar(bar: Bar) {
  if (bar.close !== null) {
    bar.open = bar.close
    bar.high = bar.close
    bar.low = bar.close
  }

  bar.vbuy = 0
  bar.vsell = 0
  bar.cbuy = 0
  bar.csell = 0
  bar.lbuy = 0
  bar.lsell = 0
  bar.empty = true

  return bar
}

/**
 * create a new object from an existing bar
 * to avoid reference when storing finished bar data to cache
 * @param {Bar} sourceBar do copy
 * @param {number} [timestamp] apply timestamp to returned bar
 */
export function cloneSourceBar(sourceBar: Bar, timestamp?: number): Bar {
  return {
    pair: sourceBar.pair,
    exchange: sourceBar.exchange,
    time: timestamp || sourceBar.time,
    open: sourceBar.open,
    high: sourceBar.high,
    low: sourceBar.low,
    close: sourceBar.close,
    vbuy: sourceBar.vbuy,
    vsell: sourceBar.vsell,
    cbuy: sourceBar.cbuy,
    csell: sourceBar.csell,
    lbuy: sourceBar.lbuy,
    lsell: sourceBar.lsell
  }
}

/**
 * Prepare the bars for render
 * Takes a bars array (from cache)
 * Merge with bar from activeRenderer
 * So that 1 bar = 1 source at 1 timestamp
 * @param bars cached bars
 * @param renderer renderer containing active bars
 * @returns {void} only bars content changes
 */
export function mergeBarsWithActiveBars(bars: Bar[], renderer: Renderer) {
  if (!bars.length) {
    if (renderer && renderer.bar && !renderer.bar.empty) {
      Array.prototype.push.apply(
        bars,
        Object.values(renderer.sources).filter(bar => bar.empty === false)
      )
    }
  } else if (renderer && renderer.timestamp > bars[bars.length - 1].time) {
    const activeBars = Object.values(renderer.sources).filter(
      bar => bar.empty === false
    )

    for (let i = 0; i < activeBars.length; i++) {
      const activeBar = activeBars[i]

      activeBar.time = renderer.timestamp

      for (let j = bars.length - 1; j >= 0; j--) {
        const cachedBar = bars[j]

        if (cachedBar.time < renderer.timestamp) {
          bars.splice(j + 1, 0, activeBar)
          activeBars.splice(i, 1)
          i--
          break
        } else if (
          cachedBar.exchange === activeBar.exchange &&
          cachedBar.pair === activeBar.pair
        ) {
          cachedBar.vbuy += activeBar.vbuy
          cachedBar.vsell += activeBar.vsell
          cachedBar.cbuy += activeBar.cbuy
          cachedBar.csell += activeBar.csell
          cachedBar.lbuy += activeBar.lbuy
          cachedBar.lsell += activeBar.lsell
          cachedBar.open = activeBar.open
          cachedBar.high = activeBar.high
          cachedBar.low = activeBar.low
          cachedBar.close = activeBar.close
          activeBars.splice(i, 1)
          i--

          break
        }
      }
    }
  }
}

export function registerInitialBar(
  renderer: Renderer,
  market: string,
  pair: string,
  exchange: string,
  close: number,
  active?: boolean,
  prepend?: PrependState
) {
  renderer.sources[market] = {
    pair: pair,
    exchange: exchange,
    close: close,
    active
  }

  resetBar(renderer.sources[market])

  if (prepend) {
    registerPrependFromRealtime(prepend, market, exchange, pair, close)
  }
}
