`avg_close(renderer: Renderer): number`

Calculates the simple average closing price of all active sources within the provided renderer's bar.

## Parameters

- `renderer`: The full bar object containing various sources of closing price data.

## Returns

- A `number` representing the averaged closing price of the active sources.

## Summary

The `avg_close` function aggregates the closing prices of all active sources within the renderer's bar and computes their simple average (total sum divided by the count of sources). This function is essential for obtaining a quick and straightforward average of the closing prices, which can be a critical indicator of the overall market sentiment at the end of a trading period.

*Note: The function accounts for any inactive sources by excluding them from the averaging process, ensuring that only valid and active data contributes to the final averaged close value.*
