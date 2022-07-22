import { MAX_BARS_PER_CHUNKS } from '../../utils/constants'
import {
  getHms,
  camelize,
  getTimeframeForHuman,
  floorTimestampToTimeframe,
  isOddTimeframe
} from '../../utils/helpers'
import {
  defaultChartOptions,
  defaultPlotsOptions,
  defaultSerieOptions,
  getChartCustomColorsOptions,
  getChartOptions
} from './options'
import store from '../../store'
import seriesUtils from './serieUtils'
import * as TV from 'lightweight-charts'
import ChartCache, { Chunk } from './cache'
import SerieBuilder from './serieBuilder'
import { MarketAlert, Trade } from '@/types/types'
import dialogService from '@/services/dialogService'
import { ChartPaneState, PriceScaleSettings } from '@/store/panesSettings/chart'
import { waitForStateMutation } from '../../utils/store'
import aggregatorService from '@/services/aggregatorService'
import workspacesService from '@/services/workspacesService'
import { getEventOffset } from '@/utils/touchevent'
import {
  formatPrice,
  stripStable,
  marketDecimals
} from '@/services/productsService'
import audioService from '../../services/audioService'

export interface Bar {
  vbuy?: number
  vsell?: number
  cbuy?: number
  csell?: number
  lbuy?: number
  lsell?: number
  exchange?: string
  pair?: string
  timestamp?: number
  open?: number
  high?: number
  low?: number
  close?: number
  empty?: boolean
  active?: boolean
}

export interface IndicatorApi extends TV.ISeriesApi<any> {
  id: string
  precision?: number
}

export type IndicatorMarkets = {
  [marketId: string]: string[]
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
  options: TV.SeriesOptions<any>,
  seriesUtils: any
) => void
export interface LoadedIndicator {
  id: string
  options: any
  script: string
  model: IndicatorTranspilationResult
  adapter: IndicatorRealtimeAdapter
  silentAdapter: IndicatorRealtimeAdapter
  apis: IndicatorApi[]
}

export interface IndicatorTranspilationResult {
  output: string
  silentOutput: string
  variables: IndicatorVariable[]
  functions: IndicatorFunction[]
  plots: IndicatorPlot[]
  markets?: IndicatorMarkets
  references?: IndicatorReference[]
}
export interface IndicatorFunction {
  name: string
  args?: any[]
  length?: number
  state?: any
  next?: Function
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
  type: 'time' | 'tick'
  timeframe: number
  timestamp: number
  localTimestamp: number
  renderedTimestamp?: number
  length: number
  bar: Bar
  sources: { [name: string]: Bar }
  indicators: { [id: string]: RendererIndicatorData }
  empty?: boolean
}

