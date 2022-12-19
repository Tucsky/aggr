import ChartController from '.'
import { floorTimestampToTimeframe } from '../../../utils/helpers'
import { Renderer } from './types'

export function createRenderer(
  this: ChartController,
  timestamp,
  indicatorsIds?: string[]
) {
  timestamp = floorTimestampToTimeframe(timestamp, this.timeframe)

  const renderer: Renderer = {
    timestamp: timestamp,
    localTimestamp: timestamp + this.timezoneOffset,
    timeframe: this.timeframe,
    timeframeType: this.timeframeType,
    length: 1,
    indicators: {},
    sources: {},

    bar: {
      vbuy: 0,
      vsell: 0,
      cbuy: 0,
      csell: 0,
      lbuy: 0,
      lsell: 0,
      empty: true
    }
  }

  /*this.loadedIndicators = this.loadedIndicators.sort((a, b) => {
    const referencesA = a.model ? a.model.references.length : 0
    const referencesB = b.model ? b.model.references.length : 0
    return referencesA - referencesB
  })*/

  for (const indicator of this.indicators) {
    if (
      (indicatorsIds && indicatorsIds.indexOf(indicator.id) === -1) ||
      indicator.options.visible === false
    ) {
      continue
    }

    this.bindIndicator(indicator, renderer)
  }

  return renderer
}
