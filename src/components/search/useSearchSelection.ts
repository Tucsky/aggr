import dialogService from '@/services/oldDialogService'
import {
  indexedProducts,
  parseMarket,
  stripStableQuote
} from '@/services/productsService'
import store from '@/store'
import { Product } from '@/store/app'
import { SearchFilters } from '@/store/settings'
import { copyTextToClipboard } from '@/utils/helpers'
import {
  computed,
  ComputedRef,
  nextTick,
  onBeforeUnmount,
  onMounted,
  Ref,
  ref
} from 'vue'

const _selectedProducts: { [id: string]: Product } = {}

export function useSearchSelection(
  page: Ref<number>,
  activeIndex: Ref<number>,
  slicedResults: ComputedRef<any[]>,
  selectionRef: Ref<HTMLElement>,
  inputRef: Ref<HTMLInputElement>,
  filters: ComputedRef<SearchFilters>,
  submit: () => void
) {
  const query = ref('')
  const selection = ref<string[]>([])

  const copySelection = () => {
    copyTextToClipboard(selection.value.join(','))
    store.dispatch('app/showNotice', {
      id: 'products-clipboard',
      title: `Copied ${selection.value.length} product(s) to clipboard`
    })
  }

  const onPaste = (event: ClipboardEvent) => {
    if (document.activeElement && document.activeElement.tagName === 'INPUT') {
      return
    }
    const raw = event.clipboardData?.getData('text/plain') ?? ''
    const markets = raw.split(',').filter(a => /^.{3,}:.{4,32}$/.test(a))
    if (markets.length) {
      selection.value = markets
    }
  }

  const cacheSelectedProducts = (id?: string, clear = false) => {
    for (const market of selection.value) {
      if (id && market !== id) continue
      if (clear) {
        delete _selectedProducts[market]
        continue
      }
      const [exchange] = parseMarket(market)
      const product = indexedProducts[exchange]?.find(p => p.id === market)
      _selectedProducts[market] = product
      if (id) break
    }
  }

  const clearSelection = (event?: MouseEvent) => {
    if (
      event &&
      event.target &&
      (event.currentTarget as HTMLElement).tagName !== 'BUTTON' &&
      (event.target as HTMLElement).tagName !== 'BUTTON'
    ) {
      return
    }

    selection.value = []
    query.value = ''
    inputRef.value.focus()
    cacheSelectedProducts(null, true)
  }

  async function toggleMarkets(
    markets: string | string[],
    removeFromHistory = false
  ) {
    const scrollTop = selectionRef.value.scrollTop ?? 0

    if (!Array.isArray(markets)) {
      markets = [markets]
    }

    if (removeFromHistory) {
      store.commit('settings/REMOVE_SEARCH_HISTORY', markets)
      return
    }

    for (const market of markets) {
      toggleMarket(market)
    }

    await nextTick()
    inputRef.value.focus()
    if (selectionRef.value) {
      selectionRef.value.scrollTop = scrollTop
    }
  }

  function toggleMarket(market: string) {
    const index = selection.value.indexOf(market)
    if (index === -1) {
      selection.value.push(market)
      cacheSelectedProducts(market)
    } else {
      selection.value.splice(index, 1)
      cacheSelectedProducts(market, true)
    }
  }

  function onKeydown(event: KeyboardEvent) {
    if (dialogService.isDialogOpened('prompt')) {
      return false
    }
    switch (event.key) {
      case 'Enter':
        event.preventDefault()
        if (slicedResults.value[activeIndex.value]) {
          if (filters.value.normalize) {
            toggleMarkets(slicedResults.value[activeIndex.value].markets)
          } else {
            toggleMarkets([slicedResults.value[activeIndex.value].id])
          }
          if (activeIndex.value === 0) {
            activeIndex.value = -1
          }
        } else if (activeIndex.value === null || activeIndex.value === -1) {
          submit()
        }
        break
      case 'ArrowDown':
      case 'ArrowUp':
        if (event.key === 'ArrowUp') {
          activeIndex.value = Math.max(-1, activeIndex.value - 1)
        } else {
          if (activeIndex.value === null) {
            activeIndex.value = 0
          } else {
            activeIndex.value = Math.min(
              slicedResults.value.length - 1,
              activeIndex.value + 1
            )
          }
        }
        break
      case 'Backspace':
      case 'Delete':
        deleteLast()
        break
      case 'c':
        if (
          (event.ctrlKey || event.metaKey) &&
          !window.getSelection()?.toString().length
        ) {
          copySelection()
        }
        break
    }
  }

  function deleteLast() {
    if (!query.value.length && selection.value.length) {
      if (filters.value.normalize) {
        const lastPair = Object.keys(groupedSelection.value).pop()
        toggleMarkets(groupedSelection.value[lastPair])
      } else {
        selection.value.pop()
      }
    }
  }

  function addAll() {
    const normalized = filters.value.normalize
    const markets: string[] = []
    for (const result of slicedResults.value) {
      if (normalized) {
        markets.push(...result.markets)
      } else {
        markets.push(result.id)
      }
    }
    toggleMarkets(markets)
  }

  const groupedSelection = computed<{ [localPair: string]: string[] }>(() => {
    const _searchFilters = filters.value

    return selection.value.reduce((groups, market) => {
      const indexedProduct = _selectedProducts[market]

      let localPair = market

      if (indexedProduct) {
        if (indexedProduct && _searchFilters.mergeUsdt) {
          localPair =
            indexedProduct.base + stripStableQuote(indexedProduct.quote)
        } else {
          localPair = indexedProduct.base + indexedProduct.quote
        }
      }

      if (!groups[localPair]) {
        groups[localPair] = []
      }

      groups[localPair].push(market)

      return groups
    }, {})
  })

  const selectedProducts = computed(() => {
    return selection.value.map(
      market =>
        _selectedProducts[market] || {
          id: market,
          exchange: '',
          local: '',
          pair: ''
        }
    )
  })

  function onInput(event: Event) {
    page.value = 0
    query.value = (event.target as HTMLInputElement).value
    activeIndex.value = 0
  }

  onMounted(() => {
    document.addEventListener('paste', onPaste)
    document.addEventListener('keydown', onKeydown)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('paste', onPaste)
    document.removeEventListener('keydown', onKeydown)
  })

  return {
    query,
    selection,
    groupedSelection,
    selectedProducts,
    addAll,
    onInput,
    toggleMarkets,
    clearSelection,
    cacheSelectedProducts
  }
}
