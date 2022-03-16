import store from '@/store'
import { ProductsData, ProductsStorage } from '@/types/test'
import { PRODUCTS_EXPIRES_AFTER } from '@/utils/constants'
import aggregatorService from './aggregatorService'
import workspacesService from './workspacesService'

const baseRegex = '([a-z0-9]{2,})'
const quoteRegexKnown = '(eur|usd|usdt|usdc|tusd)'
const quoteRegexOthers = '([a-z0-9]{3,})'

const baseQuoteLookup1 = new RegExp(`^${baseRegex}[^a-z0-9]?${quoteRegexKnown}$`, 'i')
const baseQuoteLookup2 = new RegExp(`^${baseRegex}[^a-z0-9]?${quoteRegexOthers}$`, 'i')
const baseQuoteLookupPoloniex = new RegExp(`^(.*)_(.*)$`)

const promisesOfProducts = {}

export const indexedProducts = {}

export const marketDecimals = {}

export async function getProducts(exchangeId: string) {
  const storage = await workspacesService.getProducts(exchangeId)

  if (storage && Date.now() - storage.timestamp < PRODUCTS_EXPIRES_AFTER) {
    return storage.data
  }

  return null
}

export function saveProducts(storage: ProductsStorage) {
  console.log(`[products.${storage.exchange}] saving products`)
  storage.timestamp = Date.now()

  return workspacesService.saveProducts(storage)
}

export async function indexProducts(exchangeId: string, productsData: ProductsData, showNotice?: boolean) {
  let products

  if (!productsData) {
    productsData = await getProducts(exchangeId)
  }

  if (productsData) {
    if (Array.isArray(productsData)) {
      products = productsData
    } else {
      products = productsData.products
    }
  }

  if (!products) {
    products = []
  }

  if (showNotice) {
    store.dispatch('app/showNotice', {
      title: `Fetched ${products.length} products on ${exchangeId}`,
      type: 'success'
    })
  }

  console.debug(`[products.${exchangeId}] indexed ${products.length} products`)

  store.dispatch('exchanges/indexExchangeProducts', {
    exchangeId,
    symbols: products
  })
}

export async function fetchProducts(exchangeId: string, endpoints: string[]): Promise<ProductsData> {
  if (!Array.isArray(endpoints)) {
    endpoints = [endpoints]
  }

  console.debug(`[products.${exchangeId}] fetching latest products...`, endpoints)

  let data = []

  for (const instruction of endpoints) {
    let [url, method] = instruction.split('|')

    if (!method) {
      method = 'GET'
    }

    if (process.env.VUE_APP_PROXY_URL && !/^https:\/\/raw.githubusercontent.com\//.test(url)) {
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

  console.log(`[products.${exchangeId}] received API products response => format products`)

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
      //indexProducts(exchangeId, productsData, true)
      saveProducts({
        exchange: exchangeId,
        data: productsData
      })
      return productsData
    }

    return null
  } else {
    return null
  }
}

export async function getStoredProductsOrFetch(exchangeId: string, endpoints: string[], forceFetch?: boolean): Promise<ProductsData> {
  let productsData: ProductsData = await getProducts(exchangeId)

  console.debug(`[products.${exchangeId}] reading stored products`)

  if (!productsData || forceFetch) {
    console.debug(`[products.${exchangeId}] fetch products using provided endpoints`)

    if (indexProducts[exchangeId]) {
      delete indexProducts[exchangeId]
    }

    productsData = await fetchProducts(exchangeId, endpoints)
  } else {
    console.debug(`[products.${exchangeId}] using products exchange storage`)
  }

  if (productsData) {
    if (!store.state.exchanges[exchangeId].fetched) {
      store.commit('exchanges/SET_FETCHED', exchangeId)
    }

    //indexProducts(exchangeId, productsData, forceFetch)
  }

  return productsData
}

export function requestProducts(exchangeId: string, forceFetch = false) {
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
  } else if (exchangeId === 'BITMEX' || /(-|_)swap$|(-|_|:)perp/i.test(symbol)) {
    type = 'perp'
  } else if (exchangeId === 'PHEMEX' && symbol[0] !== 's') {
    type = 'perp'
  } else if (exchangeId === 'KRAKEN' && /PI_/.test(symbol)) {
    type = 'perp'
  }

  let localSymbol = symbol

  if (exchangeId === 'BYBIT') {
    localSymbol = localSymbol.replace(/-SPOT$/, '')
  }

  if (exchangeId === 'KRAKEN') {
    localSymbol = localSymbol.replace(/PI_/, '').replace(/FI_/, '')
  }

  if (exchangeId === 'BITFINEX') {
    localSymbol = localSymbol.replace(/(.*)F0:USTF0/, '$1USDT').replace(/UST$/, 'USDT')
  }

  if (exchangeId === 'HUOBI') {
    localSymbol = localSymbol.replace(/_CW|_CQ|_NW|_NQ/i, 'USD')
  }

  if (exchangeId === 'DERIBIT') {
    localSymbol = localSymbol.replace(/_(\w+)-PERPETUAL/i, '$1')
  }

  localSymbol = localSymbol
    .replace(/-PERP(ETUAL)?/i, 'USD')
    .replace(/[^a-z0-9](perp|swap|perpetual)$/i, '')
    .replace(/[^a-z0-9]\d+$/i, '')
    .replace(/[-_/:]/, '')
    .replace(/XBT/i, 'BTC')
    .toUpperCase()

  let match

  if (exchangeId === 'POLONIEX') {
    match = symbol.match(baseQuoteLookupPoloniex)

    if (match) {
      match[0] = match[2]
      match[2] = match[1]
      match[1] = match[0]

      localSymbol = match[1] + match[2]
    }
  } else {
    match = localSymbol.match(baseQuoteLookup1)

    if (!match) {
      match = localSymbol.match(baseQuoteLookup2)
    }
  }

  if (!match && (exchangeId === 'DERIBIT' || exchangeId === 'FTX' || exchangeId === 'HUOBI')) {
    match = localSymbol.match(/(\w+)[^a-z0-9]/i)

    if (match) {
      match[2] = match[1]
    }
  }

  let base
  let quote

  if (match) {
    base = match[1]
    quote = match[2]

    if (noStable) {
      localSymbol = base + quote.replace(/usd[a-z]/i, 'USD')
    }
  }

  return {
    id,
    base,
    quote,
    pair: symbol,
    local: localSymbol,
    exchange: exchangeId,
    type
  }
}

export function formatAmount(amount, decimals?: number) {
  const negative = amount < 0

  amount = Math.abs(amount)

  if (amount >= 1000000000) {
    amount = +(amount / 1000000000).toFixed(isNaN(decimals) ? 1 : decimals) + 'B'
  } else if (amount >= 1000000) {
    amount = +(amount / 1000000).toFixed(isNaN(decimals) ? 1 : decimals) + 'M'
  } else if (amount >= 100000) {
    amount = +(amount / 1000).toFixed(isNaN(decimals) ? 0 : decimals) + 'K'
  } else if (amount >= 1000) {
    amount = +(amount / 1000).toFixed(isNaN(decimals) ? 1 : decimals) + 'K'
  } else {
    amount = +amount.toFixed(4)
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

export function formatMarketPrice(price, market): number {
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
