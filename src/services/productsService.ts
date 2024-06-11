import store from '@/store'
import { ProductsData, ProductsStorage } from '@/types/types'
import { PRODUCTS_EXPIRES_AFTER } from '@/utils/constants'
import { getApiUrl } from '../utils/helpers'
import aggregatorService from './aggregatorService'
import workspacesService from './workspacesService'

const COINBASE_INTX_REGEX = /-INTX$/
const BITFINEX_PERP_REGEX = /F0$/
const BITFINEX_FUTURES_REGEX = /(.*)F0:(\w+)F0/
const BITFINEX_UST_REGEX = /UST($|F0)/
const HUOBI_FUTURES_REGEX = /_(CW|CQ|NW|NQ)$/
const UNDERSCORE_REGEX = /_/
const DASH_REGEX = /-/
const DASH_SPOT_REGEX = /-SPOT$/
const SWAP_OR_PERP_REGEX = /(-|_)swap$|(-|_|:)perp/i
const TWO_DIGITS_REGEX = /\d{2}/
const KRAKEN_FUTURES_REGEX = /(PI|FI|PF)_/
const HUOBI_SUFFIXES_REGEX = /_CW|_CQ|_NW|_NQ/i
const DERIBIT_PERP_REGEX = /_(\w+)-PERPETUAL/i
const KUCOIN_SUFFIX_REGEX = /M$/
const PERP_QUOTE_REGEX = /-PERP(ETUAL)?/i
const XBT_BASE_REGEX = /xbt$|^xbt/i
const PERP_SUFFIX_REGEX = /[^a-z0-9](perp|swap|perpetual)$/i
const DIGIT_PREFIX_REGEX = /[^a-z0-9]\d+$/i
const SYMBOL_DELIMITER_REGEX = /[-_/:]/
const EVERYTHING_BINANCE_REGEX = /BINANCE/
const REVERSE_MATCH_REGEX = /(\w+)[^a-z0-9]/i
const COMMON_FUTURES_SUFFIX_REGEX = /[HUZ_-]\d{2}/
const UNDERSCORE_ANYTHING_REGEX = /_.*/
const PARSE_MARKET_REGEX = /([^:]*):(.*)/

const stablecoins = [
  'USDT',
  'USDC',
  'TUSD',
  'BUSD',
  'USDD',
  'USDK',
  'USDP',
  'FDUSD',
  'UST'
]

const normalStablecoinLookup = /^U/

const normalStablecoins = stablecoins.filter(s =>
  normalStablecoinLookup.test(s)
)

const reverseStablecoins = stablecoins.filter(
  s => !normalStablecoinLookup.test(s)
)

const currencies = ['EUR', 'USD', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNH']

const genericQuoteCurrencyLookup = new RegExp(
  `[a-z]*(${currencies.join('|')})[a-z]?$`,
  'i'
)
const reverseStablecoinPairLookup = new RegExp(
  `(\\w{3,})(${reverseStablecoins.join('|')})$`,
  'i'
)
const standardCurrencyPairLookup = new RegExp(
  `(\\w{3})?(${currencies.join('|')})[a-z]?$`,
  'i'
)
const currencyPairLookup = new RegExp(
  `^([A-Z0-9]{2,})[-/:]?(${currencies.join('|')})$`
)

// use 2+ caracters symbol for normal stablecoins, and 3+ for reversed
// not infallible but avoids coin with symbol finishing with T or B to be labeled as TUSD or BUSD quoted markets
const stablecoinPairLookup = new RegExp(
  `^([A-Z0-9]{2,})[-/:_]?(${normalStablecoins.join(
    '|'
  )})$|^([A-Z0-9]{3,})[-/:_]?(${reverseStablecoins.join('|')})$`
)
const simplePairLookup = new RegExp(`^([A-Z0-9]{2,})[-/_]?([A-Z0-9]{3,})$`)

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

  if (storage) {
    return storage
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
    let endpoint: {
      url: string
      method: string
      data?: string
      proxy?: boolean
    }

    if (typeof instruction === 'string') {
      endpoint = {
        url: instruction,
        method: 'GET'
      }
    } else {
      endpoint = instruction
    }

    if (
      endpoint.proxy !== false &&
      import.meta.env.VITE_APP_PROXY_URL &&
      !/^https:\/\/raw.githubusercontent.com\//.test(endpoint.url)
    ) {
      endpoint.url = import.meta.env.VITE_APP_PROXY_URL + endpoint.url
    }

    try {
      const json = await fetch(endpoint.url, {
        method: endpoint.method,
        body: endpoint.data
      }).then(response => response.json())

      data[endpoints.indexOf(instruction)] = json
    } catch (error) {
      console.error(`[${exchangeId}] couldn't parse non-json products`, error)

      data[endpoints.indexOf(instruction)] = null
    }
  }

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
  let productsStorage: ProductsStorage
  let productsData: ProductsData

  if (
    forceFetch ||
    !(productsStorage = await getExchangeStoredProductsData(exchangeId)) ||
    Date.now() - productsStorage.timestamp > PRODUCTS_EXPIRES_AFTER
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
    productsData = productsStorage.data
  }

  return productsData
}

