Current chart state

```
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
```