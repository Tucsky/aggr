import alertService, { MarketAlert } from '@/services/alertService'
import dialogService from '@/services/dialogService'
import { formatAmount, formatPrice } from '@/services/productsService'
import store from '@/store'
import { ChartPaneState } from '@/store/panesSettings/chart'
import {
  createComponent,
  floorTimestampToTimeframe,
  getEventCords,
  mountComponent,
  sleep
} from '@/utils/helpers'
import { isTouchSupported } from '@/utils/touchevent'
import {
  IPriceLine,
  MouseEventParams,
  PriceLineOptions,
  Time
} from 'lightweight-charts'
import Chart from './chart'
import AlertEventHandler from './controls/alertEventHandler'
import MeasurementEventHandler from './controls/measurementEventHandler'
import {
  getChartCustomColorsOptions,
  getChartGridlinesOptions,
  getChartBorderOptions
} from './options'

const controlledCharts: Chart[] = []
let contextMenuComponent: any = null
let timeframeDropdownComponent: any = null

export default class ChartControl {
  chart: Chart

  private onPanTimeout: number
  private legendElements: { [id: string]: HTMLElement }
  private lastCrosshairX: number
  private activeEvent: any

  private clickHandler: (event: MouseEvent | TouchEvent) => void
  private contextMenuHandler: (event: MouseEvent | TouchEvent) => void
  private crosshairMoveHandler: (MouseEventParams) => void
  private onPanHandler: (MouseEventParams) => void
  private unsubscribeStore: () => void

  constructor(chart) {
    this.chart = chart
  }

  bindEvents() {
    this.subscribeStore()

    // bind pan
    this.onPanHandler = this.onPan.bind(this)
    this.chart.chartInstance
      .timeScale()
      .subscribeVisibleLogicalRangeChange(this.onPanHandler)

    // bind click
    if (process.env.VUE_APP_PUBLIC_VAPID_KEY) {
      const canvas = this.chart.getChartCanvas()
      const clickEventName = isTouchSupported() ? 'touchstart' : 'mousedown'

      this.clickHandler = this.onClick.bind(this)
      canvas.addEventListener(clickEventName, this.clickHandler)
      this.contextMenuHandler = this.onContextMenu.bind(this)
      canvas.addEventListener('contextmenu', this.contextMenuHandler)
    }

    // bind crosshair
    this.crosshairMoveHandler = this.onCrosshairMove.bind(this)
    this.chart.chartInstance.subscribeCrosshairMove(this.crosshairMoveHandler)

    // bind legends
    if (
      store.state[this.chart.paneId].showIndicators &&
      store.state[this.chart.paneId].showLegend
    ) {
      this.bindLegend()
    }

    controlledCharts.push(this.chart)
  }

  unbindEvents() {
    this.unsubscribeStore()
    this.unbindLegend()

    // unbind pan
    this.chart.chartInstance
      .timeScale()
      .unsubscribeVisibleLogicalRangeChange(this.onPan)

    // unbind click / context menu
    if (process.env.VUE_APP_PUBLIC_VAPID_KEY) {
      const canvas = this.chart.getChartCanvas()
      const clickEventName = isTouchSupported() ? 'touchstart' : 'mousedown'
      canvas.removeEventListener(clickEventName, this.clickHandler)
      this.clickHandler = null
      canvas.removeEventListener('contextmenu', this.contextMenuHandler)
      this.contextMenuHandler = null
    }

    // unbind crosshair
    this.chart.chartInstance.unsubscribeCrosshairMove(this.crosshairMoveHandler)
    this.crosshairMoveHandler = null

    // remove from sync
    const index = controlledCharts.indexOf(this.chart)
    if (index !== -1) {
      controlledCharts.splice(index, 1)
    }
  }

