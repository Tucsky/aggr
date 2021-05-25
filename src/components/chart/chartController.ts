import { MAX_BARS_PER_CHUNKS } from '../../utils/constants'
import { formatTime, getHms, parseMarket, setValueByDotNotation } from '../../utils/helpers'
import { defaultChartOptions, defaultPlotsOptions, defaultSerieOptions, getChartOptions } from './chartOptions'
import store from '../../store'
import * as seriesUtils from './serieUtils'
import * as TV from 'lightweight-charts'
import ChartCache, { Chunk } from './chartCache'
import SerieBuilder from './serieBuilder'
import dialogService from '../../services/dialogService'
import SerieDialog from './SerieDialog.vue'
import { Trade } from '@/types/test'

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

export type SerieAdapter = (
  renderer: Renderer,
  functions: SerieInstruction,
  variables: SerieInstruction,
  options: TV.SeriesOptions<any>,
  seriesUtils: any
) => OHLC | number | { value: number }

export type SerieTranspilationOutputType = 'ohlc' | 'value' | 'custom'

export interface ActiveSerie {
  id: string
  type: string
  input: string
  options: any
  model: SerieTranspilationResult
  adapter: SerieAdapter
  outputType?: SerieTranspilationOutputType
  api: TV.ISeriesApi<any>
}

export interface SerieTranspilationResult {
  output: string
  type: SerieTranspilationOutputType
  variables: SerieInstruction[]
  functions: SerieInstruction[]
  exchanges?: string[]
  references?: string[]
}

export interface SerieInstruction {
  name: string
  type: string
  arg?: string | number
  length?: string | number
  state?: any
}

export interface Renderer {
  timestamp: number
  length: number
  bar: Bar
  sources: { [name: string]: Bar }
  series: { [id: string]: RendererSerieData }
  empty?: boolean
}

interface RendererSerieData {
  value: number
  point?: any
  variables: SerieInstruction[]
  functions: SerieInstruction[]
}

export default class ChartController {
  paneId: string
  watermark: string

  chartInstance: TV.IChartApi
  chartElement: HTMLElement
  activeSeries: ActiveSerie[] = []
  activeRenderer: Renderer
  activeChunk: Chunk
  renderedRange: TimeRange = { from: null, to: null }
  queuedTrades: Trade[] = []
  chartCache: ChartCache
  SerieBuilder: SerieBuilder
  preventRender: boolean
  panPrevented: boolean
  markets: { [identifier: string]: true }

  private _releaseQueueInterval: number
  private _releasePanTimeout: number
  private _preventImmediateRender: boolean

  constructor(id: string) {
    this.paneId = id

    this.chartCache = new ChartCache()
    this.SerieBuilder = new SerieBuilder()

    this.setMarkets(store.state.panes.panes[this.paneId].markets)
  }

  setMarkets(markets: string[]) {
    this.watermark = markets
      .filter(market => {
        const [exchange] = parseMarket(market)

        return !store.state.exchanges[exchange].disabled
      })
      .join(' + ')

    this.markets = markets.reduce((output, identifier) => {
      output[identifier.replace(/:/g, '')] = true

      return output
    }, {})

    this.updateWatermark()
  }

  createChart(containerElement) {
    console.log(`[chart/${this.paneId}/controller] create chart`)

    const chartOptions = getChartOptions(defaultChartOptions)

    this.chartInstance = TV.createChart(containerElement, chartOptions)
    this.chartElement = containerElement

    this.addEnabledSeries()
    this.updateWatermark()
  }

  /**
   * remove series, destroy this.chartInstance and cancel related events1
   */
  removeChart() {
    console.log(`[chart/${this.paneId}/controller] remove chart`)

    if (!this.chartInstance) {
      return
    }

    while (this.activeSeries.length) {
      this.removeSerie(this.activeSeries[0])
    }

    this.chartInstance.remove()

    this.chartInstance = null
  }

  /**
   * Get active serie by id
   * @returns {ActiveSerie} serie
   */
  getSerie(id: string): ActiveSerie {
    for (let i = 0; i < this.activeSeries.length; i++) {
      if (this.activeSeries[i].id === id) {
        return this.activeSeries[i]
      }
    }
  }

