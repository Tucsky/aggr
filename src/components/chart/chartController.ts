import { MAX_BARS_PER_CHUNKS } from '../../utils/constants'
import { getHms, parseMarket, deepSet, camelize, getTimeframeForHuman } from '../../utils/helpers'
import { defaultChartOptions, defaultPlotsOptions, defaultSerieOptions, getChartOptions } from './chartOptions'
import store from '../../store'
import * as seriesUtils from './serieUtils'
import * as TV from 'lightweight-charts'
import ChartCache, { Chunk } from './chartCache'
import SerieBuilder from './serieBuilder'
import { Trade } from '@/types/test'
import dialogService from '@/services/dialogService'
import IndicatorDialog from './IndicatorDialog.vue'
import { ChartPaneState } from '@/store/panesSettings/chart'

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
}

export interface IndicatorApi extends TV.ISeriesApi<any> {
  id: string
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
  apis: IndicatorApi[]
  apisNoop: IndicatorApi[]
}

export interface IndicatorTranspilationResult {
  output: string
  variables: IndicatorVariable[]
  functions: IndicatorFunction[]
  plots: IndicatorPlot[]
  markets?: IndicatorMarkets
  references?: IndicatorReference[]
}
export interface IndicatorFunction {
  name: string
  arg?: string | number
  length?: string | number
  persistence?: string[]
  state?: any
}
export interface IndicatorVariable {
  name: string
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
  length: number
  bar: Bar
  sources: { [name: string]: Bar }
  indicators: { [id: string]: RendererIndicatorData }
  empty?: boolean
}

interface RendererIndicatorData {
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

const DAY = 60 * 60 * 24

export default class ChartController {
  paneId: string
  watermark: string

  chartInstance: TV.IChartApi
  chartElement: HTMLElement
  loadedIndicators: LoadedIndicator[] = []
  preventRender: boolean
  panPrevented: boolean
  activeRenderer: Renderer
  renderedRange: TimeRange = { from: null, to: null }
  chartCache: ChartCache
  markets: { [identifier: string]: true }
  timezoneOffset = 0
  fillGapsWithEmpty = true
  timeframe: number
  isOddTimeframe: boolean
  type: 'time' | 'tick'

  // private loadedSeries: { [id: string]: IndicatorApi } = {}
  private activeChunk: Chunk
  private queuedTrades: Trade[] = []
  private serieBuilder: SerieBuilder
  private seriesIndicatorsMap: { [serieId: string]: IndicatorReference } = {}

  private _releaseQueueInterval: number
  private _releasePanTimeout: number
  private _preventImmediateRender: boolean

  constructor(id: string) {
    this.paneId = id

    this.chartCache = new ChartCache()
    this.serieBuilder = new SerieBuilder()

    this.setMarkets(store.state.panes.panes[this.paneId].markets)
    this.setTimeframe(store.state[this.paneId].timeframe)
    this.setTimezoneOffset(store.state.settings.timezoneOffset)

    this.fillGapsWithEmpty = Boolean(store.state[this.paneId].fillGapsWithEmpty)
  }

  /**
   * update watermark when pane's markets changes
   * @param markets
   */
  setMarkets(markets: string[]) {
    const marketsForWatermark = markets.filter(market => {
      const [exchange] = parseMarket(market)

      return !store.state.exchanges[exchange] || !store.state.exchanges[exchange].disabled
    })

    this.watermark = marketsForWatermark.slice(0, 3).join(' + ') + (markets.length - 3 > 0 ? ' + ' + (markets.length - 3) + ' others' : '')

    this.markets = markets.reduce((output, market) => {
      const identifier = market.replace(':', '')

      if (this.chartCache.initialPrices[identifier]) {
        delete this.chartCache.initialPrices[identifier]
      }

      output[identifier] = true

      return output
    }, {})

    this.updateWatermark()
  }

