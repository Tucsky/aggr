```ts
baseline(data: number | { 
  value: number, 
  time: number 
}, [options])
```

Creates a baseline series with two colored areas (top and bottom) between the data line and the base value line.

## Parameters

- `data`: The value for the current bar, either a number or an object with `value` and `time` properties.
- `options` (optional): A set of styling options for the baseline series. Options include:
  - `baseValue`: The base value to create the baseline (e.g., `baseValue=25`).
  - `topLineColor`: The color of the top line (e.g., `topLineColor='rgba(38, 166, 154, 1)'`).
  - `topFillColor1`: The first fill color for the top area (e.g., `topFillColor1='rgba(38, 166, 154, 0.28)'`).
  - `topFillColor2`: The second fill color for the top area (e.g., `topFillColor2='rgba(38, 166, 154, 0.05)'`).
  - `bottomLineColor`: The color of the bottom line (e.g., `bottomLineColor='rgba(239, 83, 80, 1)'`).
  - `bottomFillColor1`: The first fill color for the bottom area (e.g., `bottomFillColor1='rgba(239, 83, 80, 0.05)'`).
  - `bottomFillColor2`: The second fill color for the bottom area (e.g., `bottomFillColor2='rgba(239, 83, 80, 0.28)'`).

## Returns

- This function does not return a value. It renders the baseline series on the chart for the current bar.

## Summary

The `baseline` function is an adaptation of Lightweight Charts' `addBaselineSeries` method, designed for use in scenarios where a baseline is needed to compare the data points against a base value. This feature is particularly useful in visualizing how data fluctuates above or below a certain reference point, making it suitable for financial analysis, comparative studies, and trend visualization.

*Note: All options are optional. The function can be used with just the `data` parameter, applying default styles if options are not specified. The options must be valid CSS color values and a numerical base value for the function to render the series correctly.*