  /**
   * Update one serie's option
   * @param {Object} obj vuex store payload
   * @param {string} obj.id serie id
   * @param {string} obj.key option key
   * @param {any} obj.value serie id
   */
  setSerieOption({ id, key, value }) {
    const serie = this.getSerie(id)

    if (!serie) {
      return
    }

    let firstKey = key

    if (key.indexOf('.') !== -1) {
      const path = key.split('.')
      setValueByDotNotation(serie.options, path, value)
      firstKey = path[0]
    } else {
      serie.options[key] = value
    }

    serie.api.applyOptions({
      [firstKey]: serie.options[firstKey]
    })

    const noRedrawOptions = [/priceFormat/i, /scaleMargins/i, /color/i, /^linetype$/i, /width/i, /style$/i, /visible$/i]

    for (let i = 0; i < noRedrawOptions.length; i++) {
      if (noRedrawOptions[i] === firstKey || (noRedrawOptions[i] instanceof RegExp && noRedrawOptions[i].test(firstKey))) {
        return
      }
    }

    this.redrawSerie(id)
  }

  /**
   * Rebuild the whole serie
   * @param {string} id serie id
   */
  rebuildSerie(id) {
    this.removeSerie(this.getSerie(id))

    if (this.addSerie(id)) {
      this.redrawSerie(id)
    }
  }

  /**
   * Redraw one specific serie (and the series it depends on)
   * @param {string} id
   */
  redrawSerie(id) {
    let bars = []

    for (const chunk of this.chartCache.chunks) {
      // if (chunk.rendered) {
      bars = bars.concat(chunk.bars)
      // }
    }

    const series = this.getSeriesDependances(this.getSerie(id))

    series.push(id)

    this.renderBars(bars, series)
  }

  getVisibleRange() {
    const visibleRange = this.chartInstance.timeScale().getVisibleRange() as TimeRange

    if (!visibleRange) {
      return visibleRange
    }

    const timezoneOffset = store.state.settings.timezoneOffset / 1000

    visibleRange.from -= timezoneOffset
    visibleRange.to -= timezoneOffset

    return visibleRange
  }

  /**
   * Redraw
   * @param
   */
  redraw() {
    this.renderVisibleChunks()
  }

  /**
   * Add all enabled series
   */
  addEnabledSeries() {
    for (const id in store.state[this.paneId].series) {
      this.addSerie(id)
    }
  }

  updateWatermark() {
    if (!this.chartInstance) {
      return
    }

    this.chartInstance.applyOptions({
      watermark: {
        text: `\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0${this.watermark}\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0`,
        visible: true
      }
    })
  }

  /**
   * get series that depends on this serie
   * @param {ActiveSerie} serie
   * @returns {string[]} id of series
   */
  getSeriesDependendingOn(serie) {
    const series = []

    for (let i = 0; i < this.activeSeries.length; i++) {
      const serieCompare = this.activeSeries[i]

      if (serieCompare.id === serie.id) {
        continue
      }

      if (this.isSerieReferencedIn(serie, serieCompare)) {
        series.push(serieCompare.id)
      }
    }

    return series
  }

  /**
   * get dependencies of serie
   * @param {ActiveSerie} serie
   * @returns {string[]} id of series
   */
  getSeriesDependances(serie) {
    return serie.model.references.slice()
  }

  /**
   * is serieA referenced in serieB
   * @param {ActiveSerie} serieA
   * @param {ActiveSerie} serieB
   * @returns {boolean}
   */
  isSerieReferencedIn(serieA, serieB) {
    const functionString = serieB.input.toString()
    const reg = new RegExp(`bar\\.series\\.${serieA.id}\\.`, 'g')

    return !!functionString.match(reg)
  }

