import ChartController from '.'
import aggregatorService from '../../../services/aggregatorService'
import alertService from '../../../services/alertService'
import dialogService from '../../../services/dialogService'
import { formatPrice } from '../../../services/productsService'
import workspacesService from '../../../services/workspacesService'
import store from '../../../store'
import { MarketAlert } from '../../../types/types'
import { joinRgba } from '../../../utils/colors'
import { getEventOffset, isTouchSupported } from '../../../utils/touchevent'

export function bindChartEvents(this: ChartController) {
  aggregatorService.on('alert', this.onAlert)

  if (this.showLegend && this.showIndicatorsOverlay) {
    this.bindLegend()
  }

  this._chartController.chartInstance
    .timeScale()
    .subscribeVisibleLogicalRangeChange(this.onPan)

  if (process.env.VUE_APP_PUBLIC_VAPID_KEY) {
    const canvas = this._chartController.chartElement.querySelector(
      'canvas:nth-child(2)'
    )
    canvas.addEventListener(
      isTouchSupported() ? 'touchstart' : 'mousedown',
      this.onLevelDragStart
    )
  }
}

export function unbindChartEvents(this: ChartController) {
  aggregatorService.off('alert', this.onAlert)

  this.unbindLegend()

  this._chartController.chartInstance
    .timeScale()
    .unsubscribeVisibleLogicalRangeChange(this.onPan)

  if (process.env.VUE_APP_PUBLIC_VAPID_KEY) {
    const canvas = this._chartController.chartElement.querySelector(
      'canvas:nth-child(2)'
    )
    canvas.removeEventListener(
      isTouchSupported() ? 'touchstart' : 'mousedown',
      this.onLevelDragStart
    )
  }
}

export function onLevelDragStart(this: ChartController, event) {
  if (
    this._levelDragEndHandler ||
    !store.state.settings.alerts ||
    event.button ||
    dialogService.hasDialogOpened
  ) {
    return
  }

  const dataAtPoint = this._chartController.getPricelineAtPoint(event)

  if (!dataAtPoint || !dataAtPoint.api) {
    return
  }

  const canvas = this._chartController.chartElement.querySelector(
    'canvas:nth-child(2)'
  )

  if ((dataAtPoint as any).priceline) {
    this._chartController.disableCrosshair()
  }

  this._levelDragMoveHandler = this.onLevelDragMove.bind(
    this,
    dataAtPoint,
    Date.now()
  )
  canvas.addEventListener(
    /touch/.test(event.type) ? 'touchmove' : 'mousemove',
    this._levelDragMoveHandler
  )

  this._levelDragEndHandler = this.onLevelDragEnd.bind(
    this,
    dataAtPoint,
    Date.now()
  )
  canvas.addEventListener(
    /touch/.test(event.type) ? 'touchend' : 'mouseup',
    this._levelDragEndHandler
  )
}

export function onLevelDragStart(
  { api, priceline, originalOffset, offset },
  startedAt,
  event) {
  const { x, y } = getEventOffset(event)

  const canMove =
    Math.abs(originalOffset.y - y) > 5 || Date.now() - startedAt > 100

  offset.x = x
  offset.y = y

  if (priceline) {
    event.stopPropagation()

    if (!canMove) {
      return
    }

    const price = +formatPrice(
      api.coordinateToPrice(y) as number,
      api.options().priceFormat.precision
    )

    priceline.applyOptions({
      price
    })
  }
}

export function onLevelDragStart(this: ChartController, 
  { api, priceline, price, market, canCreate, originalOffset, offset },
  startedAt,
  event) {
  const canvas = this._chartController.chartElement.querySelector(
    'canvas:nth-child(2)'
  )

  const canMove =
    Math.abs(originalOffset.y - offset.y) > 5 || Date.now() - startedAt > 200
  canCreate = !priceline && canCreate && !canMove

  if (priceline || canCreate) {
    this._chartController.chartInstance.clearCrosshairPosition()
  }

  // unbind up
  canvas.removeEventListener(
    /touch/.test(event.type) ? 'touchend' : 'mouseup',
    this._levelDragEndHandler
  )
  this._levelDragEndHandler = null

  if (this._levelDragMoveHandler) {
    // unbind move
    canvas.removeEventListener(
      /touch/.test(event.type) ? 'touchmove' : 'mousemove',
      this._levelDragMoveHandler
    )
    this._levelDragMoveHandler = null
  }

  if (this._onPanTimeout) {
    return
  }

  if (priceline) {
    this._chartController.enableCrosshair()
    const alert = this._chartController.alerts[market].find(
      a => a.price === price
    )
    const newPrice = priceline.options().price

    if (price !== newPrice && canMove) {
      const active = await alertService.moveAlert(market, price, newPrice)

      alert.triggered = false
      alert.price = newPrice
      alert.active = active

      await workspacesService.saveAlerts({
        market,
        alerts: this._chartController.alerts[market].filter(
          a => a.market === alert.market
        )
      })

      priceline.applyOptions({
        title: ''
      })
    } else {
      api.removePriceLine(priceline)

      // unregister alert from server
      try {
        await alertService.unsubscribe(market, price)
      } catch (err) {
        if (alert && alert.active) {
          store.dispatch('app/showNotice', {
            id: 'alert-registration-failure',
            title: `${err.message}\nYou need to make sure your browser is set to allow push notifications.`,
            type: 'error'
          })
        }
      }

      // save remaining active alerts for this market
      const index = this._chartController.alerts[market].indexOf(alert)

      if (index !== -1) {
        this._chartController.alerts[market].splice(index, 1)
      }

      await workspacesService.saveAlerts({
        market,
        alerts: this._chartController.alerts[market].filter(
          a => a.price !== price
        )
      })
    }
  } else if (canCreate) {
    // draw line first with 50% opacity
    const color = splitColorCode(store.state.settings.alertsColor)
    const alpha = color[3] || 1
    color[3] = alpha * 0.5

    let timestamp

    if (!(event.ctrlKey || event.metaKey)) {
      timestamp = this._chartController.chartInstance
        .timeScale()
        .coordinateToTime(offset.x)
    }

    const priceline = this._chartController.renderAlert(
      {
        price,
        market,
        timestamp
      },
      api,
      joinRgba(color)
    )

    const alert: MarketAlert = {
      price,
      market,
      timestamp,
      active: false
    }

    this._chartController.alerts[market].push(alert)

    let finalColor

    // try subscribe to alert
    await alertService
      .subscribe(market, price)
      .then(active => {
        // make sure alert still exists before switching alpha / saving
        if (this._chartController.alerts[market].indexOf(alert) !== -1) {
          alert.active = active
          const finalAlpha = active ? alpha : alpha * 0.75

          // set line color to original alpha
          color[3] = finalAlpha

          finalColor = joinRgba(color)
        }
      })
      .catch(err => {
        store.dispatch('app/showNotice', {
          id: 'alert-registration-failure',
          title: `${err.message}\nYou need to make sure your browser is set to allow push notifications.`,
          type: 'error'
        })

        finalColor = store.state.settings.alertsColor
      })
      .finally(() => {
        workspacesService.saveAlerts({
          market,
          alerts: this._chartController.alerts[market]
        })

        priceline.applyOptions({
          color: finalColor
        })
      })
  }
}