  subscribeStore() {
    this.unsubscribeStore = store.subscribe(mutation => {
      switch (mutation.type) {
        case this.chart.paneId + '/FLAG_INDICATOR_AS_SAVED':
          this.chart.saveIndicatorPreview(mutation.payload)
          break
        case 'settings/SET_CHART_THEME':
        case 'settings/SET_TEXT_COLOR':
          this.chart.chartInstance.applyOptions(
            getChartCustomColorsOptions(this.chart.paneId)
          )
          break
        case 'settings/TOGGLE_NORMAMIZE_WATERMARKS':
          this.chart.refreshMarkets()
          break
        case 'settings/SET_TIMEZONE_OFFSET':
          this.chart.setTimezoneOffset(store.state.settings.timezoneOffset)
          this.chart.clearChart()
          this.chart.renderAll()
          break
        case 'panes/SET_PANE_MARKETS':
          if (mutation.payload.id === this.chart.paneId) {
            ;(store.state[this.chart.paneId] as ChartPaneState).hiddenMarkets =
              {}
            this.chart.refreshMarkets()

            this.chart.clear()
            this.chart.fetch()
          }
          break
        case 'panes/SET_PANE_ZOOM':
          if (mutation.payload.id === this.chart.paneId) {
            this.chart.updateFontSize()
          }
          break
        case this.chart.paneId + '/SET_TIMEFRAME':
          this.chart.clear()
          this.chart.fetch()
          break
        case 'settings/TOGGLE_ALERTS':
        case this.chart.paneId + '/TOGGLE_ALERTS':
        case this.chart.paneId + '/TOGGLE_ALERTS_LABEL':
        case 'settings/SET_ALERTS_COLOR':
        case 'settings/SET_ALERTS_LINESTYLE':
        case 'settings/SET_ALERTS_LINEWIDTH':
        case 'app/EXCHANGE_UPDATED':
        case this.chart.paneId + '/TOGGLE_MARKET':
          this.chart.refreshMarkets()
          this.chart.renderAll()
          break
        case this.chart.paneId + '/SET_REFRESH_RATE':
          this.chart.clearQueue()
          this.chart.setupQueue()
          break
        case this.chart.paneId + '/TOGGLE_LEGEND':
        case this.chart.paneId + '/TOGGLE_INDICATORS':
          if (
            store.state[this.chart.paneId].showIndicators &&
            store.state[this.chart.paneId].showLegend
          ) {
            this.bindLegend()
          } else {
            this.unbindLegend()
          }
          break
        case this.chart.paneId + '/SET_GRIDLINES':
          this.chart.chartInstance.applyOptions(
            getChartGridlinesOptions(this.chart.paneId)
          )
          break
        case this.chart.paneId + '/SET_BORDER':
        case this.chart.paneId + '/TOGGLE_AXIS':
          this.chart.chartInstance.applyOptions(
            getChartBorderOptions(this.chart.paneId)
          )
          break
        case this.chart.paneId + '/SET_WATERMARK':
        case this.chart.paneId + '/TOGGLE_NORMAMIZE_WATERMARKS':
          this.chart.updateWatermark()
          break
        case this.chart.paneId + '/SET_INDICATOR_OPTION':
          this.chart.setIndicatorOption(
            mutation.payload.id,
            mutation.payload.key,
            mutation.payload.value,
            mutation.payload.silent
          )
          break
        case this.chart.paneId + '/SET_PRICE_SCALE':
          if (mutation.payload.priceScale) {
            this.chart.refreshPriceScale(mutation.payload.id)
          }
          break
        case this.chart.paneId + '/SET_INDICATOR_SCRIPT':
          this.chart.rebuildIndicator(mutation.payload.id)
          break
        case this.chart.paneId + '/ADD_INDICATOR':
          if (this.chart.addIndicator(mutation.payload.id)) {
            this.chart.redrawIndicator(mutation.payload.id)

            if (
              store.state[this.chart.paneId].showIndicators &&
              store.state[this.chart.paneId].showLegend
            ) {
              this.bindLegend(mutation.payload.id)
            }
          }
          break
        case this.chart.paneId + '/REMOVE_INDICATOR':
          this.unbindLegend(mutation.payload)
          this.chart.removeIndicator(mutation.payload)
          break
        case this.chart.paneId + '/TOGGLE_FILL_GAPS_WITH_EMPTY':
          this.chart.toggleFillGapsWithEmpty()
          break
        case 'settings/TOGGLE_AUTO_HIDE_HEADERS':
          this.chart.refreshChartDimensions()
          break
      }
    })
  }

