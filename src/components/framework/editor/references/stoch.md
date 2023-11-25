```ts
stoch(
  close: number,
  high: number,
  low: number,
  length: number
): number
```

Calculates the stochastic oscillator value, a momentum indicator comparing a particular closing price to a range of its prices over a certain period.

## Parameters

- `close`: The current closing price.
- `high`: The current high price.
- `low`: The current low price.
- `length`: The number of bars to consider for calculating the highs and lows.

## Returns

- The stochastic oscillator value as a percentage.

## Summary

The `stoch` function computes the stochastic oscillator, which is widely used in technical analysis to generate overbought and oversold signals by comparing the closing price to a range of prices over a specified period. The function maintains a record of the highest and lowest values over the `length` period and calculates the oscillator as \( 100 \times \frac{\text{close} - \text{lowest}}{\text{highest} - \text{lowest}} \). This indicator helps in identifying potential reversal points in the market, as values close to 100 indicate overbought conditions and values close to 0 indicate oversold conditions.

*Note: The accuracy and relevance of the stochastic oscillator are contingent on the specified `length` and the quality of the price data. It's essential to interpret this indicator in conjunction with other tools and market factors for effective trading decisions.*
