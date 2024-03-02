import store from '@/store'
import { getColor } from '@/utils/colors'
import {
  ChartOptions,
  ColorType,
  DeepPartial,
  LineType,
  LineWidth
} from 'lightweight-charts'
import { ChartPaneState, IndicatorSettings } from '@/store/panesSettings/chart'
import merge from 'lodash.merge'
import { getCustomPlotOptions } from './buildUtils'

const computedDefaultValues = {}
const computedOptionTypes = {}

export const defaultChartOptions: DeepPartial<ChartOptions> = {
  crosshair: {
    vertLine: {
      color: 'rgba(255, 255, 255, .5)',
      width: 1 as LineWidth,
      style: 2,
      visible: true,
      labelVisible: true
    },
    horzLine: {
      color: 'rgba(255, 255, 255, .5)',
      width: 1 as LineWidth,
      style: 2,
      visible: true,
      labelVisible: true
    },
    mode: 0
  },
  watermark: {
    color: 'rgba(255,255,255, 0.1)',
    visible: false,
    text: '',
    horzAlign: 'center',
    vertAlign: 'center',
    fontFamily: 'Spline Sans Mono',
    fontStyle: '600'
  },
  layout: {
    background: {
      type: ColorType.Solid,
      color: 'transparent'
    },
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
    borderColor: 'rgba(255, 255, 255, .2)',
    visible: true,
    scaleMargins: {
      top: 0.1,
      bottom: 0.1
    }
  },
  leftPriceScale: {
    borderColor: 'rgba(255, 255, 255, .2)',
    visible: true,
    scaleMargins: {
      top: 0.1,
      bottom: 0.1
    }
  }
}

