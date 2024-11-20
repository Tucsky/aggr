<template>
  <Btn
    class="form-control -outline -arrow"
    @click.stop="togglePriceScaleDropdown(indicatorId, $event.currentTarget)"
  >
    {{ priceScaleLabel }}
  </Btn>
</template>

<script setup lang="ts">
import { ref, defineProps, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { createComponent, mountComponent } from '@/utils/helpers'
import Btn from '@/components/framework/Btn.vue'
import { ChartPaneState } from '../../store/panesSettings/chart'
import store from '@/store'

// Define props
const props = defineProps<{ paneId: string; indicatorId: string }>()

// Reactive state for the label and dropdown instance
const priceScaleLabel = ref<string | null>(null)
let priceScaleDropdown: any = null

// Update label based on store state
const updateLabel = () => {
  const paneState = store.state[props.paneId] as ChartPaneState
  const indicator = paneState.indicators[props.indicatorId]

  if (
    indicator.options.priceScaleId === 'right' ||
    indicator.options.priceScaleId === 'left'
  ) {
    priceScaleLabel.value = indicator.options.priceScaleId
  }

  if (indicator) {
    priceScaleLabel.value = indicator.name || indicator.options.priceScaleId
  }
}

// Initialize label on mount
onMounted(() => {
  updateLabel()
})

// Cleanup dropdown on unmount
onBeforeUnmount(() => {
  if (priceScaleDropdown) {
    priceScaleDropdown.$destroy()
    priceScaleDropdown = null
  }
})

// Toggle dropdown visibility
const togglePriceScaleDropdown = async (
  indicatorId: string,
  anchor: HTMLElement
) => {
  updateLabel()
  if (!priceScaleDropdown) {
    const { default: PriceScaleDropdown } = await import(
      '@/components/indicators/PriceScaleDropdown.vue'
    )
    priceScaleDropdown = createComponent(PriceScaleDropdown, {
      paneId: props.paneId,
      indicatorId,
      value: anchor
    })

    priceScaleDropdown.$on('input', async (value: any) => {
      priceScaleDropdown.value = value
      await nextTick()
      updateLabel()
    })
    mountComponent(priceScaleDropdown)
  } else if (priceScaleDropdown.value) {
    priceScaleDropdown.value = null
  } else {
    priceScaleDropdown.indicatorId = indicatorId
    priceScaleDropdown.value = anchor
  }
}
</script>
