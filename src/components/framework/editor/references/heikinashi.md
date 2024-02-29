```ts
heikinashi(renderer: Renderer, time: number, ohlc: {
    open: number,
    high: number,
    low: number,
    close: number
}): {
    time: number,
    open: number,
    high: number,
    low: number,
    close: number
}
```

Computes the Heikin-Ashi values based on the provided OHLC (Open, High, Low, Close) data. Heikin-Ashi is a charting technique that averages price data to create a Japanese candlestick chart that filters out market noise.

## Parameters

- `renderer`: The renderer object, which is automatically injected with the local timestamp.
- `time`: The timestamp for the current candle/bar.
- `ohlc`: An object containing the open, high, low, and close values of the current candle/bar.

## Returns

An object containing the calculated Heikin-Ashi values:
- `time`: The timestamp for the current candle/bar.
- `open`: The average of the previous Heikin-Ashi candle's open and close (or the current OHLC open and close if it's the first calculation).
- `high`: The maximum value among the current open, high, and close.
- `low`: The minimum value among the current open, low, and close.
- `close`: The average of the current open, high, low, and close.

## Summary

The `heikinashi` function simplifies price data and helps traders identify trending periods and potential reversal points. The initial state is null, which gets updated with the high and low from the provided `ohlc`. The `close` is then computed as the average of the open, high, low, and previous close. For subsequent calculations, the `open` is averaged with the previous Heikin-Ashi candle's `open` and `close`. The resulting `low` and `high` are adjusted to represent the extremes of the current Heikin-Ashi candle.

*Note: This function is often used in financial analysis to provide a smoother chart that makes it easier to identify trends and reversals compared to traditional candlestick charts.*
