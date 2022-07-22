import store from '@/store'
import { ProductsData, ProductsStorage } from '@/types/types'
import { PRODUCTS_EXPIRES_AFTER } from '@/utils/constants'
import { getApiUrl } from '../utils/helpers'
import aggregatorService from './aggregatorService'
import workspacesService from './workspacesService'

const baseQuoteLookupKnown = new RegExp(
  `^([A-Z0-9]{3,})[-/:]?(USDT|USDC|TUSD|BUSD)$|^([A-Z0-9]{2,})[-/:]?(UST|EUR|USD)$`
)
const baseQuoteLookupOthers = new RegExp(`^([A-Z0-9]{2,})[-/]?([A-Z0-9]{3,})$`)
const baseQuoteLookupPoloniex = new RegExp(`^(.*)_(.*)$`)

const promisesOfProducts = {}

export const indexedProducts = {}

export const marketDecimals = {}

/**
 * 1. app send products request to worker
 * 2. worker send products request endpoints
 * 3. app call getStoredProductsOrFetch with worker's endpoints
 * 4. getStoredProductsOrFetch first try to retrieve from workspace storage
 * 5. if not found or forceFetch is true, getStoredProductsOrFetch will fetch using worker's endpoints
 * 6. aquired productsData are sent back to worker for assignation in the exchange class
 * @param exchangeId
 * @param {boolean} forceFetch
 * @returns
 */
export function requestExchangeProductsData(
  exchangeId: string,
  forceFetch = false
) {
  if (promisesOfProducts[exchangeId]) {
    console.debug(`[products.${exchangeId}] use promise of products`)
    return promisesOfProducts[exchangeId]
  }

  promisesOfProducts[exchangeId] = aggregatorService
    .dispatchAsync({
      op: 'fetchExchangeProducts',
      data: { exchangeId, forceFetch }
    })
    .then(data => {
      delete promisesOfProducts[exchangeId]
      return data
    })

  return promisesOfProducts[exchangeId]
}

async function getExchangeStoredProductsData(exchangeId: string) {
  console.debug(`[products.${exchangeId}] reading stored products`)

  const storage = await workspacesService.getProducts(exchangeId)

  if (storage && Date.now() - storage.timestamp < PRODUCTS_EXPIRES_AFTER) {
    return storage.data
  }

  return null
}

function saveExchangeProductsData(
  exchangeId: string,
  productsData: ProductsData
) {
  console.log(`[products.${exchangeId}] saving products`)

  return workspacesService.saveProducts({
    exchange: exchangeId,
    data: productsData,
    timestamp: Date.now()
  })
}

/**
 * 1. get raw symbols data from exchange API
 * 2. send response(s) to worker for formatting
 * 3. worker returns formatted products data (productsData)
 * 4. return productsData
 * @param {string} exchangeId exchange to fetch products for
 * @param {string[]} endpoints list of URL to fetch
 * @returns {Promise<ProductsData>}
 */
async function fetchExchangeProducts(
  exchangeId: string,
  endpoints: string[]
): Promise<ProductsData> {
  if (!Array.isArray(endpoints)) {
    endpoints = [endpoints]
  }

  console.debug(
    `[products.${exchangeId}] fetching latest products...`,
    endpoints
  )

  let data = []

  for (const instruction of endpoints) {
    let [url, method] = instruction.split('|')

    if (!method) {
      method = 'GET'
    }

    if (
      process.env.VUE_APP_PROXY_URL &&
      !/^https:\/\/raw.githubusercontent.com\//.test(url)
    ) {
      url = process.env.VUE_APP_PROXY_URL + url
    }

    try {
      const json = await fetch(url, {
        method
      }).then(response => response.json())

      data[endpoints.indexOf(instruction)] = json
    } catch (error) {
      console.error(`[${exchangeId}] couldn't parse non-json products`, error)

      data[endpoints.indexOf(instruction)] = null
    }
  }

  console.log(
    `[products.${exchangeId}] received API products response => format products`
  )

  if (data.indexOf(null) !== -1) {
    // today if one of the endpoint fail, consider they all failed
    // todo => accept this set of products without saving
    data = null
  } else if (data.length === 1) {
    data = data[0]
  }

  if (data) {
    const productsData = (await aggregatorService.dispatchAsync({
      op: 'formatExchangeProducts',
      data: {
        exchangeId: exchangeId,
        response: data
      }
    })) as ProductsStorage

    if (productsData) {
      return saveExchangeProductsData(exchangeId, productsData).then(
        () => productsData
      )
    }

    return null
  } else {
    return null
  }
}

