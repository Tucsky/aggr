```ts
last(value: number, length: number): number
```

Returns the value from the last bar of the specified length, or the current value if there are not enough bars.

## Parameters

- `value`: The current numerical value.
- `length`: The number of bars to consider.

## Returns

- The value from the last bar if the specified number of bars is available; otherwise, returns the current value.

## Summary

The `last` function is designed to retrieve the value from the last bar of a specified length. It is particularly useful in scenarios where analysis or decisions depend on the value from a specific point in the past relative to the current bar. If the length parameter includes enough bars, the function returns the value from the last bar; if not, it defaults to the current value. This function can be valuable in financial and data analysis contexts where historical values have significance in trend analysis, decision-making, or comparative studies.

*Note: The effectiveness of the `last` function depends on the availability of sufficient historical data as specified by the `length` parameter. In cases where historical data is limited, the function will provide the most recent available value.*
