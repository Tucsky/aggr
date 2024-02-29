```ts
na(val: any): any | number
```

Evaluates the given value and returns it if it is truthy; otherwise, returns 0.

## Parameters

- `val`: The value to be evaluated, which can be of any type.

## Returns

- The original value if it is truthy (non-null, non-undefined, non-false, non-zero, non-empty string, etc.); otherwise, returns `0`.

## Summary

The `na` function is a simple yet versatile utility used to ensure that a value is usable in calculations. It checks if the provided value is "not available" (i.e., null, undefined, false, zero, or an empty string) and, in such cases, substitutes it with `0`. This function is particularly useful in scenarios where default values are needed to maintain computational integrity, such as in financial calculations, data processing, or any situation where missing or undefined values could lead to errors or misinterpretations.

*Note: The simplicity of the `na` function makes it a handy tool for data validation and error handling in various computational contexts.*
