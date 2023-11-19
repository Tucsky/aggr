import store from '@/store'

import { MAX_BARS_PER_CHUNKS } from '@/utils/constants'
import {
  getHms,
  camelize,
  getTimeframeForHuman,
  floorTimestampToTimeframe,
  isOddTimeframe,
  sleep,
  formatBytes,
  displayCanvasInPopup
} from '@/utils/helpers'
import { waitForStateMutation } from '@/utils/store'
import { joinRgba, splitColorCode } from '@/utils/colors'
import merge from 'lodash.merge'

import {
  defaultChartOptions,
  defaultPlotsOptions,
  defaultSerieOptions,
  getChartBarSpacingOptions,
  getChartGridlinesOptions,
  getChartOptions,
  getChartWatermarkOptions
} from '@/components/chart/options'
import dialogService from '@/services/dialogService'
import { ChartPaneState, PriceScaleSettings } from '@/store/panesSettings/chart'
import aggregatorService from '@/services/aggregatorService'
import workspacesService from '@/services/workspacesService'
import {
  stripStablePair,
  marketDecimals,
  parseMarket
} from '@/services/productsService'
import audioService from '@/services/audioService'
import alertService, {
  MarketAlert,
  AlertEvent,
  AlertEventType
} from '@/services/alertService'
import historicalService, {
  HistoricalResponse
} from '@/services/historicalService'

import seriesUtils from '@/components/chart/serieUtils'

import ChartCache, { Chunk } from '@/components/chart/cache'

import {
  createChart as createTVChart,
  BarData,
  HistogramData,
  ISeriesApi,
  LineData,
  PriceScaleOptions,
  SeriesOptions,
  UTCTimestamp,
  IChartApi,
  Time
} from 'lightweight-charts'
import { Trade } from '@/types/types'
import ChartControl from './controls'
import grouping from './grouping'
import {
  build,
  getBuildedIndicator,
  getCustomPlotOptions,
  getRendererIndicatorData
} from './buildUtils'

export interface Bar {
  vbuy?: number
  vsell?: number
  cbuy?: number
  csell?: number
  lbuy?: number
  lsell?: number
  time?: number
  open?: number
  high?: number
  low?: number
  close?: number
  empty?: boolean
  active?: boolean
  exchange?: string
  pair?: string
}

export interface IndicatorApi extends ISeriesApi<any> {
  id: string
  precision?: number
}

export type IndicatorMarkets = {
  [marketId: string]: string[]
}

export interface IndicatorSource {
  prop: string
  filters: IndicatorSourceFilters
}

export type IndicatorOption = { [key: string]: any }

export type IndicatorSourceFiltersValues = string | RegExp

export interface IndicatorSourceFilters {
  quote: IndicatorSourceFiltersValues
  exchange: IndicatorSourceFiltersValues
  type: IndicatorSourceFiltersValues
  name: IndicatorSourceFiltersValues
}

export interface TimeRange {
  from: number
  to: number
}

export interface OHLC {
  open: number
  high: number
  low: number
  close: number
}

export type IndicatorRealtimeAdapter = (
  renderer: Renderer,
  functions: IndicatorFunction[],
  variables: IndicatorVariable[],
  apis: IndicatorApi[],
  options: SeriesOptions<any>,
  seriesUtils: any
) => void
export interface LoadedIndicator {
  id: string
  options: any
  script: string
  model: IndicatorTranspilationResult
  adapter: IndicatorRealtimeAdapter
  apis: IndicatorApi[]
}

export interface IndicatorTranspilationResult {
  output: string
  variables: IndicatorVariable[]
  functions: IndicatorFunction[]
  plots: IndicatorPlot[]
  markets?: IndicatorMarkets
  references?: IndicatorReference[]
  options?: { [key: string]: IndicatorOption }
  sources?: IndicatorSource[]
}
export interface IndicatorFunction {
  name: string
  args?: any[]
  length?: number
  state?: any
  next?: () => void
}
export interface IndicatorVariable {
  length?: number
  state?: any
}
export interface IndicatorPlot {
  id: string
  type: string
  expectedInput: 'number' | 'ohlc' | 'range'
  options: { [prop: string]: any }
}
export interface IndicatorReference {
  indicatorId: string
  serieId?: string
  plotIndex: number
}
export interface Renderer {
  type: 'time' | 'tick' | 'bps' | 'vol'
  timeframe: number
  timestamp: number
  localTimestamp: number
  length: number
  bar: Bar
  sources: { [name: string]: Bar }
  indicators: { [id: string]: RendererIndicatorData }
  empty?: boolean
  price?: number
  prependedBars: any
}

interface RendererIndicatorData {
  canRender: boolean
  series: {
    rendered?: boolean
    time: number
    value?: number
    open?: number
    high?: number
    low?: number
    close?: number
    color?: string
    higherValue?: number
    lowerValue?: number
  }[]
  variables: IndicatorVariable[]
  functions: IndicatorFunction[]
  plotsOptions?: any[]
  minLength?: number
}

export type MarketsFilters = {
  [identifier: string]: boolean
}

// @todo: to split into 5 categories of things going on here
// + chart (create, configure, maintain, destroy)
// + indicators (all about indicators, scripting, and options)
// + ticker/engine (known as renderer, all about the developping data)
// + renderer (all about actual rendering)
// + helpers (utilities, exposed getters)
export default class Chart {
  paneId: string
  watermark: string

  chartCache: ChartCache
  chartControl: ChartControl
  chartInstance: IChartApi
  chartElement: HTMLElement
  loadedIndicators: LoadedIndicator[] = []
  panPrevented: boolean
  activeRenderer: Renderer
  renderedRange: TimeRange = { from: null, to: null }
  marketsFilters: MarketsFilters = {}
  marketsIndexes: string[] = []
  mainIndex: string
  timezoneOffset = 0
  fillGapsWithEmpty = true
  timeframe: number
  isOddTimeframe: boolean
  type: 'time' | 'tick' | 'bps' | 'vol'
  priceScales: string[] = []
  isLoading = false
  hasReachedEnd = false
  hasMixedSourceHistory = false

  private activeChunk: Chunk
  private queuedTrades: Trade[] = []
  private historicalMarkets: string[]
  private seriesIndicatorsMap: { [serieId: string]: IndicatorReference } = {}
  private previousLogicalRange: string

  private _releaseQueueInterval: number
  private _releasePanTimeout: number
  private _queueHandler = this.releaseQueue.bind(this)
  private _refreshDecimalsHandler = this.refreshAutoDecimals.bind(this)
  private _promiseOfPrependedBars: Promise<void>
  private _promiseOfMarkets: Promise<void>
  private _promiseOfMarketsRender: Promise<void>
  private _priceIndicatorId: string
  private _priceApi: IndicatorApi
  private _alertsRendered: boolean
  private _timeToRecycle: number
  private _recycleTimeout: number

  constructor(id: string, chartElement: HTMLElement) {
    this.paneId = id
    this.chartElement = chartElement

    // @todo: refactor as abstract
    this.chartCache = new ChartCache()

    this.initialize()
  }

  initialize() {
    this.createChart()
    this.setupQueue()
    this.setupRecycle()
    this.setTimeframe(store.state[this.paneId].timeframe)
    this.setTimezoneOffset(store.state.settings.timezoneOffset)
    this.refreshMarkets()
    this.fetch()

    aggregatorService.on('decimals', this._refreshDecimalsHandler)

    this.fillGapsWithEmpty = Boolean(store.state[this.paneId].fillGapsWithEmpty)
  }

  /**
   * update watermark when pane's markets changes
   */
  async refreshMarkets() {
    if (!store.state.app.isExchangesReady) {
      // exchanges are still loading (probably fetching products)
      // we need to call this again once fully loaded
      if (!this._promiseOfMarkets) {
        this._promiseOfMarkets = waitForStateMutation(
          state => state.app.isExchangesReady
        ).then(this.refreshMarkets.bind(this))
      } else {
        return this._promiseOfMarkets
      }
    } else if (this._promiseOfMarkets) {
      this._promiseOfMarkets = null
    }

    const markets: string[] = store.state.panes.panes[this.paneId].markets
    const normalizeWatermarks = store.state.settings.normalizeWatermarks
    const marketsForWatermark: string[] = []
    const marketsIndexes: { [index: string]: number } = {}
    const marketsFilters: any = {}

    for (const marketKey of markets) {
      const [exchange] = marketKey.split(':')
      const market = store.state.panes.marketsListeners[marketKey]

      let localPair = marketKey

      if (market) {
        localPair = stripStablePair(market.local)
      }

      // build up markets
      marketsFilters[marketKey] =
        store.state.exchanges[exchange] &&
        !store.state.exchanges[exchange].disabled &&
        !store.state[this.paneId].hiddenMarkets[marketKey]

      // build up watermark
      if (
        marketsFilters[marketKey] &&
        marketsForWatermark.indexOf(localPair) === -1
      ) {
        marketsForWatermark.push(
          !normalizeWatermarks || !market ? marketKey : localPair
        )
      }

      // find main pair
      if (!marketsIndexes[localPair]) {
        marketsIndexes[localPair] = 0
      }
      marketsIndexes[localPair]++
    }

    this.marketsFilters = marketsFilters
    this.marketsIndexes = Object.keys(marketsIndexes)
    this.historicalMarkets =
      historicalService.filterOutUnavailableMarkets(markets)
    this.hasMixedSourceHistory =
      this.historicalMarkets.length !== markets.length
    this.mainIndex = this.marketsIndexes
      .reduce((acc, index) => {
        acc.push({
          index,
          count: this.marketsIndexes[index]
        })

        return acc
      }, [])
      .sort((a, b) => b.count - a.count)[0]?.index

    this.updateWatermark(marketsForWatermark)
    this.resetPriceScales()
    this.refreshAutoDecimals()
  }

