`interpolate(ratio: number, ...colors: string): string`

Given a ratio (between 0 and 1) and an array of RGB colors, this function returns an interpolated color based on the specified ratio. 

![interpolate](https://i.imgur.com/HFJpc0J.png)

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