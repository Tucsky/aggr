```ts
pivot_high(
    value: number,
    lengthBefore: number,
    lengthAfter: number
): number | null
```

Identifies the pivot high point in a series of values, defined as the highest value within a specified number of bars before and after the current value.

## Parameters

- `value`: The current value from which the pivot high is to be identified.
- `lengthBefore`: The number of bars to the left (before) of the current value to consider.
- `lengthAfter`: The number of bars to the right (after) of the current value to consider.

## Returns

- The price of the pivot high point if found; otherwise, `null`.

## Summary

The `pivot_high` function is designed to detect significant high points in a data series, which are often indicators of potential market turning points or support/resistance levels. It examines the range of bars specified by `lengthBefore` and `lengthAfter` around the current value and identifies the highest point within this range. This point is considered a pivot high if it is higher than all other values in the specified range. If no such point exists, the function returns `null`. This tool is particularly valuable in technical analysis for pinpointing key levels that might influence future price movements.

*Note: The function's ability to identify a pivot high is contingent on the availability and accuracy of data for the specified range of bars. Incomplete or noisy data may affect the reliability of the pivot high identification.*
