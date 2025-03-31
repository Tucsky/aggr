import { Bar, TimeRange } from './chart.d'

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

  /**
   * append or prepend chunk to cache array
   * and recalculate this.cacheRange
   * @param{Chunk} chunk Chunk to add
   */
  saveChunk(chunk) {
    let index

    if (
      !this.chunks.length ||
      this.chunks[this.chunks.length - 1].to < chunk.from
    ) {
      index = this.chunks.push(chunk) - 1
    } else if (this.chunks[0].from > chunk.to) {
      this.chunks.unshift(chunk)
      index = 0
    } else {
      console.warn(`\t-> couldn't push or prepend the chunk -> abort`)
      return this.chunks[0]
    }

    if (index === 0) {
      this.cacheRange.from = chunk.from
    }

    if (index === this.chunks.length - 1) {
      this.cacheRange.to = chunk.to
    }

    return chunk
  }

  clear() {
    console.log(`[chartCache/this.chunks] clear this.chunks`)

    this.chunks.splice(0, this.chunks.length)
    this.cacheRange.from = this.cacheRange.to = null
  }

  trim(end) {
    if (!this.chunks.length) {
      return
    }

    let trimmed = false

    while (this.chunks[0] && this.chunks[0].to < end) {
      console.debug(
        `[chart.cache] trim chunk (${this.chunks[0].bars.length} bars)`
      )
      this.chunks.splice(0, 1)

      trimmed = true
    }

    this.cacheRange.from = this.chunks[0].from

    return trimmed
  }
}