  setTimeframe(timeframe) {
    if (/t$/.test(timeframe)) {
      this.type = 'tick'
    } else {
      this.type = 'time'
    }

    this.timeframe = parseInt(timeframe)
    this.isOddTimeframe = (1440 * 60) % timeframe !== 0

    this.updateWatermark()

    /*if (this.activeRenderer) {
      const activeRendererDayOpen = Math.floor(this.activeRenderer.timestamp / DAY) * DAY
      this.activeRenderer.timestamp = activeRendererDayOpen + Math.floor((this.activeRenderer.timestamp - activeRendererDayOpen) / timeframe) * timeframe
      this.activeRenderer.timeframe = timeframe

      for (const source in this.activeRenderer.sources) {
        this.activeRenderer.sources[source].timestamp = this.activeRenderer.timestamp
      }
    }*/
  }

  /**
   * Cache timezone offset
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
      chartOptions.grid.vertLines.visible = store.state[this.paneId].showVerticalGridlines
      chartOptions.grid.vertLines.color = store.state[this.paneId].verticalGridlinesColor
    }

    if (store.state[this.paneId].showHorizontalGridlines) {
      chartOptions.grid.horzLines.visible = store.state[this.paneId].showHorizontalGridlines
      chartOptions.grid.horzLines.color = store.state[this.paneId].horizontalGridlinesColor
    }

    if (store.state[this.paneId].showWatermark) {
      chartOptions.watermark.visible = store.state[this.paneId].showWatermark
      chartOptions.watermark.color = store.state[this.paneId].watermarkColor
    }

    this.chartInstance = TV.createChart(containerElement, chartOptions)
    this.chartElement = containerElement

    this.addEnabledSeries()
    this.updateWatermark()
    this.updateFontSize()
  }

  /**
   * remove series, destroy this.chartInstance and cancel related events1
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

    this.chartInstance = null
  }

  /**
   * Get active indicator by id
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
   * Set indicator option by key
   * @param {string} id serie id
   * @param {string} key option key
   * @param {any} value serie id
   */
  setIndicatorOption(id, key, value) {
    const indicator = this.getLoadedIndicator(id)

    if (!indicator) {
      return
    }

    let rootOptionKey = key

    if (key.indexOf('.') !== -1) {
      const path = key.split('.')

      deepSet(indicator.options, path, value)

      rootOptionKey = path[0]
    } else {
      indicator.options[rootOptionKey] = value
    }

    for (let i = 0; i < indicator.apis.length; i++) {
      let value = indicator.options[rootOptionKey]

      if (this.activeRenderer && typeof this.activeRenderer.indicators[id].plotsOptions[i][key] !== 'undefined') {
        value = this.activeRenderer.indicators[id].plotsOptions[i][key]
      }

      indicator.apis[i].applyOptions({
        [rootOptionKey]: value
      })
    }

    if (this.optionRequiresRedraw(rootOptionKey)) {
      this.redrawIndicator(id)
    }
  }

  optionRequiresRedraw(key: string) {
    const redrawOptions = /upColor|downColor|wickDownColor|wickUpColor|borderDownColor|borderUpColor/i

    if (redrawOptions.test(key)) {
      return true
    }

    const noRedrawOptions = /color|priceFormat|scaleMargins|linetype|width|style|visible/i

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
    let bars = []

    for (const chunk of this.chartCache.chunks) {
      bars = bars.concat(chunk.bars)
    }

    const requiredIndicatorsIds = this.getReferencedIndicators(this.getLoadedIndicator(indicatorId))

    this.renderBars(bars, [...requiredIndicatorsIds, indicatorId])
  }

