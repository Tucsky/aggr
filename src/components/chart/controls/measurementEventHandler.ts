import { formatMarketPrice } from '@/services/productsService'
import { createComponent, getEventCords, mountComponent } from '@/utils/helpers'
import { Time } from 'lightweight-charts'
import ChartController, { IndicatorApi } from '../chart'

export default class MeasurementEventHandler {
  isBusy = false

  private api: IndicatorApi
  private chart: ChartController
  private a: {
    x: number
    y: number
    price?: number
    time?: number
  }
  private b: {
    x: number
    y: number
    price?: number
    time?: number
  }
  private market: string
  private measurementComponent: any
  private isLoading: boolean
  private canvas: HTMLCanvasElement
  private height: number
  private top: number
  private left: number
  private width: number
  private onMoveHandler: (event) => {}
  private onEndHandler: (event) => {}
  private onPanHandler: (event) => {}

  constructor(chart: ChartController, event: MouseEvent | TouchEvent) {
    this.chart = chart
    this.canvas = this.chart.getChartCanvas()

    if (this.initialize(event)) {
      this.bindEvents(event)
    }
  }

  initialize(event: MouseEvent | TouchEvent) {
    this.api = this.chart.getPriceApi()
    if (!this.api) {
      return false
    }

    const { x, y } = getEventCords(event, true)
    const { top, left } = this.canvas.getBoundingClientRect()
    this.top = top
    this.height = this.canvas.height
    this.left = left
    this.width = this.canvas.width

    this.a = {
      x: Math.max(0, Math.min(this.width, x - left)),
      y: Math.max(0, Math.min(this.height, y - top))
    }
    this.a.price = this.api.coordinateToPrice(this.a.y) as number
    this.a.time = this.chart.chartInstance
      .timeScale()
      ?.coordinateToTime(this.a.x) as number

    if (!this.a.price) {
      return false
    }

    this.market = this.chart.mainIndex

    return true
  }

  getMoveEvent(event: MouseEvent | TouchEvent) {
    return /touch/.test(event.type) ? 'touchmove' : 'mousemove'
  }

  getEndEvent(event: MouseEvent | TouchEvent) {
    return /touch/.test(event.type) ? 'touchend' : 'mouseup'
  }

  getClearEvent() {
    return /touch/.test(event.type) ? 'touchstart' : 'mousedown'
  }

  bindEvents(event) {
    this.chart.chartInstance.applyOptions({
      handleScroll: false
    })
    this.onMoveHandler = this.onMove.bind(this)
    this.onEndHandler = this.onEnd.bind(this)
    document.body.addEventListener(this.getMoveEvent(event), this.onMoveHandler)
    document.body.addEventListener(this.getEndEvent(event), this.onEndHandler)
  }

  onPan() {
    const api = this.chart.getPriceApi()

    const timeScale = this.chart.chartInstance.timeScale()

    if (timeScale) {
      this.a.x = timeScale.timeToCoordinate(this.a.time as Time)
      this.b.x = timeScale.timeToCoordinate(this.b.time as Time)
    }

    this.a.y = api.priceToCoordinate(this.a.price) as number
    this.b.y = api.priceToCoordinate(this.b.price) as number

    this.updateComponent()
  }

  onMove(event) {
    const { x, y } = getEventCords(event, true)

    this.b = {
      x: Math.max(0, Math.min(this.width, x - this.left)),
      y: Math.max(0, Math.min(this.height, y - this.top))
    }
    this.b.price = this.api.coordinateToPrice(this.b.y) as number
    this.b.time = this.chart.chartInstance
      .timeScale()
      ?.coordinateToTime(this.b.x) as number

    if (!this.measurementComponent) {
      this.createComponent()
    } else {
      this.updateComponent()
    }
  }

  getPropsData() {
    const x = [this.a.x, this.b.x].sort((a, b) => a - b)
    const y = [this.a.y, this.b.y].sort((a, b) => a - b)
    const prices = [this.a.price, this.b.price].sort((a, b) => a - b)
    const percent = ((this.b.price - this.a.price) / Math.abs(this.a.price)) * 100;
    return {
      position: {
        top: y[0],
        left: x[0],
        width: x[1] - x[0],
        height: y[1] - y[0]
      },
      low: +formatMarketPrice(prices[0], this.market),
      high: +formatMarketPrice(prices[1], this.market),
      percent
    }
  }

  async createComponent() {
    this.isBusy = true

    if (this.isLoading) {
      return false
    }

    this.isLoading = true
    document.body.style.cursor = 'progress'

    const module = await import(`@/components/chart/ChartMeasurement.vue`)
    const { position, low, high, percent } = this.getPropsData()

    this.measurementComponent = createComponent(module.default, {
      position,
      low,
      high,
      percent
    })

    mountComponent(this.measurementComponent, this.canvas.parentElement)

    const timeScale = this.chart.chartInstance.timeScale()

    if (timeScale) {
      this.onPanHandler = this.onPan.bind(this)
      timeScale.subscribeVisibleLogicalRangeChange(this.onPanHandler)
    }

    this.isLoading = false
    document.body.style.cursor = ''
  }

  updateComponent() {
    const { position, low, high, percent } = this.getPropsData()

    this.measurementComponent.position = position
    this.measurementComponent.low = low
    this.measurementComponent.high = high
    this.measurementComponent.percent = percent
  }

  onEnd(event) {
    this.unbindEvents(event)
  }

  async unbindEvents(event) {
    document.body.removeEventListener(
      this.getEndEvent(event),
      this.onEndHandler
    )
    this.onEndHandler = null

    document.body.removeEventListener(
      this.getMoveEvent(event),
      this.onMoveHandler
    )
    this.onMoveHandler = null

    this.chart.chartInstance.applyOptions({
      handleScroll: true
    })

    this.canvas.addEventListener(
      this.getClearEvent(),
      () => {
        this.destroy()
      },
      {
        once: true
      }
    )
  }

  removeComponent() {
    this.measurementComponent.$destroy()
    this.measurementComponent.$el.parentNode.removeChild(
      this.measurementComponent.$el
    )
    this.measurementComponent = null

    if (this.onPanHandler) {
      const timeScale = this.chart.chartInstance.timeScale()

      if (timeScale) {
        timeScale.unsubscribeVisibleLogicalRangeChange(this.onPanHandler)
      }

      this.onPanHandler = null
    }
  }

  destroy() {
    if (this.measurementComponent) {
      this.removeComponent()
    }

    this.isBusy = false
  }
}
