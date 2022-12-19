import { ISeriesApi, SeriesOptions } from 'lightweight-charts'

export interface Bar {
  exchange?: string
  pair?: string
  empty?: boolean
  active?: boolean
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
}

export interface IndicatorApi extends ISeriesApi<any> {
  id: string
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
  expectedInput: string
  options: { [prop: string]: any }
}

export interface Renderer {
  timeframe: number
  timeframeType: 'time' | 'tick'
  timestamp: number
  localTimestamp: number
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
  plotsOptions?: { [plotId: string]: { [key: string]: any }}
  minLength?: number
}

export type IndicatorRealtimeAdapter = (
  renderer: Renderer,
  functions: IndicatorFunction[],
  variables: IndicatorVariable[],
  apis: IndicatorApi[],
  options: SeriesOptions<any>,
  seriesUtils: any
) => void

export interface IndicatorMetadata {
  output: string
  silentOutput: string
  variables: IndicatorVariable[]
  functions: IndicatorFunction[]
  plots: { [id: string]: IndicatorPlot }
  markets: IndicatorMarkets
  references: string[]
  props: string[]
}

export type IndicatorMarkets = {
  [marketId: string]: string[]
}

export interface BuildedIndicator {
  id: string
  options: SeriesOptions<any>
  script: string
  meta: IndicatorMetadata
  adapter?: IndicatorRealtimeAdapter
  silentAdapter?: IndicatorRealtimeAdapter
}

export interface ChartMarket {
  active: boolean
  index: string
}