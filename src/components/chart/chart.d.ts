import { ISeriesApi, SeriesOptions } from 'lightweight-charts'

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

export type MarketsBars = {
  [market: string]: Bar
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
  libraryId: string
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
  plotType: string
}
export interface Renderer {
  minLength: number
  type: 'time' | 'tick' | 'bps' | 'vol'
  timeframe: number
  timestamp: number
  localTimestamp: number
  lastTradeTimestamp?: number
  length: number
  bar: Bar
  sources: { [name: string]: Bar }
  indicators: { [id: string]: RendererIndicatorData }
  series: { [id: string]: IndicatorSeriePoint }
  empty?: boolean
  price?: number
}

export interface RendererIndicatorData {
  canRender: boolean
  variables: IndicatorVariable[]
  functions: IndicatorFunction[]
  plotsOptions?: any[]
  minLength?: number
}

export interface IndicatorSeriePoint {
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
}

export type MarketsFilters = {
  [identifier: string]: boolean
}
