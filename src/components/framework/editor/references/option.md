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

![basics](https://i.imgur.com/LHi36wv.png)

```ts
// number input with `min`, `max` and `step` attribute
threshold = option(type = number, min = 0, max = 10, step = 0.1)
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

![ranges](https://i.imgur.com/79A2KYI.png)

```ts
smallrange = option(
type = range,
label = 'Small range',
min = 0,
max = 1
)

bigrange = option(
type = range,
label = 'Big range',
gradient = ['red', 'limegreen'], // colorize slider
min = 0,
max = 1000000,
log = true // slider will ajust displayed value logarithmic scale
)
```

## List option


![list](https://i.imgur.com/otNfKdD.png)


```ts
// regular list
quote = option(
  type=list,
  options=[null, "USD", "USDT", "TUSD", "USDC"],
  rebuild=true // not specifc to list but will trigger a full indi rebuild when change
)

// custom list item labels
quote = option(
  type=list,
  options={
    "": "Pick something",
    "USD": "United State Dollar",
    "USDT": "Tether",
    "USDC": "Coinbase USD",
    "TUSD": "TrueUSD"
  },
  default=USD
)

// same as list but with predefined exchanges options
exchange = option(type=exchange, rebuild=true)
```

> Warning
> options must be valid JSON format all option values must be wrapped in double-quotes

## Color input

```ts
// regular color with default value
color = option(type=color,default="red")

// other color format are allowed
color = option(type=color,default="rgba(0, 255, 0, 0.5)")
```

> Warning  
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