export async function getStoredProductsOrFetch(
  exchangeId: string,
  endpoints: string[],
  forceFetch?: boolean
): Promise<ProductsData> {
  let productsData: ProductsData

  if (
    forceFetch ||
    !(productsData = await getExchangeStoredProductsData(exchangeId))
  ) {
    console.debug(
      `[products.${exchangeId}] fetch products using provided endpoints`
    )

    if (indexedProducts[exchangeId]) {
      delete indexedProducts[exchangeId]
    }

    productsData = await fetchExchangeProducts(exchangeId, endpoints)
  } else {
    console.debug(`[products.${exchangeId}] using products exchange storage`)
  }

  return productsData
}

export function stripStable(pair) {
  return pair.replace(
    /(\w{3})?(usd|ust|eur|jpy|gbp|aud|cad|chf|cnh)[a-z]?$/i,
    '$1$2'
  )
}

export async function getExchangeSymbols(
  exchangeId: string,
  forceFetch = false
) {
  let symbols

  const data = await requestExchangeProductsData(exchangeId, forceFetch)

  if (data) {
    if (Array.isArray(data)) {
      symbols = data
    } else {
      symbols = data.products
    }
  }

  if (!symbols) {
    symbols = []
  }

  return symbols
}

export function parseMarket(market: string) {
  return market.match(/([^:]*):(.*)/).slice(1, 3)
}

export function getMarketProduct(exchangeId, symbol, noStable?: boolean) {
  const id = exchangeId + ':' + symbol

  let type = 'spot'

  if (/[UZ_-]\d{2}/.test(symbol)) {
    type = 'future'
  } else if (exchangeId === 'BINANCE_FUTURES' || exchangeId === 'DYDX') {
    type = 'perp'
  } else if (exchangeId === 'BITFINEX' && /F0$/.test(symbol)) {
    type = 'perp'
  } else if (exchangeId === 'HUOBI' && /_(CW|CQ|NW|NQ)$/.test(symbol)) {
    type = 'future'
  } else if (exchangeId === 'HUOBI' && /-/.test(symbol)) {
    type = 'perp'
  } else if (exchangeId === 'BYBIT' && !/-SPOT$/.test(symbol)) {
    type = 'perp'
  } else if (
    exchangeId === 'BITMEX' ||
    /(-|_)swap$|(-|_|:)perp/i.test(symbol)
  ) {
    if (/\d{2}/.test(symbol)) {
      type = 'future'
    } else {
      type = 'perp'
    }
  } else if (exchangeId === 'PHEMEX' && symbol[0] !== 's') {
    type = 'perp'
  } else if (exchangeId === 'KRAKEN' && /_/.test(symbol) && type === 'spot') {
    type = 'perp'
  }

  let localSymbol = symbol

  if (exchangeId === 'BYBIT') {
    localSymbol = localSymbol.replace(/-SPOT$/, '')
  } else if (exchangeId === 'KRAKEN') {
    localSymbol = localSymbol.replace(/PI_/, '').replace(/FI_/, '')
  } else if (exchangeId === 'FTX' && type === 'future') {
    localSymbol = localSymbol.replace(/(\w+)-\d+$/, '$1-USD')
  } else if (exchangeId === 'BITFINEX') {
    localSymbol = localSymbol
      .replace(/(.*)F0:(\w+)F0/, '$1-$2')
      .replace(/UST($|F0)/, 'USDT$1')
  } else if (exchangeId === 'HUOBI') {
    localSymbol = localSymbol.replace(/_CW|_CQ|_NW|_NQ/i, 'USD')
  } else if (exchangeId === 'DERIBIT') {
    localSymbol = localSymbol.replace(/_(\w+)-PERPETUAL/i, '$1')
  }

  localSymbol = localSymbol
    .replace(/xbt$|^xbt/i, 'BTC')
    .replace(/-PERP(ETUAL)?/i, '-USD')
    .replace(/[^a-z0-9](perp|swap|perpetual)$/i, '')
    .replace(/[^a-z0-9]\d+$/i, '')
    .toUpperCase()

  let localSymbolAlpha = localSymbol.replace(/[-_/:]/, '')

  let match

  if (exchangeId === 'POLONIEX') {
    match = symbol.match(baseQuoteLookupPoloniex)

    if (match) {
      match[0] = match[2]
      match[2] = match[1]
      match[1] = match[0]

      localSymbolAlpha = match[1] + match[2]
    }
  } else {
    match = localSymbol.match(baseQuoteLookupKnown)

    if (!match) {
      match = localSymbolAlpha.match(baseQuoteLookupOthers)
    }
  }

  if (
    !match &&
    (exchangeId === 'DERIBIT' || exchangeId === 'FTX' || exchangeId === 'HUOBI')
  ) {
    match = localSymbolAlpha.match(/(\w+)[^a-z0-9]/i)

    if (match) {
      match[2] = match[1]
    }
  }

  let base
  let quote

  if (match) {
    if (match[1] === undefined && match[2] === undefined) {
      base = match[3]
      quote = match[4]
    } else {
      base = match[1]
      quote = match[2]
    }

    if (noStable) {
      localSymbolAlpha = stripStable(base + quote)
    } else {
      localSymbolAlpha = base + quote
    }
  }

  return {
    id,
    base,
    quote,
    pair: symbol,
    local: localSymbolAlpha,
    exchange: exchangeId,
    type
  }
}

