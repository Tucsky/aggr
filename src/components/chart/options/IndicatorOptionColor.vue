<template>
  <div class="indicator-option-color">
    <label>{{ label }}<slot name="description" /></label>
    <color-picker-control
      :label="label"
      model="rgb"
      allow-null
      :value="value"
      @input="onInput"
      @close="reloadIndicator"
    ></color-picker-control>
  </div>
</template>

<script setup lang="ts">
import store from '@/store'
import { useIndicatorOptionProps } from './useIndicatorOptionProps'
import ColorPickerControl from '@/components/framework/picker/ColorPickerControl.vue'

// Import props
const props = defineProps(useIndicatorOptionProps)

const emit = defineEmits(['input'])

// Event handler for emitting input
const onInput = (value: any) => {
  emit('input', value)
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
