```ts
cum_ohlc(value: number, time: number): { 
  time: number, 
  open: number, 
  high: number, 
  low: number, 
  close: number 
}
```

Produces a cumulative OHLC (Open, High, Low, Close) object based on a continuous addition of incoming values over time. The high and low values are determined by the intra-bar fluctuations and depend on the chart's refresh rate.

## Parameters

- `value`: The current value to be added to the cumulative total.
- `time`: The timestamp for the current bar, typically obtained from `bar.localTimestamp`.

## Returns

An object containing the cumulative OHLC values:
- `time`: The timestamp for the current data point.
- `open`: The initial value of the series or the opening value of the current bar.
- `high`: The highest cumulative value within the current bar.
- `low`: The lowest cumulative value within the current bar.
- `close`: The latest cumulative value, representing the closing value at the current time.

## Summary

The `cum_ohlc` function is designed to track the cumulative total of a value as it changes over time, providing an OHLC representation of its progression. It starts with the initial value as the open, high, and low. As new values are introduced, they are added to the opening value to reflect the ongoing total. The high and low are adjusted if the new cumulative value exceeds or falls below the current bar's extremes. This function is useful for visualizing the accumulation of values, such as volume or aggregated price changes, over a given period in a financial chart.

*Note: Since the high and low are based on fluctuations within the bar, the precision of these values can vary depending on the chart's refresh rate. Faster refresh rates can provide a more accurate range of intra-bar fluctuations.*
