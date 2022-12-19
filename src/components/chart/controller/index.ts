import * as TV from 'lightweight-charts'
import { onCrosshair } from './events'
import {
  addIndicator,
  addPaneIndicators,
  bindIndicator,
  buildIndicator,
  clearIndicatorSeries,
  createIndicatorSeries,
  getIndicator,
  prepareRendererForIndicators,
  rebuildIndicator,
  redrawIndicator,
  refreshChartDependencies,
  refreshIndicatorsDependencies,
  removeIndicator,
  removeIndicatorSeries,
  resolveReferences,
  unbindIndicator
} from './indicators'
import {
  bindLegend,
  bindStateEvents,
  createChart,
  destroyChart,
  ensurePriceScale,
  refreshChartColors,
  refreshFontSize,
  refreshLegend,
  refreshMarkets,
  refreshPriceScale,
  refreshTimezone,
  refreshWatermark,
  resetPriceScales,
  unbindLegend
} from './setup'
import { BuildedIndicator, ChartMarket, IndicatorApi, Renderer } from './types'

export default class ChartController {
  protected paneId: string
  protected chartInstance: TV.IChartApi
  protected chartElement: HTMLElement
  protected indicators: BuildedIndicator[]
  protected priceScales: string[]
  protected watermark = ''
  protected timeframe: number
  protected timeframeType: 'time' | 'tick'
  protected activeRenderer: Renderer
  protected timezoneOffset: number
  protected markets: { [market: string]: ChartMarket }
  protected dependencies: string[]
  protected apis: { [id: string]: IndicatorApi }
  protected marketsProps: { [market: string]: string[] }

  protected _legendElements: { [id: string]: HTMLElement } = {}
  protected _promiseOfMarkets: Promise<void>
  protected _lastCrosshairX: number
  protected _onStoreMutation: () => void

  // events
  protected onCrosshair = onCrosshair

  // setup
  public createChart = createChart
  public destroyChart = destroyChart
  protected bindStateEvents = bindStateEvents
  protected bindLegend = bindLegend
  protected unbindLegend = unbindLegend
  protected refreshLegend = refreshLegend
  protected resetPriceScales = resetPriceScales
  protected refreshMarkets = refreshMarkets
  protected refreshTimezone = refreshTimezone
  protected refreshWatermark = refreshWatermark
  protected refreshChartColors = refreshChartColors
  protected refreshPriceScale = refreshPriceScale
  protected ensurePriceScale = ensurePriceScale
  protected refreshFontSize = refreshFontSize

  // indicators
  protected addPaneIndicators = addPaneIndicators
  protected getIndicator = getIndicator
  protected addIndicator = addIndicator
  protected createIndicatorSeries = createIndicatorSeries
  protected resolveReferences = resolveReferences
  protected buildIndicator = buildIndicator
  protected rebuildIndicator = rebuildIndicator
  protected redrawIndicator = redrawIndicator
  protected removeIndicator = removeIndicator
  protected removeIndicatorSeries = removeIndicatorSeries
  protected clearIndicatorSeries = clearIndicatorSeries
  protected bindIndicator = bindIndicator
  protected unbindIndicator = unbindIndicator
  protected prepareRendererForIndicators = prepareRendererForIndicators
  protected refreshIndicatorsDependencies = refreshIndicatorsDependencies
  protected refreshChartDependencies = refreshChartDependencies

  constructor(paneId: string) {
    this.paneId = paneId

    this.bindStateEvents()
  }
}