  onContextMenu(event) {
    if (window.innerWidth < 375) {
      return
    }

    const canvas = event.currentTarget as HTMLCanvasElement

    event.preventDefault()
    const { x, y } = getEventCords(event, true)
    const { top, left } = canvas.getBoundingClientRect()
    const api = this.chart.getPriceApi()
    const market = this.chart.mainIndex

    let price
    let alert
    if (api) {
      const pricedCoordinate = api.coordinateToPrice(y - top)

      if (pricedCoordinate) {
        price = alertService.formatPrice(pricedCoordinate)
      }

      const timeScale = this.chart.chartInstance.timeScale()

      const priceline = api.getPriceLine(
        price,
        timeScale ? timeScale.coordinateToLogical(x - left) : null
      ) as IPriceLine

      if (priceline) {
        const pricelineOptions = priceline.options() as PriceLineOptions &
          MarketAlert

        alert = {
          price: pricelineOptions.price,
          market: pricelineOptions.market,
          message: pricelineOptions.message
        }
      }
    }

    const timestamp = floorTimestampToTimeframe(
      Date.now() / 1000,
      this.chart.timeframe
    )
    const timeframe = store.state[this.chart.paneId].timeframe
    const paneId = this.chart.paneId

    this.createContextMenu({
      value: {
        top: y - 1,
        left: x - 1,
        width: 2,
        height: 2
      },
      market,
      price,
      timeframe,
      timestamp,
      paneId,
      alert,
      getPrice: this.chart.getPrice.bind(this.chart)
    })
  }

  async createContextMenu(propsData) {
    if (contextMenuComponent) {
      contextMenuComponent.$off('cmd')
      for (const key in propsData) {
        contextMenuComponent[key] = propsData[key]
      }
    } else {
      const module = await import(`@/components/chart/ChartContextMenu.vue`)
      contextMenuComponent = createComponent(module.default, propsData)

      mountComponent(contextMenuComponent)
    }

    contextMenuComponent.$on('cmd', args => {
      if (this.chart[args[0]] instanceof Function) {
        this.chart[args[0]](...args.slice(1))
      } else {
        throw new Error(
          `[chart/control] ContextMenu->chart->${args[0]} is not a function`
        )
      }
    })
  }

  onClick(event: MouseEvent | TouchEvent) {
    if (dialogService.hasDialogOpened) {
      return
    }

    if (
      dialogService.hasDialogOpened ||
      (event instanceof MouseEvent && event.button)
    ) {
      return
    }

    const previousEventBusy = this.activeEvent && this.activeEvent.isBusy

    if (event.shiftKey) {
      console.log('new MeasurementEventHandler')
      this.activeEvent = new MeasurementEventHandler(this.chart, event)
    } else if (store.state.settings.alerts) {
      if (previousEventBusy) {
        return
      }

      console.log('new AlertEventHandler')
      this.activeEvent = new AlertEventHandler(this.chart, event)
    }
  }

  /**
   * TV chart mousemove event
   */
  onCrosshairMove(event: MouseEventParams) {
    if (!event || !event.point || this.lastCrosshairX === event.point.x) {
      return
    }

    this.syncCrosshair(event)

    this.lastCrosshairX = event.point.x

    if (this.legendElements) {
      this.updateLegend(event)
    }
  }

  onPan(visibleLogicalRange) {
    if (
      !visibleLogicalRange ||
      this.chart.panPrevented ||
      this.chart.isLoading ||
      this.chart.type === 'tick'
    ) {
      return
    }

    if (this.onPanTimeout) {
      clearTimeout(this.onPanTimeout)
      this.onPanTimeout = null
    }

    this.onPanTimeout = setTimeout(() => {
      this.onPanTimeout = null

      if (this.chart.chartCache.cacheRange.from === null) {
        return
      }

      // get latest visible logical range
      visibleLogicalRange = this.chart.chartInstance
        .timeScale()
        .getVisibleLogicalRange()

      this.chart.savePosition(visibleLogicalRange)

      this.chart.fetchMore(visibleLogicalRange)
    }, 500)
  }

