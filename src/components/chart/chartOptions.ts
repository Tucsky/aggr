import store from '@/store'
import { formatRgb, toRgb } from 'color-fns'
import { ChartOptions, DeepPartial, LineType, LineWidth } from 'lightweight-charts'

export const defaultChartOptions = {
  crosshair: {
    vertLine: {
      color: 'rgba(255, 255, 255, .5)',
      width: 0.5 as LineWidth,
      style: 2,
      visible: true,
      labelVisible: true
    },
    horzLine: {
      color: 'rgba(255, 255, 255, .5)',
      width: 0.5 as LineWidth,
      style: 2,
      visible: true,
      labelBackgroundColor: 'white',
      labelVisible: true
    },
    mode: 0
  },
  watermark: {
    color: 'rgba(255,255,255, 0.1)',
    visible: false,
    text: 'Loading',
    fontSize: 24,
    horzAlign: 'center',
    vertAlign: 'center'
  },
  layout: {
    backgroundColor: 'transparent',
    textColor: 'white',
    fontFamily: 'Barlow Semi Condensed'
  },
  grid: {
    horzLines: {
      visible: false
    },
    vertLines: {
      visible: false
    }
  },
  timeScale: {
    barSpacing: 3,
    minBarSpacing: 0,
    rightOffset: 12,
    lockVisibleTimeRangeOnResize: true,
    rightBarStaysOnScroll: true,
    borderVisible: true,
    borderColor: 'rgba(255, 255, 255, .2)',
    visible: true,
    timeVisible: true,
    secondsVisible: true
  },
  priceScale: {
    position: 'right',
    mode: 0,
    borderColor: 'rgba(255, 255, 255, .2)',
    scaleMargins: {
      top: 0.1,
      bottom: 0.2
    }
  }
}

export const defaultSerieOptions = {
  crosshairMarkerVisible: false,
  lastValueVisible: false,
  priceLineVisible: false,
  priceFormat: {
    type: 'price',
    minMove: '0.01',
    precision: 2
  },
  scaleMargins: {
    top: 0.1,
    bottom: 0.2
  }
}

export const defaultLineOptions = {
  priceLineStyle: 1,
  color: 'white',
  lineWidth: 1,
  lineStyle: 0,
  lineType: 0
}

export const defaultCandlestickOptions = {
  priceLineColor: 'rgba(255, 255, 255, .5)',
  borderVisible: false,
  upColor: '#c3a87a',
  downColor: '#e53935',
  borderUpColor: '#c3a87a',
  borderDownColor: '#e53935',
  wickUpColor: 'rgba(223, 195, 148, .8)',
  wickDownColor: 'rgba(224, 91, 95, .8)'
}

export const defaultHistogramOptions = {
  color: '#c3a87a',
  scaleMargins: {
    top: 0.8,
    bottom: 0
  }
}

export const defaultAreaOptions = {
  topColor: 'rgba(21, 146, 230, 0.4)',
  bottomColor: 'rgba(21, 146, 230, 0)',
  lineColor: 'rgba(21, 146, 230, 1)',
  lineStyle: 0,
  lineWidth: 2
}

export const defaultCloudAreaOptions = {
  positiveColor: 'rgba(76,175,80,0.1)',
  negativeColor: 'rgba(255,82,82,0.1)',
  higherLineColor: '#4CAF50',
  higherLineStyle: LineType.Simple,
  higherLineWidth: 1,
  lowerLineColor: '#FF5252',
  lowerLineStyle: LineType.Simple,
  lowerLineWidth: 1
}

export const defaultBarOptions = {
  thinBars: false,
  upColor: '#a5d6a7',
  downColor: '#e57373',
  openVisible: true
}

export const defaultStatsChartOptions = {
  ...defaultChartOptions,
  priceScale: {
    position: 'none',
    mode: 0
  },
  timeScale: {
    barSpacing: 3,
    rightOffset: 5,
    lockVisibleTimeRangeOnResize: true,
    rightBarStaysOnScroll: true,
    borderColor: 'rgba(255, 255, 255, .2)',
    timeVisible: true
  }
}

export function getCustomColorsOptions(color?: string) {
  let textColor = color

  if (!textColor) {
    if (store.state.settings.textColor) {
      textColor = store.state.settings.textColor
    } else {
      textColor = store.state.settings.theme === 'light' ? '#111111' : '#f6f6f6'
    }
  }

  const borderColor = formatRgb({ ...toRgb(textColor), alpha: 0.2 })

  const crossHairColor = store.state.settings.theme === 'light' ? 'rgba(0, 0, 0, .25)' : 'rgba(255, 255, 255, .25)'

  const customColorsOptions = {
    crosshair: {
      vertLine: {
        color: crossHairColor
      },
      horzLine: {
        color: crossHairColor
      }
    },
    layout: {
      textColor: textColor,
      borderColor
    },
    priceScale: {
      borderColor
    },
    timeScale: {
      borderColor
    }
  }

  return customColorsOptions
}

export function getChartOptions(baseOptions: DeepPartial<ChartOptions>): DeepPartial<ChartOptions> {
  const chartOptions = Object.assign({}, baseOptions)

  const chartColorOptions = getCustomColorsOptions()

  for (const prop in chartColorOptions) {
    Object.assign(chartOptions[prop], chartColorOptions[prop])
  }

  return chartOptions
}

export const plotTypesMap = {
  cloudarea: 'cloud-area'
}

export const defaultPlotsOptions = {
  line: defaultLineOptions,
  area: defaultAreaOptions,
  candlestick: defaultCandlestickOptions,
  'cloud-area': defaultCloudAreaOptions,
  bar: defaultBarOptions,
  histogram: defaultHistogramOptions
}