interface RendererIndicatorData {
  canRender: boolean
  series: {
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

export default class ChartController {
  paneId: string
  watermark: string

  chartInstance: TV.IChartApi
  chartElement: HTMLElement
  loadedIndicators: LoadedIndicator[] = []
  panPrevented: boolean
  activeRenderer: Renderer
  renderedRange: TimeRange = { from: null, to: null }
  chartCache: ChartCache
  markets: {
    [identifier: string]: {
      active: boolean
      index: string
      historical: boolean
    }
  } = {}
  alerts: {
    [identifier: string]: MarketAlert[]
  } = {}
  timezoneOffset = 0
  fillGapsWithEmpty = true
  timeframe: number
  isOddTimeframe: boolean
  type: 'time' | 'tick'
  propagateInitialPrices = true
  priceScales: string[] = []

  private activeChunk: Chunk
  private queuedTrades: Trade[] = []
  private serieBuilder: SerieBuilder
  private seriesIndicatorsMap: { [serieId: string]: IndicatorReference } = {}

  private _releaseQueueInterval: number
  private _releasePanTimeout: number
  private _queueHandler = this.releaseQueue.bind(this)
  private _refreshDecimalsHandler = this.refreshAutoDecimals.bind(this)
  private _promiseOfMarkets: Promise<void>
  private _promiseOfMarketsRender: Promise<void>
  private _priceIndicatorId: string
  private _alertsRendered: boolean

  constructor(id: string) {
    this.paneId = id

    this.chartCache = new ChartCache()
    this.serieBuilder = new SerieBuilder()

    this.setTimeframe(store.state[this.paneId].timeframe)
    this.setTimezoneOffset(store.state.settings.timezoneOffset)
    this.refreshMarkets()
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

    const markets = store.state.panes.panes[this.paneId].markets
    const historicalMarkets = store.state.app.historicalMarkets
    const normalizeWatermarks = store.state.settings.normalizeWatermarks
    const marketsForWatermark = []
    const cachedMarkets: any = {}

    for (const marketKey of markets) {
      const [exchange] = marketKey.split(':')
      const market = store.state.panes.marketsListeners[marketKey]

      let localPair = marketKey

      if (market) {
        localPair = stripStable(market.local)
      }

      cachedMarkets[marketKey] = {
        active:
          store.state.exchanges[exchange] &&
          !store.state.exchanges[exchange].disabled &&
          !store.state[this.paneId].hiddenMarkets[marketKey],
        index: localPair,
        historical: historicalMarkets.indexOf(marketKey) !== -1
      }

      if (
        cachedMarkets[marketKey].active &&
        marketsForWatermark.indexOf(localPair) === -1
      ) {
        marketsForWatermark.push(
          (!normalizeWatermarks && market ? market.exchange + ':' : '') +
            localPair
        )
      }
    }

    this.markets = cachedMarkets

    if (store.state.app.isExchangesReady) {
      await this.retrieveAlerts()
    }

    this.updateWatermark(marketsForWatermark)
    this.resetPriceScales()
  }

  /**
   * set timeframe to chart model and update watermark with litteral
   * @param timeframe
   */
  setTimeframe(timeframe) {
    if (/t$/.test(timeframe)) {
      this.type = 'tick'
    } else {
      this.type = 'time'
    }

    this.timeframe = parseFloat(timeframe)
    this.isOddTimeframe = isOddTimeframe(this.timeframe)

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
   * @param {HTMLElement} containerElement
   */
  createChart(containerElement: HTMLElement) {
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
      chartOptions.timeScale.barSpacing = store.state[this.paneId].barSpacing
      chartOptions.timeScale.rightOffset = Math.ceil(
        (containerElement.clientWidth * 0.05) /
          chartOptions.timeScale.barSpacing
      )
    }

    this.chartInstance = TV.createChart(containerElement, chartOptions)
    this.chartElement = containerElement

    this.addEnabledSeries()
    this.updateWatermark()
    this.updateFontSize()
  }

  /**
   * remove series, destroy this.chartInstance and cancel related events
   */
  removeChart() {
    console.log(`[chart/${this.paneId}/controller] remove chart`)

    if (!this.chartInstance) {
      return
    }

    while (this.loadedIndicators.length) {
      this.removeIndicator(this.loadedIndicators[0])
    }

    this.chartInstance.remove()
    this.priceScales.splice(0, this.priceScales.length)

    this.chartInstance = null
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
    } else if (key === 'priceFormat' && value.auto) {
      this.refreshAutoDecimals(id)
    }

    for (let i = 0; i < indicator.apis.length; i++) {
      if (key === 'priceFormat' && !value.auto) {
        indicator.apis[i].precision = value.precision
      }

      indicator.apis[i].applyOptions({
        [key]: value
      })
    }

    if (this.optionRequiresRedraw(key)) {
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
    const redrawOptions = /upColor|downColor|wickDownColor|wickUpColor|borderDownColor|borderUpColor|compositeOperation/i

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
   */
  redrawIndicator(indicatorId) {
    const indicator = this.getLoadedIndicator(indicatorId)

    this.clearIndicatorSeries(indicator)

    let bars = []

    for (const chunk of this.chartCache.chunks) {
      bars = bars.concat(chunk.bars)
    }

    const requiredIndicatorsIds = this.getReferencedIndicators(indicator)

    this.ensureIndicatorVisible(requiredIndicatorsIds)

    this.renderBars(bars, [...requiredIndicatorsIds, indicatorId])
  }

  ensureIndicatorVisible(indicatorIds: string[]) {
    for (const indicatorId of indicatorIds) {
      if (
        this.loadedIndicators[indicatorId] &&
        this.loadedIndicators[indicatorId].options.visible === false
      ) {
        this.setIndicatorOption(indicatorId, 'visible', true, true)
      }
    }
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
  updateWatermark(markets?: string[]) {
    if (markets) {
      if (store.state.settings.normalizeWatermarks) {
        this.watermark = markets.join(' | ')
      } else {
        const othersCount = markets.length - 3
        this.watermark =
          markets.slice(0, 3).join(' + ') +
          (othersCount > 0
            ? ' + ' + othersCount + ' other' + (othersCount > 1 ? 's' : '')
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
        text: `\u00A0\u00A0\u00A0\u00A0${this.watermark +
          ' | ' +
          getTimeframeForHuman(
            store.state[this.paneId].timeframe
          )}\u00A0\u00A0\u00A0\u00A0`,
        visible: store.state[this.paneId].showWatermark,
        color: store.state[this.paneId].watermarkColor
      }
    })
  }

  /**
   * update chart font using pane zoom option
   */
  updateFontSize() {
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
      silentAdapter: null,
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
        /*if (indicators[otherIndicatorId].options.visible === false) {
          this.setIndicatorOption(otherIndicatorId, 'visible', true, true)
        } else*/ if (
          this.addIndicator(otherIndicatorId, dependencyDepth + 1)
        ) {
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
      const result = this.serieBuilder.build(
        indicator,
        this.seriesIndicatorsMap,
        this.paneId
      )

      if (store.state[this.paneId].indicatorsErrors[indicator.id]) {
        store.commit(this.paneId + '/SET_INDICATOR_ERROR', {
          id: indicator.id,
          error: null
        })
      }

      indicator.model = result

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

    renderer.indicators[
      indicator.id
    ] = this.serieBuilder.getRendererIndicatorData(indicator)

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
      indicator.adapter = this.serieBuilder.getAdapter(indicator.model.output)
      indicator.silentAdapter = this.serieBuilder.getAdapter(
        indicator.model.silentOutput
      )
    }

    this.prepareRendererForIndicators(indicator, renderer)

    return indicator
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

  ensurePriceScale(priceScaleId: string, indicator: LoadedIndicator) {
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

  resetPriceScales() {
    for (let i = 0; i < this.priceScales.length; i++) {
      this.chartInstance.priceScale(this.priceScales[i]).applyOptions({
        autoScale: true
      })
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
    console.log(
      `[chart/${this.paneId}/controller] clear chart (all series emptyed)`
    )

    if (!triggerPan) {
      this.preventPan()
    }

    for (const indicator of this.loadedIndicators) {
      this.clearIndicatorSeries(indicator)
    }

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

    this.setTimeframe(store.state[this.paneId].timeframe)

    // starting from here the chart will only develop using realtime api
    // market will get priced once a trade is done: can take some time to get "true price" of aggregated markets
    // we use this to re-render the whole chart with all initial prices everytime a market get priced first time
    // if a fetch adds historical data after this present fucntion, propagateInitialPrices will be set to false
    this.propagateInitialPrices = true
  }

  resample(timeframe: number) {
    console.log(`[chart/${this.paneId}/controller] resample to ${timeframe}`)

    const activeRendererTimestamp = floorTimestampToTimeframe(
      this.activeRenderer.timestamp,
      timeframe
    )

    const activeChunk = this.getActiveChunk()

    if (activeChunk) {
      for (const source in this.activeRenderer.sources) {
        if (this.activeRenderer.sources[source].empty === false) {
          activeChunk.bars.push(
            this.cloneSourceBar(
              this.activeRenderer.sources[source],
              activeRendererTimestamp
            )
          )
        }
      }
    }

    this.setTimeframe(timeframe)

    if (!this.chartCache.chunks.length) {
      return
    }

    const newBar = (source, destination, timestamp) => {
      if (typeof source.close === 'number') {
        destination.open = destination.high = destination.low = destination.close =
          source.close
      } else if (
        typeof destination.close === 'undefined' ||
        destination.close === null
      ) {
        destination.open = destination.high = destination.low = destination.close = null

        destination.vbuy = 0
        destination.vsell = 0
        destination.cbuy = 0
        destination.csell = 0
        destination.lbuy = 0
        destination.lsell = 0
      }

      destination.timestamp = timestamp

      return destination
    }

    const markets = {}

    for (let i = 0; i < this.chartCache.chunks.length; i++) {
      for (let j = 0; j < this.chartCache.chunks[i].bars.length; j++) {
        const bar = this.chartCache.chunks[i].bars[j]

        const market = bar.exchange + ':' + bar.pair

        const barTimestamp = floorTimestampToTimeframe(
          bar.timestamp,
          this.timeframe,
          this.isOddTimeframe
        )

        if (!markets[market] || markets[market].timestamp < barTimestamp) {
          if (markets[market]) {
            markets[market] = newBar(markets[market], bar, barTimestamp)
          } else {
            markets[market] = newBar({}, bar, barTimestamp)
          }
          continue
        }

        if (typeof markets[market].open === null) {
          markets[market].open = bar.open
          markets[market].high = bar.high
          markets[market].low = bar.low
          markets[market].close = bar.close
        }

        markets[market].vbuy += bar.vbuy
        markets[market].vsell += bar.vsell
        markets[market].cbuy += bar.cbuy
        markets[market].csell += bar.csell
        markets[market].lbuy += bar.lbuy
        markets[market].lsell += bar.lsell
        markets[market].close = bar.close
        markets[market].high = Math.max(
          markets[market].high,
          bar.high,
          bar.open,
          bar.close
        )
        markets[market].low = Math.min(
          markets[market].low,
          bar.low,
          bar.open,
          bar.close
        )

        this.chartCache.chunks[i].bars.splice(j--, 1)
      }

      if (i && this.chartCache.chunks[i].bars.length < MAX_BARS_PER_CHUNKS) {
        if (this.chartCache.chunks[i].bars.length) {
          const available =
            MAX_BARS_PER_CHUNKS - this.chartCache.chunks[i - 1].bars.length

          if (available) {
            this.chartCache.chunks[i - 1].bars = this.chartCache.chunks[
              i - 1
            ].bars.concat(this.chartCache.chunks[i].bars.splice(0, available))
          }
        }

        if (!this.chartCache.chunks[i].bars.length) {
          this.chartCache.chunks.splice(i, 1)
          i--
        }
      }
    }

    this.activeRenderer = null

    this.renderAll()
  }

  getActiveChunk() {
    if (
      !this.activeChunk &&
      this.chartCache.cacheRange.to === this.activeRenderer.timestamp
    ) {
      this.activeChunk = this.chartCache.chunks[
        this.chartCache.chunks.length - 1
      ]
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

    aggregatorService.off('decimals', this._refreshDecimalsHandler)
  }

  /**
   * @param {LoadedIndicator} indicator indicator owning series
   */
  clearIndicatorSeries(indicator: LoadedIndicator) {
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
    )
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

    this.renderRealtimeTrades(this.queuedTrades)
    this.queuedTrades.splice(0, this.queuedTrades.length)
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

    let redrawRequired = false

    for (let i = 0; i < trades.length; i++) {
      const trade = trades[i]
      const identifier = trade.exchange + ':' + trade.pair

      if (typeof this.markets[identifier] === 'undefined') {
        continue
      }

      let timestamp
      if (this.activeRenderer) {
        if (this.activeRenderer.type === 'time') {
          timestamp = floorTimestampToTimeframe(
            trade.timestamp / 1000,
            this.timeframe,
            this.isOddTimeframe
          )
        } else {
          if (
            this.activeRenderer.bar.cbuy + this.activeRenderer.bar.csell >=
            this.timeframe
          ) {
            timestamp = Math.max(
              this.activeRenderer.timestamp + 0.001,
              Math.round(trade.timestamp / 1000)
            )
          } else {
            timestamp = this.activeRenderer.timestamp
          }
        }
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

          this.activeChunk.to = this.chartCache.cacheRange.to = this.activeRenderer.timestamp

          if (this.renderedRange.to < this.activeRenderer.timestamp) {
            this.renderedRange.to = this.activeRenderer.timestamp
          }

          this.nextBar(timestamp, this.activeRenderer)
        } else {
          this.activeRenderer = this.createRenderer(timestamp)
        }
      }

      const amount = trade.price * trade.size

      if (
        !this.activeRenderer.sources[identifier] ||
        typeof this.activeRenderer.sources[identifier].pair === 'undefined'
      ) {
        if (this.propagateInitialPrices) {
          this.chartCache.initialPrices[identifier] = {
            exchange: trade.exchange,
            pair: trade.pair,
            price: trade.price
          }

          if (!redrawRequired) {
            redrawRequired = true
          }
        }

        this.activeRenderer.sources[identifier] = {
          pair: trade.pair,
          exchange: trade.exchange,
          close: +trade.price,
          active: this.markets[identifier].active
        }

        this.resetBar(this.activeRenderer.sources[identifier])
      }

      const isActive = this.markets[identifier].active

      if (trade.liquidation) {
        this.activeRenderer.sources[identifier]['l' + trade.side] += amount

        this.activeRenderer.bar.empty = false

        if (isActive) {
          this.activeRenderer.bar['l' + trade.side] += amount
        }

        continue
      }

      this.activeRenderer.sources[identifier].close = +trade.price

      if (this.activeRenderer.sources[identifier].empty) {
        this.activeRenderer.sources[
          identifier
        ].open = this.activeRenderer.sources[
          identifier
        ].high = this.activeRenderer.sources[
          identifier
        ].low = this.activeRenderer.sources[identifier].close
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
      this.activeRenderer.sources[identifier]['v' + trade.side] += amount

      this.activeRenderer.sources[identifier].empty = false

      if (isActive) {
        this.activeRenderer.bar['v' + trade.side] += amount
        this.activeRenderer.bar['c' + trade.side] += trade.count

        this.activeRenderer.bar.empty = false
      }
    }

    if (!this.activeRenderer) {
      return
    }

    if (redrawRequired) {
      this.renderAll()
    } else if (!this.activeRenderer.bar.empty) {
      this.updateBar(this.activeRenderer)

      if (this.renderedRange.to < this.activeRenderer.timestamp) {
        this.renderedRange.to = this.activeRenderer.timestamp
      }
    }
  }

  /**
   * create a new object from an existing bar
   * to avoid reference when storing finished bar data to cache
   * @param {Bar} bar do copy
   * @param {number} [timestamp] apply timestamp to returned bar
   */
  cloneSourceBar(sourceBar, timestamp?: number): Bar {
    return {
      pair: sourceBar.pair,
      exchange: sourceBar.exchange,
      timestamp: timestamp || sourceBar.timestamp,
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
   * then render indicatorsIds (or all if not specified) from new set of bars
   * this replace data of series, erasing current data on chart
   * if no indicatorsIds is specified, all indicators on chart are rendered from start to finish
   * then merge indicator's states from temporary renderer used to render all thoses bars into activeRenderer
   *
   * @param {Bar[]} bars bars to render
   * @param {string[]} indicatorsId id of indicators to render
   * @param {boolean} refreshInitialPrices
   */
  renderBars(
    bars,
    indicatorsIds,
    refreshInitialPrices?: boolean,
    triggerPan?: boolean
  ) {
    if (bars.length) {
      this.prependInitialPrices(bars, refreshInitialPrices)
    }

    this.clearPriceLines(indicatorsIds)

    const computedSeries = {}
    let from = null
    let to = null

    let temporaryRenderer: Renderer
    let computedBar: any

    if (!bars.length) {
      if (
        this.activeRenderer &&
        this.activeRenderer.bar &&
        !this.activeRenderer.bar.empty
      ) {
        bars = Object.values(this.activeRenderer.sources).filter(
          bar => bar.empty === false
        )
      }

      if (!bars.length) {
        return
      }
    } else if (
      this.activeRenderer &&
      this.activeRenderer.timestamp > bars[bars.length - 1].timestamp
    ) {
      const activeBars = Object.values(this.activeRenderer.sources).filter(
        bar => bar.empty === false
      )

      for (let i = 0; i < activeBars.length; i++) {
        const activeBar = activeBars[i]

        activeBar.timestamp = this.activeRenderer.timestamp

        for (let j = bars.length - 1; j >= 0; j--) {
          const cachedBar = bars[j]

          if (cachedBar.timestamp < this.activeRenderer.timestamp) {
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

    let barCount = 0

    for (let i = 0; i <= bars.length; i++) {
      const bar = bars[i]

      if (
        !bar ||
        !temporaryRenderer ||
        bar.timestamp > temporaryRenderer.timestamp
      ) {
        if (temporaryRenderer) {
          if (temporaryRenderer.bar.empty && !this.fillGapsWithEmpty && bar) {
            this.nextBar(bar.timestamp, temporaryRenderer)
            continue
          }

          if (from === null) {
            from = temporaryRenderer.timestamp
          }

          to = temporaryRenderer.timestamp

          computedBar = this.computeBar(temporaryRenderer, indicatorsIds)

          for (const id in computedBar) {
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
              (bar.timestamp -
                temporaryRenderer.timeframe -
                temporaryRenderer.timestamp) /
              temporaryRenderer.timeframe

            if (missingBars > 0) {
              for (let j = 0; j < missingBars; j++) {
                this.incrementRendererBar(temporaryRenderer)

                for (const id in computedBar) {
                  if (typeof computedSeries[id] === 'undefined') {
                    computedSeries[id] = []
                  }

                  computedSeries[id].push({
                    time: temporaryRenderer.localTimestamp
                  })
                }
              }
            }
          }
          this.nextBar(bar.timestamp, temporaryRenderer)
        } else {
          temporaryRenderer = this.createRenderer(
            bar.timestamp || this.activeRenderer.timestamp,
            indicatorsIds
          )
        }
      }

      const marketKey = bar.exchange + ':' + bar.pair

      const isActive = this.markets[marketKey].active

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
      this.activeRenderer.bar = temporaryRenderer.bar
      for (const id in temporaryRenderer.indicators) {
        this.activeRenderer.indicators[id] = temporaryRenderer.indicators[id]
      }
      for (const id in temporaryRenderer.sources) {
        this.activeRenderer.sources[id] = temporaryRenderer.sources[id]
      }
    } else {
      this.activeRenderer = temporaryRenderer
    }

    let scrollPosition: number

    if (!indicatorsIds || !indicatorsIds.length) {
      this.activeRenderer.length = barCount
      // whole chart was rendered from start to finish

      scrollPosition = this.chartInstance.timeScale().scrollPosition()
      if (!bars.length) {
        this.renderedRange.from = this.renderedRange.to = null
      } else {
        this.renderedRange.from = from
        this.renderedRange.to = to
      }
    }
    this.replaceData(computedSeries, triggerPan)

    if (scrollPosition) {
      this.chartInstance.timeScale().scrollToPosition(scrollPosition, false)
    }

    this.renderAlerts()
  }

  prependInitialPrices(bars: Bar[], refreshInitialPrices: boolean) {
    const remainingInitialMarkets = Object.keys(this.markets).filter(
      name => this.markets[name].historical
    )

    const maxLookback = 100 * remainingInitialMarkets.length

    if (this.propagateInitialPrices) {
      const initialTimestamp = bars[0].timestamp

      if (refreshInitialPrices) {
        for (let i = 0; i < bars.length; i++) {
          const market = bars[i].exchange + ':' + bars[i].pair
          let index

          if (refreshInitialPrices) {
            if (bars[i].timestamp <= initialTimestamp) {
              if ((index = remainingInitialMarkets.indexOf(market)) !== -1) {
                remainingInitialMarkets.splice(index, 1)
              }
              continue
            } else if (
              (index = remainingInitialMarkets.indexOf(market)) !== -1
            ) {
              this.chartCache.initialPrices[market] = {
                exchange: bars[i].exchange,
                pair: bars[i].pair,
                price: bars[i].close
              }
              remainingInitialMarkets.splice(index, 1)
            } else if (!remainingInitialMarkets.length || i > maxLookback) {
              break
            }
          }
        }
      }

      for (const market in this.chartCache.initialPrices) {
        const price = this.chartCache.initialPrices[market].price
        const exchange = this.chartCache.initialPrices[market].exchange
        const pair = this.chartCache.initialPrices[market].pair
        const bar = this.resetBar({
          timestamp: initialTimestamp,
          exchange: exchange,
          pair: pair,
          open: price,
          high: price,
          low: price,
          close: price
        })

        bars.unshift(bar)
      }
    }
  }

  removeIndicatorSeries(indicator) {
    // remove from chart instance (derender)
    for (let i = 0; i < indicator.apis.length; i++) {
      this.chartInstance.removeSeries(indicator.apis[i])
      indicator.apis.splice(i--, 1)
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

    for (let i = 0; i < indicator.model.plots.length; i++) {
      const plot = indicator.model.plots[i]
      const apiMethodName = camelize('add-' + plot.type + '-series')
      const customPlotOptions = this.serieBuilder.getCustomPlotOptions(
        indicator,
        plot
      )
      const serieOptions = {
        ...defaultSerieOptions,
        ...(defaultPlotsOptions[plot.type] || {}),
        ...indicator.options,
        ...customPlotOptions
      }

      if (serieOptions.scaleMargins) {
        delete serieOptions.scaleMargins
      }

      const api = this.chartInstance[apiMethodName](
        serieOptions
      ) as IndicatorApi

      api.id = plot.id

      if (
        serieOptions.priceFormat &&
        typeof serieOptions.priceFormat.precision === 'number'
      ) {
        api.precision = serieOptions.priceFormat.precision
      }

      this.seriesIndicatorsMap[plot.id] = {
        indicatorId: indicator.id,
        plotIndex: i
      }
      series.push(plot.id)

      indicator.apis.push(api)
    }

    store.commit(this.paneId + '/SET_INDICATOR_SERIES', {
      id: indicator.id,
      series
    })

    // ensure chart is aware of pricescale used by this indicator
    this.ensurePriceScale(indicator.options.priceScaleId, indicator)

    // attach indicator to active renderer
    this.bindIndicator(indicator, this.activeRenderer)
  }

  refreshPriceScale(priceScaleId: string) {
    const priceScale: PriceScaleSettings =
      store.state[this.paneId].priceScales[priceScaleId]

    this.chartInstance.priceScale(priceScaleId).applyOptions({
      ...priceScale
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
  renderAll(refreshInitialPrices?: boolean, triggerPan?: boolean) {
    if (!this.chartInstance) {
      return
    }

    if (this._promiseOfMarkets) {
      if (!this._promiseOfMarketsRender) {
        this._promiseOfMarketsRender = this._promiseOfMarkets.then(() => {
          this._promiseOfMarketsRender = null
          this.renderAll(false, true)
        })
      }

      return this._promiseOfMarketsRender
    }

    this.clearChart(triggerPan)

    this.renderBars(
      this.chartCache.chunks.length
        ? this.chartCache.chunks.reduce(
            (bars, chunk) => bars.concat(chunk.bars),
            []
          )
        : [],
      null,
      refreshInitialPrices,
      triggerPan
    )
  }

  async retrieveAlerts() {
    const indexes = Object.values(this.markets).reduce((acc, market) => {
      if (acc.indexOf(market.index) === -1) {
        acc.push(market.index)
      }

      return acc
    }, [])

    for (const index of Object.keys(this.alerts)) {
      if (indexes.indexOf(index) === -1) {
        delete this.alerts[index]
      }
    }

    for (const index of indexes) {
      if (this.alerts[index]) {
        continue
      }

      this.alerts[index] = []

      await workspacesService.getAlerts(index).then(alerts => {
        for (let i = 0; i < alerts.length; i++) {
          this.alerts[index].push(alerts[i])
        }
      })
    }
  }

  renderAlerts() {
    if (this._alertsRendered || !store.state.settings.alerts) {
      return
    }

    const api = this.getPriceApi()

    if (!api) {
      return
    }

    for (const index in this.alerts) {
      for (let i = 0; i < this.alerts[index].length; i++) {
        this.renderAlert(this.alerts[index][i], api)
      }
    }

    this._alertsRendered = true
  }

  triggerAlert(market: string, price: number) {
    if (!this.alerts[market]) {
      return
    }

    const alert = this.alerts[market].find(a => a.price === price)

    if (alert) {
      if (store.state.settings.alertSound) {
        audioService.playOnce(store.state.settings.alertSound)
      }

      alert.triggered = true

      const api = this.getPriceApi()
      const priceline = api.getPriceLine(price)

      if (priceline) {
        api.removePriceLine(priceline)
      }

      this.renderAlert(alert, api)
    }
  }

  renderAlert(alert: MarketAlert, api: TV.ISeriesApi<any>, color?: string) {
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
            .timeToCoordinate(timestamp as TV.UTCTimestamp)
        )
    }

    let title

    if (alert.triggered) {
      title = '✔'
    }

    return api.createPriceLine({
      market: alert.market,
      index,
      price: alert.price,
      color: color || store.state.settings.alertsColor,
      lineWidth: store.state.settings.alertsLineWidth,
      lineStyle: store.state.settings.alertsLineStyle,
      title
    } as any)
  }

  /**
   * replace whole chart with a set of computed series bars
   * @param {Bar[]} seriesData Lightweight Charts formated series
   */
  replaceData(
    seriesData: {
      [id: string]: (TV.LineData | TV.BarData | TV.HistogramData)[]
    },
    triggerPan?: boolean
  ) {
    if (!triggerPan) {
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

    for (let i = 0; i < this.loadedIndicators.length; i++) {
      if (this.loadedIndicators[i].options.visible === false) {
        continue
      }

      const indicator = this.loadedIndicators[i]
      const serieData = renderer.indicators[indicator.id]

      if (serieData.canRender) {
        this.loadedIndicators[i].adapter(
          renderer,
          serieData.functions,
          serieData.variables,
          indicator.apis,
          indicator.options,
          seriesUtils
        )
      } else {
        this.loadedIndicators[i].silentAdapter(
          renderer,
          serieData.functions,
          serieData.variables,
          indicator.apis,
          indicator.options,
          seriesUtils
        )
      }
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
        indicator.silentAdapter(
          renderer,
          serieData.functions,
          serieData.variables,
          indicator.apis,
          indicator.options,
          seriesUtils
        )
      } catch (error) {
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
    for (let i = 0; i < this.loadedIndicators.length; i++) {
      for (let j = 0; j < this.loadedIndicators[i].apis.length; j++) {
        const api = this.loadedIndicators[i].apis[j]

        if (api.options().priceScaleId === 'right') {
          this._priceIndicatorId = this.loadedIndicators[i].id

          return api
        }
      }
    }
  }

  /**
   * create empty renderer
   * this is called on first realtime trade or when indicator(s) are rendered from start to finish
   * @param {number} timestamp create at time
   * @param {string[]} indicatorsIds id of indicators to bind (if null all indicators are binded)
   */
  createRenderer(firstBarTimestamp, indicatorsIds?: string[]) {
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

      for (let i = 0; i < this.loadedIndicators.length; i++) {
        for (let j = 0; j < this.loadedIndicators[i].apis.length; j++) {
          for (let k = 0; k < missingBars; k++) {
            if (i === 0 && j === 0) {
              this.incrementRendererBar(renderer)
            }

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

  prepareRendererForIndicators(indicator: LoadedIndicator, renderer: Renderer) {
    const markets = Object.keys(indicator.model.markets)

    for (let j = 0; j < markets.length; j++) {
      if (!renderer.sources[markets[j]]) {
        renderer.sources[markets[j]] = {
          open: null,
          high: null,
          low: null,
          close: null
        }
      }

      const keys = indicator.model.markets[markets[j]]

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

  refreshAutoDecimals(indicatorId?: string) {
    const chartMarkets = Object.keys(this.markets)
    const pricedMarket = Object.keys(marketDecimals).find(
      market => chartMarkets.indexOf(market) !== -1
    )

    if (pricedMarket) {
      const precision = marketDecimals[pricedMarket]

      for (let i = 0; i < this.loadedIndicators.length; i++) {
        if (indicatorId && indicatorId !== this.loadedIndicators[i].id) {
          continue
        }

        let priceFormat = this.loadedIndicators[i].options.priceFormat || {
          type: 'price'
        }

        if (
          !priceFormat.auto ||
          priceFormat.type === 'volume' ||
          priceFormat.precision === precision
        ) {
          continue
        }

        priceFormat = {
          ...priceFormat,
          precision,
          minMove: 1 / Math.pow(10, precision)
        }

        store.dispatch(this.paneId + '/setIndicatorOption', {
          id: this.loadedIndicators[i].id,
          key: 'priceFormat',
          value: priceFormat,
          silent: true
        })

        for (let j = 0; j < this.loadedIndicators[i].apis.length; j++) {
          this.loadedIndicators[i].apis[j].applyOptions({
            priceFormat
          })

          this.loadedIndicators[i].apis[j].precision = precision
        }
      }
    }
  }

  /**
   * Get price api, index & price at a point on the chart
   * Return the priceline if found at price
   * @param {MouseEvent | TouchEvent} event
   * @returns {{
   *  originalOffset: {x: number, y: number},
   *  offset: {x?: number, y?: number},
   *  priceline: TV.IPriceLine | null,
   *  api: IndicatorApi,
   *  price: number,
   *  market: string,
   *  canCreate: boolean
   * }}
   */
  getPricelineAtPoint(event) {
    const originalOffset = getEventOffset(event)
    const offset = {
      x: originalOffset.x,
      y: originalOffset.y
    }

    const api = this.getPriceApi()

    if (!api) {
      return
    }

    let price = api.coordinateToPrice(originalOffset.y) as number

    if (!price) {
      return
    }

    let priceline = api.getPriceLine(
      price,
      this.chartInstance.timeScale().coordinateToLogical(originalOffset.x)
    )

    let market

    if (priceline) {
      const priceLineOptions = priceline.options() as any
      market = priceLineOptions.market

      if (!priceLineOptions.market) {
        priceline = null
      } else {
        market = priceLineOptions.market
        price = priceLineOptions.price
      }
    }

    if (!market) {
      for (const marketKey in this.markets) {
        if (
          this.markets[marketKey].active &&
          this.markets[marketKey].historical
        ) {
          market = this.markets[marketKey].index
          break
        }
      }

      if (!market) {
        market = Object.values(this.markets)[0].index
      }
    }

    if (!priceline) {
      price = +formatPrice(price, api.options().priceFormat.precision)
    }

    const canCreate =
      store.state.settings.alerts &&
      (event.shiftKey || store.state.settings.alertsClick)

    return { api, price, market, priceline, canCreate, originalOffset, offset }
  }

  disableCrosshair() {
    this.chartInstance.applyOptions({
      crosshair: {
        vertLine: {
          color: 'transparent',
          labelVisible: false
        },
        horzLine: {
          color: 'transparent',
          labelVisible: false
        }
      }
    })
  }

  enableCrosshair() {
    const chartColorOptions = getChartCustomColorsOptions()

    this.chartInstance.applyOptions({
      crosshair: {
        vertLine: {
          color: chartColorOptions.crosshair.vertLine.color,
          labelVisible: true
        },
        horzLine: {
          color: chartColorOptions.crosshair.horzLine.color,
          labelVisible: true
        }
      }
    })
  }
}
