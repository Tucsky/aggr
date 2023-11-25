```ts
sma(value: number, length: number): number
```

Calculates the Simple Moving Average (SMA) by averaging the given value with the accumulated sum over a specified number of points.

## Parameters

- `value`: The current numerical value to be included in the average calculation.
- `length`: The number of points over which the moving average is calculated.

## Returns

- The Simple Moving Average value.

## Summary

The `sma` function computes the Simple Moving Average, a widely used indicator in financial analysis for smoothing out price data and identifying trends. It adds the current value to the accumulated sum and divides this total by the count of data points to get the average. The function is essential for tracking average values over time, providing a clear picture of trends and helping to mitigate the effects of short-term fluctuations. It is particularly valuable in technical analysis for identifying potential support and resistance levels in financial markets.

*Note: The accuracy and relevance of the SMA depend on the specified length and the consistency of the input data. It's a straightforward yet powerful tool for analyzing trends, but it may lag behind the most recent market movements due to its nature as a moving average.*
