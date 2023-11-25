```ts
histogram(
  data: {
    value: number,
    [time: number],
    [color: string]
  },
  [options]
)
```

Creates a histogram series to visually represent the distribution of values. The histogram consists of intervals (columns) indicating how many values fall into each column.

## Parameters

- `data`: An array of objects, each representing a data point in the histogram. Each object includes `value`, and optionally `time` and a specific `color`.
- `options` (optional): Styling options for the histogram series. Options include:
  - `color`: The default color for the histogram columns (e.g., `color='#26a69a'`).

## Returns

- This function does not return a value. It renders the histogram series on the chart for the current data points.

## Summary

The `histogram` function, adapted from Lightweight Charts' `addHistogramSeries`, provides a graphical representation of value distribution through a series of columns. Each column in the histogram represents a range of values, and its height indicates the count of values within that range. This function is particularly useful for data analysis, showing frequency distributions, and identifying patterns or outliers in data sets.

*Note: The color for individual data points can be specified directly within the data objects. If not specified, the default color set in the options will be applied.*
