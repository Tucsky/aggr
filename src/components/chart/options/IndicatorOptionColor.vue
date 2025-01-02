<template>
  <div class="indicator-option-color">
    <label>{{ label }}<slot name="description" /></label>
    <ColorPickerControl
      :label="label"
      model="rgb"
      allow-null
      :modelValue="modelValue"
      @update:modelValue="onInput"
      @close="reloadIndicator"
    ></ColorPickerControl>
  </div>
</template>

<script setup lang="ts">
import store from '@/store'
import { useIndicatorOptionProps } from './useIndicatorOptionProps'
import ColorPickerControl from '@/components/framework/picker/ColorPickerControl.vue'

// Import props
const props = defineProps(useIndicatorOptionProps)

const emit = defineEmits(['update:modelValue'])

// Event handler for emitting input
const onInput = (value: any) => {
  emit('update:modelValue', value)
}

// Method to reload the indicator script
const reloadIndicator = () => {
  const { paneId, indicatorId } = useIndicatorOptionProps
  store.commit(`${paneId}/SET_INDICATOR_SCRIPT`, {
    id: indicatorId,
    value: store.state[props.paneId].indicators[props.indicatorId].script
  })
}
</script>

<style lang="scss" scoped>
.indicator-option-color {
  display: flex;
  justify-content: space-between;
  align-items: center;

  > label > i {
    vertical-align: bottom;
    line-height: 1;
  }
}
</style>
