```ts
rma(
  value: number,
  length: number
): number
```

Calculates the Running Moving Average (RMA) for the given value over a specified number of points, emphasizing recent data.

## Parameters

- `value`: The current numerical value to be included in the RMA calculation.
- `length`: The number of points over which the running moving average is computed.

## Returns

- The Running Moving Average of the given value over the specified length.

## Summary

The `rma` function computes the Running Moving Average, a type of moving average that places a greater emphasis on recent data points. It uses a weighting factor \( k = \frac{1}{\text{length}} \) to determine the impact of the most recent data point in the calculation. If there are previous data points available, the RMA is calculated using the current value, the last RMA value, and the weighting factor. If not, the RMA is initially set to 1. This calculation method makes the RMA particularly useful in situations where recent changes are more significant than older data, such as in financial markets for trend analysis or in tracking recent performance metrics.

_Note: The responsiveness of the RMA to recent changes depends on the specified length; a shorter length results in a moving average that is more responsive to recent data, while a longer length averages out the data over a longer period, providing a smoother and less volatile average._
