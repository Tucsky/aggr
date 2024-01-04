<template>
  <div class="community-indicators">
    <Loader v-if="isLoading" class="community-indicators__loader" />
    <transition name="slide-fade-right">
      <div v-if="!isLoading">
        <IndicatorLibrarySearchBar v-model="query" />
        <IndicatorLibraryResults
          class="table--inset"
          :indicators="indicators"
          :query="query"
          @selected="$emit('selected', $event)"
        />
      </div>
    </transition>
  </div>
</template>

<script>
import Loader from '@/components/framework/Loader.vue'
import IndicatorLibrarySearchBar from '@/components/indicators/IndicatorLibrarySearchBar.vue'
import IndicatorLibraryResults from '@/components/indicators/IndicatorLibraryResults.vue'

export default {
  components: {
    IndicatorLibrarySearchBar,
    IndicatorLibraryResults,
    Loader
  },
  props: {
    paneId: {
      type: String,
      required: true
    }
  },
  data: () => ({
    indicators: [],
    query: '',
    selectedIndicator: null,
    dropdownTrigger: null,
    isLoading: false
  }),
  async created() {
    await this.getIndicators()
  },
  methods: {
    async getIndicators() {
      try {
        this.indicators = await (
          await fetch(`${import.meta.env.VITE_APP_LIB_URL}library/indicators`)
        ).json()
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
}
</style>
