```ts
avg_ohlc(renderer: Renderer): {
time: number,
open: number,
high: number,
low: number,
close: number
}
```

Calculates the average Open, High, Low, and Close (OHLC) values of the active sources within the provided renderer's bar. The function ensures that the last close value is equal to the next open value (classic aggregation printing).

## Parameters

- `renderer`: The full bar object that contains the data sources to be averaged.

## Returns

An object containing:
- `time`: The local timestamp from the renderer.
- `open`: The averaged opening price from the active sources.
- `high`: The highest price observed among the averaged values.
- `low`: The lowest price observed among the averaged values.
- `close`: The averaged closing price from the active sources.

## Summary

The `avg_ohlc` function is designed to provide a consolidated view of multiple data sources in a trading environment. By averaging the OHLC values of all active sources contained within a renderer's bar, it offers a simplified representation of complex data, which can be critical for making informed trading decisions.

The function performs a check to initialize the `open` value if it is the first computation. It iterates over all sources within the renderer, summing the OHLC values for active sources only and skipping any that are inactive or have a null `open` value. The average is then calculated based on the number of active sources, with the function returning the computed average OHLC values along with the renderer's local timestamp.

*Note: This function assumes that all sources have equal weight in the averaging process. The practical use of this function may vary based on the specific trading strategy and data analysis requirements.*
