import ChartController from '.'
import * as TV from 'lightweight-charts'
import { formatAmount, formatPrice } from '../../../services/productsService'

export function onCrosshair(this: ChartController, param: TV.MouseEventParams) {
  let x

  if (
    param &&
    param.time &&
    param.point.x > 0 &&
    param.point.x < this.chartElement.clientWidth
  ) {
    x = param.point.x
  }

  if (this._lastCrosshairX === x) {
    return
  }

  this._lastCrosshairX = x

  for (let i = 0; i < this.indicators.length; i++) {
    const indicator = this.indicators[i]

    if (!indicator.meta.plots.length) {
      continue
    }

    const legendId = this.paneId + indicator.id

    if (!this._legendElements[legendId]) {
      continue
    }

    if (!x) {
      continue
    }

    let text = ''

    for (let j = 0; j < indicator.apis.length; j++) {
      if (j > 10) {
        break
      }

      const api = this.apis[indicator.apis[j]]

      const data = param.seriesPrices.get(api)

      if (text.length) {
        text += '\u00a0|\u00a0'
      }

      if (!data) {
        text += 'na'
        continue
      }

      const formatFunction =
        indicator.options.priceFormat &&
        indicator.options.priceFormat.type === 'volume'
          ? formatAmount
          : formatPrice

      if (typeof data === 'number') {
        text += formatFunction(data)
      } else if (data.close) {
        text += `O: ${formatFunction(data.open)} H: ${formatFunction(
          data.high
        )} L: ${formatFunction(data.low)} C: ${formatFunction(data.close)}`
      }
    }

    this._legendElements[legendId].textContent = text
  }
}
