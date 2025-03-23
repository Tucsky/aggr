`series` array contain the registered LightweightCharts series API

ex:
```
// series contain the drawing APIs of the current indicator (line, candlestick etc)
var indicatorFirstSerie = series[0].id

// bar.series contain the value of each series for the current bar
bar.series[indicatorFirstSerie] = {
  time: time
  value: 123,
}
```

