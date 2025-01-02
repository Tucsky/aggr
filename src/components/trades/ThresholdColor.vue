<template>
  <ColorPickerControl
    v-if="color"
    class="ml8"
    :modelValue="color"
    label="Buy color"
    @update:modelValue="regenerateSwatch"
    @click.stop
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import store from '@/store'
import ColorPickerControl from '../framework/picker/ColorPickerControl.vue'
import { TradesPaneState } from '@/store/panesSettings/trades'
import { joinRgba, splitColorCode } from '@/utils/colors'

// Define props with types
const props = defineProps<{
  paneId: string
  side: 'buy' | 'sell'
  type: 'thresholds' | 'liquidations'
}>()

// Computed property to access thresholds from the store
const thresholds = computed(() => {
  return (store.state[props.paneId] as TradesPaneState)[props.type]
})

// Computed property to generate the color property name
const name = computed(() => `${props.side}Color`)

// Computed property to derive the color value
const color = computed<string | null>(() => {
  const value = thresholds.value[1][name.value]
  if (!value) {
    return null
  }
  const colorRgb = splitColorCode(value)
  colorRgb[3] = 1 // Ensure alpha is set to 1
  return joinRgba(colorRgb)
})

/**
 * Method to regenerate the swatch based on the selected color.
 * @param {string} newColor - The new color selected by the user.
 */
const regenerateSwatch = async (newColor: string) => {
  // Dispatch the generateSwatch action to the store
  await store.dispatch(`${props.paneId}/generateSwatch`, {
    type: props.type,
    side: props.side,
    baseVariance: 0.33,
    color: newColor
  })

  // Force refresh by deep cloning the thresholds object
  const updatedThresholds = JSON.parse(
    JSON.stringify(store.state[props.paneId][props.type])
  )
  store.state[props.paneId][props.type] = updatedThresholds

  // Commit an empty object to trigger any watchers or reactivity
  store.commit(`${props.paneId}/SET_THRESHOLD_COLOR`, {})
}
</script>