export async function getApiSupportedMarkets() {
  let products = process.env.VUE_APP_API_SUPPORTED_PAIRS

  if (products && products.length) {
    products = products.split(',').map(market => market.trim())
  } else {
    products = []
  }

  if (!process.env.VUE_APP_API_URL) {
    return products
  }

  const now = Date.now()

  try {
    const cache = JSON.parse(localStorage.getItem('API_SUPPORTED_PAIRS'))

    if (!cache || !cache.products) {
      throw new Error('api supported pairs products cache is invalid')
    }

    if (!cache.products.length) {
      throw new Error('api supported pairs need a refresh')
    }

    if (now - cache.timestamp > 1000 * 60 * 5) {
      throw new Error('api supported pairs products cache has expired')
    }

    products = cache.products
  } catch (error) {
    await fetch(getApiUrl('products'))
      .then(response => response.json())
      .then(arr => {
        products = arr
      })
      .catch(err => {
        console.log(err)
      })

    localStorage.setItem(
      'API_SUPPORTED_PAIRS',
      JSON.stringify({ products, timestamp: now })
    )
  }

  return products
}

export async function indexProducts(exchangeId: string, symbols: string[]) {
  console.debug(`[products.${exchangeId}] indexed ${symbols.length} products`)

  indexedProducts[exchangeId] = symbols.map(product =>
    getMarketProduct(exchangeId, product)
  )

  return indexedProducts[exchangeId]
}

export async function ensureIndexedProducts() {
  for (const exchangeId of store.getters['exchanges/getExchanges']) {
    if (
      store.state.exchanges[exchangeId].disabled === true ||
      indexedProducts[exchangeId]
    ) {
      continue
    }

    await indexProducts(exchangeId, await getExchangeSymbols(exchangeId))
  }
}

export async function resolvePairs(pairs: string[]) {
  const markets = []

  const historicalMarkets = store.state.app.historicalMarkets
  const searchPreference = store.state.settings.searchTypes
  const historicalOnly = searchPreference.historical
  const searchTypes = {
    spot: searchPreference.spots,
    perp: searchPreference.perpetuals,
    future: searchPreference.futures
  }
  const allTypes = !(searchTypes.spot || searchTypes.perp || searchTypes.future)
  const searchQuotes = store.state.settings.searchQuotes
  const allQuotes = !Object.values(searchQuotes).find(filtered => !!filtered)

  for (const exchangeId of store.getters['exchanges/getExchanges']) {
    if (store.state.exchanges[exchangeId].disabled === true) {
      continue
    }

    const symbols = await getExchangeSymbols(exchangeId)

    for (const symbol of symbols) {
      const product = getMarketProduct(exchangeId, symbol, true)

      if (historicalOnly && historicalMarkets.indexOf(product.id) === -1) {
        continue
      }

      if (!allTypes && !searchTypes[product.type]) {
        continue
      }

      if (!allQuotes && !searchQuotes[product.quote]) {
        continue
      }

      if (pairs.indexOf(product.local) !== -1) {
        markets.push(product.id)
      }
    }
  }

  if (!markets.length) {
    return null
  }

  return markets
}

export function formatAmount(amount, decimals?: number) {
  const negative = amount < 0

  amount = Math.abs(amount)

  if (amount >= 1000000000) {
    amount =
      +(amount / 1000000000).toFixed(isNaN(decimals) ? 1 : decimals) + ' B'
  } else if (amount >= 1000000) {
    amount = +(amount / 1000000).toFixed(isNaN(decimals) ? 1 : decimals) + ' M'
  } else if (amount >= 1000) {
    amount = +(amount / 1000).toFixed(isNaN(decimals) ? 1 : decimals) + 'k'
  } else {
    amount = +amount.toFixed(2)
  }

  if (negative) {
    return '-' + amount
  } else {
    return amount
  }
}

export function countDecimals(value) {
  const parts = value.toString().split('.')

  if (parts.length === 2) {
    return parts[1].length
  }

  return 0
}

export function formatMarketPrice(price, market): string {
  if (typeof marketDecimals[market] === 'undefined') {
    return price
  }

  if (!price) {
    price = 0
  }

  return price.toFixed(marketDecimals[market])
}

export function formatPrice(price, precision?: number): number {
  if (!precision) {
    return parseInt(price)
  }

  if (!price) {
    price = 0
  }

  return price.toFixed(precision)
}
