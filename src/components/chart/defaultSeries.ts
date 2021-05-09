export const defaultChartSeries = {
  price: {
    name: 'Price',
    type: 'candlestick',
    description: 'Price',
    input: 'avg_ohlc(bar)',
    axisLabelVisible: true,
    options: {
      priceScaleId: 'price',
      priceLineVisible: true,
      lastValueVisible: true,
      upColor: 'rgb(100, 157, 102)',
      borderUpColor: 'rgb(59, 202, 109)',
      wickUpColor: 'rgba(119, 148, 92, .5)',
      downColor: 'rgb(239, 67, 82)',
      borderDownColor: 'rgb(235, 30, 47)',
      wickDownColor: 'rgba(239, 67, 82,.5)'
    }
  },
  'price-ma': {
    type: 'line',
    name: 'PRICE {smaLength} MA',
    input: 'sma($price.close, options.smaLength)',
    options: {
      priceScaleId: 'price',
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
    enabled: false,
    name: 'CVD',
    type: 'candlestick',
    description: 'Cumulative Volume Delta',
    input: 'cum_ohlc(vbuy - vsell)',
    options: {
      priceScaleId: 'right',
      priceFormat: {
        type: 'volume'
      },
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
      priceScaleId: 'right',
      color: 'rgba(236, 254, 232, .5)',
      smaLength: 50,
      lineWidth: 1
    }
  }
}
