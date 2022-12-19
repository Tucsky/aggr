import ChartController from '.'
import store from '../../../store'
import {
  ChartPaneState,
  PriceScaleSettings
} from '../../../store/panesSettings/chart'
import { getTimeframeForHuman } from '../../../utils/helpers'
import { waitForStateMutation } from '../../../utils/store'
import { BuildedIndicator, ChartMarket } from './types'
import * as TV from 'lightweight-charts'
import {
  defaultChartOptions,
  getChartCustomColorsOptions,
  getChartOptions
} from '../chartOptions'
import { stripStable } from '../../../services/productsService'

export function bindStateEvents(this: ChartController) {
  let mutationPayload: any

  const mutationMap = {
    'settings/SET_TEXT_COLOR': () => {
      this.refreshChartColors(mutationPayload)
    },
    'settings/SET_CHART_THEME': this.refreshChartColors,
    'settings/TOGGLE_NORMAMIZE_WATERMARKS': this.refreshWatermark,
    'settings/SET_TIMEZONE_OFFSET': this.refreshTimezone.bind(this, true),
    'panes/SET_PANE_MARKETS': (() => {
      if (mutationPayload.id === this.paneId) {
        this.refreshMarkets()
      }
    }).bind(this, mutationPayload),
    'panes/SET_PANE_ZOOM': this.refreshFontSize,
    [this.paneId + '/TOGGLE_LEGEND']: this.refreshLegend,
    [this.paneId + '/SET_REFRESH_RATE']: this.refreshQueue,
    [this.paneId + '/SET_GRIDLINES']: () => {
      this.refreshGridlines(mutationPayload.type)
    },
    [this.paneId + '/SET_WATERMARK']: this.refreshWatermark,
    [this.paneId + '/TOGGLE_NORMAMIZE_WATERMARKS']: this.refreshWatermark,
    [this.paneId + '/SET_INDICATOR_OPTION']: () => {
      this.setIndicatorOption(
        mutationPayload.id,
        mutationPayload.key,
        mutationPayload.value,
        mutationPayload.silent
      )
    },
    [this.paneId + '/SET_PRICE_SCALE']: () => {
      this.refreshPriceScale(mutationPayload.id)
    },
    [this.paneId + '/SET_INDICATOR_SCRIPT']: () => {
      this.rebuildIndicator(mutationPayload.id)
    },
    [this.paneId + '/ADD_INDICATOR']: () => {
      this.addIndicator(mutationPayload.id)
    },
    [this.paneId + '/ADD_INDICATOR']: () => {
      if (this.addIndicator(mutationPayload.id)) {
        this.redrawIndicator(mutationPayload.id)
        this.bindLegend(mutationPayload.id)
      }
    },
    [this.paneId + '/REMOVE_INDICATOR']: () => {
      this.unbindLegend(mutationPayload)
      this.removeIndicator(mutationPayload)
    },
    [this.paneId + '/TOGGLE_FILL_GAPS_WITH_EMPTY']:
      this.toggleFillGapsWithEmpty,
    'settings/TOGGLE_AUTO_HIDE_HEADERS': this.refreshSize
  }

  this._onStoreMutation = store.subscribe(mutation => {
    if (!mutationMap[mutation.type]) {
      return
    }

    mutationPayload = mutation.payload

    mutationMap[mutation.type]()
  })
}

export function refreshFontSize(this: ChartController) {
  const multiplier = store.state.panes.panes[this.paneId].zoom || 1
  const watermarkBaseFontSize = store.state.settings.normalizeWatermarks
    ? 72
    : 48

  this.chartInstance.applyOptions({
    layout: {
      fontSize: 14 * multiplier
    },
    watermark: {
      fontSize: watermarkBaseFontSize * multiplier
    }
  })
}

export function ensurePriceScale(
  this: ChartController,
  priceScaleId: string,
  indicator: BuildedIndicator
) {
  if (this.priceScales.indexOf(priceScaleId) !== -1) {
    // chart already knows about that price scale (and doesn't need update)
    return
  } else {
    // register pricescale
    this.priceScales.push(priceScaleId)
  }

  let priceScale: TV.PriceScaleOptions | any =
    store.state[this.paneId].priceScales[priceScaleId]

  if (!priceScale) {
    // create default price scale
    priceScale = {}

    if (indicator && indicator.options.scaleMargins) {
      // use indicator priceScale
      priceScale.scaleMargins = indicator.options.scaleMargins
    } else {
      priceScale.scaleMargins = {
        top: 0.1,
        bottom: 0.2
      }
    }

    // save it
    store.commit(this.paneId + '/SET_PRICE_SCALE', {
      id: priceScaleId,
      priceScale
    })
  }

  this.refreshPriceScale(priceScaleId)
}

export function refreshPriceScale(this: ChartController, priceScaleId) {
  const priceScale: PriceScaleSettings =
    store.state[this.paneId].priceScales[priceScaleId]

  this.chartInstance.priceScale(priceScaleId).applyOptions({
    ...priceScale
  })
}

export function refreshChartColors(
  this: ChartController,
  textColorOverride?: string
) {
  this.chartInstance.applyOptions(
    getChartCustomColorsOptions(textColorOverride)
  )
}