  async bindLegend(indicatorId?: string) {
    if (!this.legendElements) {
      this.legendElements = {}
    }

    if (!indicatorId) {
      for (const id in (store.state[this.chart.paneId] as ChartPaneState)
        .indicators) {
        this.bindLegend(id)
      }

      return
    }

    await sleep(1)

    const legendId = this.chart.paneId + indicatorId

    if (this.legendElements[legendId]) {
      return
    }

    const el = document.getElementById(legendId)

    if (el) {
      this.legendElements[legendId] = el
    }
  }

  unbindLegend(indicatorId?: string) {
    if (!this.legendElements) {
      return
    }

    if (!indicatorId) {
      for (const indicator of this.chart.loadedIndicators) {
        this.unbindLegend(indicator.id)
      }

      this.legendElements = null

      return
    }

    const legendId = this.chart.paneId + indicatorId

    for (const bindedLegendId in this.legendElements) {
      if (legendId === bindedLegendId) {
        this.legendElements[bindedLegendId].innerText = ''
        delete this.legendElements[bindedLegendId]
        return
      }
    }
  }

  clearChartsCrosshairs(paneId: string) {
    for (let i = 0; i < controlledCharts.length; i++) {
      if (typeof paneId !== paneId && paneId !== controlledCharts[i].paneId) {
        continue
      }

      controlledCharts[i].chartInstance.setCrosshair(null, null)
    }
  }

  syncCrosshair(param: MouseEventParams) {
    if (!param.time) {
      return
    }

    for (let i = 0; i < controlledCharts.length; i++) {
      if (controlledCharts[i].paneId === this.chart.paneId) {
        continue
      }

      controlledCharts[i].chartInstance.setCrosshair(
        controlledCharts[i].chartInstance
          .timeScale()
          .timeToCoordinate(
            floorTimestampToTimeframe(
              +param.time,
              controlledCharts[i].timeframe,
              controlledCharts[i].isOddTimeframe
            ) as Time
          ),
        true
      )
    }
  }
  updateLegend(event: MouseEventParams) {
    for (let i = 0; i < this.chart.loadedIndicators.length; i++) {
      const indicator = this.chart.loadedIndicators[i]

      if (!indicator.apis.length) {
        continue
      }

      const id = this.chart.paneId + indicator.id

      if (!this.legendElements[id]) {
        continue
      }

      if (!event.point.x) {
        continue
      }

      let text = ''

      for (let j = 0; j < indicator.apis.length; j++) {
        if (j > 10) {
          break
        }

        const api = indicator.apis[j]

        const data = event.seriesPrices.get(api) as any

        if (text.length) {
          text += '\u00a0|\u00a0'
        }

        if (!data) {
          text += 'na'
          continue
        }

        const formatFunction =
          indicator.options.priceFormat &&
          indicator.options.priceFormat.type === 'volume'
            ? formatAmount
            : formatPrice

        if (typeof data === 'number') {
          text += formatFunction(data, api.precision)
        } else if (data.close) {
          text += `O: ${formatFunction(
            data.open,
            api.precision
          )} H: ${formatFunction(data.high, api.precision)} L: ${formatFunction(
            data.low,
            api.precision
          )} C: ${formatFunction(data.close, api.precision)}`
        }
      }

      this.legendElements[id].textContent = text
    }
  }

  async toggleTimeframeDropdown(event) {
    const propsData = {
      value: event.currentTarget,
      paneId: this.chart.paneId
    }

    if (!timeframeDropdownComponent) {
      const module = await import(`@/components/chart/TimeframeDropdown.vue`)
      timeframeDropdownComponent = createComponent(module.default, propsData)

      mountComponent(timeframeDropdownComponent)
    } else {
      if (timeframeDropdownComponent.value === event.currentTarget) {
        timeframeDropdownComponent.value = null
      } else {
        timeframeDropdownComponent.paneId = propsData.paneId
        timeframeDropdownComponent.value = propsData.value
      }
    }
  }
}
