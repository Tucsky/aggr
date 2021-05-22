export const defaultChartSeries = {
  price: {
    name: 'Price',
    type: 'candlestick',
    description: 'Price',
    input: 'avg_ohlc(bar)',
    axisLabelVisible: true,
    options: {
      priceScaleId: 'right',
      priceLineVisible: true,
      lastValueVisible: true,
      borderVisible: true,
      upColor: 'rgba(33, 150, 243, 0)',
      borderUpColor: 'rgb(255, 255, 255)',
      wickUpColor: 'rgba(255, 255, 255, .45)',
      downColor: 'rgba(66, 165, 245, .47)',
      borderDownColor: 'rgb(255, 255, 255, .33)',
      wickDownColor: 'rgb(100, 181, 246, .53)'
    }
  },
  'price-ma': {
    type: 'line',
    name: 'PRICE {smaLength} MA',
    input: 'sma($price.close, options.smaLength)',
    options: {
      priceScaleId: 'right',
      color: '#C2EFEB',
      smaLength: 200,
      lineWidth: 1
    }
  },
  volume: {
    name: 'Volume',
    type: 'histogram',
    description: 'Volume',
    input: 'vbuy + vsell',
    options: {
      priceFormat: {
        type: 'volume'
      },
      color: 'rgba(255, 255, 255, .15)',
      priceScaleId: 'volume'
    }
  },
  volume_delta: {
    name: 'Volume Δ',
    type: 'histogram',
    description: 'Volume Delta',
    input: '{value: Math.abs(vbuy-vsell),color: vbuy - vsell > 0 ? options.upColor : options.downColor}',
    options: {
      priceFormat: {
        type: 'volume'
      },
      upColor: '#3BCA6D',
      downColor: '#EB1E2F',
      priceScaleId: 'volume'
    }
  },
  liquidations: {
    name: 'Liquidations',
    type: 'histogram',
    description: 'Forced Liquidations',
    input: '{value: lbuy+lsell,color: lbuy - lsell > 0 ? options.upColor : options.downColor}',
    options: {
      priceFormat: {
        type: 'volume'
      },
      priceScaleId: 'volume_liquidations',
      upColor: 'rgba(255,235,59,0.79)',
      downColor: 'rgba(103,58,183,0.69)',
      scaleMargins: {
        top: 0.9,
        bottom: 0
      }
    }
  },
  cvd: {
    enabled: true,
    name: 'CVD',
    type: 'line',
    description: 'Cumulative Volume Delta',
    input: 'cum_ohlc(vbuy - vsell)',
    options: {
      priceScaleId: 'cvd',
      priceFormat: {
        type: 'volume'
      },
      color: '#ffe100',
      upColor: 'rgba(165,214,167,0)',
      borderUpColor: 'rgb(255,235,59)',
      wickUpColor: 'rgb(255,235,59)',
      downColor: 'rgba(239,154,154,0)',
      borderDownColor: 'rgb(255,167,38)',
      wickDownColor: 'rgb(255,152,0)',
      borderVisible: true,
      lastValueVisible: true,
      priceLineVisible: true
    }
  },
  ctd: {
    enabled: false,
    input: 'cum(cbuy-csell)',
    type: 'line',
    name: 'CTD',
    description: 'Cumulative Trade Delta',
    options: {
      priceScaleId: 'ctd',
      lineStyle: 4,
      lineWidth: 1
    }
  },
  'cvd-ma': {
    enabled: false,
    type: 'line',
    name: 'CVD {smaLength} MA',
    input: 'sma($cvd.close, options.smaLength)',
    options: {
      priceScaleId: 'cvd',
      color: 'rgba(236, 254, 232, .5)',
      smaLength: 50,
      lineWidth: 1
    }
  }
}
