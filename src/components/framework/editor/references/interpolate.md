```ts
interpolate(ratio: number, ...colors: Array<string>): string
```

Interpolates between a set of color codes based on a given ratio, producing a new color code.

## Parameters

- `ratio`: A numerical value representing the interpolation ratio between the given colors.
- `colors`: A variable number of color codes (strings) used for the interpolation.

## Returns

- A color code (string) that represents the interpolated color based on the ratio and the provided color codes.

## Summary

![interpolate](https://i.imgur.com/HFJpc0J.png)

The `interpolate` function blends a set of color codes based on the specified ratio to produce a new color. It first converts the color codes into their RGB representations and then mixes them according to the given ratio to create a new color. This function is useful in visual applications, such as data visualization, UI design, and graphics, where dynamic color generation based on certain criteria or scales is required. The function ensures that the colors are mixed correctly according to the ratio, providing a smooth transition between the specified colors.

```
color1 = option(type=color, default=rgb(34, 139, 230))
color2 = option(type=color, default=rgb(85, 201, 255))
color3 = option(type=color, default=rgb(255, 255, 85))
color4 = option(type=color, default=rgb(255, 165, 0))
color5 = option(type=color, default=rgb(255, 69, 0))

var ohlc = avg_ohlc(bar)
var color = interpolate(
    Math.abs(Math.sin(bar.length / 100)), // rainbow pos
    color1, // rainbow colors
    color2, //
    color3,
    color4,
    color5
)

ohlc.color = color
ohlc.borderColor = color
ohlc.wickColor = color

candlestick(ohlc)
```

*Note: The function requires valid color codes as input and a ratio between 0 and 1 for correct operation. Incorrect color codes or ratios outside this range may result in errors or unexpected outputs.*