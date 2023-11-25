```ts
lowest(
    value: number,
    length: number
): number
```

Identifies the lowest value within a specified number of recent bars.

## Parameters

- `value`: The current value to be evaluated.
- `length`: The number of bars to consider in the set for identifying the lowest value.

## Returns

- The lowest value discovered within the specified range of bars.

## Summary

The `lowest` function is tailored to pinpoint the lowest value in a sequence of bars, up to a certain `length`. This functionality is crucial in areas like technical analysis, where identifying valleys or troughs in a data series is essential. The function assesses the current value against preceding bars within the defined range and determines the lowest among them. Such analysis is invaluable for detecting support levels, gauging market bottoms, or understanding bearish trends.

*Note: The effectiveness of the `lowest` function is contingent on having complete and accurate data for the designated number of bars. Gaps or inaccuracies in data could influence the determination of the actual lowest value.*
