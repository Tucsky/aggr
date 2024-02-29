`cma(value: number, length: number): number`

Calculates the Cumulative Moving Average (CMA) over a specified length, averaging the incoming values within this window.

## Parameters

- `value`: The latest numerical value to be included in the average.
- `length`: The number of points to consider for the cumulative moving average.

## Returns

- The Cumulative Moving Average calculated over the specified number of points.

## Summary

The `cma` function computes the Cumulative Moving Average, which is a type of moving average that considers a specified window (`length`) of data points. Unlike a simple moving average that might consider all past data, the `cma` in this context focuses on a finite number of recent data points, making it more responsive to recent changes in the data. This function is especially useful in situations where a more current view of the average is needed, such as in trend analysis and short-term market movement studies.

*Note: The CMA's responsiveness and relevance are directly influenced by the chosen length. A shorter length makes the CMA more sensitive to recent changes, while a longer length smoothens out short-term fluctuations, providing a more stable average.*
