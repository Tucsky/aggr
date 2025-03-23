`customFns` contain the custom functions

```
// define a base function
function midpoint(low, high) {
  return (low + high) / 2
}

// define a function that calls another function
function rangeMidpoint(customFns, ohlc) {
  return customFns.midpoint(ohlc.low, ohlc.high)
}

// usage (pass global `customFns` to another function)
line(rangeMidpoint(customFns, $price))
```