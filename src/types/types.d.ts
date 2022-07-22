import { PaneType } from '@/store/panes'

export type SlippageMode = false | 'price' | 'bps'
export type AggregationLength = 0 | 1 | 10 | 100 | 1000

declare module 'test.worker' {
  // You need to change `Worker`, if you specified a different value for the `workerType` option
  class WebpackWorker extends Worker {
    constructor()
  }

  // Uncomment this if you set the `esModule` option to `false`
  // export = WebpackWorker;
  export default WebpackWorker
}

export interface AggregatorPayload {
  op: string
  data?: any
  trackingId?: string
}

export interface AggregatedTrade extends Trade {
  originalPrice: number
}

export interface AggregatorSettings {
  aggregationLength: AggregationLength
  calculateSlippage?: SlippageMode
  preferQuoteCurrencySize?: boolean
  buckets?: { [bucketId: string]: string[] }
}

export interface Market {
  id: string
  exchange: string
  pair: string
}

export interface Trade {
  exchange: string
  pair: string
  timestamp: number
  price: number
  size: number
  side: 'buy' | 'sell'
  amount?: number
  count?: number
  originalPrice?: number
  liquidation?: boolean
  slippage?: number
}

export interface QueuedTrade extends Trade {
  timeout?: number
}

export interface Volumes {
  timestamp: number
  vbuy: number
  vsell: number
  cbuy: number
  csell: number
  lbuy: number
  lsell: number
}

export interface Connection {
  exchange: string
  pair: string
  hit: number
  timestamp: number
  bucket?: Volumes
}

export interface ProductsStorage {
  exchange: string
  timestamp?: number
  data: ProductsData
}

export interface GifsStorage {
  slug: string
  keyword: string
  timestamp?: number
  data: string[]
}
export interface Workspace {
  version?: number
  createdAt: number
  updatedAt: number
  id: string
  name: string
  states: { [id: string]: any }
}

export type PresetType = ('audio' | 'colors' | 'indicator') | PaneType

export interface Preset {
  name: string
  type: PresetType
  data: any
  createdAt: number
  updatedAt: number
  version?: string
}

export interface ImportedSound {
  name: string
  data: any
}

export interface MarketAlerts {
  market: string
  alerts: MarketAlert[]
}

export interface MarketAlert {
  price: number
  market?: string
  active?: boolean
  timestamp?: number
  triggered?: boolean
}

export type ProductsData = string[] | { [prop: string]: any }

export interface PreviousSearchSelection {
  label: string
  count: number
  markets: string[]
}