  /**
   * set timeframe to chart model and update watermark with litteral
   * @param timeframe
   */
  setTimeframe(timeframe) {
    const modifier = timeframe[timeframe.length - 1]
    if (modifier === 't') {
      this.type = 'tick'
    } else if (modifier === 'b') {
      this.type = 'bps'
    } else if (modifier === 'v') {
      this.type = 'vol'
    } else {
      this.type = 'time'
    }

    this.timeframe = parseFloat(timeframe)
    this.isOddTimeframe = isOddTimeframe(this.timeframe)
    this.previousLogicalRange = null

    this.updateWatermark()
  }

  /**
   * cache timezone offset
   * @param offset in ms
   */
  setTimezoneOffset(offset: number) {
    const originalTimezoneOffset = this.timezoneOffset

    this.timezoneOffset = offset / 1000

    const change = this.timezoneOffset - originalTimezoneOffset

    if (this.activeRenderer) {
      this.activeRenderer.localTimestamp += change
    }
  }

  /**
   * create Lightweight Charts instance and render pane's indicators
   */
  createChart() {
    console.log(`[chart/${this.paneId}/controller] create chart`)

    const chartOptions = merge(
      getChartOptions(defaultChartOptions, this.paneId),
      getChartWatermarkOptions(this.paneId),
      getChartGridlinesOptions(this.paneId),
      getChartBarSpacingOptions(this.paneId, this.chartElement.clientWidth)
    )

    this.chartInstance = createTVChart(
      this.chartElement,
      chartOptions
    ) as IChartApi

    this.addEnabledSeries()
    this.updateWatermark()
    this.updateFontSize()

    if (!this.chartControl) {
      this.chartControl = new ChartControl(this)
    }
    this.chartControl.bindEvents()
  }

  /**
   * remove series, destroy this.chartInstance and cancel related events
   */
  removeChart() {
    console.log(`[chart/${this.paneId}/controller] remove chart`)

    this.chartControl.unbindEvents()

    this.priceScales.splice(0, this.priceScales.length)

    while (this.loadedIndicators.length) {
      this.removeIndicator(this.loadedIndicators[0])
    }

    if (!this.chartInstance) {
      return
    }

    this.chartInstance = null
    this.chartElement.innerHTML = ''
  }

  /**
   * get active indicator by id
   * @returns {LoadedIndicator} serie
   */
  getLoadedIndicator(id: string): LoadedIndicator {
    for (let i = 0; i < this.loadedIndicators.length; i++) {
      if (this.loadedIndicators[i].id === id) {
        return this.loadedIndicators[i]
      }
    }
  }

  /**
   * set indicator option by key
   * @param {string} id serie id
   * @param {string} key option key
   * @param {any} value serie id
   */
  setIndicatorOption(id, key, value, silent = false) {
    const indicator = this.getLoadedIndicator(id)

    if (!indicator) {
      return
    }

    indicator.options[key] = value

    if (silent) {
      return
    }

    if (key === 'visible') {
      this.toggleIndicatorVisibility(indicator, value)

      return
    } else if (key === 'priceFormat') {
      if (value.auto) {
        setTimeout(() => this.refreshAutoDecimals(null, id))
      }
    }

    for (let i = 0; i < indicator.apis.length; i++) {
      indicator.apis[i].applyOptions({
        [key]: value
      })
    }

    if (indicator.model.options[key] && indicator.model.options[key].rebuild) {
      this.refreshIndicatorAdapter(indicator, this.activeRenderer)
      this.redrawIndicator(id)
    } else if (this.optionRequiresRedraw(key)) {
      this.redrawIndicator(id)
    }
  }

  toggleIndicatorVisibility(indicator: LoadedIndicator, value: boolean) {
    if (!value) {
      this.removeIndicatorSeries(indicator)
    } else {
      if (!indicator.model) {
        this.prepareIndicator(indicator)
      } else {
        this.createIndicatorSeries(indicator)
      }
      this.redrawIndicator(indicator.id)
    }
  }

  /**
   * return true if option change require complete redraw, false otherwise
   * @param key option key
   * @returns
   */
  optionRequiresRedraw(key: string) {
    const redrawOptions =
      /upColor|downColor|wickDownColor|wickUpColor|borderDownColor|borderUpColor|compositeOperation|src|priceScaleId/i

    if (redrawOptions.test(key)) {
      return true
    }

    const noRedrawOptions = /color|priceFormat|linetype|width|style/i

    if (noRedrawOptions.test(key)) {
      return false
    }

    return true
  }

  /**
   * rebuild the whole serie
   * @param {string} id serie id
   */
  rebuildIndicator(id) {
    this.removeIndicator(this.getLoadedIndicator(id))

    if (this.addIndicator(id)) {
      this.redrawIndicator(id)
    }
  }

  /**
   * get id(s) of indicators used in anoter indicator
   * @param {LoadedIndicator} indicator
   * @returns {string[]} id of indicators
   */
  getReferencedIndicators(indicator: LoadedIndicator) {
    return indicator.model.references
      .slice()
      .map(a => a.indicatorId)
      .filter((t, index, self) => self.indexOf(t) === index)
  }

  /**
   * redraw one specific indicator (and the series it depends on)
   * @param {string} indicatorId
   * @param {number?} from timestamp
   * @param {number?} to timestamp
   */
  redrawIndicator(indicatorId: string, from?: number, to?: number) {
    const indicator = this.getLoadedIndicator(indicatorId)

    this.clearIndicatorSeries(indicator)

    let bars = []

    for (const chunk of this.chartCache.chunks) {
      if (from || to) {
        bars = bars.concat(
          chunk.bars.filter(
            bar => (!from || bar.time >= from) && (!to || bar.time < to)
          )
        )
      } else {
        bars = bars.concat(chunk.bars)
      }
    }

    this.renderBars(bars, indicatorId)
  }

  /**
   * just a extention of Lightweight Charts getVisibleRange but using timezone offset from the settings
   * @returns
   */
  getVisibleRange() {
    const visibleRange = this.chartInstance
      .timeScale()
      .getVisibleRange() as TimeRange

    if (!visibleRange) {
      return visibleRange
    }

    visibleRange.from -= this.timezoneOffset
    visibleRange.to -= this.timezoneOffset

    return visibleRange
  }

  /**
   * add all pane's indicators
   */
  addEnabledSeries() {
    for (const id in store.state[this.paneId].indicators) {
      this.addIndicator(id)
    }
  }

  /**
   * render watermark in chart
   * @returns
   */
  updateWatermark(marketsUpdate?: string[]) {
    if (marketsUpdate) {
      if (!marketsUpdate.length) {
        this.watermark = 'Empty'
      } else if (store.state.settings.normalizeWatermarks) {
        this.watermark = marketsUpdate.join('\u2009|\u2009')
      } else {
        const othersCount = marketsUpdate.length - 3
        this.watermark =
          marketsUpdate.slice(0, 3).join('\u2009+\u2009') +
          (othersCount > 0
            ? '\u2009+\u2009' +
              othersCount +
              '\u2009other' +
              (othersCount > 1 ? 's' : '')
            : '')
      }
    }

    if (!this.chartInstance) {
      return
    }

    /**
     * weird spaces (\u00A0) are for left / right margins
     */
    this.chartInstance.applyOptions({
      watermark: {
        text: `\u00A0\u00A0\u00A0\u00A0${
          this.watermark +
          '\u2009|\u2009' +
          getTimeframeForHuman(store.state[this.paneId].timeframe)
        }\u00A0\u00A0\u00A0\u00A0`,
        ...getChartWatermarkOptions(this.paneId).watermark
      }
    })
  }

  /**
   * update chart font using pane zoom option
   */
  updateFontSize() {
    if (!this.chartElement) {
      return
    }

    const multiplier = store.state.panes.panes[this.paneId].zoom || 1
    const watermarkBaseFontSize =
      this.chartElement.clientWidth *
      0.05 *
      (!store.state.settings.normalizeWatermarks ? 0.5 : 1)

    this.chartInstance.applyOptions({
      layout: {
        fontSize: 14 * multiplier
      },
      watermark: {
        fontSize: Math.max(
          16,
          Math.min(144, watermarkBaseFontSize * multiplier)
        )
      }
    })
  }

  /**
   * create indicator and register associated series
   * @param {string} indicatorId indicator id
   */
  addIndicator(id, dependencyDepth?: number) {
    if (this.getLoadedIndicator(id)) {
      return true
    }

    if (dependencyDepth > 5) {
      return false
    }

    // get indicator name, script, options ...
    const indicatorSettings = store.state[this.paneId].indicators[id]
    const indicatorOptions = indicatorSettings.options || {}

    console.debug(`[chart/${this.paneId}/addIndicator] adding ${id}`)

    const indicator: LoadedIndicator = {
      id,
      options: JSON.parse(JSON.stringify(indicatorOptions)),
      script: indicatorSettings.script,
      model: null,
      adapter: null,
      apis: []
    }

    // build indicator
    try {
      this.prepareIndicator(indicator)
    } catch (error) {
      // handle dependency issue (resolveDependency adds required indicator(s) then try add this one again)
      if (
        error.status === 'indicator-required' &&
        !this.resolveDependency(
          indicator.id,
          error.serieId,
          dependencyDepth || 0
        )
      ) {
        dialogService.confirm({
          message: `"${indicator.id}" indicator need the "${error.serieId}" serie but that one WAS NOT found anywhere in the current indicators.`,
          ok: 'I see',
          cancel: false
        })
      }

      if (!error.status && !dialogService.isDialogOpened('indicator')) {
        dialogService.openIndicator(this.paneId, indicator.id)
      }

      return false
    }

    // build complete
    this.loadedIndicators.push(indicator)

    return true
  }

