import { defaultPlotsOptions } from '@/components/chart/options'
import { Volumes } from '@/types/types'
import { IChartApi, ISeriesApi, UTCTimestamp } from 'lightweight-charts'
import store from '../store'
import { hexToRgb, splitColorCode } from './colors'
import { getHms } from './helpers'

export type BucketColor = string | ((value: number) => string)

export interface BucketOptions {
  id: string
  name: string
  window?: number
  precision?: number
  color?: string
  type?: string
}

export default class Bucket {
  id: string
  name: string
  window: number
  precision: number
  color: BucketColor
  granularity: number
  type: string

  stacks: any[] = []

  private timestamp: number
  private live: number
  private filled = false
  private remaining = 0

  private adapter: (stats: Volumes) => number
  private serie: ISeriesApi<'Line'>
  private timeouts: number[] = []

  constructor(input, options: BucketOptions, paneId: string) {
    this.id = options.id
    this.name = options.name

    this.adapter = this.getAdapter(input)

    this.window =
      (!isNaN(options.window) ? +options.window : store.state[paneId].window) ||
      60000
    this.precision = options.precision
    this.color = this.parseColor(options.color)
    this.granularity = Math.max(
      store.state[paneId].granularity,
      this.window / 5000
    )
    this.type = options.type || 'line'

    const windowLabel = getHms(this.window).replace(/^1(\w)$/, '$1')

    this.name += '/' + windowLabel

    this.clear()

    if (module.hot) {
      module.hot.dispose(() => {
        this.unbind()
      })
    }
  }

  getAdapter(str: string) {
    const litteral = str.replace(
      /([^.]|^)(vbuy|vsell|cbuy|csell|lbuy|lsell)/g,
      '$1stats.$2'
    )
    return new Function('stats', `'use strict'; return ${litteral};`) as (
      stats: Volumes
    ) => number
  }

  clear() {
    this.stacks = []
    this.live = 0
    this.filled = false
    this.remaining = 0

    for (let i = 0; i < this.timeouts.length; i++) {
      clearTimeout(this.timeouts[i])
    }

    this.timeouts = []
  }

  unbind() {
    this.clear()
  }

  onStats(stats: Volumes) {
    const value = this.adapter(stats)

    if (
      !this.stacks.length ||
      stats.timestamp > this.timestamp + this.granularity
    ) {
      this.appendStack(stats.timestamp)
    } else if (this.filled && this.remaining) {
      const p = (stats.timestamp - this.timestamp) / this.granularity
      const remaining = Math.ceil(this.stacks[0] * (1 - p))
      const change = this.remaining - remaining
      this.remaining = remaining
      this.live -= change
    }

    this.addData(value)
  }

  appendStack(timestamp) {
    if (!timestamp) {
      timestamp = Date.now()
    }

    if (!this.stacks.length || this.stacks[this.stacks.length - 1]) {
      this.stacks.push(0)

      this.timeouts.push(setTimeout(this.shiftStack.bind(this), this.window))
    }

    this.timestamp = timestamp

    if (!this.filled && this.stacks.length === this.window / this.granularity) {
      this.filled = true
    }
  }

  shiftStack() {
    this.timeouts.shift()

    const stack = this.stacks.shift()

    if (!stack) {
      return
    }

    if (this.remaining) {
      this.live -= this.remaining
    }

    this.remaining = this.stacks[0]

    // this.live -= stack
  }

  addData(data) {
    this.stacks[this.stacks.length - 1] += data
    this.live += data
  }

  getValue() {
    return this.live
  }

  createSerie(chart: IChartApi) {
    if (this.serie) {
      return
    }

    const apiMethodName =
      'add' +
      (this.type.charAt(0).toUpperCase() + this.type.slice(1)) +
      'Series'
    const options = Object.assign({}, defaultPlotsOptions[this.type], {
      priceScaleId: this.name,
      title: this.name,
      priceLineVisible: false,
      lineWidth: 1,
      scaleMargins: {
        top: 0.05,
        bottom: 0.05
      },
      ...this.getColorOptions()
    })

    this.serie = chart[apiMethodName](options)
  }

  updateSerie() {
    const value = this.getValue()

    if (
      !this.serie ||
      !this.timestamp ||
      (this.type === 'histogram' && !value)
    ) {
      return
    }

    const point: any = {
      time: (this.timestamp / 1000) as UTCTimestamp,
      value: value
    }

    if (typeof this.color === 'function') {
      point.color = this.color(value)
    }

    this.serie.update(point)
  }

  getColorOptions() {
    if (typeof this.color === 'function') {
      return {}
    }

    if (this.type === 'area') {
      let r: number
      let g: number
      let b: number

      if ((this.color as string).indexOf('#') === 0) {
        ;[r, g, b] = hexToRgb(this.color)
      } else {
        ;[r, g, b] = splitColorCode(this.color)
      }

      const topColor = `rgba(${r},${g},${b}, .4)`
      const bottomColor = `rgba(${r},${g},${b}, 0)`
      return {
        topColor,
        bottomColor,
        lineColor: this.color
      }
    } else {
      return { color: this.color }
    }
  }

  parseColor(colorInput: string): BucketColor {
    if (/rgba?\(|#/.test(colorInput)) {
      return colorInput
    }

    return (function() {
      'use strict'
      return new Function('value', '"use strict"; return ' + colorInput)
    })() as BucketColor
  }

  updateColor(color) {
    if (!this.serie) {
      return
    }

    this.color = this.parseColor(color)

    if (typeof color === 'string') {
      this.serie.applyOptions(this.getColorOptions())
    }
  }

  removeIndicator(chart: IChartApi) {
    if (!this.serie) {
      return
    }

    chart.removeSeries(this.serie)

    delete this.serie
  }
}
