```ts
ohlc(renderer: Renderer, time: number, value: number): {
    time: number,
    open: number,
    high: number,
    low: number,
    close: number
}
```

Records the Open, High, Low, and Close (OHLC) values for a given time and value input, typically used in financial charting to represent price movements within a specified timeframe.

## Parameters

- `renderer`: The renderer object that includes the local timestamp.
- `time`: The timestamp for the current data point.
- `value`: The price value at the current timestamp.

## Returns

An object containing:
- `time`: The timestamp for the current data point.
- `open`: The opening price, defined as the value when the state is first set.
- `high`: The highest price observed since the last state reset.
- `low`: The lowest price observed since the last state reset.
- `close`: The most recent price value, representing the closing price at the current time.

## Summary

The `ohlc` function initializes the state with the first value received, setting it as the opening, high, and low prices. As new values are processed, the function updates the high and low prices if the incoming value exceeds the current extremes. The latest value is always set as the close price. This function is crucial for real-time financial charting, where it's important to capture the extremes of price movements and the final price at the end of a time interval.

*Note: The OHLC data is vital for technical analysis in trading, providing information about price volatility and market trends during the charting period.*
