<template>
  <button
    type="button"
    class="dropdown-item dropdown-item--narrow"
    @click.stop="togglePriceFormatDropdown(indicatorId, $event)"
  >
    <span class="dropdown-item__emoji"> 📊 </span>
    <span class="d-flex -column">
      <small class="block text-muted">Scale</small>
      <div class="d-flex -gap4">
        <span v-tippy title="Scale format type">{{ type }}</span>
        :
        <span v-tippy :title="`Precision : ${precision}`">{{ precision }}</span>
        <span v-tippy v-if="auto" title="Automatic precision">(auto)</span>
      </div>
    </span>
  </button>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount } from 'vue'
import { ChartPaneState } from '../../store/panesSettings/chart'
import { createComponent, mountComponent } from '@/utils/helpers'
import store from '@/store'

// Define props
const props = defineProps<{
  paneId: string
  indicatorId: string
}>()

// Reactive variable for the dropdown
let priceFormatDropdown: any = null
let unmountPriceFormatDropdown: () => void

// Computed properties to access the price format details
const priceScale = computed(
  () =>
    (store.state[props.paneId] as ChartPaneState).priceScales[
      (store.state[props.paneId] as ChartPaneState).indicators[
        props.indicatorId
      ].options.priceScaleId
    ]
)

const priceFormat = computed(() => {
  return {
    type: 'price',
    precision: null,
    auto: null,
    ...priceScale.value.priceFormat,
    ...(store.state[props.paneId] as ChartPaneState).indicators[
      props.indicatorId
    ].options?.priceFormat
  }
})
const type = computed(() => priceFormat.value.type || 'price')
const precision = computed(() => priceFormat.value.precision || 'n/a')
const auto = computed(() => priceFormat.value.auto)

onBeforeUnmount(() => {
  if (priceFormatDropdown) {
    priceFormatDropdown.value = false
    unmountPriceFormatDropdown()
  }
})

// Method to toggle the PriceFormatDropdown
async function togglePriceFormatDropdown(indicatorId: string, event: Event) {
  const anchor = event.target as HTMLElement
  if (!priceFormatDropdown) {
    const module = await import(
      '@/components/indicators/IndicatorScaleDropdown.vue'
    )
    priceFormatDropdown = createComponent(module.default, {
      paneId: props.paneId,
      indicatorId: indicatorId,
      modelValue: anchor,
      onInput(value) {
        priceFormatDropdown.modelValue = value
      }
    })
    unmountPriceFormatDropdown = mountComponent(priceFormatDropdown)
  } else if (priceFormatDropdown.value) {
    priceFormatDropdown.value = null
  } else {
    priceFormatDropdown.indicatorId = indicatorId
    priceFormatDropdown.value = anchor
  }
}
</script>
