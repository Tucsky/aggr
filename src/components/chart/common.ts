import { floorTimestampToTimeframe } from '@/utils/helpers'
import Chart from './chart'
import { Time } from 'lightweight-charts'

export const controlledCharts: Chart[] = []

export const components: {
  contextMenu?: any
  timeframeDropdown?: any
} = {}

export function syncCrosshair(params, originalPaneId = null) {
  for (let i = 0; i < controlledCharts.length; i++) {
    if (controlledCharts[i].paneId === originalPaneId) {
      continue
    }

    const priceApi = controlledCharts[i].getPriceApi()
    const timeScale = controlledCharts[i].chartInstance.timeScale()

    let x
    let y

    if (params.timestamp && timeScale) {
      x = timeScale.timeToCoordinate(
        floorTimestampToTimeframe(
          +params.timestamp,
          controlledCharts[i].timeframe,
          controlledCharts[i].isOddTimeframe
        ) as Time
      )
    }

    if (priceApi) {
      const chartPrice = controlledCharts[i].getPrice()

      y = priceApi.priceToCoordinate(chartPrice + chartPrice * params.change)
    }

    controlledCharts[i].chartInstance.setCrosshair(x, y, true)
  }
}
