import store from '@/store'
import { ProductsData, ProductsStorage } from '@/types/test'
import { progress } from '@/utils/helpers'
import aggregatorService from './aggregatorService'
import workspacesService from './workspacesService'

export function saveProducts(storage: ProductsStorage) {
  console.log(`[products.${storage.exchange}] saving products`, storage.data)
  storage.timestamp = +new Date()

  workspacesService.saveProducts(storage)
}

export async function indexProducts(exchangeId: string, productsData: ProductsData) {
  let products = []

  if (productsData) {
    if (Array.isArray(productsData)) {
      products = productsData
    } else {
      products = productsData.products
    }
  }

  store.dispatch('exchanges/indexExchangeProducts', {
    exchange: exchangeId,
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

    if (process.env.VUE_APP_PROXY_URL) {
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
      op: 'format-products',
      data: {
        exchange: exchangeId,
        data
      }
    })) as ProductsStorage

    if (productsData) {
      indexProducts(exchangeId, productsData)
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

export async function getProducts(exchangeId: string, endpoints?: string[]): Promise<ProductsData> {
  let productsData: ProductsData

  console.debug(`[products.${exchangeId}] reading stored products`)
  const storage = await workspacesService.getProducts(exchangeId)

  if (storage && +new Date() - storage.timestamp < 1000 * 60 * 60 * 24 * 7) {
    console.debug(`[products.${exchangeId}] using products exchange storage`)

    productsData = storage.data
  } else if (!endpoints) {
    console.debug(`[products.${exchangeId}] no storage + no endpoint = no products`)

    const payload = await aggregatorService.dispatchAsync({
      op: 'fetch-products',
      data: exchangeId
    })

    console.log('fetch-product payloed', payload)

    return null
  } else {
    console.debug(`[products.${exchangeId}] endpoint are known, gona fetch now`)

    progress(`fetching ${exchangeId}'s products`)

    productsData = await fetchProducts(exchangeId, endpoints)
  }

  if (productsData) {
    if (!store.state.exchanges[exchangeId].fetched) {
      store.commit('exchanges/SET_FETCHED', exchangeId)
    }

    indexProducts(exchangeId, productsData)
  }

  return productsData
}

export async function showIndexedProductsCount() {
  const count = Array.prototype.concat(...Object.values(store.state.app.indexedProducts)).length

  store.dispatch('app/showNotice', {
    id: 'fetch-products',
    type: 'success',
    title: `${count} markets indexed 🔥`
  })
}

export async function getAllProducts() {
  store.dispatch('app/showNotice', {
    id: 'fetch-products',
    title: 'Fetching the latest products...'
  })

  await aggregatorService.dispatchAsync({
    op: 'fetch-products'
  })

  this.showIndexedProductsCount()
}
