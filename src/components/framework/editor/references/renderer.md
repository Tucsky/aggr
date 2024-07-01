Current chart state

```ts
export interface Renderer {
  type: 'time' | 'tick' | 'bps' | 'vol'
  timeframe: number
  timestamp: number
  localTimestamp: number
  lastTradeTimestamp: renderer
  length: number
  bar: Bar
  sources: { [name: string]: Bar }
  indicators: { [id: string]: RendererIndicatorData }
  empty?: boolean
  price?: number
}

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
```