export function refreshWatermark(this: ChartController, refreshText?: boolean) {
  if (refreshText) {
    const normalize = store.state.settings.normalizeWatermarks
    const paneMarkets = Object.keys(this.markets)
    const includedMarkets = []

    for (const market of paneMarkets) {
      if (includedMarkets.length > 3 && !normalize) {
        break
      }

      includedMarkets.push(normalize ? paneMarkets[market].index : market)
    }

    if (normalize) {
      this.watermark = includedMarkets.join(' | ')
    } else {
      const otherCount = paneMarkets.length - includedMarkets.length
      this.watermark =
        includedMarkets.join(' + ') +
        (otherCount ? ` + ${otherCount} other${otherCount > 1 ? 's' : ''}` : '')
    }
  }

  if (!this.chartInstance) {
    return
  }

  this.chartInstance.applyOptions({
    watermark: {
      text: `\u00A0\u00A0\u00A0\u00A0${
        this.watermark +
        ' | ' +
        getTimeframeForHuman(store.state[this.paneId].timeframe)
      }\u00A0\u00A0\u00A0\u00A0`,
      visible: store.state[this.paneId].showWatermark,
      color: store.state[this.paneId].watermarkColor
    }
  })
}

export function refreshTimezone(this: ChartController, offset: number) {
  const originalTimezoneOffset = this.timezoneOffset

  this.timezoneOffset = offset / 1000

  const change = this.timezoneOffset - originalTimezoneOffset

  if (this.activeRenderer) {
    this.activeRenderer.localTimestamp += change
  }
}

/**
 * update watermark when pane's markets changes
 */
export async function refreshMarkets(this: ChartController) {
  if (!store.state.app.isExchangesReady) {
    if (!this._promiseOfMarkets) {
      this._promiseOfMarkets = waitForStateMutation(
        state => state.app.isExchangesReady
      ).then(this.refreshMarkets.bind(this, true))
    } else {
      return this._promiseOfMarkets
    }
  } else if (this._promiseOfMarkets) {
    this._promiseOfMarkets = null
  }

  const markets = store.state.panes.panes[this.paneId].markets
  const chartMarkets: { [market: string]: ChartMarket } = {}

  for (const marketKey of markets) {
    const product = store.state.panes.products[marketKey]

    let localPair = marketKey

    if (product) {
      localPair = stripStable(product.local)
    }

    chartMarkets[marketKey] = {
      active: !store.state[this.paneId].hiddenMarkets[marketKey],
      index: localPair
    }
  }

  this.markets = chartMarkets

  this.refreshWatermark(true)
  this.resetPriceScales()
}

export function resetPriceScales() {
  for (let i = 0; i < this.priceScales.length; i++) {
    this.chartInstance.priceScale(this.priceScales[i]).applyOptions({
      autoScale: true
    })
  }
}

export function refreshLegend(indicatorId?: string) {
  if (store.state[this.paneId].showLegend) {
    this.bindLegend(indicatorId)
  } else {
    this.unbindLegend(indicatorId)
  }
}

export async function bindLegend(this: ChartController, indicatorId?: string) {
  if (!store.state[this.paneId].showLegend) {
    return
  }

  if (!indicatorId) {
    for (const id in (store.state[this.paneId] as ChartPaneState).indicators) {
      this.bindLegend(id)
    }

    this.chartInstance.subscribeCrosshairMove(this.onCrosshair)
    return
  }

  const legendId = this.paneId + indicatorId

  if (this._legendElements[legendId]) {
    return
  }

  const el = document.getElementById(legendId)

  if (el) {
    this._legendElements[legendId] = el
  }
}

export function unbindLegend(this: ChartController, indicatorId?: string) {
  if (!indicatorId) {
    for (const id in (store.state[this.paneId] as ChartPaneState).indicators) {
      this.unbindLegend(id)
    }

    this.chartInstance.unsubscribeCrosshairMove(this.onCrosshair)
    return
  }

  const legendId = this.paneId + indicatorId

  for (const bindedLegendId in this._legendElements) {
    if (legendId === bindedLegendId) {
      this._legendElements[bindedLegendId].innerText = ''
      delete this._legendElements[bindedLegendId]
      return
    }
  }
}

/**
 * create Lightweight Charts instance and render pane's indicators
 * @param {HTMLElement} containerElement
 */
export function createChart(
  this: ChartController,
  containerElement: HTMLElement
) {
  console.log(`[chart/${this.paneId}/controller] create chart`)

  const chartOptions = getChartOptions(defaultChartOptions as any)

  if (store.state[this.paneId].showVerticalGridlines) {
    chartOptions.grid.vertLines.visible =
      store.state[this.paneId].showVerticalGridlines
    chartOptions.grid.vertLines.color =
      store.state[this.paneId].verticalGridlinesColor
  }

  if (store.state[this.paneId].showHorizontalGridlines) {
    chartOptions.grid.horzLines.visible =
      store.state[this.paneId].showHorizontalGridlines
    chartOptions.grid.horzLines.color =
      store.state[this.paneId].horizontalGridlinesColor
  }

  if (store.state[this.paneId].showWatermark) {
    chartOptions.watermark.visible = store.state[this.paneId].showWatermark
    chartOptions.watermark.color = store.state[this.paneId].watermarkColor
  }

  const preferedBarSpacing = store.state[this.paneId].barSpacing

  if (preferedBarSpacing) {
    chartOptions.timeScale.barSpacing = preferedBarSpacing
    chartOptions.timeScale.rightOffset = Math.ceil(
      (containerElement.clientWidth * 0.05) / chartOptions.timeScale.barSpacing
    )
  }

  this.chartInstance = TV.createChart(containerElement, chartOptions)
  this.chartElement = containerElement

  this.refreshFontSize()
  this.addPaneIndicators()
}

export function destroyChart(this: ChartController) {
  this._onStoreMutation()

  if (this.chartInstance) {
    this.chartInstance.destroy()
  }
}
