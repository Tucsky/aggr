```ts
ema(value: number, length: number): number
```

Calculates the Exponential Moving Average (EMA) for the given value over a specified number of points.

## Parameters

- `value`: The current numerical value to be included in the EMA calculation.
- `length`: The number of points over which the exponential moving average is computed.

## Returns

- The Exponential Moving Average of the given value over the specified length.

## Summary

The `ema` function computes the Exponential Moving Average, a key indicator in financial analysis that gives more weight to recent data points, making it more responsive to new information compared to a simple moving average. The function uses a smoothing factor \( k = \frac{2}{\text{length} + 1} \), which determines the weight of the most recent data point in the calculation. If there are previous data points available, the EMA is calculated using the current value, the last EMA value, and the smoothing factor. Otherwise, the EMA is set to the current value. This method of calculation makes the EMA an essential tool in trend analysis and trading strategies, as it closely follows recent price changes.

*Note: The EMA's responsiveness is influenced by the chosen length; a shorter length results in a greater focus on recent data, while a longer length smoothens out the data over a more extended period, providing a more generalized view of the trend.*