  /**
   * register serie and create serie api12
   * @param {string} serieId serie id
   * @returns {boolean} success if true
   */
  addSerie(id, depth = 0) {
    if (this.getSerie(id)) {
      console.log(id, 'already added')
      return true
    }

    const serieSettings = store.state[this.paneId].series[id] || {}
    const serieType = serieSettings.type

    if (!serieType) {
      throw new Error('unknown-serie-type')
    }

    const serieOptions = Object.assign({}, defaultSerieOptions, defaultPlotsOptions[serieType] || {}, serieSettings.options || {})

    const serieInput = serieSettings.input

    console.debug(`[chart/${this.paneId}/addSerie] adding ${id}`)
    console.debug(`\t-> TYPE: ${serieType}`)

    const serie: ActiveSerie = {
      id,
      type: serieType,
      input: serieInput,
      options: serieOptions,
      model: null,
      api: null,
      adapter: null
    }

    try {
      this.prepareSerie(serie)
    } catch (error) {
      if (depth < 5 && error.status === 'serie-required') {
        if (this.addSerie(error.serieId, depth + 1)) {
          if (depth === 0) {
            this.addSerie(id, depth + 1)
          }
        } else {
          dialogService.confirm({
            message: `Serie ${serie.id} require ${error.serieId} that wasn't found anywhere in this workspace`,
            ok: 'OK',
            cancel: false
          })
        }
      }

      return false
    }

    const apiMethodName = 'add' + (serieType.charAt(0).toUpperCase() + serieType.slice(1)) + 'Series'

    serie.api = this.chartInstance[apiMethodName](serieOptions)

    if (serieOptions.scaleMargins && serieOptions.priceScaleId) {
      serie.api.applyOptions({
        scaleMargins: serieOptions.scaleMargins
      })
    }

    this.activeSeries.push(serie)

    this.bindSerie(serie, this.activeRenderer)

    return true
  }

  prepareSerie(serie) {
    try {
      const result = this.SerieBuilder.build(
        serie,
        this.activeSeries.map(a => a.id)
      )
      const { functions, variables, references } = result
      let { output, type } = result

      if (store.state[this.paneId].seriesErrors[serie.id]) {
        store.commit(this.paneId + '/SET_SERIE_ERROR', {
          id: serie.id,
          error: null
        })
      }

      if (type === 'ohlc' && serie.type !== 'candlestick' && serie.type !== 'bar') {
        output += '.close'
        type = 'value'
      } else if (type === 'value' && (serie.type === 'candlestick' || serie.type === 'bar')) {
        throw new Error('inserted input produced a number but ohlc object was expected ({open: xx, high: xx, low: xx, close: xx})')
      }

      serie.model = {
        output,
        type,
        functions,
        references,
        variables
      }

      return true
    } catch (error) {
      console.error(`[chart/${this.paneId}/prepareSerie] transpilation failed`)
      console.error(`\t->`, error)

      store.commit(this.paneId + '/SET_SERIE_ERROR', {
        id: serie.id,
        error: error.message
      })

      if (error.status !== 'serie-required' && !dialogService.isDialogOpened('serie')) {
        dialogService.open(
          SerieDialog,
          {
            paneId: this.paneId,
            serieId: serie.id
          },
          'serie'
        )
      }

      throw error
    }
  }

  /**
   *
   * @param {ActiveSerie} serie
   * @param {Renderer} renderer
   * @returns
   */
  bindSerie(serie: ActiveSerie, renderer) {
    if (!renderer || typeof renderer.series[serie.id] !== 'undefined' || !serie.model) {
      return
    }

    const { functions, variables } = JSON.parse(JSON.stringify(serie.model))

    this.SerieBuilder.updateInstructionsArgument(functions, serie.options)

    console.debug(`[chart/${this.paneId}/bindSerie] binding ${serie.id} ...`)

    renderer.series[serie.id] = {
      value: null,
      point: null,
      functions,
      variables
    }

    serie.adapter = this.SerieBuilder.getAdapter(serie.model.output)
    serie.outputType = serie.model.type

    return serie
  }

  /**
   * Detach serie from renderer
   * @param {ActiveSerie} serie
   * @param {Renderer} renderer
   */
  unbindSerie(serie, renderer) {
    if (!renderer || typeof renderer.series[serie.id] === 'undefined') {
      return
    }

    delete renderer.series[serie.id]
  }

