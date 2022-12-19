import ChartController from '.'
import store from '../../../store'
import ScriptBuilder from '../scripts/scriptBuilder'
import { defaultPlotsOptions, defaultSerieOptions } from '../chartOptions'
import {
  BuildedIndicator,
  IndicatorApi,
  IndicatorMetadata,
  Renderer
} from './types'
import { camelize } from '../../../utils/helpers'

export function addPaneIndicators(this: ChartController) {
  for (const id in store.state[this.paneId].indicators) {
    this.addIndicator(id)
  }
}

export function getIndicator(id: string): BuildedIndicator {
  for (let i = 0; i < this.indicators.length; i++) {
    if (this.indicators[i].id === id) {
      return this.indicators[i]
    }
  }
}

export function addIndicator(this: ChartController, id) {
  if (this.getIndicator(id)) {
    return true
  }

  if (!store.state[this.paneId].indicators[id].meta) {
    this.buildIndicator(id)
  }

  const indicatorSettings = JSON.parse(
    JSON.stringify(store.state[this.paneId].indicators[id])
  )

  const meta: IndicatorMetadata = JSON.parse(indicatorSettings.meta)

  if (meta.references.length) {
    this.resolveReferences(meta.references)
  }

  const indicator: BuildedIndicator = {
    id,
    options: indicatorSettings.options || {},
    script: indicatorSettings.script,
    meta
  }

  this.createIndicatorSeries(indicator)

  this.indicators.push(indicator)

  return true
}

export function createIndicatorSeries(
  this: ChartController,
  indicator: BuildedIndicator
) {
  for (const plotId in indicator.meta.plots) {
    const plot = indicator.meta.plots[plotId]
    const apiMethodName = camelize('add-' + plot.type + '-series')
    const customPlotOptions = ScriptBuilder.getCustomPlotOptions(
      indicator,
      plot
    )
    const serieOptions = {
      ...defaultSerieOptions,
      ...(defaultPlotsOptions[plot.type] || {}),
      ...indicator.options,
      ...customPlotOptions
    }

    if (serieOptions.scaleMargins) {
      delete serieOptions.scaleMargins
    }

    const api = this.chartInstance[apiMethodName](serieOptions) as IndicatorApi

    api.id = plotId
    this.apis[api.id] = api
  }

  // ensure chart is aware of pricescale used by this indicator
  this.ensurePriceScale(indicator.options.priceScaleId, indicator)

  // attach indicator to active renderer
  this.bindIndicator(indicator, this.activeRenderer)
}

export function resolveReferences(this: ChartController, references: string[]) {
  for (let i = 0; i < references.length; i++) {
    if (!this.indicators[references[i]]) {
      this.addIndicator(references[i])
    }
  }
}

export function buildIndicator(this: ChartController, id) {
  try {
    const meta = ScriptBuilder.build(store.state[this.paneId].indicators, id)

    store.commit(`${this.paneId}/SET_INDICATOR_META`, {
      id,
      meta: meta
    })
  } catch (error) {
    console.error(
      `[chart/${this.paneId}/prepareIndicator] transpilation failed`
    )
    console.error(`\t->`, error)

    store.commit(this.paneId + '/SET_INDICATOR_ERROR', {
      id: id,
      error: error.message
    })

    throw error
  }
}

/**
 * rebuild the whole serie
 * @param {string} id serie id
 */
export function rebuildIndicator(this: ChartController, id: string) {
  this.removeIndicator(this.getIndicator(id))

  if (this.addIndicator(id)) {
    this.redrawIndicator(id)
  }
}

/**
 * redraw one specific indicator (and the series it depends on)
 * @param {string} indicatorId
 */
export function redrawIndicator(this: ChartController, indicatorId) {
  const indicator = this.getIndicator(indicatorId)

  this.clearIndicatorSeries(indicator)

  let bars = []

  for (const chunk of this.chartCache.chunks) {
    bars = bars.concat(chunk.bars)
  }

  const requiredIndicatorsIds = this.getReferencedIndicators(indicator)

  this.ensureIndicatorVisible(requiredIndicatorsIds)

  this.renderBars(bars, [...requiredIndicatorsIds, indicatorId])
}

/**
 * attach indicator copy of indicator model (incl. states of variables and functions)
 * @param {BuildedIndicator} indicator
 * @param {Renderer} renderer
 * @returns
 */
