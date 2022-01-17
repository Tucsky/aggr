import store from '@/store'
import { ProductsData, ProductsStorage } from '@/types/test'
import aggregatorService from './aggregatorService'
import workspacesService from './workspacesService'

const promisesOfProducts = []

export const indexedProducts = []

export function saveProducts(storage: ProductsStorage) {
  console.log(`[products.${storage.exchange}] saving products`, storage.data)
  storage.timestamp = Date.now()

  workspacesService.saveProducts(storage)
}

export async function indexProducts(exchangeId: string, productsData: ProductsData, showNotice?: boolean) {
  let products = []

  if (productsData) {
    if (Array.isArray(productsData)) {
      products = productsData
    } else {
      products = productsData.products
    }
  }

  if (showNotice) {
    store.dispatch('app/showNotice', {
      title: `Fetched ${products.length} products on ${exchangeId}`,
      type: 'success'
    })
  }

  store.dispatch('exchanges/indexExchangeProducts', {
    exchangeId,
    symbols: products || []
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
      indexProducts(exchangeId, productsData, true)
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

export async function getStoredProductsOrFetch(id: string, endpoints: string[], forceFetch?: boolean): Promise<ProductsData> {
  let productsData: ProductsData

  console.debug(`[products.${id}] reading stored products`)
  const storage = await workspacesService.getProducts(id)

  if (!forceFetch && storage && Date.now() - storage.timestamp < 1000 * 60 * 60 * 24 * 7) {
    console.debug(`[products.${id}] using products exchange storage`)

    productsData = storage.data
  } else {
    console.debug(`[products.${id}] fetch products using provided endpoints`)

    productsData = await fetchProducts(id, endpoints)
  }

  if (productsData) {
    if (!store.state.exchanges[id].fetched) {
      store.commit('exchanges/SET_FETCHED', id)
    }

    indexProducts(id, productsData, forceFetch)
  }

  return productsData
}

export function requestProducts(exchangeId: string) {
  if (promisesOfProducts[exchangeId]) {
    console.debug(`[products.${exchangeId}] use promise of products`)
    return promisesOfProducts[exchangeId]
  }

  promisesOfProducts[exchangeId] = aggregatorService.dispatchAsync({
    op: 'fetchExchangeProducts',
    data: { exchangeId }
  })

  return promisesOfProducts[exchangeId]
}
