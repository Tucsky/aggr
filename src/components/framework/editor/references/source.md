```ts
line(source(close, type='spot'))
```

Filter chart sources<br>
⚠️ You still need to add the sources to the pane


```ts
// plot futures contract premium
var premium = source(close, type="perp") - source(close, type="spot")
line(premium, title=Premium)

// plot the Binance spot delta
var delta = source(vbuy, exchange='BINANCE', type="spot") - source(vbuy, exchange='BINANCE', type="spot")
line(vbuy, cum(delta))

// plot a specific ohlc from available sources
var sentiment = source(name=/^SENTIMENT/)
avg_ohlc(sentiment)

// negative filtering
var others = source(name=/(?!SENTIMENT/)/)
avg_ohlc(others)
```