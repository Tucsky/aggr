<template>
  <div class="chart-overlay__panel markets-overlay">
    <div class="chart-overlay__content pane-overlay" v-if="showOverlay">
      <div class="column">
        <a
          href="javascript:void(0)"
          class="btn -text"
          @click="toggleMarkets('perp')"
          >perp</a
        >
        <a
          href="javascript:void(0)"
          class="btn -text"
          @click="toggleMarkets('spot')"
          >spot</a
        >
        <a
          href="javascript:void(0)"
          class="btn -text"
          @click="toggleMarkets('all')"
          >all</a
        >
      </div>
      <div class="mx4 mt0">
        <div
          v-for="market of markets"
          :key="market"
          @click="toggleMarket($event, market)"
        >
          <label class="checkbox-control -extra-small mb4">
            <input
              type="checkbox"
              class="form-control"
              :checked="!hiddenMarkets[market]"
              @click.stop.prevent
            />
            <div></div>
            <span>{{ market }}</span>
          </label>
        </div>
      </div>
    </div>
    <div
      class="chart-overlay__head pane-overlay"
      @click="showOverlay = !showOverlay"
    >
      <div class="chart-overlay__title">
        {{ label }}
      </div>
      <button type="button" class="btn badge -text" @click="searchMarkets">
        <i class="icon-plus"></i>
      </button>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { ref, computed } from 'vue'
import store from '@/store'

// Props
const props = defineProps({
  paneId: {
    type: String,
    required: true
  }
})

// Refs (data)
const showOverlay = ref(false)

// Computed properties
const markets = computed(() => store.state.panes.panes[props.paneId].markets)

const hiddenMarkets = computed(() => store.state[props.paneId].hiddenMarkets)

const visibleMarkets = computed(
  () => markets.value.filter(market => !hiddenMarkets.value[market]).length
)

const label = computed(() => {
  const count = visibleMarkets.value
  return `${count} market${count > 1 ? 's' : ''}`
})

// Methods
const searchMarkets = (event: Event) => {
  store.dispatch('app/showSearch', { paneId: props.paneId })
  event.stopPropagation()
}

const toggleMarket = (event: MouseEvent, id: string) => {
  store.dispatch(`${props.paneId}/toggleMarkets`, {
    id,
    inverse: event.shiftKey
  })
}

const toggleMarkets = (type: string) => {
  store.dispatch(`${props.paneId}/toggleMarkets`, { type })
}
</script>

<style lang="scss">
.markets-overlay {
  flex-grow: 1;
  overflow: hidden;

  .chart-overlay__content {
    overflow: auto;
  }

  .checkbox-control {
    span {
      text-decoration: line-through;
      opacity: 0.5;
    }

    input:checked ~ span {
      text-decoration: none;
      opacity: 1;
    }
  }

  li {
    cursor: pointer;
    &.-hidden {
      opacity: 0.5;
      text-decoration: line-through;
    }
  }
}
</style>
