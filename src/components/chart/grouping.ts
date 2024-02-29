import { floorTimestampToTimeframe } from '@/utils/helpers'

export default {
  time({ trade, timeframe, isOdd }) {
    return floorTimestampToTimeframe(trade.timestamp / 1000, timeframe, isOdd)
  },
  tick({ renderer, timeframe, trade }) {
    if (renderer.bar.cbuy + renderer.bar.csell >= timeframe) {
      return Math.max(
        renderer.timestamp + 0.001,
        Math.round(trade.timestamp / 1000)
      )
    }

    return renderer.timestamp
  },
  vol({ renderer, timeframe, trade }) {
    if (renderer.bar.vbuy + renderer.bar.vsell >= timeframe) {
      return Math.max(
        renderer.timestamp + 0.001,
        Math.round(trade.timestamp / 1000)
      )
    }

    return renderer.timestamp
  },
  bps({ renderer, trade, marketsFilters, timeframe }) {
    const { count, sum } = Object.keys(renderer.sources).reduce(
      (acc, identifier) => {
        if (
          !marketsFilters[identifier] ||
          renderer.sources[identifier].open === null
        ) {
          return acc
        }
        acc.sum += renderer.sources[identifier].close
        acc.count++
        return acc
      },
      {
        count: 0,
        sum: 0
      }
    )

    const avg = sum / count
    const absBps = ((avg - renderer.bar.close) / renderer.bar.close) * 100 * 100
    if (!renderer.bar.close || Math.abs(absBps) > timeframe) {
      renderer.bar.close = avg
      return Math.max(
        renderer.timestamp + 0.001,
        Math.round(trade.timestamp / 1000)
      )
    } else {
      return renderer.timestamp
    }
  }
}