  resolveDependency(
    originalIndicatorId: string,
    missingSerieId: string,
    dependencyDepth: number
  ) {
    // serie was not found in active indicators
    // first we loop through pane indicators, maybe order of add is incorrect
    const indicators = (store.state[this.paneId] as ChartPaneState).indicators

    for (const otherIndicatorId in indicators) {
      if (
        otherIndicatorId === originalIndicatorId ||
        !indicators[otherIndicatorId].series
      ) {
        continue
      }

      if (indicators[otherIndicatorId].series.indexOf(missingSerieId) !== -1) {
        // found missing indicator
        // add missing indicator (otherIndicatorId) that seems to contain the missing serie (missingSerieId)
        if (this.addIndicator(otherIndicatorId, dependencyDepth + 1)) {
          if (dependencyDepth === 0) {
            // finaly add original indicator
            this.addIndicator(originalIndicatorId, dependencyDepth + 1)
          }

          return true
        } else {
          return false
          // too many dependencies
        }
      }
    }

    if (indicators[missingSerieId]) {
      if (
        this.addIndicator(indicators[missingSerieId].id, dependencyDepth + 1)
      ) {
        if (dependencyDepth === 0) {
          this.addIndicator(originalIndicatorId, dependencyDepth + 1)
        }

        return true
      }
    }

    return false
  }

  /**
   * build indicator and create own series instances from Lightweight Charts
   * @param indicator
   */
  prepareIndicator(indicator: LoadedIndicator) {
    try {
      const result = build(indicator, this.seriesIndicatorsMap)

      if (store.state[this.paneId].indicatorsErrors[indicator.id]) {
        store.commit(this.paneId + '/SET_INDICATOR_ERROR', {
          id: indicator.id,
          error: null
        })
      }

      indicator.model = result
      indicator.options = Object.keys(result.options).reduce((acc, key) => {
        acc[key] =
          typeof indicator.options[key] !== 'undefined'
            ? indicator.options[key]
            : result.options[key].default
        return acc
      }, indicator.options)

      store.commit(this.paneId + '/SET_INDICATOR_OPTIONS_DEFINITIONS', {
        id: indicator.id,
        optionsDefinitions: result.options
      })

      if (indicator.options.visible !== false) {
        this.createIndicatorSeries(indicator)
      }
    } catch (error) {
      if (indicator.options.visible !== false) {
        console.error(
          `[chart/${this.paneId}/prepareIndicator] transpilation failed`
        )
        console.error(`\t->`, error)

        store.commit(this.paneId + '/SET_INDICATOR_ERROR', {
          id: indicator.id,
          error: error.message
        })

        throw error
      }
    }
  }

  /**
   * attach indicator copy of indicator model (incl. states of variables and functions)
   * @param {LoadedIndicator} indicator
   * @param {Renderer} renderer
   * @returns
   */
  bindIndicator(indicator: LoadedIndicator, renderer: Renderer) {
    if (
      !renderer ||
      typeof renderer.indicators[indicator.id] !== 'undefined' ||
      !indicator.model
    ) {
      return
    }

    renderer.indicators[indicator.id] = getRendererIndicatorData(indicator)

    if (!this.activeRenderer || renderer === this.activeRenderer) {
      // update indicator series with plotoptions
      for (
        let i = 0;
        i < renderer.indicators[indicator.id].plotsOptions.length;
        i++
      ) {
        indicator.apis[i].applyOptions(
          renderer.indicators[indicator.id].plotsOptions[i]
        )
      }

      // create function ready to calculate (& render) everything for this indicator
      this.refreshIndicatorAdapter(indicator, renderer)
    }

    this.prepareRendererForIndicators(indicator, renderer)

    return indicator
  }

  refreshIndicatorAdapter(indicator: LoadedIndicator, renderer) {
    try {
      indicator.adapter = getBuildedIndicator(
        indicator.model,
        this.marketsFilters,
        indicator.options
      )
    } catch (error) {
      this.unbindIndicator(indicator, renderer)

      throw error
    }
  }

  refreshAllIndicatorAdapters() {
    for (const indicator of this.loadedIndicators) {
      this.refreshIndicatorAdapter(indicator, this.activeRenderer)
    }
  }

  /**
   * detach serie from renderer
   * @param {LoadedIndicator} indicator
   * @param {Renderer} renderer
   */
  unbindIndicator(indicator, renderer) {
    if (!renderer || typeof renderer.indicators[indicator.id] === 'undefined') {
      return
    }

    delete renderer.indicators[indicator.id]
  }

