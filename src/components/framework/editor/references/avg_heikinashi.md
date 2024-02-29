`avg_heikinashi(renderer: Renderer): { time: number, open: number, high: number, low: number, close: number }`

Calculates the Heikin-Ashi values for the average of all active sources contained within the renderer's bar, using the Heikin-Ashi technique, which in Japanese means "average bar". This method is used to average price movements and create a smoothed chart representation.

## Parameters

- `renderer`: The full bar object containing various sources of OHLC data.

## Returns

An object containing the averaged Heikin-Ashi values:
- `time`: The local timestamp from the renderer.
- `open`: The average of the open values of active sources, adjusted to Heikin-Ashi technique.
- `high`: The average of the high values of active sources.
- `low`: The average of the low values of active sources.
- `close`: The Heikin-Ashi close value, calculated as the average of the open, high, low, and close values.

## Summary

The `avg_heikinashi` function averages the OHLC values of all active sources within the renderer's bar, employing the Heikin-Ashi calculation to produce a single smoothed candlestick. This
