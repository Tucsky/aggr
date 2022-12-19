import store from '@/store'
import { formatRgb, toRgb } from 'color-fns'
import {
  ChartOptions,
  DeepPartial,
  LineType,
  LineWidth
} from 'lightweight-charts'

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
    text: '',
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
    barSpacing: 4,
    minBarSpacing: 0,
    rightOffset: 12,
    lockVisibleTimeRangeOnResize: false,
    borderVisible: true,
    borderColor: 'rgba(255, 255, 255, .2)',
    visible: true,
    timeVisible: true,
    secondsVisible: true
  },
  rightPriceScale: {
    borderColor: 'rgba(255, 255, 255, .2)'
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

export const defaultBaselineOptions = {
  topFillColor1: 'rgba(38, 166, 154, 0.28)',
  topFillColor2: 'rgba(38, 166, 154, 0.05)',
  topLineColor: 'rgba(38, 166, 154, 1)',
  bottomFillColor1: 'rgba(239, 83, 80, 0.05)',
  bottomFillColor2: 'rgba(239, 83, 80, 0.28)',
  bottomLineColor: 'rgba(239, 83, 80, 1)',
  lineWidth: 1
}

export const defaultHistogramOptions = {
  color: '#c3a87a'
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

export const defaultBrokenAreaOptions = {
  color: 'rgba(76,175,80,0.1)'
}

export const defaultBarOptions = {
  thinBars: false,
  upColor: '#a5d6a7',
  downColor: '#e57373',
  openVisible: true
}

export const defaultStatsChartOptions = {
  ...defaultChartOptions,
  rightPriceScale: {
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

export const plotTypesMap = {
  cloudarea: 'cloud-area',
  brokenarea: 'broken-area'
}

export const defaultPlotsOptions = {
  line: defaultLineOptions,
  area: defaultAreaOptions,
  candlestick: defaultCandlestickOptions,
  baseline: defaultBaselineOptions,
  'cloud-area': defaultCloudAreaOptions,
  'broken-area': defaultBrokenAreaOptions,
  bar: defaultBarOptions,
  histogram: defaultHistogramOptions
}

export function getChartCustomColorsOptions(color?: string) {
  let textColor = color

  if (!textColor) {
    if (store.state.settings.textColor) {
      textColor = store.state.settings.textColor
    } else {
      textColor = store.state.settings.theme === 'light' ? '#111111' : '#f6f6f6'
    }
  }

  const borderColor = formatRgb({ ...toRgb(textColor), alpha: 0.2 })

  const crossHairColor =
    store.state.settings.theme === 'light'
      ? 'rgba(0, 0, 0, .25)'
      : 'rgba(255, 255, 255, .25)'

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
    rightPriceScale: {
      borderColor
    },
    timeScale: {
      borderColor
    }
  }

  return customColorsOptions
}

export function getChartOptions(
  baseOptions: DeepPartial<ChartOptions>
): DeepPartial<ChartOptions> {
  const chartOptions = Object.assign({}, baseOptions)

  const chartColorOptions = getChartCustomColorsOptions()

  for (const prop in chartColorOptions) {
    Object.assign(chartOptions[prop], chartColorOptions[prop])
  }

  return chartOptions
}

export function getDefaultIndicatorOptionValue(
  key: string,
  plotTypes: string[]
) {
  let value

  if (plotTypes) {
    for (const type of plotTypes) {
      if (typeof defaultPlotsOptions[type][key] !== 'undefined') {
        return defaultPlotsOptions[type][key]
      }
    }
  }

  if (
    typeof value === 'undefined' &&
    typeof defaultSerieOptions[key] !== 'undefined'
  ) {
    return defaultSerieOptions[key]
  }

  if (typeof value === 'undefined' && /length$/i.test(key)) {
    return 14
  }

  if (typeof value === 'undefined' && /color$/i.test(key)) {
    return '#c3a87a'
  }

  if (typeof value === 'undefined' && /width$/i.test(key)) {
    return 1
  }

  return value
}

export function getIndicatorOptionValue(
  paneId: string,
  indicatorId: string,
  key: string,
  plotTypes?: string[]
): any {
  let preferedValue

  if (
    typeof store.state[paneId].indicators[indicatorId].options[key] !==
    'undefined'
  ) {
    preferedValue = store.state[paneId].indicators[indicatorId].options[key]
  }

  const defaultValue = getDefaultIndicatorOptionValue(key, plotTypes)

  if (typeof preferedValue !== 'undefined') {
    if (
      preferedValue &&
      typeof preferedValue === 'object' &&
      defaultValue &&
      typeof defaultValue === 'object'
    ) {
      return Object.assign({}, defaultValue, preferedValue)
    } else {
      return preferedValue
    }
  } else if (typeof defaultValue !== 'undefined') {
    return defaultValue
  }

  return null
}
