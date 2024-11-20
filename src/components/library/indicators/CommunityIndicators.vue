<template>
  <div class="community-indicators">
    <Loader v-if="isLoading" class="community-indicators__loader" />
    <transition name="transition-height-scale">
      <div v-if="!isLoading" class="community-indicators__wrapper">
        <LibraryIncentive />
        <SearchBar v-model="query" class="community-indicators__search-bar">
          <Btn @click="getIndicators" class="-text -small">
            <i class="icon-refresh"></i>
          </Btn>
        </SearchBar>
        <IndicatorTable
          class="table--inset"
          :indicators="indicators"
          :query="query"
          show-author
          @selected="onSelected"
        />
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import Btn from '@/components/framework/Btn.vue'
import Loader from '@/components/framework/Loader.vue'
import SearchBar from '@/components/framework/SearchBar.vue'
import IndicatorTable from '@/components/library/indicators/IndicatorTable.vue'
import LibraryIncentive from '@/components/library/LibraryIncentive.vue'
import store from '@/store'
import { onMounted, ref } from 'vue'

// Define emits
const emit = defineEmits<{
  (e: 'selected', indicator: any): void
}>()

// Module-level cache to persist data across component instances
let CACHE: any[] = []

// Reactive state
const indicators = ref<any[]>(CACHE)
const query = ref<string>('')
const isLoading = ref<boolean>(false)

// Methods

/**
 * Fetches indicators from the server and updates the cache and reactive state.
 */
const getIndicators = async () => {
  isLoading.value = true

  try {
    const response = await fetch(
      `${import.meta.env.VITE_APP_LIB_URL}library/indicators`
    )
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    CACHE = data
    indicators.value = CACHE
  } catch (error: any) {
    console.error('Failed to fetch indicators:', error)
    store.dispatch('app/showNotice', {
      type: 'error',
      title: 'Failed to fetch indicators'
    })
  } finally {
    isLoading.value = false
  }
}

/**
 * Handles the selection of an indicator from the IndicatorTable.
 * @param {any} indicator - The selected indicator object.
 */
const onSelected = (indicator: any) => {
  emit('selected', indicator)
}

// Lifecycle Hook

/**
 * On component mount, fetch indicators if the cache is empty.
 */
onMounted(async () => {
  if (CACHE.length === 0) {
    await getIndicators()
  }
})
</script>

<style lang="scss" scoped>
.community-indicators {
  &__loader {
    margin-top: 2rem;
  }

  &__wrapper {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  &__search-bar {
    order: 0;
  }
}
</style>
