export const defaultIndicators = {
  price: {
    name: 'Price',
    script: 'plotcandlestick(avg_ohlc(bar))',
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
  smas: {
    enabled: false,
    name: 'Smas {fastLength} {mediumLength} {slowLength}',
    displayName: 'Smas 50 100 200',
    script:
      'plotline(sma($price.close, options.fastLength), color=options.fastColor)\nplotline(sma($price.close, options.mediumLength), color=options.mediumColor)\nplotline(sma($price.close, options.slowLength), color=options.slowColor)',
    options: {
      priceScaleId: 'right',
      fastLength: 50,
      mediumLength: 100,
      slowLength: 200,
      fastColor: '#42a5f5',
      mediumColor: '#64b5f6',
      slowColor: '#90caf9'
    }
  },
  emas: {
    enabled: false,
    name: 'Emas {fastLength} {mediumLength} {slowLength}',
    displayName: 'Emas 50 100 200',
    script:
      'plotline(ema($price.close, options.fastLength), color=options.fastColor)\nplotline(ema($price.close, options.mediumLength), color=options.mediumColor)\nplotline(ema($price.close, options.slowLength), color=options.slowColor)',
    options: {
      priceScaleId: 'right',
      fastLength: 50,
      mediumLength: 100,
      slowLength: 200,
      fastColor: '#42a5f5',
      mediumColor: '#64b5f6',
      slowColor: '#90caf9'
    }
  },
  cmas: {
    enabled: false,
    name: 'Cmas {fastLength} {mediumLength} {slowLength}',
    displayName: 'Cmas 50 100 200',
    script:
      'plotline(cma($price.close, options.fastLength), color=options.fastColor)\nplotline(cma($price.close, options.mediumLength), color=options.mediumColor)\nplotline(cma($price.close, options.slowLength), color=options.slowColor)',
    options: {
      priceScaleId: 'right',
      fastLength: 50,
      mediumLength: 100,
      slowLength: 200,
      fastColor: '#42a5f5',
      mediumColor: '#64b5f6',
      slowColor: '#90caf9'
    }
  },
  volume: {
    name: 'Volume',
    script: 'plothistogram(vbuy + vsell)',
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
    script: 'plothistogram({ time: time, value: Math.abs(vbuy-vsell), color: vbuy - vsell > 0 ? options.upColor : options.downColor})',
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
    script: 'plothistogram({ time: time, value: lbuy+lsell, color: lbuy - lsell > 0 ? options.upColor : options.downColor})',
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
    name: 'CVD',
    script: 'plotline(cum(vbuy - vsell))',
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
    script: 'plotline(cum(cbuy-csell))',
    name: 'CTD',
    options: {
      priceScaleId: 'ctd',
      lineStyle: 4,
      lineWidth: 1
    }
  },
  linregcurve: {
    enabled: false,
    script: 'plotline(linreg($price.close, 50))\nplotline(linreg($price.close, 100))\nplotline(linreg($price.close, 200))',
    name: 'linreg',
    options: {
      priceScaleId: 'right',
      lineStyle: 4,
      lineWidth: 1
    }
  }
}
