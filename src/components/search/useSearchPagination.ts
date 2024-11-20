import { SearchFilters } from '@/store/settings'
import { ref, computed, ComputedRef, Ref } from 'vue'

export function useSearchPagination(
  dialogRef: Ref<any>,
  results: ComputedRef<any[]>,
  marketsByPair: ComputedRef<{
    [localPair: string]: string[]
  }>,
  filters: ComputedRef<SearchFilters>
) {
  const resultsPerPage = 25
  const page = ref(0)

  const maxPagesDisplayed = computed(() => {
    return dialogRef.value.currentSize === 'small'
      ? 3
      : dialogRef.value.currentSize === 'medium'
        ? 5
        : 10
  })

  const pagesCount = computed(() => {
    if (filters.value.normalize) {
      return Math.ceil(Object.keys(marketsByPair.value).length / resultsPerPage)
    }
    return Math.ceil(results.value.length / resultsPerPage)
  })

  const slicedGroups = computed(() => {
    if (filters.value.normalize) {
      const offset = page.value * resultsPerPage
      return Object.keys(marketsByPair.value).slice(
        offset,
        offset + resultsPerPage
      )
    }

    return []
  })

  const slicedResults = computed(() => {
    const offset = page.value * resultsPerPage

    if (filters.value.normalize) {
      return results.value
    }
    return results.value.slice(offset, offset + resultsPerPage)
  })

  const pagination = computed(() => {
    const halfMax = Math.floor(maxPagesDisplayed.value / 2)
    const start = Math.max(
      0,
      Math.min(page.value - halfMax, pagesCount.value - maxPagesDisplayed.value)
    )
    const end = Math.min(
      pagesCount.value - 1,
      start + maxPagesDisplayed.value - 1
    )
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  })

  function goPage(newPage) {
    if (newPage >= 0 && newPage < pagesCount.value) {
      page.value = newPage
    }
  }

  return {
    page,
    pagesCount,
    slicedResults,
    slicedGroups,
    pagination,
    goPage
  }
}
