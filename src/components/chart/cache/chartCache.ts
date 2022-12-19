import historicalService from '../../../services/historicalService'

// id = BITMEX:XBTUSD#1H#vbuy
const cache: { [id: string]: CacheNode } = {}

interface TimeRange {
  from: number
  to: number
}

interface CacheNode {
  id: string
  market: string
  timeframe: number
  prop: string
  from: number
  to: number
  points: number[]
  complete?: boolean
}

export function getId(market: string, timeframe: number, prop: string) {
  return `${market}#${timeframe}#${prop}`
}

export async function fetchPoints(id: string): Promise<number[]> {
  const { points } = await historicalService.getData(id)

  return points
}

export async function getData(
  market: string,
  timeframe: number,
  prop: string,
  from: number,
  to: number
) {
  const id = getId(market, timeframe, prop)
  const node = cache[id]

  const missingRange: TimeRange = {
    from,
    to
  }

  node.from
  node.to

  if (node && !node.complete && node.from > from) {
    missingRange.to = node.from
  }

  if (missingRange.from < missingRange.to) {
    const points = await fetchPoints(id)

    if (node) {
      node.points = points.concat(node.points)
      Array.prototype.unshift.apply(node.points, points)
    } else {
      cache[id] = {
        id,
        market,
        timeframe,
        prop,
        from,
        to,
        points
      }
    }

    cache[id].from = Math.min(cache[id].from, from)
    cache[id].to = Math.max(cache[id].to, to)

    if (!points.length) {
      cache[id].complete = true
    }
  }

  return cache[id].points
}
