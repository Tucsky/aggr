```ts
avg_ohlc_with_gaps(renderer: Renderer): { 
  time: number, 
  open: number, 
  high: number, 
  low: number, 
  close: number 
}
```

Computes the average Open, High, Low, and Close (OHLC) values of the active sources within the renderer's bar, taking into account potential gaps in the data. Unlike `avg_ohlc`, this function also calculates the average open for each candle.

## Parameters

- `renderer`: The full bar object that includes various sources of OHLC data.

## Returns

An object containing:
- `time`: The local timestamp from the renderer.
- `open`: The averaged opening price from the active sources.
- `high`: The highest price achieved, compared to the previous state or within the current active sources.
- `low`: The lowest price achieved, compared to the previous state or within the current active sources.
- `close`: The averaged closing price from the active sources.

## Summary

The `avg_ohlc_with_gaps` function is designed for scenarios where there might be gaps in the data, ensuring that the average calculations are performed only on active sources with valid data. It updates the high and low values only if the new computed averages exceed the previous state's values, accounting for any potential gaps in price data. This function is particularly useful in markets where price gaps can occur, providing a more accurate representation of market conditions for analysis.

*Note: This approach can be useful for traders who need to consider gaps in price data, which could be indicative of market volatility or other significant events that might not be reflected in a simple average.*
