\```ts
pivot_low(
    value: number,
    lengthBefore: number,
    lengthAfter: number
): number | null
\```

Determines the pivot low point in a series of values, which is the lowest value within a specified number of bars before and after the current value.

## Parameters

- `value`: The current value to evaluate for a potential pivot low.
- `lengthBefore`: The number of bars to examine to the left (before) the current value.
- `lengthAfter`: The number of bars to examine to the right (after) the current value.

## Returns

- The price of the pivot low point if one is found; otherwise, `null`.

## Summary

The `pivot_low` function is crucial for identifying significant low points in a data series, typically used in technical analysis to spot potential market reversal points or to determine support levels. It scans the bars within the range specified by `lengthBefore` and `lengthAfter` around the current value to find the lowest point. This point is recognized as a pivot low if it is lower than all other values in the specified range. If no such low point is detected, the function returns `null`. This analysis is key for traders and analysts who rely on understanding market trends and potential turning points.

*Note: The effectiveness of this function depends on complete and accurate data for the given range. Gaps or inaccuracies in data may impact the precision of the pivot low identification.*