export function bindIndicator(
  this: ChartController,
  indicator: BuildedIndicator,
  renderer: Renderer
) {
  if (
    !renderer ||
    typeof renderer.indicators[indicator.id] !== 'undefined' ||
    !indicator.meta
  ) {
    return
  }

  renderer.indicators[indicator.id] =
    ScriptBuilder.getRendererIndicatorData(indicator)

  if (!this.activeRenderer || renderer === this.activeRenderer) {
    // update indicator series with plotoptions
    for (const plotId in renderer.indicators[indicator.id].plotsOptions) {
      this.apis[plotId].applyOptions(
        renderer.indicators[indicator.id].plotsOptions[plotId]
      )
    }

    // create function ready to calculate (& render) everything for this indicator
    try {
      indicator.adapter = ScriptBuilder.getAdapter(indicator.meta.output)
      indicator.silentAdapter = ScriptBuilder.getAdapter(
        indicator.meta.silentOutput
      )
    } catch (error) {
      this.unbindIndicator(indicator, renderer)

      throw error
    }
  }

  this.prepareRendererForIndicators(indicator, renderer)

  return indicator
}

/**
 * detach serie from renderer
 * @param {LoadedIndicator} indicator
 * @param {Renderer} renderer
 */
export function unbindIndicator(this: ChartController, indicator, renderer) {
  if (!renderer || typeof renderer.indicators[indicator.id] === 'undefined') {
    return
  }

  delete renderer.indicators[indicator.id]
}

export function refreshIndicatorsDependencies(this: ChartController) {
  this.marketsProps = {}

  const props = []

  for (const indicator of this.indicators) {
    for (const prop of indicator.meta.props) {
      if (props.indexOf(prop) === -1) {
        props.push(prop)
      }
    }

    for (const market in indicator.meta.markets) {
      if (!this.marketsProps[market]) {
        this.marketsProps[market] = []
      }

      for (const prop of indicator.meta.markets[market]) {
        if (this.marketsProps[market].indexOf(prop) === -1) {
          this.marketsProps[market].push(prop)
        }
      }
    }
  }

  for (const market in this.markets) {
    if (!this.marketsProps[market]) {
      this.marketsProps[market] = []
    }

    for (const prop of props) {
      if (this.marketsProps[market].indexOf(prop) === -1) {
        this.marketsProps[market].push(prop)
      }
    }
  }

  this.refreshChartDependencies()
}

export function refreshChartDependencies(this: ChartController) {
  const added = []
  const remaining = []

  for (const market in this.marketsProps) {
    for (const prop of this.marketsProps[market]) {
      const id = `${market}.${this.timeframe}.${prop}`

      const index = this.dependencies.indexOf(id)

      if (index !== -1) {
        remaining.push(this.dependencies.splice(index, 1)[0])
      } else if (index === -1) {
        added.push(this.dependencies.splice(index, 1)[0])
      }
    }
  }

  //const removed = this.dependencies.splice(0, this.dependencies.length)

  this.dependencies = remaining.concat(added)
}

export function prepareRendererForIndicators(
  this: ChartController,
  indicator: BuildedIndicator,
  renderer: Renderer
) {
  const markets = Object.keys(indicator.meta.markets)

  for (let j = 0; j < markets.length; j++) {
    if (!renderer.sources[markets[j]]) {
      renderer.sources[markets[j]] = {
        open: null,
        high: null,
        low: null,
        close: null
      }
    }

    const keys = indicator.meta.markets[markets[j]]

    if (keys.length) {
      for (let k = 0; k < keys.length; k++) {
        if (
          typeof renderer.sources[markets[j]][keys[k]] === 'undefined' &&
          keys[k] !== 'open' &&
          keys[k] !== 'high' &&
          keys[k] !== 'low' &&
          keys[k] !== 'close'
        ) {
          renderer.sources[markets[j]][keys[k]] = 0
        }
      }
    }
  }
}

/**
 * @param {LoadedIndicator} indicator indicator owning series
 */
export function clearIndicatorSeries(
  this: ChartController,
  indicator: BuildedIndicator
) {
  for (const apiId in indicator.meta.plots) {
    this.apis[apiId].removeAllPriceLines()
    this.apis[apiId].setData([])
  }
}

export function removeIndicator(
  this: ChartController,
  indicator: string | BuildedIndicator
) {
  if (typeof indicator === 'string') {
    indicator = this.getIndicator(indicator)
  }

  if (!indicator) {
    return
  }

  this.removeIndicatorSeries(indicator)

  // remove from active series model
  this.indicators.splice(this.indicators.indexOf(indicator), 1)
}

export function removeIndicatorSeries(
  this: ChartController,
  indicator: BuildedIndicator
) {
  // remove from chart instance (derender)
  for (const apiId in indicator.meta.plots) {
    this.chartInstance.removeSeries(this.apis[apiId])
    delete this.apis[apiId]
  }

  // unbind from activebar (remove serie meta data like sma memory etc)
  this.unbindIndicator(indicator, this.activeRenderer)

  const isPriceScaleDead =
    typeof this.indicators.find(
      i =>
        i.id !== indicator.id &&
        i.options.visible !== false &&
        i.options.priceScaleId === indicator.options.priceScaleId
    ) === 'undefined'

  if (isPriceScaleDead) {
    this.priceScales.splice(
      this.priceScales.indexOf(indicator.options.priceScaleId),
      1
    )
  }
}
