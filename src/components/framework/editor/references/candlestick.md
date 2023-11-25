```ts
candlestick(data: {
  open: number,
  high: number,
  low: number,
  close: number,
  [time: number]
}, [options])
```

Renders a candlestick series for the current bar using OHLC (Open, High, Low, Close) data and optional styling parameters.

## Parameters

- `data`: An object representing the candlestick data, containing `open`, `high`, `low`, and `close` values. Optionally, `time` can also be included.
- `options` (optional): A set of styling options for the candlestick series. Options include:
  - `upColor`: The color for rising candlesticks (e.g., `upColor='#26a69a'`).
  - `downColor`: The color for falling candlesticks (e.g., `downColor='#ef5350'`).
  - `borderVisible`: A boolean to show or hide the candlestick border (e.g., `borderVisible=false`).
  - `wickUpColor`: The color of the wick for rising candlesticks (e.g., `wickUpColor='#26a69a'`).
  - `wickDownColor`: The color of the wick for falling candlesticks (e.g., `wickDownColor='#ef5350'`).

## Returns

- This function does not return a value. It renders the candlestick series on the chart for the current bar.

## Summary

The `candlestick` function integrates with Lightweight Charts' `addCandlestickSeries` to display price movements in the form of candlesticks. Each candlestick's body is formed by the open and close values, while the wicks represent the high and low values for the bar's time interval. This function is essential for financial charting, providing a detailed and visual representation of price action, suitable for various market analysis methods.

_Note: All options are optional. The function can be used with just the `data` parameter, applying default styles if options are not specified. The options must be valid CSS color values for the function to render the series correctly._
