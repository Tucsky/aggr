import { Bar, TimeRange } from './chartController'

export interface Chunk {
  from: number
  to: number
  bars: Bar[]
  rendered?: boolean
  active?: boolean
}

export default class ChartCache {
  chunks: Chunk[] = []
  cacheRange: TimeRange = { from: null, to: null }
  initialPrices: {
    [exchange: string]: {
      pair: string
      exchange: string
      price: number
    }
  } = {}

  /**
   * append or prepend chunk to cache array
   * and recalculate this.cacheRange
   * @param{Chunk} chunk Chunk to add
   */
  saveChunk(chunk) {
    // console.log(`[chartCache/saveChunk]`, formatTime(chunk.from), formatTime(chunk.to), chunk.bars.length, 'bars', chunk.active ? '[active chunk]' : '')

    let index

    if (!this.chunks.length || this.chunks[this.chunks.length - 1].to < chunk.from) {
      // console.log(`\t-> push chunk at the end of this.chunks array (chunk contain latest data)`)
      index = this.chunks.push(chunk) - 1
    } else if (this.chunks[0].from > chunk.to) {
      // console.log(`\t-> prepend chunk at the beginning of this.chunks array (chunk contain old data)`)
      this.chunks.unshift(chunk)
      index = 0
    } else {
      console.warn(`\t-> couldn't push or prepend the chunk -> abort`)
      return
    }

    if (index === 0) {
      if (this.cacheRange.from) {
        // console.log(`\t-> increase this.cacheRange (start) by ${getHms((this.cacheRange.from - chunk.from) * 1000)}`)
      } else {
        // console.log(`\t-> set this.cacheRange (start) = ${formatTime(chunk.from)}`)
      }
      this.cacheRange.from = chunk.from
    }

    if (index === this.chunks.length - 1) {
      if (this.cacheRange.to) {
        // console.log(`\t-> increase this.cacheRange (end) by ${getHms((chunk.to - this.cacheRange.to) * 1000)}`)
      } else {
        // console.log(`\t-> set this.cacheRange (end) = ${formatTime(chunk.to)}`)
      }

      this.cacheRange.to = chunk.to
    }

    return chunk
  }

  clear() {
    console.log(`[chartCache/this.chunks] clear this.chunks`)

    this.chunks.splice(0, this.chunks.length)
    this.cacheRange.from = this.cacheRange.to = null
    this.initialPrices = {}
  }

  trim(end) {
    while (this.chunks[0] && this.chunks[0].to < end) {
      this.chunks.splice(0, 1)
    }

    this.cacheRange.from = this.chunks[0].from
  }
}
