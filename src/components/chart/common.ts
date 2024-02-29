import { floorTimestampToTimeframe } from '@/utils/helpers'
import Chart from './chart'
import { Time } from 'lightweight-charts'
import store from '@/store'
import { ensureIndexedProducts, resolvePair } from '@/services/productsService'

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

    if (x && y) {
      controlledCharts[i].isSyncingCrosshair = true
      controlledCharts[i].chartInstance.setCrosshair(x, y, true)
    } else if (controlledCharts[i].isSyncingCrosshair) {
      controlledCharts[i].isSyncingCrosshair = false
      controlledCharts[i].chartInstance.setCrosshair(null, null, null)
    }
  }
}

/*
{
  "currency_code": "USDT",
  "exchange": "KUCOIN",
  "base_currency": "JASMY",
  "type": "spot",
  "id": "KUCOIN:JASMYUSDT"
}
*/
export async function syncMarket(market) {
  await ensureIndexedProducts()
  const markets = await resolvePair(market.base_currency, market.currency_code)

  for (const paneId of store.state.panes.syncedWithParentFrame) {
    if (!store.state[paneId]) {
      continue
    }

    store.dispatch('panes/setMarketsForPane', {
      id: paneId,
      markets
    })
  }
}
