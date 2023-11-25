```ts
highest(value: number, length: number): number
```

Finds the highest value within a specified number of recent bars.

## Parameters

- `value`: The current value to be compared.
- `length`: The number of bars to include in the set for comparison.

## Returns

- The highest value found within the specified number of bars.

## Summary

The `highest` function is designed to track the highest value within a set of recent bars, up to the specified `length`. This function is particularly useful in technical analysis for identifying extreme values or peaks in a data series over a given period. It compares the current value with the values from the preceding bars and returns the highest value found. This kind of analysis is essential for understanding market dynamics, such as identifying resistance levels or assessing the strength of a market move.

*Note: The accuracy of the `highest` function's output depends on the completeness and reliability of the data for the specified number of bars. Incomplete data may affect the identification of the true highest value.*