  /**
   * Derender serie
   * if there is series depending on this serie, they will be also removed
   * @param {ActiveSerie} serie
   */
  removeSerie(serie) {
    if (typeof serie === 'string') {
      serie = this.getSerie(serie)
    }

    if (!serie) {
      return
    }

    // remove from chart instance (derender)
    this.chartInstance.removeSeries(serie.api)

    // unbind from activebar (remove serie meta data like sma memory etc)
    this.unbindSerie(serie, this.activeRenderer)

    // update store (runtime prop)
    // store.commit(this.paneId + '/DISABLE_SERIE', serie.id)

    // recursive remove of dependent series
    /* for (let dependentId of this.getSeriesDependendingOn(serie)) {
      this.removeSerie(this.getSerie(dependentId))
    } */

    // remove from active series model
    this.activeSeries.splice(this.activeSeries.indexOf(serie), 1)
  }

  /**
   * clear rendered stuff
   */
  clearChart() {
    console.log(`[chart/${this.paneId}/controller] clear chart (all series emptyed)`)

    this.preventPan()

    for (const serie of this.activeSeries) {
      this.clearSerie(serie)
    }

    this.renderedRange.from = this.renderedRange.to = null
  }

  /**
   * clear active data
   */
  clearData() {
    console.log(`[chart/${this.paneId}/controller] clear data (activeRenderer+activeChunk+queuedTrades1)`)

    this.activeRenderer = null
    this.activeChunk = null
    this.queuedTrades.splice(0, this.queuedTrades.length)
  }