  ensurePriceScale(serieOptions: IndicatorOption) {
    const { priceScaleId, scaleMargins } = serieOptions
    if (this.priceScales.indexOf(priceScaleId) === -1) {
      // register pricescale
      this.priceScales.push(priceScaleId)
    }

    let priceScale: PriceScaleOptions | any =
      store.state[this.paneId].priceScales[priceScaleId]

    if (
      !priceScale ||
      (scaleMargins &&
        (!priceScale.scaleMargins ||
          scaleMargins.top !== priceScale.scaleMargins.top ||
          scaleMargins.bottom !== priceScale.scaleMargins.bottom))
    ) {
      if (!priceScale) {
        // create default price scale
        priceScale = {}
      }

      if (scaleMargins) {
        // use indicator priceScale
        priceScale.scaleMargins = scaleMargins
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

  resetPriceScales() {
    for (let i = 0; i < this.priceScales.length; i++) {
      try {
        this.chartInstance.priceScale(this.priceScales[i]).applyOptions({
          autoScale: true
        })
      } catch (error) {
        // priceScale might not exist with this id anymore
      }
    }
  }

  /**
   * deactivate indicator and remove it from chart controller
   * @param {LoadedIndicator} indicator
   */
  removeIndicator(indicator: LoadedIndicator) {
    if (typeof indicator === 'string') {
      indicator = this.getLoadedIndicator(indicator)
    }

    if (!indicator) {
      return
    }

    this.removeIndicatorSeries(indicator)

    // remove from active series model
    this.loadedIndicators.splice(this.loadedIndicators.indexOf(indicator), 1)
  }

  /**
   * clear all rendered data on chart (empty the chart)
   */
  clearChart(triggerPan?: boolean) {
    console.debug(
      `[chart/${this.paneId}/controller] clear chart (all series emptyed)`
    )

    if (!triggerPan) {
      this.preventPan()
    }

    for (const indicator of this.loadedIndicators) {
      this.clearIndicatorSeries(indicator)
    }

    this._alertsRendered = false
    this.renderedRange.from = this.renderedRange.to = null
  }

  /**
   * remove active renderer and incoming data
   * only use when chart indicators are cleared
   */
  clearData() {
    console.log(
      `[chart/${this.paneId}/controller] clear data (activeRenderer+activeChunk+queuedTrades1)`
    )

    this.activeRenderer = null
    this.activeChunk = null
    this.queuedTrades.splice(0, this.queuedTrades.length)
  }

  /**
   * Remove chart price lines (of given indicators if passed)
   * @param indicatorsIds
   */
  clearPriceLines(indicatorsIds?: string[]) {
    for (let i = 0; i < this.loadedIndicators.length; i++) {
      if (
        indicatorsIds &&
        indicatorsIds.indexOf(this.loadedIndicators[i].id) === -1
      ) {
        continue
      }

      if (this._priceIndicatorId === this.loadedIndicators[i].id) {
        this._alertsRendered = false
      }

      for (let j = 0; j < this.loadedIndicators[i].apis.length; j++) {
        this.loadedIndicators[i].apis[j].removeAllPriceLines()
      }
    }
  }

  /**
   * fresh start : clear cache, renderer and rendered series on chart
   */
  clear() {
    console.log(
      `[chart/${this.paneId}/controller] clear all (cache+activedata+chart)`
    )

    this.chartCache.clear()
    this.clearData()
    this.clearChart()
    this.hasReachedEnd = false
    this.setTimeframe(store.state[this.paneId].timeframe)
  }

  getActiveChunk() {
    if (
      !this.activeChunk &&
      this.chartCache.cacheRange.to === this.activeRenderer.timestamp
    ) {
      this.activeChunk =
        this.chartCache.chunks[this.chartCache.chunks.length - 1]
      this.activeChunk.active = true
    } else {
      if (this.activeChunk) {
        this.activeChunk.active = false
      }
      this.activeChunk = this.chartCache.saveChunk({
        from: this.activeRenderer.timestamp,
        to: this.activeRenderer.timestamp,
        active: true,
        rendered: true,
        bars: []
      })
    }

    return this.activeChunk
  }

  /**
   * clear everything
   */
  destroy() {
    console.log(`[chart/${this.paneId}/controller] destroy`)

    this.chartCache.clear()
    this.clearData()
    this.clearChart()
    this.removeChart()
    this.clearQueue()
    this.clearRecycle()

    aggregatorService.off('decimals', this._refreshDecimalsHandler)
  }

  /**
   * @param {LoadedIndicator} indicator indicator owning series
   */
  clearIndicatorSeries(indicator: LoadedIndicator) {
    if (indicator.id === this._priceIndicatorId) {
      this._priceIndicatorId = null
      this._priceApi = null
    }

    for (let i = 0; i < indicator.apis.length; i++) {
      indicator.apis[i].removeAllPriceLines()
      indicator.apis[i].setData([])
    }
  }

  /**
   * start queuing next trades
   */
  setupQueue() {
    if (this._releaseQueueInterval) {
      return
    }

    if (!store.state[this.paneId].refreshRate) {
      this._releaseQueueInterval = requestAnimationFrame(this._queueHandler)
      return
    }

    console.debug(
      `[chart/${this.paneId}/controller] setup queue (${getHms(
        store.state[this.paneId].refreshRate
      )})`
    )

    this._releaseQueueInterval = setInterval(
      this._queueHandler,
      store.state[this.paneId].refreshRate
    ) as unknown as number
  }

  /**
   * release queue and stop queuing next trades (stops all timers handling realtime data)
   * called when chart refresh rate changes (followed by setupQueue with new refresh rate)
   */
  clearQueue() {
    if (!this._releaseQueueInterval) {
      return
    }

    console.log(`[chart/${this.paneId}/controller] clear queue`)

    clearInterval(this._releaseQueueInterval)
    cancelAnimationFrame(this._releaseQueueInterval)
    delete this._releaseQueueInterval

    this.releaseQueue()
  }

  /**
   * pull trades from queue and render them immediately
   */
  releaseQueue() {
    if (!this.queuedTrades.length) {
      return
    }

    try {
      this.renderRealtimeTrades(this.queuedTrades)
    } catch (error) {
      console.log(error)
    } finally {
      this.queuedTrades.splice(0, this.queuedTrades.length)
    }
  }

  /**
   * push a set of trades to queue in order to render them later
   * @param {Trades[]} trades
   */
  queueTrades(trades) {
    Array.prototype.push.apply(this.queuedTrades, trades)

    if (!store.state[this.paneId].refreshRate) {
      this._releaseQueueInterval = requestAnimationFrame(this._queueHandler)
    }
  }

  /**
   * take a set of trades, group them into bars while using activeRenderer for reference and render them
   * also cache finished bar
   * @param {Trade[]} trades trades to render
   */
  renderRealtimeTrades(trades) {
    if (!trades.length) {
      return
    }

    let redrawAll = false

    for (let i = 0; i < trades.length; i++) {
      const trade = trades[i]
      const identifier = trade.exchange + ':' + trade.pair

      if (typeof this.marketsFilters[identifier] === 'undefined') {
        continue
      }

      let timestamp
      if (this.activeRenderer) {
        timestamp = grouping[this.activeRenderer.type]({
          renderer: this.activeRenderer,
          timeframe: this.timeframe,
          trade,
          isOdd: this.isOddTimeframe,
          marketsFilters: this.marketsFilters
        })
      } else {
        timestamp = trade.timestamp / 1000
      }

      if (!this.activeRenderer || this.activeRenderer.timestamp < timestamp) {
        if (this.activeRenderer) {
          if (
            !this.activeChunk ||
            (this.activeChunk.to < this.activeRenderer.timestamp &&
              this.activeChunk.bars.length >= MAX_BARS_PER_CHUNKS)
          ) {
            // ensure active chunk is created and ready to receive bars
            this.getActiveChunk()
          }

          if (!this.activeRenderer.bar.empty) {
            this.updateBar(this.activeRenderer)
          }

          // feed activeChunk with active bar exchange snapshot
          for (const source in this.activeRenderer.sources) {
            if (this.activeRenderer.sources[source].empty === false) {
              this.activeChunk.bars.push(
                this.cloneSourceBar(
                  this.activeRenderer.sources[source],
                  this.activeRenderer.timestamp
                )
              )
            }
          }

          this.activeChunk.to = this.chartCache.cacheRange.to =
            this.activeRenderer.timestamp

          if (this.renderedRange.to < this.activeRenderer.timestamp) {
            this.renderedRange.to = this.activeRenderer.timestamp
          }

          this.nextBar(timestamp, this.activeRenderer)
        } else {
          this.activeRenderer = this.createRenderer(timestamp)
        }
      }

      if (
        !this.activeRenderer.sources[identifier] ||
        typeof this.activeRenderer.sources[identifier].pair === 'undefined'
      ) {
        this.registerInitialBar(
          identifier,
          trade.pair,
          trade.exchange,
          +trade.price,
          this.marketsFilters[identifier]
        )
        redrawAll = true
      }

      const isActive = this.marketsFilters[identifier]

      if (trade.liquidation) {
        this.activeRenderer.sources[identifier]['l' + trade.side] +=
          trade.amount

        this.activeRenderer.bar.empty = false

        if (isActive) {
          this.activeRenderer.bar['l' + trade.side] += trade.amount
        }

        continue
      }

      this.activeRenderer.sources[identifier].close = +trade.price

      if (this.activeRenderer.sources[identifier].empty) {
        this.activeRenderer.sources[identifier].open =
          this.activeRenderer.sources[identifier].high =
          this.activeRenderer.sources[identifier].low =
            this.activeRenderer.sources[identifier].close
      } else {
        this.activeRenderer.sources[identifier].high = Math.max(
          this.activeRenderer.sources[identifier].high,
          this.activeRenderer.sources[identifier].close
        )
        this.activeRenderer.sources[identifier].low = Math.min(
          this.activeRenderer.sources[identifier].low,
          this.activeRenderer.sources[identifier].close
        )
      }

      this.activeRenderer.sources[identifier]['c' + trade.side] += trade.count
      this.activeRenderer.sources[identifier]['v' + trade.side] += trade.amount

      this.activeRenderer.sources[identifier].empty = false

      if (isActive) {
        this.activeRenderer.bar['v' + trade.side] += trade.amount
        this.activeRenderer.bar['c' + trade.side] += trade.count

        this.activeRenderer.bar.empty = false
      }
    }

    if (!this.activeRenderer || this.activeRenderer.bar.empty || redrawAll) {
      if (redrawAll) {
        this.renderAll()
      }
      return
    }

    this.updateBar(this.activeRenderer)

    if (this.renderedRange.to < this.activeRenderer.timestamp) {
      this.renderedRange.to = this.activeRenderer.timestamp
    }
  }

  /**
   * create a new object from an existing bar
   * to avoid reference when storing finished bar data to cache
   * @param {Bar} sourceBar do copy
   * @param {number} [timestamp] apply timestamp to returned bar
   */
  cloneSourceBar(sourceBar: Bar, timestamp?: number): Bar {
    return {
      pair: sourceBar.pair,
      exchange: sourceBar.exchange,
      time: timestamp || sourceBar.time,
      open: sourceBar.open,
      high: sourceBar.high,
      low: sourceBar.low,
      close: sourceBar.close,
      vbuy: sourceBar.vbuy,
      vsell: sourceBar.vsell,
      cbuy: sourceBar.cbuy,
      csell: sourceBar.csell,
      lbuy: sourceBar.lbuy,
      lsell: sourceBar.lsell
    }
  }

  /**
   * Prepare the bars for render
   * Takes a bars array (from cache)
   * Merge with bar from activeRenderer
   * So that 1 bar = 1 source at 1 timestamp
   * @param bars cached bars
   * @returns {void} only bars content changes
   */
  mergeBarsWithActiveBars(bars) {
    if (!bars.length) {
      if (
        this.activeRenderer &&
        this.activeRenderer.bar &&
        !this.activeRenderer.bar.empty
      ) {
        Array.prototype.push.apply(
          bars,
          Object.values(this.activeRenderer.sources).filter(
            bar => bar.empty === false
          )
        )
      }
    } else if (
      this.activeRenderer &&
      this.activeRenderer.timestamp > bars[bars.length - 1].time
    ) {
      const activeBars = Object.values(this.activeRenderer.sources).filter(
        bar => bar.empty === false
      )

      for (let i = 0; i < activeBars.length; i++) {
        const activeBar = activeBars[i]

        activeBar.time = this.activeRenderer.timestamp

        for (let j = bars.length - 1; j >= 0; j--) {
          const cachedBar = bars[j]

          if (cachedBar.time < this.activeRenderer.timestamp) {
            bars.splice(j + 1, 0, activeBar)
            activeBars.splice(i, 1)
            i--
            break
          } else if (
            cachedBar.exchange === activeBar.exchange &&
            cachedBar.pair === activeBar.pair
          ) {
            cachedBar.vbuy += activeBar.vbuy
            cachedBar.vsell += activeBar.vsell
            cachedBar.cbuy += activeBar.cbuy
            cachedBar.csell += activeBar.csell
            cachedBar.lbuy += activeBar.lbuy
            cachedBar.lsell += activeBar.lsell
            cachedBar.open = activeBar.open
            cachedBar.high = activeBar.high
            cachedBar.low = activeBar.low
            cachedBar.close = activeBar.close
            activeBars.splice(i, 1)
            i--

            break
          }
        }
      }
    }
  }

  /**
   * then render indicatorsIds (or all if not specified) from new set of bars
   * this replace data of series, erasing current data on chart
   * if no indicatorsId is specified, all indicators on chart are rendered from start to finish
   * then merge indicator's states from temporary renderer used to render all thoses bars into activeRenderer
   *
   * @param {Bar[]} bars
   * @param {string} indicatorId
   * @param {boolean} silent
   */
  renderBars(bars: Bar[], indicatorId, silent?: boolean) {
    let indicatorsIds
    let drawReferences = false

    if (indicatorId) {
      const indicator = this.getLoadedIndicator(indicatorId)
      if (
        indicator.options.priceScaleId === 'left' ||
        indicator.options.priceScaleId === 'right'
      ) {
        drawReferences = true
      }
      indicatorsIds = [...this.getReferencedIndicators(indicator), indicatorId]
    }

    this.clearPriceLines(indicatorsIds)
    this.mergeBarsWithActiveBars(bars)

    if (!bars.length) {
      return
    }

    const computedSeries = {}
    let from = null
    let to = null

    // new renderer (will replace activeRenderer)
    let temporaryRenderer: Renderer

    let barCount = 0

    for (let i = 0; i <= bars.length; i++) {
      const bar = bars[i]

      if (
        !bar ||
        !temporaryRenderer ||
        bar.time > temporaryRenderer.timestamp
      ) {
        if (temporaryRenderer) {
          if (temporaryRenderer.bar.empty && !this.fillGapsWithEmpty && bar) {
            this.nextBar(bar.time, temporaryRenderer)
            continue
          }

          if (from === null) {
            from = temporaryRenderer.timestamp
          }

          to = temporaryRenderer.timestamp

          const computedBar = this.computeBar(temporaryRenderer, indicatorsIds)

          for (const id in computedBar) {
            if (
              !drawReferences &&
              indicatorsIds &&
              indicatorId !== id &&
              indicatorsIds.indexOf(id) !== -1
            ) {
              continue
            }

            if (typeof computedSeries[id] === 'undefined') {
              computedSeries[id] = []
            }

            computedSeries[id].push(computedBar[id])
          }
        }

        if (!bar) {
          break
        }

        barCount++

        if (temporaryRenderer) {
          if (this.fillGapsWithEmpty && temporaryRenderer.type === 'time') {
            const missingBars =
              (bar.time -
                temporaryRenderer.timeframe -
                temporaryRenderer.timestamp) /
              temporaryRenderer.timeframe

            if (missingBars > 0) {
              for (let j = 0; j < missingBars; j++) {
                this.incrementRendererBar(temporaryRenderer)

                for (const id in computedSeries) {
                  computedSeries[id].push({
                    time: temporaryRenderer.localTimestamp
                  })
                }

                barCount++
              }
            }
          }
          this.nextBar(bar.time, temporaryRenderer)
        } else {
          temporaryRenderer = this.createRenderer(
            bar.time || this.activeRenderer.timestamp,
            indicatorsIds
          )

          if (temporaryRenderer.prependedBars) {
            Array.prototype.unshift.apply(bars, temporaryRenderer.prependedBars)
          }
        }
      }

      const marketKey = bar.exchange + ':' + bar.pair

      const isActive = this.marketsFilters[marketKey]

      if (isActive && !bar.empty) {
        temporaryRenderer.bar.empty = false
        temporaryRenderer.bar.vbuy += bar.vbuy
        temporaryRenderer.bar.vsell += bar.vsell
        temporaryRenderer.bar.cbuy += bar.cbuy
        temporaryRenderer.bar.csell += bar.csell
        temporaryRenderer.bar.lbuy += bar.lbuy
        temporaryRenderer.bar.lsell += bar.lsell
      }

      temporaryRenderer.sources[marketKey] = this.cloneSourceBar(bar)
      temporaryRenderer.sources[marketKey].empty = false
      temporaryRenderer.sources[marketKey].active = isActive
    }
    if (this.activeRenderer) {
      this.activeRenderer.bar = {
        ...temporaryRenderer.bar,
        close: this.activeRenderer.bar.close
      }
      for (const id in temporaryRenderer.indicators) {
        this.activeRenderer.indicators[id] = temporaryRenderer.indicators[id]
      }
      for (const id in temporaryRenderer.sources) {
        this.activeRenderer.sources[id] = temporaryRenderer.sources[id]
      }
    } else {
      this.activeRenderer = temporaryRenderer
    }

    this.replaceData(computedSeries, silent)

    setTimeout(this.renderAlerts.bind(this))

    if (!indicatorsIds || !indicatorsIds.length) {
      if (this.activeRenderer) {
        this.activeRenderer.length = barCount
      }
      if (!bars.length) {
        this.renderedRange.from = this.renderedRange.to = null
      } else {
        this.renderedRange.from = from
        this.renderedRange.to = to
      }
    }
  }

  removeIndicatorSeries(indicator) {
    if (this.chartInstance) {
      // remove from chart instance (derender)
      for (let i = 0; i < indicator.apis.length; i++) {
        this.chartInstance.removeSeries(indicator.apis[i])
        indicator.apis.splice(i--, 1)
      }
    }

    // unbind from activebar (remove serie meta data like sma memory etc)
    this.unbindIndicator(indicator, this.activeRenderer)

    const isPriceScaleDead =
      typeof this.loadedIndicators.find(
        i =>
          i.id !== indicator.id &&
          i.options.visible !== false &&
          i.options.priceScaleId === indicator.options.priceScaleId
      ) === 'undefined'

    if (isPriceScaleDead) {
      this.priceScales.splice(
        this.priceScales.indexOf(indicator.options.priceScaleId),
        1
      )
    }
  }

  createIndicatorSeries(indicator) {
    const series = []

    const priceScale =
      store.state[this.paneId].priceScales[indicator.options.priceScaleId]

    if (priceScale && priceScale.priceFormat) {
      indicator.options.priceFormat = {
        ...indicator.options.priceFormat,
        ...priceScale.priceFormat
      }
    }

    for (let i = 0; i < indicator.model.plots.length; i++) {
      const plot = indicator.model.plots[i]
      const apiMethodName = camelize('add-' + plot.type + '-series')
      const customPlotOptions = getCustomPlotOptions(indicator, plot)

      const serieOptions = {
        ...defaultSerieOptions,
        ...(defaultPlotsOptions[plot.type] || {}),
        ...indicator.options,
        ...(priceScale && priceScale.scaleMargins
          ? {
              scaleMargins: {
                top: priceScale.scaleMargins.top,
                bottom: priceScale.scaleMargins.bottom
              }
            }
          : {}),
        ...customPlotOptions
      }

      const api = this.chartInstance[apiMethodName](
        serieOptions
      ) as IndicatorApi

      api.id = plot.id

      this.seriesIndicatorsMap[plot.id] = {
        indicatorId: indicator.id,
        plotIndex: i
      }
      series.push(plot.id)

      indicator.apis.push(api)

      this.ensurePriceScale(serieOptions)
    }

    store.commit(this.paneId + '/SET_INDICATOR_SERIES', {
      id: indicator.id,
      series
    })

    // attach indicator to active renderer
    this.bindIndicator(indicator, this.activeRenderer)
  }

  refreshPriceScale(priceScaleId: string) {
    const priceScale: PriceScaleSettings =
      store.state[this.paneId].priceScales[priceScaleId]
    this.chartInstance.priceScale(priceScaleId).applyOptions({
      scaleMargins: priceScale.scaleMargins,
      mode: priceScale.mode
    })
  }

  /**
   * disable "fetch on pan" until current operation (serie.update / serie.setData) is finished
   */
  preventPan() {
    if (this.panPrevented) {
      return
    }

    const delay = 100

    if (typeof this._releasePanTimeout !== 'undefined') {
      clearTimeout(this._releasePanTimeout)
    }

    this.panPrevented = true

    this._releasePanTimeout = window.setTimeout(() => {
      this.panPrevented = false
    }, delay)
  }

  /**
   * Renders all chunks
   */
  async renderAll(triggerPan?: boolean) {
    if (!this.chartInstance) {
      return
    }

    if (this._promiseOfMarkets) {
      if (!this._promiseOfMarketsRender) {
        this._promiseOfMarketsRender = this._promiseOfMarkets.then(() => {
          this._promiseOfMarketsRender = null
          this.renderAll(true)
        })
      }

      return this._promiseOfMarketsRender
    }

    const scrollPosition = this.chartInstance.timeScale().scrollPosition()
    this.clearChart(triggerPan)
    this.renderBars(
      this.chartCache.chunks.length
        ? this.chartCache.chunks.reduce(
            (bars, chunk) => bars.concat(chunk.bars),
            []
          )
        : [],
      null,
      !triggerPan
    )

    if (scrollPosition) {
      this.chartInstance.timeScale().scrollToPosition(scrollPosition, false)
    }
  }
  getPrependedBars(timestamp) {
    if (this.type === 'time' && !this.hasMixedSourceHistory) {
      return null
    }

    if (
      this.activeRenderer &&
      this.activeRenderer.prependedBars &&
      this.activeRenderer.prependedBars.length
    ) {
      if (this.activeRenderer.prependedBars[0].time !== timestamp) {
        this.activeRenderer.prependedBars =
          this.activeRenderer.prependedBars.map(bar => ({
            ...bar,
            time: timestamp
          }))
      }
      return this.activeRenderer.prependedBars
    }

    if (this._promiseOfPrependedBars) {
      return []
    }

    this._promiseOfPrependedBars = aggregatorService
      .getAllTickers()
      .then(tickers => {
        this._promiseOfPrependedBars = null

        if (this.activeRenderer) {
          this.activeRenderer.prependedBars = Object.keys(tickers).reduce(
            (acc, key) => {
              const price = tickers[key].price
              if (!price) {
                return acc
              }

              const [exchange, pair] = parseMarket(key)

              acc.push({
                time: timestamp,
                cbuy: null,
                close: price,
                csell: null,
                high: price,
                lbuy: null,
                low: price,
                lsell: null,
                market: key,
                open: price,
                vbuy: null,
                vsell: null,
                exchange: exchange,
                pair: pair
              })

              return acc
            },
            this.activeRenderer.prependedBars
          )

          this.renderAll()
        }
      })

    return []
  }

  async registerInitialBar(identifier, pair, exchange, close, active) {
    this.activeRenderer.sources[identifier] = {
      pair: pair,
      exchange: exchange,
      close: close,
      active
    }

    this.resetBar(this.activeRenderer.sources[identifier])

    if (this.activeRenderer.prependedBars) {
      this.activeRenderer.prependedBars.push({
        ...this.resetBar({
          close: close
        }),
        pair: pair,
        exchange: exchange,
        cbuy: 1,
        csell: 1
      })
    }
  }

  async renderAlerts() {
    if (
      this._alertsRendered ||
      !store.state.settings.alerts ||
      !store.state[this.paneId].showAlerts
    ) {
      return
    }

    const api = this.getPriceApi()

    if (!api) {
      return
    }

    for (const index of this.marketsIndexes) {
      const alerts = await alertService.getAlerts(index)
      for (let i = 0; i < alerts.length; i++) {
        this.renderAlert(alerts[i], api)
      }
    }

    this._alertsRendered = true
  }

  onAlert({ timestamp, price, market, type, newPrice }: AlertEvent) {
    if (this.marketsIndexes.indexOf(market) === -1) {
      return
    }

    const existingAlert = alertService.alerts[market].find(
      a => a.price === price
    )

    const api = this.getPriceApi()

    if (!api) {
      return
    }

    const timeScale = this.chartInstance.timeScale()
    let index
    if (timeScale && timestamp) {
      index = timeScale.coordinateToLogical(
        timeScale.timeToCoordinate(timestamp as Time)
      )
    }

    const priceline = api.getPriceLine(newPrice || price, index)

    switch (type) {
      case AlertEventType.DELETED:
        if (priceline) {
          api.removePriceLine(priceline)
        }
        break

      case AlertEventType.UPDATED:
        if (priceline) {
          api.removePriceLine(priceline)
        }

        this.renderAlert(
          {
            ...existingAlert,
            price: newPrice
          },
          api
        )
        break

      case AlertEventType.TRIGGERED:
        if (store.state.settings.alertSound) {
          audioService.playOnce(store.state.settings.alertSound)
        }

        if (priceline) {
          api.removePriceLine(priceline)
        }

        this.renderAlert(existingAlert, api)
        break

      case AlertEventType.CREATED:
        if (priceline) {
          api.removePriceLine(priceline)
        }

        this.renderAlert(
          {
            timestamp,
            price,
            market
          },
          api,
          0.5
        )
        break

      case AlertEventType.ACTIVATED:
        if (priceline) {
          api.removePriceLine(priceline)
        }

        this.renderAlert(existingAlert, api)
        break

      case AlertEventType.DEACTIVATED:
        if (priceline) {
          api.removePriceLine(priceline)
        }

        this.renderAlert(existingAlert, api, 0.5)
        break
    }
  }

  renderAlert(alert: MarketAlert, api: ISeriesApi<any>, opacity?: number) {
    if (!api) {
      return
    }

    let index

    if (alert.timestamp) {
      const timestamp = floorTimestampToTimeframe(
        alert.timestamp,
        this.timeframe
      )
      index = this.chartInstance
        .timeScale()
        .coordinateToLogical(
          this.chartInstance
            .timeScale()
            .timeToCoordinate(timestamp as UTCTimestamp)
        )
    }

    const showLabel = store.state[this.paneId].showAlertsLabel
    let title = ''

    if (showLabel && alert.message && alert.message.length < 3) {
      title = alert.message
    }

    let color = store.state.settings.alertsColor

    if (alert.triggered) {
      title += '✔'
    }

    if (opacity || alert.triggered) {
      const colorRgb = splitColorCode(color)
      colorRgb[3] = (colorRgb[3] || 1) * (opacity || 0.5)
      color = joinRgba(colorRgb)
    }

    return api.createPriceLine({
      market: alert.market,
      message: alert.message,
      index,
      price: alert.price,
      lineWidth: store.state.settings.alertsLineWidth,
      lineStyle: store.state.settings.alertsLineStyle,
      color,
      title: title.length ? title : null,
      axisLabelVisible: showLabel
    } as any)
  }

  /**
   * replace whole chart with a set of computed series bars
   * @param {Bar[]} seriesData Lightweight Charts formated series
   */
  replaceData(
    seriesData: {
      [id: string]: (LineData | BarData | HistogramData)[]
    },
    silent?: boolean
  ) {
    if (silent) {
      this.preventPan()
    }

    for (let i = this.loadedIndicators.length - 1; i >= 0; i--) {
      if (this.loadedIndicators[i].options.visible === false) {
        continue
      }

      for (let j = 0; j < this.loadedIndicators[i].apis.length; j++) {
        const serieId = this.loadedIndicators[i].apis[j].id
        if (seriesData[serieId]) {
          try {
            this.loadedIndicators[i].apis[j].setData(seriesData[serieId])
          } catch (error) {
            store.commit(this.paneId + '/SET_INDICATOR_ERROR', {
              id: this.loadedIndicators[i].id,
              error: error.message
            })

            this.setIndicatorOption(
              this.loadedIndicators[i].id,
              'visible',
              false
            )
          }
        }
      }
    }
  }

  /**
   * excecute indicators, updating chart series with renderer's data
   * @param renderer
   */
  updateBar(renderer: Renderer) {
    this.preventPan()

    const toUpdate = []

    for (let i = 0; i < this.loadedIndicators.length; i++) {
      if (this.loadedIndicators[i].options.visible === false) {
        continue
      }

      const indicator = this.loadedIndicators[i]
      const serieData = renderer.indicators[indicator.id]

      this.loadedIndicators[i].adapter(
        renderer,
        serieData.functions,
        serieData.variables,
        indicator.apis,
        indicator.options,
        seriesUtils
      )

      if (serieData.canRender) {
        for (let j = 0; j < indicator.apis.length; j++) {
          if (serieData.series[j] && !serieData.series[j].rendered) {
            if (
              (indicator.model.plots[j].type === 'line' &&
                !serieData.series[j].value) ||
              (indicator.model.plots[j].type === 'histogram' &&
                !serieData.series[j].value) ||
              ((indicator.model.plots[j].type === 'cloudarea' ||
                indicator.model.plots[j].type === 'brokenarea') &&
                serieData.series[j].lowerValue === null) ||
              (indicator.model.plots[j].type === 'histogram' &&
                !serieData.series[j].value)
            ) {
              continue
            }
            toUpdate.push([indicator.apis[j], serieData.series[j]])
          }
        }
      }
    }

    for (let i = 0; i < toUpdate.length; i++) {
      toUpdate[i][0].update(toUpdate[i][1])
      toUpdate[i][1].rendered = true
    }
  }

  /**
   * excecute indicators with renderer's data, and return series points
   * this does not update series on chart (indicator.apisNoop is passed instead of indicator.apis)
   * @param {Renderer} renderer
   * @param {string[]} indicators id of indicators to execute (all indicators calculated if null)
   * @returns series points
   */
  computeBar(
    renderer: Renderer,
    indicatorsIds?: string[]
  ): { [serieId: string]: any } {
    const points = {}

    for (let i = 0; i < this.loadedIndicators.length; i++) {
      if (
        (indicatorsIds &&
          indicatorsIds.indexOf(this.loadedIndicators[i].id) === -1) ||
        this.loadedIndicators[i].options.visible === false
      ) {
        continue
      }

      const indicator = this.loadedIndicators[i]
      const serieData = renderer.indicators[indicator.id]

      serieData.series = []

      try {
        indicator.adapter(
          renderer,
          serieData.functions,
          serieData.variables,
          indicator.apis,
          indicator.options,
          seriesUtils
        )
      } catch (error) {
        console.error(
          `[chart/${this.paneId}/computeBar] execution failed\n\t->`,
          error
        )

        store.commit(this.paneId + '/SET_INDICATOR_ERROR', {
          id: indicator.id,
          error: error.message
        })

        continue
      }

      for (let i = 0; i < serieData.series.length; i++) {
        if (!indicator.model.plots[i]) {
          break
        }

        if (
          renderer.length < serieData.minLength ||
          !serieData.series[i] ||
          (typeof serieData.series[i].value !== 'undefined' &&
            serieData.series[i].value === null) ||
          (typeof serieData.series[i].lowerValue !== 'undefined' &&
            serieData.series[i].lowerValue === null) ||
          (indicator.model.plots[i].type === 'histogram' &&
            serieData.series[i].value === 0)
        ) {
          continue
        }
        points[indicator.apis[i].id] = serieData.series[i]
      }
    }

    return points
  }

  getPriceApi() {
    if (this._priceApi) {
      return this._priceApi
    }

    const price = this.loadedIndicators.find(a => a.id === 'price')

    if (price && price.options.visible !== false) {
      this._priceIndicatorId = 'price'
      this._priceApi = price.apis[0]
      return this._priceApi
    }

    for (let i = 0; i < this.loadedIndicators.length; i++) {
      for (let j = 0; j < this.loadedIndicators[i].apis.length; j++) {
        const api = this.loadedIndicators[i].apis[j]

        if (api.options().priceScaleId === 'right') {
          this._priceIndicatorId = this.loadedIndicators[i].id
          this._priceApi = api

          return this._priceApi
        }
      }
    }
  }

  /**
   * Create empty renderer
   * this is called on first realtime trade or when indicator(s) are rendered from start to finish
   * @param {number} firstBarTimestamp  - create at time
   * @param {string[]} indicatorsIds    - id of indicators to bind (if null all indicators are binded)
   * @return {Renderer}
   */
  createRenderer(
    firstBarTimestamp: number,
    indicatorsIds?: string[]
  ): Renderer {
    firstBarTimestamp = floorTimestampToTimeframe(
      firstBarTimestamp,
      this.timeframe
    )

    const renderer: Renderer = {
      timestamp: firstBarTimestamp,
      localTimestamp: firstBarTimestamp + this.timezoneOffset,
      timeframe: this.timeframe,
      type: this.type,
      length: 1,
      indicators: {},
      sources: {},
      prependedBars: this.getPrependedBars(firstBarTimestamp),

      bar: {
        vbuy: 0,
        vsell: 0,
        cbuy: 0,
        csell: 0,
        lbuy: 0,
        lsell: 0,
        empty: true
      }
    }

    this.loadedIndicators = this.loadedIndicators.sort((a, b) => {
      const referencesA = a.model ? a.model.references.length : 0
      const referencesB = b.model ? b.model.references.length : 0
      return referencesA - referencesB
    })

    for (const indicator of this.loadedIndicators) {
      if (
        (indicatorsIds && indicatorsIds.indexOf(indicator.id) === -1) ||
        indicator.options.visible === false
      ) {
        continue
      }

      this.bindIndicator(indicator, renderer)
    }

    return renderer
  }

  /**
   * prepare renderer for next bar
   * @param {number} timestamp timestamp of the next bar
   * @param {Renderer?} renderer bar to use as reference
   */
  nextBar(timestamp, renderer?: Renderer) {
    if (
      this.fillGapsWithEmpty &&
      renderer === this.activeRenderer &&
      this.activeRenderer.type === 'time' &&
      this.activeRenderer.timestamp < timestamp - this.activeRenderer.timeframe
    ) {
      const missingBars =
        (timestamp -
          this.activeRenderer.timeframe -
          this.activeRenderer.timestamp) /
        this.activeRenderer.timeframe

      for (let k = 0; k < missingBars; k++) {
        this.incrementRendererBar(renderer)

        for (let i = 0; i < this.loadedIndicators.length; i++) {
          for (let j = 0; j < this.loadedIndicators[i].apis.length; j++) {
            this.loadedIndicators[i].apis[j].update({
              time: renderer.localTimestamp
            })
          }
        }
      }
    }

    this.incrementRendererBar(renderer)
    this.resetRendererBar(renderer)

    renderer.timestamp = timestamp
    renderer.localTimestamp = timestamp + this.timezoneOffset
  }

  /**
   * increment bar (1 timeframe forward)
   * @param {Renderer} bar bar to clear for next timestamp
   */
  incrementRendererBar(renderer: Renderer) {
    renderer.length++
    renderer.timestamp += renderer.timeframe
    renderer.localTimestamp += renderer.timeframe
    renderer.price = null

    for (let i = 0; i < this.loadedIndicators.length; i++) {
      const rendererSerieData = renderer.indicators[this.loadedIndicators[i].id]

      if (!rendererSerieData) {
        continue
      }

      rendererSerieData.canRender =
        renderer.length >= rendererSerieData.minLength

      for (let f = 0; f < rendererSerieData.functions.length; f++) {
        const instruction = rendererSerieData.functions[f]

        if (typeof seriesUtils[instruction.name].next === 'function') {
          seriesUtils[instruction.name].next(instruction)
        }
      }

      for (let v = 0; v < rendererSerieData.variables.length; v++) {
        const instruction = rendererSerieData.variables[v]

        if (instruction.length > 1) {
          instruction.state.unshift(instruction.state[0])

          if (instruction.state.length > instruction.length) {
            instruction.state.pop()
          }
        }
      }
    }
  }

  /**
   * fresh start for the renderer bar (and all its sources / markets)
   * @param {Renderer} bar bar to clear for next timestamp
   */
  resetRendererBar(renderer: Renderer) {
    renderer.bar = {
      ...renderer.bar,
      vbuy: 0,
      vsell: 0,
      cbuy: 0,
      csell: 0,
      lbuy: 0,
      lsell: 0,
      empty: true
    }

    if (typeof renderer.sources !== 'undefined') {
      for (const identifier in renderer.sources) {
        this.resetBar(renderer.sources[identifier])
      }
    }
  }

  /**
   * preparing bar for next
   * @param {Bar} bar
   */
  resetBar(bar: Bar) {
    if (bar.close !== null) {
      bar.open = bar.close
      bar.high = bar.close
      bar.low = bar.close
    }

    bar.vbuy = 0
    bar.vsell = 0
    bar.cbuy = 0
    bar.csell = 0
    bar.lbuy = 0
    bar.lsell = 0
    bar.empty = true

    return bar
  }

  /**
   *
   * @param indicator
   * @param renderer
   */
  prepareRendererForIndicators(indicator: LoadedIndicator, renderer: Renderer) {
    let markets = Object.keys(indicator.model.markets)

    if (indicator.model.sources.length) {
      markets = Object.keys(this.marketsFilters)
        .concat(markets)
        .filter((t, index, self) => self.indexOf(t) === index)
    }

    for (let j = 0; j < markets.length; j++) {
      if (!renderer.sources[markets[j]]) {
        renderer.sources[markets[j]] = {
          open: null,
          high: null,
          low: null,
          close: null
        }
      }

      let keys = indicator.model.markets[markets[j]] || []

      if (indicator.model.sources.length) {
        keys = indicator.model.sources
          .map(a => a.prop)
          .concat(keys)
          .filter((t, index, self) => self.indexOf(t) === index)
      }

      if (keys.length) {
        for (let k = 0; k < keys.length; k++) {
          if (
            typeof renderer.sources[markets[j]][keys[k]] === 'undefined' &&
            keys[k] !== 'open' &&
            keys[k] !== 'high' &&
            keys[k] !== 'low' &&
            keys[k] !== 'close'
          ) {
            renderer.sources[markets[j]][keys[k]] = 0
          }
        }
      }
    }
  }

  toggleFillGapsWithEmpty() {
    this.fillGapsWithEmpty = !this.fillGapsWithEmpty

    this.renderAll()
  }

  refreshAutoDecimals(indexes?: string[], indicatorId?: string) {
    if (indexes && indexes.indexOf(this.mainIndex) === -1) {
      return
    }

    const precision = marketDecimals[this.mainIndex]

    for (let i = 0; i < this.loadedIndicators.length; i++) {
      if (indicatorId && indicatorId !== this.loadedIndicators[i].id) {
        continue
      }

      let priceFormat = this.loadedIndicators[i].options.priceFormat || {
        type: 'price'
      }

      const indicatorPrecision =
        typeof precision === 'number'
          ? precision
          : typeof priceFormat.precision === 'number'
          ? priceFormat.precision
          : 2

      if (
        !priceFormat.auto ||
        priceFormat.type === 'volume' ||
        priceFormat.precision === indicatorPrecision
      ) {
        continue
      }

      const precisionOptions = {
        precision: indicatorPrecision,
        minMove: 1 / Math.pow(10, indicatorPrecision)
      }

      priceFormat = {
        ...priceFormat,
        ...precisionOptions,
        auto: true
      }

      store.dispatch(this.paneId + '/setIndicatorOption', {
        id: this.loadedIndicators[i].id,
        key: 'priceFormat',
        value: priceFormat,
        silent: true
      })

      const priceScale =
        store.state[this.paneId].priceScales[
          this.loadedIndicators[i].options.priceScaleId
        ]

      store.commit(this.paneId + '/SET_PRICE_SCALE', {
        id: this.loadedIndicators[i].options.priceScaleId,
        priceScale: {
          ...priceScale,
          priceFormat: precisionOptions
        }
      })

      for (let j = 0; j < this.loadedIndicators[i].apis.length; j++) {
        this.loadedIndicators[i].apis[j].applyOptions({
          priceFormat: precisionOptions
        })
      }
    }
  }

  async screenshotIndicator(indicatorId): Promise<Blob> {
    const indicator = this.getLoadedIndicator(indicatorId)
    const originalSize = {
      width: this.chartElement.clientWidth,
      height: this.chartElement.clientHeight
    }

    const timeScale = this.chartInstance.timeScale()
    const scrollPosition = timeScale.scrollPosition()
    const timeScaleOptions = timeScale.options()
    const chartOptions = this.chartInstance.options()
    const priceScale = this.chartInstance.priceScale(
      indicator.options.priceScaleId
    )
    const leftPriceScale = this.chartInstance.priceScale('left')
    const rightPriceScale = this.chartInstance.priceScale('right')
    const leftPriceScaleVisibility = leftPriceScale.options().visible
    const rightPriceScaleVisibility = rightPriceScale.options().visible
    const { top: scaleMarginsTop, bottom: scaleMarginsBottom } =
      priceScale.options().scaleMargins
    const watermarkVisibility = chartOptions.watermark.visible
    const timeScaleOriginalOptions = {
      visible: timeScaleOptions.visible,
      barSpacing: timeScaleOptions.barSpacing,
      rightOffset: timeScaleOptions.rightOffset
    }

    this.chartInstance.resize(420, 180)

    this.chartInstance.applyOptions({
      watermark: {
        visible: false
      }
    })

    priceScale.applyOptions({
      scaleMargins: {
        top: 0,
        bottom: 0
      }
    })

    timeScale.applyOptions({
      visible: false,
      barSpacing: 3,
      rightOffset: 0
    })

    leftPriceScale.applyOptions({
      visible: false
    })

    rightPriceScale.applyOptions({
      visible: false
    })

    let chartCanvas

    try {
      this.clearQueue()
      this.clearChart()
      this.redrawIndicator(
        indicator.id,
        this.chartCache.cacheRange.to - this.timeframe * 400
      )
      await sleep(10)
      chartCanvas = this.chartInstance.takeScreenshot()
    } catch (error) {
      console.log(error)
      //
    }

    this.renderAll()

    this.setupQueue()
    this.chartInstance.resize(originalSize.width, originalSize.height)

    priceScale.applyOptions({
      scaleMargins: {
        top: scaleMarginsTop,
        bottom: scaleMarginsBottom
      }
    })

    leftPriceScale.applyOptions({
      visible: leftPriceScaleVisibility
    })

    rightPriceScale.applyOptions({
      visible: rightPriceScaleVisibility
    })

    timeScale.applyOptions({
      ...timeScaleOriginalOptions,
      barSpacing: store.state[this.paneId].barSpacing
    })

    this.chartInstance.applyOptions({
      watermark: {
        visible: watermarkVisibility
      }
    })
    timeScale.scrollToPosition(scrollPosition, false)

    if (!chartCanvas) {
      return
    }

    return new Promise(resolve => {
      chartCanvas.toBlob(blob => {
        resolve(blob)
      })
    })
  }

  getPrice() {
    if (!this.activeRenderer) {
      return null
    }

    if (this.activeRenderer.price) {
      return this.activeRenderer.price
    }

    this.activeRenderer.price = +seriesUtils.avg_close
      .update({}, this.activeRenderer)
      .toFixed(8)

    return this.activeRenderer.price
  }

  getChartCanvas(): HTMLCanvasElement {
    return this.chartElement.querySelector(
      'tr:first-child td:nth-child(2) canvas:nth-child(2)'
    )
  }

  flipChart() {
    const api = this.getPriceApi()
    const ps = api.priceScale()

    const invertScale = ps.options().invertScale

    api.priceScale().applyOptions({
      invertScale: !invertScale
    })
  }

  takeScreenshot(event) {
    const chartCanvas = this.chartInstance.takeScreenshot()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    const zoom = store.state.panes.panes[this.paneId].zoom || 1

    const pxRatio = window.devicePixelRatio || 1
    const textPadding = 16 * zoom * pxRatio
    let textFontsize = 12 * zoom * pxRatio
    if (chartCanvas.width * chartCanvas.height < 40000) {
      textFontsize = 6
    }

    canvas.width = chartCanvas.width
    ctx.font = `${textFontsize}px Spline Sans Mono`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'

    const lines = []
    const [date, time] = new Date().toISOString().split('T')

    const fullDate = date + ' ' + time.split('.')[0] + ' UTC'
    const symbol = this.watermark
    const timeframe = getTimeframeForHuman(store.state[this.paneId].timeframe)
    if (chartCanvas.width > 500) {
      lines.push([symbol, timeframe, fullDate].join(' | '))
    } else {
      lines.push(fullDate)
      lines.push([symbol, timeframe].join(' | '))
    }

    const lineHeight = Math.round(textFontsize)
    canvas.height = chartCanvas.height

    const styles = getComputedStyle(document.documentElement)
    const themeColor = styles.getPropertyValue('--theme-base')
    const themeColorRgba = splitColorCode(themeColor)
    const themeColorO75 = joinRgba([
      themeColorRgba[0],
      themeColorRgba[1],
      themeColorRgba[2],
      0.75
    ])
    const textColor = styles.getPropertyValue('--theme-color-base')
    const backgroundColor = store.state.settings.backgroundColor

    if (!event.shiftKey) {
      ctx.fillStyle = themeColor
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = backgroundColor
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }

    ctx.fillStyle =
      store.state.settings.theme === 'light'
        ? 'rgba(255,255,255,.2)'
        : 'rgba(0,0,0,.2)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(chartCanvas, 0, 0)

    ctx.fillStyle = textColor
    ctx.font = `${textFontsize}px Spline Sans Mono`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'

    let offsetY = 0

    for (let i = 0; i < lines.length; i++) {
      ctx.strokeStyle = themeColorO75
      ctx.lineWidth = 4 * pxRatio
      ctx.lineJoin = 'round'
      ctx.strokeText(lines[i], textPadding, textPadding + offsetY)
      ctx.fillText(lines[i], textPadding, textPadding + offsetY)

      offsetY += lineHeight * 1.2 * (i + 1)
    }

    offsetY += textPadding * 2

    if (store.state[this.paneId].showIndicators) {
      Object.values(
        (store.state[this.paneId] as ChartPaneState).indicators
      ).forEach(indicator => {
        const options = indicator.options as any

        if (options.visible === false) {
          return
        }

        let color = options.color || options.upColor || textColor

        try {
          color = splitColorCode(color)

          if (typeof color[3] !== 'undefined') {
            color[3] = 1
          }

          color = joinRgba(color)
        } catch (error) {
          // not rgb(a)
        }

        const text = indicator.displayName || indicator.name

        ctx.fillStyle = textColor
        ctx.strokeStyle = themeColorO75
        ctx.lineWidth = 4 * pxRatio
        ctx.fillStyle = color
        ctx.lineJoin = 'round'
        ctx.strokeText(text, textPadding, offsetY)
        ctx.fillText(text, textPadding, offsetY)

        offsetY += lineHeight * 1.2
      })
    }

    displayCanvasInPopup(canvas)
  }

  restart() {
    this.destroy()
    this.initialize()
  }

  /**
   * fetch whatever is missing based on visiblerange
   * @param {TimeRange} range range to fetch
   */
  fetch(range?: TimeRange) {
    if (!range) {
      this.hasReachedEnd = false
    }
    const alreadyHasData =
      this.chartCache.cacheRange && this.chartCache.cacheRange.from

    if (!this.historicalMarkets.length) {
      return
    }

    const timeframe = +(store.state[this.paneId] as ChartPaneState).timeframe

    if (!timeframe) {
      this.hasReachedEnd = true
      return
    }

    if (
      store.state.app.apiSupportedTimeframes.indexOf(timeframe.toString()) ===
      -1
    ) {
      return
    }

    const visibleRange = this.getVisibleRange() as TimeRange

    let rangeToFetch

    if (!range) {
      let rightTime

      if (alreadyHasData) {
        rightTime = this.chartCache.cacheRange.from
      } else if (visibleRange && visibleRange.from) {
        rightTime =
          visibleRange.from + store.state.settings.timezoneOffset / 1000
      } else {
        rightTime = Date.now() / 1000
      }

      rangeToFetch = {
        from: rightTime - timeframe * 20,
        to: rightTime
      }
    } else {
      rangeToFetch = range
    }

    rangeToFetch.from = floorTimestampToTimeframe(
      Math.round(rangeToFetch.from),
      timeframe
    )
    rangeToFetch.to =
      floorTimestampToTimeframe(Math.round(rangeToFetch.to), timeframe) +
      timeframe

    if (this.chartCache.cacheRange.from) {
      rangeToFetch.to = Math.min(
        floorTimestampToTimeframe(this.chartCache.cacheRange.from, timeframe),
        rangeToFetch.to
      )
    }

    const barsCount = Math.floor(
      (rangeToFetch.to - rangeToFetch.from) / timeframe
    )
    const bytesPerBar = 112
    const estimatedSize = formatBytes(
      barsCount * this.historicalMarkets.length * bytesPerBar
    )

    store.dispatch('app/showNotice', {
      id: 'fetching-' + this.paneId,
      timeout: 15000,
      title: `Fetching ${
        barsCount * this.historicalMarkets.length
      } bars (~${estimatedSize})`,
      type: 'info'
    })

    this.isLoading = true

    return historicalService
      .fetch(
        rangeToFetch.from * 1000,
        rangeToFetch.to * 1000,
        timeframe,
        this.historicalMarkets
      )
      .then(results => this.onHistorical(results))
      .catch(err => {
        console.error(err)

        this.hasReachedEnd = true
      })
      .then(() => {
        store.dispatch('app/hideNotice', 'fetching-' + this.paneId)

        setTimeout(() => {
          this.isLoading = false

          this.fetchMore(
            this.chartInstance.timeScale().getVisibleLogicalRange()
          )
        }, 200)
      })
  }

  /**
   * Handle the historical service response
   * Split bars into chunks and add to chartCache
   * Render chart once everything is done
   */
  onHistorical(results: HistoricalResponse) {
    const chunk: Chunk = {
      from: results.from,
      to: results.to,
      bars: results.data
    }

    this.chartCache.saveChunk(chunk)

    this.renderAll(true)
  }

  async fetchMore(visibleLogicalRange) {
    const logicalRangeId = `${visibleLogicalRange.from},${visibleLogicalRange.to}`

    if (
      this.isLoading ||
      this.hasReachedEnd ||
      !visibleLogicalRange ||
      visibleLogicalRange.from > 0 ||
      (this.previousLogicalRange &&
        this.previousLogicalRange === logicalRangeId)
    ) {
      return
    }

    this.previousLogicalRange = logicalRangeId

    let indicatorLength = 0

    if (this.activeRenderer) {
      for (const indicatorId in this.activeRenderer.indicators) {
        if (!this.activeRenderer.indicators[indicatorId].minLength) {
          continue
        }
        indicatorLength = Math.max(
          indicatorLength,
          this.activeRenderer.indicators[indicatorId].minLength
        )
      }
    }

    const barsToLoad =
      Math.round(
        Math.min(Math.abs(visibleLogicalRange.from) + indicatorLength, 500)
      ) + 1

    if (!barsToLoad) {
      return
    }

    const rangeToFetch = {
      from:
        this.chartCache.cacheRange.from -
        barsToLoad * store.state[this.paneId].timeframe,
      to: this.chartCache.cacheRange.from - 1
    }

    await this.fetch(rangeToFetch)
  }

  savePosition(visibleLogicalRange) {
    store.commit(
      this.paneId + '/SET_BAR_SPACING',
      this.getBarSpacing(visibleLogicalRange)
    )
  }

  getBarSpacing(visibleLogicalRange) {
    if (!visibleLogicalRange) {
      return defaultChartOptions.timeScale.barSpacing
    }

    const canvasWidth = this.getChartCanvas().clientWidth
    const barSpacing =
      canvasWidth / (visibleLogicalRange.to - visibleLogicalRange.from)

    return barSpacing
  }

  trimChart() {
    if (Date.now() > this._timeToRecycle) {
      const visibleRange = this.getVisibleRange() as TimeRange

      let end

      if (visibleRange) {
        end = visibleRange.from - (visibleRange.to - visibleRange.from) * 2
      }

      if (this.chartCache.trim(end)) {
        this.renderAll()
      }

      this.setTimeToRecycle()
    }

    this._recycleTimeout = setTimeout(
      this.trimChart.bind(this),
      1000 * 60 * 15
    ) as unknown as number
  }

  setupRecycle() {
    this._recycleTimeout = setTimeout(
      this.trimChart.bind(this),
      1000 * 60 * 3
    ) as unknown as number
    this.setTimeToRecycle()
  }

  clearRecycle() {
    clearTimeout(this._recycleTimeout)
  }

  setTimeToRecycle() {
    const now = Date.now()

    if (this.type === 'time') {
      const chartCanvas = this.getChartCanvas()
      const chartWidth = chartCanvas.clientWidth
      const barSpacing = this.getBarSpacing(
        this.chartInstance.timeScale().getVisibleLogicalRange()
      )
      this._timeToRecycle =
        now +
        Math.min(
          1000 * 60 * 60 * 24,
          (this.timeframe * 1000 * (chartWidth / barSpacing)) / 2
        )
    }

    this._timeToRecycle = now + 900000
  }

  async createAlertAtPrice(price, timestamp) {
    if (!store.state.settings.alerts) {
      if (
        !(await dialogService.confirm({
          title: 'Alerts are disabled',
          message: 'Enable alerts ?',
          ok: 'Yes please'
        }))
      ) {
        return
      }

      store.commit('settings/TOGGLE_ALERTS', true)
    }

    const market = this.mainIndex

    const alert: MarketAlert = {
      price,
      market,
      timestamp,
      active: false
    }

    alertService.createAlert(alert, this.getPrice())
  }

  async refreshChartDimensions() {
    if (!this.chartInstance) {
      return
    }

    let headerHeight = 0

    if (!store.state.settings.autoHideHeaders) {
      const zoom = store.state.panes.panes[this.paneId].zoom || 1
      headerHeight = 1.375 * zoom * 16
    }

    const paneElement = this.chartElement.parentElement

    this.chartInstance.resize(
      paneElement.clientWidth,
      paneElement.clientHeight - headerHeight
    )
  }

  async saveIndicatorPreview(indicatorId) {
    const blob = await this.screenshotIndicator(indicatorId)
    workspacesService.saveIndicatorPreview(indicatorId, blob)
  }

  toggleTimeframeDropdown(event) {
    return this.chartControl.toggleTimeframeDropdown(event)
  }
}