  /**
   * just a extention of Lightweight Charts getVisibleRange but using timezone offset from the settings
   * @returns
   */
  getVisibleRange() {
    const visibleRange = this.chartInstance.timeScale().getVisibleRange() as TimeRange

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
  updateWatermark() {
    if (!this.chartInstance) {
      return
    }

    /**
     * weird spaces (\u00A0) are for left / right margins
     */
    this.chartInstance.applyOptions({
      watermark: {
        text: `\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0${this.watermark +
          ' | ' +
          getTimeframeForHuman(store.state[this.paneId].timeframe)}\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0`,
        visible: store.state[this.paneId].showWatermark,
        color: store.state[this.paneId].watermarkColor
      }
    })
  }

  updateFontSize() {
    this.chartInstance.applyOptions({
      layout: {
        fontSize: 12 * (store.state.panes.panes[this.paneId].zoom || 1)
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
      apis: [],
      apisNoop: []
    }

    // build indicator
    try {
      this.prepareIndicator(indicator)
    } catch (error) {
      // handle dependency issue (resolveDependency adds required indicator(s) then try add this one again)
      if (error.status === 'indicator-required' && !this.resolveDependency(indicator.id, error.serieId, dependencyDepth || 0)) {
        dialogService.confirm({
          message: `"${indicator.id}" indicator need the "${error.serieId}" serie but that one WAS NOT found anywhere in the current indicators.`,
          ok: 'I see',
          cancel: false
        })
      }

      if (!error.status && !dialogService.isDialogOpened('indicator')) {
        dialogService.open(
          IndicatorDialog,
          {
            paneId: this.paneId,
            indicatorId: indicator.id
          },
          'indicator'
        )
      }

      return false
    }

    // build complete
    this.loadedIndicators.push(indicator)

    // attach indicator to active renderer
    this.bindIndicator(indicator, this.activeRenderer)

    return true
  }

  resolveDependency(originalIndicatorId: string, missingSerieId: string, dependencyDepth: number) {
    // serie was not found in active indicators
    // first we loop through pane indicators, maybe order of add is incorrect
    const indicators = (store.state[this.paneId] as ChartPaneState).indicators

    for (const otherIndicatorId in indicators) {
      if (otherIndicatorId === originalIndicatorId || !indicators[otherIndicatorId].series) {
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
      if (this.addIndicator(indicators[missingSerieId].id, dependencyDepth + 1)) {
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
      const result = this.serieBuilder.build(indicator, this.seriesIndicatorsMap, this.paneId)
      const { output, functions, variables, references, markets, plots } = result

      if (store.state[this.paneId].indicatorsErrors[indicator.id]) {
        store.commit(this.paneId + '/SET_INDICATOR_ERROR', {
          id: indicator.id,
          error: null
        })
      }

      indicator.model = {
        output,
        functions,
        variables,
        references,
        markets,
        plots
      }

      const series = []

      for (let i = 0; i < indicator.model.plots.length; i++) {
        const serie = indicator.model.plots[i]
        const apiMethodName = camelize('add-' + serie.type + '-series')
        const serieOptions = Object.assign({}, defaultSerieOptions, defaultPlotsOptions[serie.type] || {}, indicator.options, serie.options)

        if (!indicator.options.scaleMargins && indicator.options.priceScaleId) {
          const scaleMargins = this.getPriceScaleMargins(indicator.options.priceScaleId)

          if (scaleMargins) {
            serieOptions.scaleMargins = scaleMargins
          }
        }

        if (indicator.options.priceScaleId === 'right') {
          this.chartInstance.applyOptions({
            rightPriceScale: {
              scaleMargins: serieOptions.scaleMargins
            }
          })
        }

        const api = this.chartInstance[apiMethodName](serieOptions) as IndicatorApi

        api.id = serie.id

        this.seriesIndicatorsMap[serie.id] = {
          indicatorId: indicator.id,
          plotIndex: i
        }
        series.push(serie.id)

        /* if (indicator.options.scaleMargins) {
          api.applyOptions({
            scaleMargins: indicator.options.scaleMargins
          })
        } */

        // this.loadedSeries[serie.id] = api
        indicator.apis.push(api)

        // eslint-disable-next-line @typescript-eslint/no-empty-function
        indicator.apisNoop.push(({ update: () => {} } as unknown) as IndicatorApi) // for batch rendering
      }

      store.commit(this.paneId + '/SET_INDICATOR_SERIES', {
        id: indicator.id,
        series
      })
    } catch (error) {
      console.error(`[chart/${this.paneId}/prepareIndicator] transpilation failed`)
      console.error(`\t->`, error)

      store.commit(this.paneId + '/SET_INDICATOR_ERROR', {
        id: indicator.id,
        error: error.message
      })

      throw error
    }
  }

  /**
   * attach indicator copy of indicator model (incl. states of variables and functions)
   * @param {LoadedIndicator} indicator
   * @param {Renderer} renderer
   * @returns
   */
  bindIndicator(indicator: LoadedIndicator, renderer: Renderer) {
    if (!renderer || typeof renderer.indicators[indicator.id] !== 'undefined' || !indicator.model) {
      return
    }

    // console.debug(`[chart/${this.paneId}/bindIndicator] binding ${indicator.id} ...`)

    const { functions, variables, plots } = JSON.parse(JSON.stringify(indicator.model))

    // bindIndicator is called when a indicator option changes
    // this is the time to parse thoses from the scripts itself
    // and get matching value from indicator.options
    //
    // take a script like : plotline(avg_close(bar), color=options.lineColor)
    // assign (options.lineColor) value into (plots[0].options.lineColor)
    this.serieBuilder.parseScriptOptions(functions, plots, indicator.options)

    // attach indicator to renderer, with fresh functions & variables states
    // all ready to calculate bars from the start
    renderer.indicators[indicator.id] = {
      series: [],
      functions,
      variables,
      plotsOptions: plots.map(p => p.options),
      minLength: indicator.options.minLength
    }

    // update indicator series with plotoptions
    for (let i = 0; i < renderer.indicators[indicator.id].plotsOptions.length; i++) {
      indicator.apis[i].applyOptions(renderer.indicators[indicator.id].plotsOptions[i])
    }

    // create function ready to calculate (& render) everything for this indicator
    indicator.adapter = this.serieBuilder.getAdapter(indicator.model.output)

    this.prepareRendererForIndicators(indicator.id, renderer)

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

    // remove from chart instance (derender)
    for (let i = 0; i < indicator.apis.length; i++) {
      this.chartInstance.removeSeries(indicator.apis[i])
    }

    // unbind from activebar (remove serie meta data like sma memory etc)
    this.unbindIndicator(indicator, this.activeRenderer)

    // remove from active series model
    this.loadedIndicators.splice(this.loadedIndicators.indexOf(indicator), 1)
  }

  /**
   * clear all rendered data on chart (empty the chart)
   */
  clearChart() {
    console.log(`[chart/${this.paneId}/controller] clear chart (all series emptyed)`)

    this.preventPan()

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
    console.log(`[chart/${this.paneId}/controller] clear data (activeRenderer+activeChunk+queuedTrades1)`)

    this.activeRenderer = null
    this.activeChunk = null
    this.queuedTrades.splice(0, this.queuedTrades.length)
  }

  /**
   * fresh start : clear cache, renderer and rendered series on chart
   */
  clear() {
    console.log(`[chart/${this.paneId}/controller] clear all (cache+activedata+chart)`)

    this.chartCache.clear()
    this.clearData()
    this.clearChart()

    this.setTimeframe(store.state[this.paneId].timeframe)
  }

  resample(timeframe: number) {
    console.log(`[chart/${this.paneId}/controller] resample to ${timeframe}`)

    const activeRendererDayOpen = Math.floor(this.activeRenderer.timestamp / DAY) * DAY
    const activeRendererTimestamp =
      activeRendererDayOpen + Math.floor((this.activeRenderer.timestamp - activeRendererDayOpen) / timeframe) * timeframe

    const activeChunk = this.getActiveChunk()

    if (activeChunk) {
      for (const source in this.activeRenderer.sources) {
        if (this.activeRenderer.sources[source].empty === false) {
          activeChunk.bars.push(this.cloneSourceBar(this.activeRenderer.sources[source], activeRendererTimestamp))
        }
      }
    }

    this.setTimeframe(timeframe)

    if (!this.chartCache.chunks.length) {
      return
    }

    const newBar = (source, destination, timestamp) => {
      if (typeof source.close === 'number') {
        destination.open = destination.high = destination.low = destination.close = source.close
      } else if (typeof destination.close === 'undefined' || destination.close === null) {
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

        const market = bar.exchange + bar.pair

        let barTimestamp

        if (this.isOddTimeframe) {
          const dayOpen = Math.floor(bar.timestamp / DAY) * DAY
          barTimestamp = dayOpen + Math.floor((bar.timestamp - dayOpen) / this.timeframe) * this.timeframe
        } else {
          barTimestamp = Math.floor(bar.timestamp / this.timeframe) * this.timeframe
        }

        if (this.activeRenderer.type !== 'time' && markets[market] && markets[market].cbuy + markets[market].csell > this.timeframe) {
          barTimestamp = markets[market].timestamp + this.timeframe
        }

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
        markets[market].high = Math.max(markets[market].high, bar.high, bar.open, bar.close)
        markets[market].low = Math.min(markets[market].low, bar.low, bar.open, bar.close)

        this.chartCache.chunks[i].bars.splice(j--, 1)
      }

      if (i && this.chartCache.chunks[i].bars.length < MAX_BARS_PER_CHUNKS) {
        if (this.chartCache.chunks[i].bars.length) {
          const available = MAX_BARS_PER_CHUNKS - this.chartCache.chunks[i - 1].bars.length

          if (available) {
            this.chartCache.chunks[i - 1].bars = this.chartCache.chunks[i - 1].bars.concat(this.chartCache.chunks[i].bars.splice(0, available))
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
    if (!this.activeChunk && this.chartCache.cacheRange.to === this.activeRenderer.timestamp) {
      this.activeChunk = this.chartCache.chunks[this.chartCache.chunks.length - 1]
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
  }

  /**
   * @param {LoadedIndicator} indicator indicator owning series
   */
  clearIndicatorSeries(indicator: LoadedIndicator) {
    for (let i = 0; i < indicator.apis.length; i++) {
      indicator.apis[i].setData([])
    }
  }

  /**
   * start queuing next trades
   */
  setupQueue() {
    if (this._releaseQueueInterval) {
      return
    } else if (!store.state[this.paneId].refreshRate) {
      this._releaseQueueInterval = requestAnimationFrame(() => this.releaseQueue())
      return
    }
    console.debug(`[chart/${this.paneId}/controller] setup queue (${getHms(store.state[this.paneId].refreshRate)})`)

    this._releaseQueueInterval = setInterval(() => {
      if (!this._preventImmediateRender) {
        this.releaseQueue()
      }
    }, store.state[this.paneId].refreshRate)
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
    if (!this.queuedTrades.length || this.preventRender) {
      if (!store.state[this.paneId].refreshRate) {
        this._releaseQueueInterval = requestAnimationFrame(() => this.releaseQueue())
      }
      return
    }

    this.renderRealtimeTrades(this.queuedTrades)
    this.queuedTrades.splice(0, this.queuedTrades.length)

    if (!store.state[this.paneId].refreshRate) {
      this._releaseQueueInterval = requestAnimationFrame(() => this.releaseQueue())
    }
  }

  /**
   * unlock render, will release queue on next queueInterval
   */
  unlockRender() {
    this.preventRender = false
  }

  /**
   * temporarily disable render to avoid issues
   */
  lockRender() {
    this.preventRender = true
  }

  /**
   * push a set of trades to queue in order to render them later
   * @param {Trades[]} trades
   */
  queueTrades(trades) {
    Array.prototype.push.apply(this.queuedTrades, trades)
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
      const identifier = trade.exchange + trade.pair

      if (!this.markets[identifier]) {
        continue
      }

      let timestamp
      if (this.activeRenderer) {
        if (this.activeRenderer.type === 'time') {
          if (this.isOddTimeframe) {
            const dayOpen = Math.floor(trade.timestamp / 1000 / DAY) * DAY
            timestamp = dayOpen + Math.floor((trade.timestamp / 1000 - dayOpen) / this.timeframe) * this.timeframe
          } else {
            timestamp = Math.floor(trade.timestamp / 1000 / this.timeframe) * this.timeframe
          }
        } else {
          if (this.activeRenderer.bar.cbuy + this.activeRenderer.bar.csell > this.timeframe) {
            timestamp = this.activeRenderer.timestamp + this.timeframe
          } else {
            timestamp = this.activeRenderer.timestamp
          }
        }
      } else {
        timestamp = +new Date() / 1000
      }

      if (!this.activeRenderer || this.activeRenderer.timestamp < timestamp) {
        if (this.activeRenderer) {
          if (!this.activeChunk || (this.activeChunk.to < this.activeRenderer.timestamp && this.activeChunk.bars.length >= MAX_BARS_PER_CHUNKS)) {
            // ensure active chunk is created and ready to receive bars
            this.getActiveChunk()
          }

          if (!this.activeRenderer.bar.empty) {
            this.updateBar(this.activeRenderer)
          }

          // feed activeChunk with active bar exchange snapshot
          for (const source in this.activeRenderer.sources) {
            if (this.activeRenderer.sources[source].empty === false) {
              this.activeChunk.bars.push(this.cloneSourceBar(this.activeRenderer.sources[source], this.activeRenderer.timestamp))
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

        this.preventPan()
      }

      const amount = trade.price * trade.size

      if (!this.activeRenderer.sources[identifier] || typeof this.activeRenderer.sources[identifier].pair === 'undefined') {
        console.debug(`[chart/${this.paneId}/controller] set initial price ${identifier} = ${trade.price}`)

        this.chartCache.initialPrices[identifier] = {
          exchange: trade.exchange,
          pair: trade.pair,
          price: trade.price
        }

        if (this.activeRenderer.length > 10 && !redrawRequired) {
          redrawRequired = true
        }

        this.activeRenderer.sources[identifier] = {
          pair: trade.pair,
          exchange: trade.exchange,
          close: +trade.price
        }

        this.resetBar(this.activeRenderer.sources[identifier])
      }

      this.activeRenderer.sources[identifier].empty = false

      const isActive = store.state.app.activeExchanges[trade.exchange]

      if (trade.liquidation) {
        this.activeRenderer.sources[identifier]['l' + trade.side] += amount

        if (isActive) {
          this.activeRenderer.bar['l' + trade.side] += amount
          this.activeRenderer.bar.empty = false
        }

        continue
      }

      this.activeRenderer.sources[identifier].high = Math.max(this.activeRenderer.sources[identifier].high, +trade.price)
      this.activeRenderer.sources[identifier].low = Math.min(this.activeRenderer.sources[identifier].low, +trade.price)
      this.activeRenderer.sources[identifier].close = +trade.price

      this.activeRenderer.sources[identifier]['c' + trade.side] += trade.count
      this.activeRenderer.sources[identifier]['v' + trade.side] += amount

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
      console.warn(`[chart/${this.paneId}] new source redraw required`)
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
   */
  renderBars(bars, indicatorsIds) {
    console.log(
      `[chart/${this.paneId}/controller] render bars`,
      '(',
      indicatorsIds ? 'specific serie(s): ' + indicatorsIds.join(',') : 'all series',
      ')',
      bars.length,
      'bar(s)'
    )

    if (!bars.length) {
      return
    }

    const computedSeries = {}
    let from = null
    let to = null

    let temporaryRenderer: Renderer
    let computedBar: any

    const initialTimestamp = bars[0].timestamp

    for (let i = 0; i < bars.length; i++) {
      if (bars[i].timestamp > initialTimestamp) {
        break
      }

      const market = bars[i].exchange + bars[i].pair

      if (this.chartCache.initialPrices[market]) {
        delete this.chartCache.initialPrices[market]
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

    if (this.activeRenderer && this.activeRenderer.timestamp > bars[bars.length - 1].timestamp) {
      const activeBars = Object.values(this.activeRenderer.sources).filter(bar => bar.empty === false)

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
          } else if (cachedBar.exchange === activeBar.exchange && cachedBar.pair === activeBar.pair) {
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

      if (!bar || !temporaryRenderer || bar.timestamp > temporaryRenderer.timestamp) {
        if (temporaryRenderer && !temporaryRenderer.bar.empty) {
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
          this.nextBar(bar.timestamp, temporaryRenderer)
        } else {
          temporaryRenderer = this.createRenderer(bar.timestamp, indicatorsIds)
        }
      }

      if (!store.state.app.activeExchanges[bar.exchange] || !this.markets[bar.exchange + bar.pair]) {
        continue
      }

      temporaryRenderer.bar.empty = false
      temporaryRenderer.bar.vbuy += bar.vbuy
      temporaryRenderer.bar.vsell += bar.vsell
      temporaryRenderer.bar.cbuy += bar.cbuy
      temporaryRenderer.bar.csell += bar.csell
      temporaryRenderer.bar.lbuy += bar.lbuy
      temporaryRenderer.bar.lsell += bar.lsell

      temporaryRenderer.sources[bar.exchange + bar.pair] = this.cloneSourceBar(bar)
      temporaryRenderer.sources[bar.exchange + bar.pair].empty = false
    }

    if (this.activeRenderer) {
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

      this.clearChart()

      if (!bars.length) {
        this.renderedRange.from = this.renderedRange.to = null
      } else {
        this.renderedRange.from = from
        this.renderedRange.to = to
      }
    }
    this.replaceData(computedSeries)
    if (scrollPosition) {
      this.chartInstance.timeScale().scrollToPosition(scrollPosition, false)
    }
  }

  /**
   * Renders chunks that collides with visible range
   */
  renderAll() {
    if (!this.chartInstance) {
      return
    }

    this.renderBars(this.chartCache.chunks.length ? this.chartCache.chunks.reduce((bars, chunk) => bars.concat(chunk.bars), []) : [], null)
  }

  /**
   * disable "fetch on pan" until current operation (serie.update / serie.setData) is finished
   */
  preventPan() {
    if (this.panPrevented) {
      return
    }

    const delay = 1000

    if (typeof this._releasePanTimeout !== 'undefined') {
      clearTimeout(this._releasePanTimeout)
    }

    this.panPrevented = true

    this._releasePanTimeout = window.setTimeout(() => {
      if (this.panPrevented) {
        this.panPrevented = false
      }
    }, delay)
  }

  /**
   * replace whole chart with a set of computed series bars
   * @param {Bar[]} seriesData Lightweight Charts formated series
   */
  replaceData(seriesData: { [id: string]: (TV.LineData | TV.BarData | TV.HistogramData)[] }) {
    this.preventPan()

    for (let i = 0; i < this.loadedIndicators.length; i++) {
      for (let j = 0; j < this.loadedIndicators[i].apis.length; j++) {
        const serieId = this.loadedIndicators[i].apis[j].id
        if (seriesData[serieId]) {
          this.loadedIndicators[i].apis[j].setData(seriesData[serieId])
        }
      }
    }
  }

  /**
   * excecute indicators, updating chart series with renderer's data
   * @param renderer
   */
  updateBar(renderer: Renderer) {
    for (let i = 0; i < this.loadedIndicators.length; i++) {
      const indicator = this.loadedIndicators[i]
      const serieData = renderer.indicators[indicator.id]

      this.loadedIndicators[i].adapter(
        renderer,
        serieData.functions,
        serieData.variables,
        renderer.length >= serieData.minLength ? indicator.apis : indicator.apisNoop,
        indicator.options,
        seriesUtils
      )
    }
  }

  /**
   * excecute indicators with renderer's data, and return series points
   * this does not update series on chart (indicator.apisNoop is passed instead of indicator.apis)
   * @param {Renderer} renderer
   * @param {string[]} indicators id of indicators to execute (all indicators calculated if null)
   * @returns series points
   */
  computeBar(renderer: Renderer, indicatorsIds?: string[]): { [serieId: string]: any } {
    const points = {}

    for (const indicator of this.loadedIndicators) {
      if (indicatorsIds && indicatorsIds.indexOf(indicator.id) === -1) {
        continue
      }

      const serieData = renderer.indicators[indicator.id]

      indicator.adapter(renderer, serieData.functions, serieData.variables, indicator.apisNoop, indicator.options, seriesUtils)

      for (let i = 0; i < serieData.series.length; i++) {
        if (
          renderer.length < serieData.minLength ||
          !serieData.series[i] ||
          (typeof serieData.series[i].value !== 'undefined' && serieData.series[i].value === null) ||
          (typeof serieData.series[i].lowerValue !== 'undefined' && serieData.series[i].lowerValue === null) ||
          (indicator.model.plots[i].type === 'histogram' && serieData.series[i].value === 0)
        ) {
          continue
        }
        points[indicator.apis[i].id] = serieData.series[i]
      }
    }

    return points
  }

  /**
   * create empty renderer
   * this is called on first realtime trade or when indicator(s) are rendered from start to finish
   * @param {number} timestamp create at time
   * @param {string[]} indicatorsIds id of indicators to bind (if null all indicators are binded)
   */
  createRenderer(firstBarTimestamp, indicatorsIds?: string[]) {
    firstBarTimestamp = Math.floor(firstBarTimestamp / this.timeframe) * this.timeframe

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

    for (const indicator of this.loadedIndicators) {
      if (indicatorsIds && indicatorsIds.indexOf(indicator.id) === -1) {
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
      renderer === this.activeRenderer &&
      this.activeRenderer.type === 'time' &&
      this.activeRenderer.timestamp < timestamp - this.activeRenderer.timeframe
    ) {
      const count = timestamp - this.activeRenderer.timeframe - this.activeRenderer.timestamp

      for (let i = 0; i < this.loadedIndicators.length; i++) {
        for (let j = 0; j < this.loadedIndicators[i].apis.length; j++) {
          for (let k = 0; k < count; k++) {
            if (i === 0 && j === 0) {
              this.incrementRendererBar(renderer)
            }

            this.loadedIndicators[i].apis[j].update({
              time: renderer.timestamp
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

    if (renderer.bar.empty) {
      return
    }
    for (let i = 0; i < this.loadedIndicators.length; i++) {
      const rendererSerieData = renderer.indicators[this.loadedIndicators[i].id]

      if (!rendererSerieData) {
        continue
      }

      for (let f = 0; f < rendererSerieData.functions.length; f++) {
        const instruction = rendererSerieData.functions[f]

        if (typeof instruction.state.count !== 'undefined') {
          instruction.state.count++
        }

        if (typeof instruction.state.points !== 'undefined') {
          instruction.state.points.push(instruction.state.output)
          instruction.state.sum += instruction.state.output

          if (instruction.state.count > (instruction.arg as number) - 1) {
            instruction.state.sum -= instruction.state.points.shift()
            instruction.state.count--
          }
        } else if (instruction.state.open !== 'undefined') {
          instruction.state.open = instruction.state.close
          instruction.state.high = instruction.state.close
          instruction.state.low = instruction.state.close
        } else if (instruction.persistence) {
          for (let j = 0; j < instruction.persistence.length; j++) {
            instruction.state['_' + instruction.persistence[j]] = instruction.state[instruction.persistence[j]]
          }
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

  prepareRendererForIndicators(indicatorId: string, renderer: Renderer) {
    for (let i = 0; i < this.loadedIndicators.length; i++) {
      if (indicatorId && this.loadedIndicators[i].id === indicatorId) {
        const markets = Object.keys(this.loadedIndicators[i].model.markets)

        for (let j = 0; j < markets.length; j++) {
          if (!renderer.sources[markets[j]]) {
            renderer.sources[markets[j]] = {
              open: null,
              high: null,
              low: null,
              close: null
            }
          }

          const keys = this.loadedIndicators[i].model.markets[markets[j]]

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

        break
      }
    }
  }

  getPriceScaleMargins(priceScaleId) {
    for (let i = 0; i < this.loadedIndicators.length; i++) {
      if (this.loadedIndicators[i].options.priceScaleId === priceScaleId && this.loadedIndicators[i].options.scaleMargins) {
        return this.loadedIndicators[i].options.scaleMargins
      }
    }
  }

  toggleFillGapsWithEmpty() {
    this.fillGapsWithEmpty = !this.fillGapsWithEmpty

    this.renderAll()
  }
}