  /**
   * clear data and rendered stuff
   */
  clear() {
    console.log(`[chart/${this.paneId}/controller] clear all (cache+activedata+chart)`)

    this.chartCache.clear()
    this.clearData()
    this.clearChart()
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
   * @param {ActiveSerie} serie serie to clear
   */
  clearSerie(serie) {
    serie.api.setData([])
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
   * release queue and stop queuing next trades
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
    const formatedBars = []

    if (!trades.length) {
      return
    }

    for (let i = 0; i < trades.length; i++) {
      const trade = trades[i]
      const identifier = trade.exchange + trade.pair

      if (!this.markets[identifier]) {
        continue
      }

      const timestamp = Math.floor(trade.timestamp / 1000 / store.state[this.paneId].timeframe) * store.state[this.paneId].timeframe

      if (!this.activeRenderer || this.activeRenderer.timestamp < timestamp) {
        if (this.activeRenderer) {
          if (!this.activeChunk || (this.activeChunk.to < this.activeRenderer.timestamp && this.activeChunk.bars.length >= MAX_BARS_PER_CHUNKS)) {
            if (!this.activeChunk && this.chartCache.cacheRange.to === this.activeRenderer.timestamp) {
              this.chartCache.chunks[this.chartCache.chunks.length - 1].active = true
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
          }

          if (!this.activeRenderer.bar.empty) {
            formatedBars.push(this.computeBar(this.activeRenderer))
          }

          // feed activeChunk with active bar exchange snapshot
          for (const source in this.activeRenderer.sources) {
            if (!this.activeRenderer.sources[source].empty) {
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

      if (!this.activeRenderer.sources[identifier]) {
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

      this.activeRenderer.sources[identifier]['c' + trade.side]++
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

    if (!this.activeRenderer.bar.empty) {
      formatedBars.push(this.computeBar(this.activeRenderer))

      if (this.renderedRange.to < this.activeRenderer.timestamp) {
        this.renderedRange.to = this.activeRenderer.timestamp
      }
    }

    for (let i = 0; i < formatedBars.length; i++) {
      this.updateBar(formatedBars[i])
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
   * Render a set of bars
   *
   * @param {Bar[]} bars bars to render
   * @param {string[]} [series] render only theses series
   */
  renderBars(bars, series) {
    console.log(
      `[chart/${this.paneId}/controller] render bars`,
      '(',
      series ? 'specific serie(s): ' + series.join(',') : 'all series',
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

    if (this.activeRenderer && this.activeRenderer.timestamp > bars[bars.length - 1].timestamp) {
      const activeBars = Object.values(this.activeRenderer.sources).filter(bar => !bar.empty)

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

    for (let i = 0; i <= bars.length; i++) {
      const bar = bars[i]

      if (!bar || !temporaryRenderer || bar.timestamp > temporaryRenderer.timestamp) {
        if (temporaryRenderer && !temporaryRenderer.bar.empty) {
          if (from === null) {
            from = temporaryRenderer.timestamp
          }

          to = temporaryRenderer.timestamp

          computedBar = this.computeBar(temporaryRenderer, series)

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

        if (temporaryRenderer) {
          this.nextBar(bar.timestamp, temporaryRenderer)
        } else {
          temporaryRenderer = this.createRenderer(bar.timestamp, series)
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
    }

    if (this.activeRenderer) {
      for (const id in temporaryRenderer.series) {
        this.activeRenderer.series[id] = temporaryRenderer.series[id]
      }
    } else {
      this.activeRenderer = temporaryRenderer
    }

    let scrollPosition: number

    if (!series) {
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
  renderVisibleChunks() {
    if (!this.chartCache.chunks.length || !this.chartInstance) {
      return
    }

    const visibleRange = this.getVisibleRange()
    const visibleLogicalRange = this.chartInstance.timeScale().getVisibleLogicalRange()

    let from = null

    if (visibleRange) {
      console.debug(
        '[chart/${this.paneId}/renderVisibleChunks] VisibleRange: ',
        `from: ${formatTime(visibleRange.from)} -> to: ${formatTime(visibleRange.to)}`
      )

      from = visibleRange.from

      if (visibleLogicalRange.from < 0) {
        from += store.state[this.paneId].timeframe * visibleLogicalRange.from

        console.debug(
          '[chart/${this.paneId}/renderVisibleChunks] Ajusted visibleRange using visibleLogicalRange: ',
          `bars offset: ${visibleLogicalRange.from} === from: ${formatTime(from)}`
        )
      }
    }

    // const selection = ['------------------------']
    const bars = this.chartCache.chunks
      /*.filter(c => {
        c.rendered = !visibleRange || c.to > from - store.state[this.paneId].timeframe * 20
        selection.push(
          `${c.rendered ? '[selected] ' : ''} #${this.chartCache.chunks.indexOf(c)} | FROM: ${formatTime(c.from)} | TO: ${formatTime(
            c.to
          )} (${formatAmount(c.bars.length)} bars)`
        )

        return c.rendered
      })*/
      .reduce((bars, chunk) => bars.concat(chunk.bars), [])
    /*selection.push('------------------------')
    console.debug(selection.join('\n') + '\n')*/
    this.renderBars(bars, null)
  }

  /**
   * Attach marker to serie
   * @param {ActiveSerie} serie serie
   */
  setMarkers(serie, marker) {
    if (!serie.markers) {
      serie.markers = []
    }

    for (let i = serie.markers.length - 1; i >= 0; i--) {
      if (serie.markers[i].time === marker.time) {
        serie.markers.splice(i, 1)
        break
      }
    }

    serie.markers.push(marker)

    setTimeout(() => {
      serie.api.setMarkers(serie.markers)
    }, 100)
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
   * replace whole chart with a set of bars
   * @param {Bar[]} bars bars to render
   */
  replaceData(computedSeries) {
    this.preventPan()

    for (const serie of this.activeSeries) {
      if (computedSeries[serie.id] && computedSeries[serie.id].length) {
        serie.api.setData(computedSeries[serie.id])
      }
    }
  }

  /**
   * update last or add new bar to this.chartInstance
   * @param {Bar} bar
   */
  updateBar(bar) {
    for (const serie of this.activeSeries) {
      if (bar[serie.id]) {
        serie.api.update(bar[serie.id])
      }
    }
  }

  /**
   * Process bar data and compute series values for this bar
   * @param {Renderer} renderer
   * @param {string[]} series
   */
  computeBar(renderer, series?: string[]) {
    const points = {}

    const time = renderer.timestamp + store.state.settings.timezoneOffset / 1000

    for (const serie of this.activeSeries) {
      if (series && series.indexOf(serie.id) === -1) {
        continue
      }

      const serieData = renderer.series[serie.id]

      serieData.point = serie.adapter(renderer, serieData.functions, serieData.variables, serie.options, seriesUtils)

      if (renderer.length < serie.options.minLength) {
        delete points[serie.id]
        continue
      }

      if (serie.model.type === 'value') {
        serieData.value = serieData.point
        points[serie.id] = { time, value: serieData.point }
      } else if (serie.model.type === 'ohlc') {
        serieData.value = serieData.point.close
        points[serie.id] = { time, open: serieData.point.open, high: serieData.point.high, low: serieData.point.low, close: serieData.point.close }
      } else if (serie.model.type === 'custom') {
        serieData.value = serieData.point.value
        points[serie.id] = { time, ...serieData.point }
      }

      if (isNaN(serieData.value)) {
        this.unbindSerie(serie, this.activeRenderer)

        store.commit(this.paneId + '/SET_SERIE_ERROR', {
          id: serie.id,
          error: `${serie.id} is NaN`
        })

        if (!dialogService.isDialogOpened('serie')) {
          dialogService.open(
            SerieDialog,
            {
              paneId: this.paneId,
              serieId: serie.id
            },
            'serie'
          )
        }

        continue
      } else if (serieData.value === null || (serie.type === 'histogram' && serieData.value === 0)) {
        delete points[serie.id]
      }
    }

    return points
  }

  /**
   * Create empty renderer
   * @param {number} timestamp start timestamp
   * @param {string[]} series series to bind
   */
  createRenderer(firstBarTimestamp, series?: string[]) {
    const renderer: Renderer = {
      timestamp: firstBarTimestamp,
      length: 1,
      series: {},
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

    for (const serie of this.activeSeries) {
      if (series && series.indexOf(serie.id) === -1) {
        continue
      }

      this.bindSerie(serie, renderer)
    }

    return renderer
  }

  /**
   * prepare renderer for next bar
   * @param {number} timestamp timestamp of the next bar
   * @param {Renderer?} renderer bar to use as reference
   */
  nextBar(timestamp, renderer?: Renderer) {
    renderer.length++

    if (!renderer.bar.empty) {
      for (let i = 0; i < this.activeSeries.length; i++) {
        const rendererSerieData = renderer.series[this.activeSeries[i].id]

        if (!rendererSerieData) {
          continue
        }

        for (let f = 0; f < rendererSerieData.functions.length; f++) {
          const instruction = rendererSerieData.functions[f]

          if (instruction.type === 'average_function') {
            instruction.state.points.push(instruction.state.output)
            instruction.state.sum += instruction.state.output
            instruction.state.count++

            if (instruction.state.count > instruction.arg) {
              instruction.state.sum -= instruction.state.points.shift()
              instruction.state.count--
            }
          } else if (instruction.type === 'ohlc') {
            instruction.state.open = instruction.state.close
            instruction.state.high = instruction.state.close
            instruction.state.low = instruction.state.close
          }
        }

        for (let v = 0; v < rendererSerieData.variables.length; v++) {
          const instruction = rendererSerieData.variables[v]

          if (instruction.type === 'array') {
            instruction.state.unshift(instruction.state[0])

            if (instruction.state.length > instruction.length) {
              instruction.state.pop()
            }
          }
        }
      }
    }

    renderer.timestamp = timestamp

    this.resetRendererBar(renderer)
  }

  /**
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
   *
   * @param {Bar} bar
   */
  resetBar(bar: Bar) {
    bar.open = bar.close
    bar.high = bar.close
    bar.low = bar.close
    bar.vbuy = 0
    bar.vsell = 0
    bar.cbuy = 0
    bar.csell = 0
    bar.lbuy = 0
    bar.lsell = 0
    bar.empty = false
  }
}
