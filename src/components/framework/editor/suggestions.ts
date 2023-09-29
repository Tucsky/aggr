export default [
  {
    label: 'number',
    detail: '[AGGR] number option',
    insertText: `MyNumber = option(
  default=123, // default value
  label="Number value", // text above input
  placeholder="Type something" // text within empty input
)`
  },
  {
    label: 'text',
    detail: '[AGGR] text option',
    insertText: `MyText = option(
  type=text,
  label="Text value",
  placeholder="Fill me",
  description="Small description to help understand the option"
)`
  },
  {
    label: 'threshold',
    detail: '[AGGR] threshold option',
    insertText: `threshold = option(type=number, min=0, max=10, step=0.1)`
  },
  {
    label: 'range',
    detail: '[AGGR] range option',
    insertText: `MyRange = option(
  type=range,
  label="My range",
  min=0,
  max=1
)`
  },
  {
    label: 'rangecolor',
    detail: '[AGGR] range w/ gradient color',
    insertText: `MyRangeColor = option(
  type=range,
  label="Big range",
  gradient=["red", "limegreen"], // colorize slider
  min=0,
  max=1000000,
  log=true // slider will ajust displayed value logarithmic scale
)`
  },
  {
    label: 'list',
    detail: '[AGGR] list option',
    insertText: `quote = option(
  type=list,
  options=[null, "USD", "USDT", "TUSD", "USDC", "BUSD"],
  rebuild=true // not specifc to list but will trigger a full indi rebuild when change
)`
  },
  {
    label: 'listname',
    detail: '[AGGR] named list option',
    insertText: `quote = option(
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
)`
  },
  {
    label: 'color',
    detail: '[AGGR] color option',
    insertText: `color = option(type=color,default="red")`
  },
  {
    label: 'color rgba',
    detail: '[AGGR] color rgba option',
    insertText: `color = option(type=color,default="rgba(0, 255, 0, 0.5)")`
  },
  {
    label: 'sourced candlestick',
    detail: '[AGGR] sourced candlestick',
    insertText: `// let user choose spot, perp or both in indicator's settings
type = option(type=list, options=[null, "spot", "perp"], rebuild=true)

// get list of markets matching given type 
src = source(type=type)

// aggregate ohlc from markets & print into candlestick serie
candlestick(avg_ohlc(src))`
  },
  {
    label: 'multicolor histogram',
    detail: '[AGGR] multicolor histogram',
    insertText: `histogram({
  time: time,
  value: vbuy + vsell,
  color: vbuy > vsell ? upColor : downColor
})`
  },
  {
    label: 'plotbrokenarea',
    detail: '[AGGR] draw horizontal area',
    insertText: `brokenarea({
  time: time, 
  lowerValue: 10,
  higherValue: 20,
  extendRight: true,
  color: 'yellow'
})`
  },
  {
    label: 'plotline',
    detail: '[AGGR] draw simple line',
    insertText: `line($price.close)`
  },
  {
    label: 'plothistogram',
    detail: '[AGGR] draw simple columns',
    insertText: `histogram(vbuy + vsell)`
  },
  {
    label: 'plotbaseline',
    detail: '[AGGR] draw simple baseline',
    insertText: `baseline($price.close)`
  },
  {
    label: 'plotcloudarea',
    detail: '[AGGR] draw simple cloud',
    insertText: `cloudarea($price.low, $price.high)`
  },
  {
    label: 'markers',
    detail: '[AGGR] markers example',
    insertText: `// <STARTUP SCRIPT> 
if (!pendingMarkers) {
  // runs only once
  markers = []
  pendingMarkers = []
  lastIndex = null
}
// </STARTUP SCRIPT> 

// <MARKERS.UTILS> 
if (pendingMarkers.length) {
  markers = markers.concat(pendingMarkers)
  if (series[0].setMarkers) {
    series[0].setMarkers(markers)
  }
  pendingMarkers = []
}
// </MARKERS.UTILS>

// process only on new candle
if (bar.length === lastIndex) {
  return
}

line($price.close, color="transparent") // ghost price for markers

// script goes here

// we add a marker as an example :
pendingMarkers.push({
  time: time,
  position: 'belowBar',
  color: 'red',
  text: '🔺',
})

// set reference to bar index : only process first bar of tick
lastIndex = bar.length`
  },
  {
    label: 'rebuild',
    detail: '[AGGR] rebuild option param',
    insertText: `rebuild=true`
  }
]
