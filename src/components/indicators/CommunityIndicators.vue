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
          @selected="$emit('selected', $event)"
        />
      </div>
    </transition>
  </div>
</template>

<script>
import Btn from '@/components/framework/Btn.vue'
import Loader from '@/components/framework/Loader.vue'
import SearchBar from '@/components/framework/SearchBar.vue'
import IndicatorTable from '@/components/indicators/IndicatorTable.vue'
import LibraryIncentive from '@/components/library/LibraryIncentive.vue'
let CACHE = []

export default {
  name: 'CommunityIndicators',
  components: {
    SearchBar,
    IndicatorTable,
    LibraryIncentive,
    Loader,
    Btn
  },
  data: () => ({
    indicators: CACHE,
    query: '',
    selectedIndicator: null,
    dropdownTrigger: null,
    isLoading: false
  }),
  async created() {
    if (!CACHE.length) {
      await this.getIndicators()
    }
  },
  methods: {
    async getIndicators() {
      this.isLoading = true

      try {
        CACHE = await (
          await fetch(`${import.meta.env.VITE_APP_LIB_URL}library/indicators`)
        ).json()

        this.indicators = CACHE
      } catch (error) {
        console.error(error)
        this.$store.dispatch('app/showNotice', {
          type: 'error',
          title: 'Failed to fetch indicators'
        })
      } finally {
        this.isLoading = false
      }
    }
  }
}
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
