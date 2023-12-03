/**
 * Aggr allow to mix multiple coins in the same chart
 * - some may have historical data available
 * - some may have partial historical data
 * - some may not have any
 * - some may be tracked in another module on the same workspace
 *
 * The goal of this feature is to prepend the initial known price of each coin at the beginning of the chart
 * Helps prevent large price spikes ("dildos") in the chart when real-time data becomes available.
 *
 * Note: Usefull for realtime, this feature might lead to inaccurate past prices, as it injects recent prices at the start of the chart
 * Not used for single cryptocurrency charts (composite price) due to potential inaccuracy of past price.
 */

import aggregatorService from '@/services/aggregatorService'
import { parseMarket } from '@/services/productsService'
import { resetBar } from './bars'
import { HistoricalResponse } from '@/services/historicalService'
import { MarketsBars } from './chart.d'

export interface PrependState {
  bars: MarketsBars
  time: number
}

/**
 * Cleanup unsed bars
 * @param prepend The current state containing market bars data.
 * @param marketFilters Contain all markets linked on the chart
 */
export function filterPrependedBars(
  prepend: PrependState,
  marketFilters: { [market: string]: boolean }
) {
  for (const market in prepend.bars) {
    if (typeof marketFilters[market] === 'undefined') {
      delete prepend.bars[market]
    }
  }
}

/**
 * Updates the PrependState with initial price data from historical market data.
 * @param prepend The current state containing market bars data.
 * @param historicalResponse The response object containing initial prices for various markets.
 */
export function registerPrependFromHistorical(
  prepend: PrependState,
  historicalResponse: HistoricalResponse
) {
  for (const market in historicalResponse.initialPrices) {
    if (prepend.bars[market]) {
      prepend.bars[market].open =
        prepend.bars[market].high =
        prepend.bars[market].low =
        prepend.bars[market].close =
          historicalResponse.initialPrices[market]
    } else {
      const [exchange, pair] = parseMarket(market)
      prepend.bars[market] = {
        ...resetBar({
          close: historicalResponse.initialPrices[market]
        }),
        pair: pair,
        exchange: exchange
      }
    }
  }
}

/**
 * Adds a new market bar to the PrependState based on real-time price data.
 * @param prepend The current state to update.
 * @param market The market identifier.
 * @param exchange The exchange identifier.
 * @param pair The trading pair identifier.
 * @param price The real-time price.
 */
export async function registerPrependFromRealtime(
  prepend: PrependState,
  market: string,
  exchange: string,
  pair: string,
  price: number
) {
  prepend.bars[market] = {
    ...resetBar({
      close: price
    }),
    pair: pair,
    exchange: exchange,
    cbuy: 1,
    csell: 1
  }
}

/**
 * Retrieve known prices from the shared aggregator, through the tickers event
 * @param prepend The current state containing market bars data.
 * @param filters A map of market identifiers to boolean values for filtering.
 */
export async function getPrependFromTickers(
  prepend: PrependState,
  filters: { [market: string]: boolean }
) {
  const tickers = await aggregatorService.getAllTickers()

  for (const market in tickers) {
    const price = tickers[market].price

    if (!price || typeof filters[market] === 'undefined') {
      continue
    }

    const [exchange, pair] = parseMarket(market)

    prepend.bars[market] = {
      time: prepend.time,
      close: price,
      high: price,
      low: price,
      open: price,
      exchange: exchange,
      pair: pair
    }
  }
}

/**
 * Retrieves the set of bars ready to be injected at the beginning of the chart
 * @param prepend The current state containing initial market bars data.
 * @param time The first timestamp on the chart
 * @returns Set of bars
 */
export function getPrependBars(prepend: PrependState, time: number) {
  if (prepend.time === time) {
    return prepend.bars
  }

  for (const market in prepend.bars) {
    prepend.bars[market].time = time
  }

  prepend.time = time

  return prepend.bars
}
