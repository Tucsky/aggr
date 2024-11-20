<template>
  <dropdown :value="value" @input="$emit('input', $event)" on-sides>
    <div class="dropdown-divider" data-label="Avl. scales"></div>

    <button
      v-for="(label, id) in priceScales"
      :key="id"
      type="button"
      class="dropdown-item"
      :class="[priceScaleId === id && 'dropdown-item--active']"
      @click="setPriceScale(id)"
    >
      <span v-if="id === indicatorId">
        <i class="icon-star-filled -lower"></i>
        {{ indicatorName }}
      </span>
      <span v-else>{{ label }}</span>
    </button>
  </dropdown>
</template>
<script setup lang="ts">
import { computed, defineProps } from 'vue'
import { ChartPaneState } from '@/store/panesSettings/chart'
import { getChartScales } from '../chart/options'
import store from '@/store'

// Define props
const props = defineProps<{
  value: HTMLButtonElement | null
  paneId: string
  indicatorId: string
}>()

// Computed properties
const priceScales = computed(() => {
  return getChartScales(
    (store.state[props.paneId] as ChartPaneState).indicators,
    props.indicatorId
  )
})

const priceScaleId = computed(() => {
  return (store.state[props.paneId] as ChartPaneState).indicators[
    props.indicatorId
  ].options.priceScaleId
})

const indicatorName = computed(() => {
  return (store.state[props.paneId] as ChartPaneState).indicators[
    props.indicatorId
  ].name
})

const axisVisibility = computed(() => {
  return {
    left: (store.state[props.paneId] as ChartPaneState).showLeftScale,
    right: (store.state[props.paneId] as ChartPaneState).showRightScale
  }
})

// Method to set the price scale
function setPriceScale(id: string) {
  if (axisVisibility.value[id] === false) {
    store.commit(props.paneId + '/TOGGLE_AXIS', id)
  }

  store.dispatch(props.paneId + '/setIndicatorOption', {
    id: props.indicatorId,
    key: 'priceScaleId',
    value: id
  })
}
</script>

<style lang="scss" scoped></style>
