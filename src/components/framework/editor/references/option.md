```ts
MyNumber = option(
  default=123, // default value
  label="Number value", // text above input
  placeholder="Type something" // text within empty input
)
console.log(MyNumber) // 123
```

Defining options with the new option() function will allow choose the appropriate input type, set default value, help text and more.

## Allowed options types
```ts
export enum ALLOWED_OPTION_TYPES {
  text,
  number,
  range,
  list,
  lineType,
  lineStyle,
  color,
  checkbox,
  exchange
}
```

## Basic example

```ts
// number input with `min`, `max` and `step` attribute
threshold = option((type = number), (min = 0), (max = 10), (step = 0.1))
```

```ts
// default type is number
MyNumber = option(
  default=123, // default value
  label="Number value", // text above input
  placeholder="Type something" // text within empty input 
)
console.log(MyNumber) // 123

// text input
MyText = option(
  type=text,
  label="Text value",
  placeholder="Fill me",
  description="Small description to help understand the option"
)
console.log(MyText) // ""
```

## Range input

![ranges](https://private-user-images.githubusercontent.com/5738336/267001083-f836add9-dc04-4259-b0c7-ea7b3cdad3e4.png?jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTEiLCJleHAiOjE3MDA5MzIwMjAsIm5iZiI6MTcwMDkzMTcyMCwicGF0aCI6Ii81NzM4MzM2LzI2NzAwMTA4My1mODM2YWRkOS1kYzA0LTQyNTktYjBjNy1lYTdiM2NkYWQzZTQucG5nP1gtQW16LUFsZ29yaXRobT1BV1M0LUhNQUMtU0hBMjU2JlgtQW16LUNyZWRlbnRpYWw9QUtJQUlXTkpZQVg0Q1NWRUg1M0ElMkYyMDIzMTEyNSUyRnVzLWVhc3QtMSUyRnMzJTJGYXdzNF9yZXF1ZXN0JlgtQW16LURhdGU9MjAyMzExMjVUMTcwMjAwWiZYLUFtei1FeHBpcmVzPTMwMCZYLUFtei1TaWduYXR1cmU9NmRkM2Q1MDIyNGM0YjIzMzk5ZTRhOTJiYTYzZmIyYzFkODUyMGEzOWYxZmNmZDk3MDU1MDE5NjM3M2YyZGI1MCZYLUFtei1TaWduZWRIZWFkZXJzPWhvc3QmYWN0b3JfaWQ9MCZrZXlfaWQ9MCZyZXBvX2lkPTAifQ.G5aR9n_8PqjnjrDv9sfBci34pFqBvVEEMX4yQ2sWWoA)

```ts
smallrange = option(
  (type = range),
  (label = 'Small range'),
  (min = 0),
  (max = 1)
)

bigrange = option(
  (type = range),
  (label = 'Big range'),
  (gradient = ['red', 'limegreen']), // colorize slider
  (min = 0),
  (max = 1000000),
  (log = true) // slider will ajust displayed value logarithmic scale
)
```

## List option


![list](https://private-user-images.githubusercontent.com/5738336/267002237-7569405e-50a8-454d-aa68-a92e6df9109c.png?jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTEiLCJleHAiOjE3MDA5MzIwMjAsIm5iZiI6MTcwMDkzMTcyMCwicGF0aCI6Ii81NzM4MzM2LzI2NzAwMjIzNy03NTY5NDA1ZS01MGE4LTQ1NGQtYWE2OC1hOTJlNmRmOTEwOWMucG5nP1gtQW16LUFsZ29yaXRobT1BV1M0LUhNQUMtU0hBMjU2JlgtQW16LUNyZWRlbnRpYWw9QUtJQUlXTkpZQVg0Q1NWRUg1M0ElMkYyMDIzMTEyNSUyRnVzLWVhc3QtMSUyRnMzJTJGYXdzNF9yZXF1ZXN0JlgtQW16LURhdGU9MjAyMzExMjVUMTcwMjAwWiZYLUFtei1FeHBpcmVzPTMwMCZYLUFtei1TaWduYXR1cmU9Zjk4ZjBhZThkNTFmMTYyMTY3ZmFiNWJkYzQxYWJkYWFjMGU0MTMzZTcwZTI0ODgxMDdjODg5NDZhMTM1MmJlNyZYLUFtei1TaWduZWRIZWFkZXJzPWhvc3QmYWN0b3JfaWQ9MCZrZXlfaWQ9MCZyZXBvX2lkPTAifQ.TZd9fv1X8LvWXtrNnkMC1wIs2XZ4xqTBQ4uzk0ObKgE)


```ts
// regular list
quote = option(
  type=list,
  options=[null, "USD", "USDT", "TUSD", "USDC", "BUSD"],
  rebuild=true // not specifc to list but will trigger a full indi rebuild when change
)

// custom list item labels
quote = option(
  type=list,
  options={
    "": "Pick something",
    "USD": "United State Dollar",
    "USDT": "Tether",
    "TUSD": "TrueUSD",
    "USDC": "Coinbase USD",
    "BUSD": "Binance USD"
  },
  default=USD
)

// same as list but with predefined exchanges options
exchange = option(type=exchange, rebuild=true)
```

> [!WARNING]  
> options must be valid JSON format all option values must be wrapped in double-quotes `"`

## Color input

```ts
// regular color with default value
color = option(type=color,default="red")

// other color format are allowed
color = option(type=color,default="rgba(0, 255, 0, 0.5)")
```

> [!WARNING]  
> missing a `,` in the color code, a `"` in the list options, WILL break the whole chart without notice.


## Usage with source() function

```ts
// let user choose spot, perp or both in indicator's settings
type = option(type=list, options=[null, "spot", "perp"], rebuild=true)

// get list of markets matching given type 
src = source(type=type)

// aggregate ohlc from markets & print into candlestick serie
candlestick(avg_ohlc(src))
```