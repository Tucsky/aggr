import alertService, { MarketAlert } from '@/services/alertService'
import store from '@/store'
import { joinRgba, splitColorCode } from '@/utils/colors'
import { getEventOffset } from '@/utils/touchevent'
import { IPriceLine } from 'lightweight-charts'
import ChartController, { IndicatorApi } from '../chart'

export default class AlertEventHandler {
  isBusy = false

  private api: IndicatorApi
  private alert: MarketAlert
  private priceline: IPriceLine
  private timestamp: number
  private chart: ChartController
  private offset: {
    x: number
    y: number
  }
  private originalOffset: {
    x: number
    y: number
  }
  private referencePrice: number
  private moved: boolean

  private levelDragMoveHandler: (event) => {}
  private levelDragEndHandler: (event) => {}

  constructor(chart: ChartController, event: MouseEvent | TouchEvent) {
    this.chart = chart

    if (!this.chart.isLoading && this.initialize(event)) {
      this.bindEvents(event)
    }
  }

  initialize(event: MouseEvent | TouchEvent) {
    this.api = this.chart.getPriceApi()
    if (!this.api) {
      return false
    }

    this.offset = getEventOffset(event)
    this.originalOffset = { ...this.offset }

    const price = this.api.coordinateToPrice(this.offset.y) as number
    if (!price) {
      return false
    }

    this.priceline = this.api.getPriceLine(
      price,
      this.chart.chartInstance.timeScale().coordinateToLogical(this.offset.x)
    ) as IPriceLine

    const canCreate = store.state.settings.alertsClick || event.altKey

    if (!this.priceline && !canCreate) {
      return false
    }

    this.referencePrice = this.chart.getPrice()
    this.timestamp = Date.now()
    this.alert = this.getAlert(price)

    return true
  }

  getMoveEvent(event: MouseEvent | TouchEvent) {
    return /touch/.test(event.type) ? 'touchmove' : 'mousemove'
  }

  getEndEvent(event: MouseEvent | TouchEvent) {
    return /touch/.test(event.type) ? 'touchend' : 'mouseup'
  }

  bindEvents(event) {
    const canvas = this.chart.getChartCanvas()
    this.levelDragMoveHandler = this.onLevelDragMove.bind(this)
    this.levelDragEndHandler = this.onLevelDragEnd.bind(this)
    canvas.addEventListener(this.getMoveEvent(event), this.levelDragMoveHandler)
    canvas.addEventListener(this.getEndEvent(event), this.levelDragEndHandler)
  }

  getAlert(price: number) {
    let market

    if (this.priceline) {
      const priceLineOptions = this.priceline.options() as any
      market = priceLineOptions.market

      if (!priceLineOptions.market) {
        this.priceline = null
      } else {
        market = priceLineOptions.market
        price = priceLineOptions.price
      }
    }

    if (!market) {
      market = this.chart.mainIndex
    }

    return {
      price,
      market
    }
  }

  onLevelDragMove(event) {
    const { x, y } = getEventOffset(event)

    const canMove =
      Math.abs(this.originalOffset.y - y) > 5 ||
      Date.now() - this.timestamp > 750

    this.offset.x = x
    this.offset.y = y

    if (this.priceline) {
      event.stopPropagation()

      if (!canMove) {
        return
      }

      const price = alertService.formatPrice(
        this.api.coordinateToPrice(y) as number
      )

      let color

      if (!this.moved) {
        const rgb = splitColorCode(store.state.settings.alertsColor)
        color = joinRgba([rgb[0], rgb[1], rgb[2], (rgb[3] || 1) * 0.5])
      }

      this.priceline.applyOptions({
        price,
        color
      })

      this.moved = true
    } else if (canMove) {
      // moving nothing
      this.unbindEvents(event)
    }
  }

  async onLevelDragEnd(event: MouseEvent | TouchEvent) {
    const canMove =
      Math.abs(this.originalOffset.y - this.offset.y) > 5 ||
      Date.now() - this.timestamp > 750

    const canCreate =
      !this.priceline &&
      !canMove &&
      Math.abs(this.originalOffset.x - this.offset.x) +
        Math.abs(this.originalOffset.y - this.offset.y) <
        10

    store.state.settings.alerts &&
      (event.altKey || store.state.settings.alertsClick)
    const market = this.alert.market

    if (this.priceline || canCreate) {
      this.chart.chartInstance.clearCrosshairPosition()
    }

    this.unbindEvents(event)

    if (this.chart.isLoading) {
      return
    }

    try {
      this.isBusy = true

      if (this.priceline) {
        const originalAlert = alertService.alerts[this.alert.market].find(
          a => a.price === this.alert.price
        )
        const { price, title: message } = this.priceline.options()

        const movedAlert = {
          active: false,
          price,
          market,
          message
        }

        if (this.alert.price !== price && canMove) {
          if (originalAlert) {
            await alertService.moveAlert(
              originalAlert.market,
              originalAlert.price,
              movedAlert,
              this.referencePrice
            )
          }
          this.api.removePriceLine(this.priceline)
        } else {
          await alertService.removeAlert(this.alert)
        }
      } else if (canCreate) {
        const timestamp = this.chart.chartInstance
          .timeScale()
          .coordinateToTime(this.offset.x) as number

        const alert: MarketAlert = {
          price: this.alert.price,
          market: this.alert.market,
          timestamp,
          active: false
        }

        await alertService.createAlert(alert, this.chart.getPrice())
      }
    } finally {
      this.isBusy = false
    }
  }

  unbindEvents(event) {
    const canvas = this.chart.getChartCanvas()

    canvas.removeEventListener(
      this.getEndEvent(event),
      this.levelDragEndHandler
    )
    this.levelDragEndHandler = null

    canvas.removeEventListener(
      this.getMoveEvent(event),
      this.levelDragMoveHandler
    )
    this.levelDragMoveHandler = null
  }
}