export const defaultSerieOptions = {
  crosshairMarkerVisible: false,
  lastValueVisible: false,
  priceLineVisible: false,
  baseLineVisible: false,
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
  priceLineColor: null,
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
  positiveLineColor: '#4CAF50',
  higherLineStyle: LineType.Simple,
  higherLineWidth: 1,
  negativeLineColor: '#FF5252',
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
    mode: 0
  },
  timeScale: {
    barSpacing: 3,
    rightOffset: 5,
    lockVisibleTimeRangeOnResize: true,
    rightBarStaysOnScroll: true,
    borderColor: 'transparent',
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

export function getChartFontSize(paneId) {
  let fontSize
  if (paneId) {
    const zoomMultiplier = store.state.panes.panes[paneId].zoom || 1
    const typeMultipler =
      store.state.panes.panes[paneId].type === 'chart' ? 1 : 0.75
    fontSize = 14 * zoomMultiplier * typeMultipler
  }
  return fontSize
}

export function getChartLayoutOptions(paneId?: string) {
  const styles = getComputedStyle(document.documentElement)
  const transColor = styles.getPropertyValue('--theme-background-100')

  const chartOptions = store.state[paneId] as ChartPaneState

  const customColorsOptions = {
    layout: {
      textColor:
        chartOptions?.textColor || styles.getPropertyValue('--theme-color-100'),
      borderColor: transColor,
      fontSize: getChartFontSize(paneId)
    }
  }
  return customColorsOptions
}

export function getChartCrosshairOptions() {
  const textColor = getComputedStyle(document.documentElement).getPropertyValue(
    '--theme-color-o50'
  )
  const backgroundColor = getComputedStyle(
    document.documentElement
  ).getPropertyValue('--theme-background-300')

  return {
    crosshair: {
      vertLine: {
        color: textColor,
        labelVisible: true
      },
      horzLine: {
        color: textColor,
        labelVisible: true,
        labelBackgroundColor: backgroundColor
      }
    }
  }
}

export function getChartWatermarkOptions(paneId) {
  const chartOptions = store.state[paneId] as ChartPaneState

  return {
    watermark: {
      color: chartOptions.watermarkColor,
      visible: chartOptions.showWatermark
    }
  }
}

export function getChartBorderOptions(paneId?: string) {
  const transColor = getComputedStyle(
    document.documentElement
  ).getPropertyValue('--theme-color-o20')

  if (!paneId) {
    return {
      timeScale: {
        borderColor: transColor
      },
      rightPriceScale: {
        borderColor: transColor
      },
      leftPriceScale: {
        borderColor: transColor
      }
    }
  }

  const chartOptions = store.state[paneId] as ChartPaneState

  return {
    timeScale: {
      visible: chartOptions.showTimeScale,
      borderColor: chartOptions.borderColor || transColor,
      borderVisible: chartOptions.showBorder
    },
    rightPriceScale: {
      visible: chartOptions.showRightScale,
      borderColor: chartOptions.borderColor || transColor,
      borderVisible: chartOptions.showBorder
    },
    leftPriceScale: {
      visible: chartOptions.showLeftScale,
      borderColor: chartOptions.borderColor || transColor,
      borderVisible: chartOptions.showBorder
    }
  }
}

export function getChartGridlinesOptions(paneId) {
  const chartOptions = store.state[paneId] as ChartPaneState

  return {
    grid: {
      vertLines: {
        color: chartOptions.verticalGridlinesColor,
        visible: chartOptions.showVerticalGridlines
      },
      horzLines: {
        color: chartOptions.horizontalGridlinesColor,
        visible: chartOptions.showHorizontalGridlines
      }
    }
  }
}

export function getChartBarSpacingOptions(paneId, chartWidth: number) {
  const chartOptions = store.state[paneId] as ChartPaneState
  const barSpacing = chartOptions.barSpacing || 3
  return {
    timeScale: {
      barSpacing: barSpacing,
      rightOffset: Math.ceil((chartWidth * 0.05) / barSpacing)
    }
  }
}

export function getChartScales(
  indicators: {
    [id: string]: IndicatorSettings
  },
  indicatorId = ''
) {
  return Object.values(indicators).reduce(
    (scales, indicator) => {
      if (
        indicator.id !== indicatorId &&
        indicator.options &&
        indicator.options.priceScaleId &&
        !scales[indicator.options.priceScaleId]
      ) {
        scales[indicator.options.priceScaleId] = `${
          indicator.name
        } (${indicator.id.slice(0, 8)}${indicator.id.length > 8 ? '...' : ''})`
      }

      return scales
    },
    {
      ...{ [indicatorId]: `Own scale 📍` },
      left: 'Left ←',
      right: 'Right →'
    }
  )
}

export function getChartOptions(
  baseOptions: DeepPartial<ChartOptions>,
  paneId?: string
): DeepPartial<ChartOptions> {
  const baseChartOptions = Object.assign({}, baseOptions)

  return merge(
    baseChartOptions,
    getChartLayoutOptions(paneId),
    getChartCrosshairOptions(),
    getChartBorderOptions(paneId)
  )
}

export function getChartCustomColorsOptions(paneId) {
  return merge(
    getChartLayoutOptions(paneId),
    getChartOptions(defaultChartOptions as any),
    getChartWatermarkOptions(paneId),
    getChartGridlinesOptions(paneId)
  )
}

export function getDefaultIndicatorOptionValue(
  key: string,
  plotTypes: string[],
  forceCompute?: boolean
) {
  if (!forceCompute && typeof computedDefaultValues[key] !== 'undefined') {
    return computedDefaultValues[key]
  }

  if (plotTypes) {
    for (const type of plotTypes) {
      if (typeof defaultPlotsOptions[type][key] !== 'undefined') {
        computedDefaultValues[key] = defaultPlotsOptions[type][key]
        return computedDefaultValues[key]
      }
    }
  }

  if (typeof defaultSerieOptions[key] !== 'undefined') {
    computedDefaultValues[key] = defaultSerieOptions[key]
    return defaultSerieOptions[key]
  }

  if (/length$/i.test(key)) {
    computedDefaultValues[key] = 14
    return computedDefaultValues[key]
  }

  if (/color$/i.test(key)) {
    computedDefaultValues[key] = getColor()
    return computedDefaultValues[key]
  }

  if (/width$/i.test(key)) {
    computedDefaultValues[key] = 1
    return computedDefaultValues[key]
  }

  return null
}

export function getIndicatorOptionType(
  key: string,
  plotTypes: string[],
  forceCompute?: any,
  value?: any
) {
  if (!forceCompute && typeof computedOptionTypes[key] !== 'undefined') {
    return computedOptionTypes[key]
  }

  if (typeof value === 'undefined') {
    value = getDefaultIndicatorOptionValue(key, plotTypes, forceCompute)
  }

  let type = 'text'

  let typedValue

  try {
    typedValue = JSON.parse(value)
  } catch (error) {
    typedValue = value
    // empty
  }

  if (
    typeof typedValue === 'boolean' ||
    /^(show|toggle|set|use)[A-Z]/.test(key)
  ) {
    type = 'checkbox'
  } else if (
    /color/i.test(key) ||
    /^rgba?/.test(typedValue) ||
    /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(typedValue)
  ) {
    type = 'color'
  } else if (typeof typedValue === 'number') {
    type = 'number'
  }

  computedOptionTypes[key] = type

  return type
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

export function getSerieOptions(indicator, plot, priceScale?) {
  if (priceScale && priceScale.priceFormat) {
    indicator.options.priceFormat = {
      ...indicator.options.priceFormat,
      ...priceScale.priceFormat
    }
  }

  const customPlotOptions = getCustomPlotOptions(indicator, plot)

  return {
    ...defaultSerieOptions,
    ...(defaultPlotsOptions[plot.type] || {}),
    ...indicator.options,
    ...(priceScale && priceScale.scaleMargins
      ? {
          scaleMargins: {
            top: priceScale.scaleMargins.top,
            bottom: priceScale.scaleMargins.bottom
          }
        }
      : {}),
    ...customPlotOptions
  }
}