export function stripStablePair(pair) {
  return pair
    .replace(reverseStablecoinPairLookup, '$1USD')
    .replace(standardCurrencyPairLookup, '$1$2')
}

export function stripStableQuote(quote) {
  return quote.replace(genericQuoteCurrencyLookup, '$1')
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
  return market.match(PARSE_MARKET_REGEX).slice(1, 3)
}

export function getMarketProduct(exchangeId, symbol, noStable?: boolean) {
  const id = exchangeId + ':' + symbol

  let type = 'spot'

  if (COMMON_FUTURES_SUFFIX_REGEX.test(symbol)) {
    type = 'future'
  } else if (exchangeId === 'BINANCE_FUTURES' || exchangeId === 'DYDX') {
    type = 'perp'
  } else if (exchangeId === 'COINBASE' && COINBASE_INTX_REGEX.test(symbol)) {
    type = 'perp'
  } else if (exchangeId === 'BITFINEX' && BITFINEX_PERP_REGEX.test(symbol)) {
    type = 'perp'
  } else if (exchangeId === 'HUOBI' && HUOBI_FUTURES_REGEX.test(symbol)) {
    type = 'future'
  } else if (exchangeId === 'BITMART' && !UNDERSCORE_REGEX.test(symbol)) {
    type = 'perp'
  } else if (exchangeId === 'HUOBI' && DASH_REGEX.test(symbol)) {
    type = 'perp'
  } else if (exchangeId === 'BYBIT' && !DASH_SPOT_REGEX.test(symbol)) {
    if (TWO_DIGITS_REGEX.test(symbol)) {
      type = 'future'
    } else if (!DASH_SPOT_REGEX.test(symbol)) {
      type = 'perp'
    }
  } else if (exchangeId === 'BITMEX' || SWAP_OR_PERP_REGEX.test(symbol)) {
    if (TWO_DIGITS_REGEX.test(symbol)) {
      type = 'future'
    } else {
      type = 'perp'
    }
  } else if (exchangeId === 'PHEMEX' && symbol[0] !== 's') {
    type = 'perp'
  } else if (
    exchangeId === 'KRAKEN' &&
    UNDERSCORE_REGEX.test(symbol) &&
    type === 'spot'
  ) {
    type = 'perp'
  } else if (
    (exchangeId === 'BITGET' || exchangeId === 'MEXC') &&
    symbol.indexOf('_') !== -1
  ) {
    type = 'perp'
  } else if (exchangeId === 'KUCOIN' && symbol.indexOf('-') === -1) {
    type = 'perp'
  }

  let localSymbol = symbol

  if (exchangeId === 'BYBIT') {
    localSymbol = localSymbol.replace(DASH_SPOT_REGEX, '')
  } else if (exchangeId === 'KRAKEN') {
    localSymbol = localSymbol.replace(KRAKEN_FUTURES_REGEX, '')
  } else if (exchangeId === 'BITFINEX') {
    localSymbol = localSymbol
      .replace(BITFINEX_FUTURES_REGEX, '$1-$2')
      .replace(BITFINEX_UST_REGEX, 'USDT$1')
  } else if (exchangeId === 'HUOBI') {
    localSymbol = localSymbol.replace(HUOBI_SUFFIXES_REGEX, 'USD')
  } else if (exchangeId === 'DERIBIT') {
    localSymbol = localSymbol.replace(DERIBIT_PERP_REGEX, '$1')
  } else if (exchangeId === 'BITGET') {
    localSymbol = localSymbol
      .replace('USD_DMCBL', 'USD')
      .replace('PERP_CMCBL', 'USDC')
      .replace(UNDERSCORE_ANYTHING_REGEX, '')
  } else if (exchangeId === 'KUCOIN') {
    localSymbol = localSymbol.replace(KUCOIN_SUFFIX_REGEX, '')
  } else if (exchangeId === 'COINBASE' && type === 'perp') {
    localSymbol = localSymbol.replace(COINBASE_INTX_REGEX, '')
  }

  localSymbol = localSymbol
    .replace(XBT_BASE_REGEX, 'BTC')
    .replace(PERP_QUOTE_REGEX, '-USD')
    .replace(PERP_SUFFIX_REGEX, '')
    .replace(DIGIT_PREFIX_REGEX, '')
    .toUpperCase()

  let localSymbolAlpha = localSymbol.replace(SYMBOL_DELIMITER_REGEX, '')

  let match
  if (!EVERYTHING_BINANCE_REGEX.test(exchangeId)) {
    match = localSymbol.match(currencyPairLookup)
  }

  if (!match) {
    match = localSymbol.match(stablecoinPairLookup)

    if (!match) {
      match = localSymbolAlpha.match(simplePairLookup)
    }

    if (!match && (exchangeId === 'DERIBIT' || exchangeId === 'HUOBI')) {
      match = localSymbolAlpha.match(REVERSE_MATCH_REGEX)

      if (match) {
        match[2] = match[1]
      }
    }
  }
  if (!match) {
    return null
  }

  let base
  let quote

  if (match[1] === undefined && match[2] === undefined) {
    base = match[3]
    quote = match[4] || ''
  } else {
    base = match[1]
    quote = match[2] || ''
  }

  if (noStable) {
    localSymbolAlpha = stripStablePair(base + quote)
  } else {
    localSymbolAlpha = base + quote
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
  let products = import.meta.env.VITE_APP_API_SUPPORTED_PAIRS as
    | string
    | string[]
  if (products && products.length) {
    products = (products as string).split(',').map(market => market.trim())
  } else {
    products = []
  }

  if (!import.meta.env.VITE_APP_API_URL) {
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

    return cache.products
  } catch (error) {
    // console.error(error)
  }

  try {
    const products = await fetch(getApiUrl('products')).then(response =>
      response.json()
    )

    if (!products.length) {
      throw new Error('invalid supported markets list')
    }

    localStorage.setItem(
      'API_SUPPORTED_PAIRS',
      JSON.stringify({
        products,
        timestamp: now
      })
    )

    return products
  } catch (error) {
    console.error(error)
  }

  return products
}

export async function indexProducts(exchangeId: string, symbols: string[]) {
  console.debug(`[products.${exchangeId}] indexed ${symbols.length} products`)

  indexedProducts[exchangeId] = symbols.reduce((acc, symbol) => {
    const product = getMarketProduct(exchangeId, symbol)

    if (product) {
      acc.push(product)
    }

    return acc
  }, [])

  return indexedProducts[exchangeId]
}

export async function ensureIndexedProducts(filter?: {
  [id: string]: boolean
}) {
  let indexChanged = false

  for (const exchangeId of store.getters['exchanges/getExchanges']) {
    if (
      (filter && !filter[exchangeId]) ||
      store.state.exchanges[exchangeId].disabled === true ||
      indexedProducts[exchangeId]
    ) {
      continue
    }

    await indexProducts(exchangeId, await getExchangeSymbols(exchangeId))

    indexChanged = true
  }

  return indexChanged
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

      if (!product) {
        continue
      }

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

export async function resolvePair(base: string, quote: string) {
  const markets = []

  const stripedStableQuote = stripStableQuote(quote)

  for (const exchangeId in indexedProducts) {
    if (store.state.exchanges[exchangeId].disabled === true) {
      continue
    }

    for (const product of indexedProducts[exchangeId]) {
      if (
        product.base === base &&
        stripStableQuote(product.quote) === stripedStableQuote
      ) {
        markets.push(product.id)
      }
    }
  }

  return markets
}

export function formatAmount(amount, decimals?: number) {
  const negative = amount < 0

  amount = Math.abs(amount)

  if (amount >= 1000000000) {
    amount =
      +(amount / 1000000000).toFixed(isNaN(decimals) ? 1 : decimals) + ' B'
  } else if (amount >= 1000000) {
    amount = +(amount / 1000000).toFixed(isNaN(decimals) ? 1 : decimals) + ' M'
  } else if (amount >= 1000) {
    amount = +(amount / 1000).toFixed(isNaN(decimals) ? 1 : decimals) + ' K'
  } else {
    amount = +amount.toFixed(isNaN(decimals) ? 2 : decimals)
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
