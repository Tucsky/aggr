import 'monaco-editor/esm/vs/editor/editor.all.js'
import 'monaco-editor/esm/vs/language/typescript/monaco.contribution'
import 'monaco-editor/esm/vs/basic-languages/monaco.contribution'

import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'

monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
  noLib: true,
  lib: [],
  allowNonTsExtensions: true
})

monaco.languages.registerCompletionItemProvider('javascript', {
  provideCompletionItems: function (model, position) {
    // find out if we are completing a property in the 'dependencies' object.

    const word = model.getWordUntilPosition(position)
    const range = {
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      startColumn: word.startColumn,
      endColumn: word.endColumn
    }

    return {
      suggestions: [
        {
          label: 'number',
          kind: monaco.languages.CompletionItemKind.Function,
          detail: '[AGGR] number option',
          insertText: `MyNumber = option(
  default=123, // default value
  label="Number value", // text above input
  placeholder="Type something" // text within empty input
)`,
          range
        },
        {
          label: 'text',
          kind: monaco.languages.CompletionItemKind.Function,
          detail: '[AGGR] text option',
          insertText: `MyText = option(
  type=text,
  label="Text value",
  placeholder="Fill me",
  description="Small description to help understand the option"
)`,
          range
        },
        {
          label: 'threshold',
          kind: monaco.languages.CompletionItemKind.Function,
          detail: '[AGGR] threshold option',
          insertText: `threshold = option(type=number, min=0, max=10, step=0.1)`,
          range
        },
        {
          label: 'range',
          kind: monaco.languages.CompletionItemKind.Function,
          detail: '[AGGR] range option',
          insertText: `MyRange = option(
  type=range,
  label="My range",
  min=0,
  max=1
)`,
          range
        },
        {
          label: 'rangecolor',
          kind: monaco.languages.CompletionItemKind.Function,
          detail: '[AGGR] range w/ gradient color',
          insertText: `MyRangeColor = option(
  type=range,
  label="Big range",
  gradient=["red", "limegreen"], // colorize slider
  min=0,
  max=1000000,
  log=true // slider will ajust displayed value logarithmic scale
)`,
          range
        },
        {
          label: 'list',
          kind: monaco.languages.CompletionItemKind.Function,
          detail: '[AGGR] list option',
          insertText: `quote = option(
  type=list,
  options=[null, "USD", "USDT", "TUSD", "USDC", "BUSD"],
  rebuild=true // not specifc to list but will trigger a full indi rebuild when change
)`,
          range
        },
        {
          label: 'listname',
          kind: monaco.languages.CompletionItemKind.Function,
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
)`,
          range
        },
        {
          label: 'color',
          kind: monaco.languages.CompletionItemKind.Function,
          detail: '[AGGR] color option',
          insertText: `color = option(type=color,default="red")`,
          range
        },
        {
          label: 'color rgba',
          kind: monaco.languages.CompletionItemKind.Function,
          detail: '[AGGR] color rgba option',
          insertText: `color = option(type=color,default="rgba(0, 255, 0, 0.5)")`,
          range
        },
        {
          label: 'sourced candlestick',
          kind: monaco.languages.CompletionItemKind.Function,
          detail: '[AGGR] sourced candlestick',
          insertText: `// let user choose spot, perp or both in indicator's settings
type = option(type=list, options=[null, "spot", "perp"])

// get list of markets matching given type 
src = source(type=type)

// aggregate ohlc from markets & print into candlestick serie
candlestick(avg_ohlc(src))`,
          range
        },
        {
          label: 'multicolor histogram',
          kind: monaco.languages.CompletionItemKind.Function,
          detail: '[AGGR] multicolor histogram',
          insertText: `histogram({
  time: time,
  value: vbuy + vsell,
  color: vbuy > vsell ? upColor : downColor
})`,
          range
        },
        {
          label: 'brokenarea',
          kind: monaco.languages.CompletionItemKind.Function,
          detail: '[AGGR] heatmap example',
          insertText: `brokenarea(
  {
    time: time,
    lowerValue: 10,
    higherValue: 20,
    extendRight: true,
    color: 'yellow'
  },
  strokeColor=options.strokeColor,
  strokeWidth=options.strokeWidth
)`,
          range
        },
        {
          label: 'markers',
          kind: monaco.languages.CompletionItemKind.Function,
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
lastIndex = bar.length`,
          range
        }
      ]
    }
  }
})
console.log(monaco)
export default monaco
