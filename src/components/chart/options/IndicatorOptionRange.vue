<template>
  <div class="indicator-option-range form-group">
    <label>
      {{ label }}
      <editable
        tag="code"
        class="indicator-option-range__value -filled"
        :modelValue="stepRoundedValue"
        :min="min"
        :max="max"
        :step="step"
        @update:modelValue="onInput"
      ></editable>
      <slot name="description" />
    </label>
    <slider
      class="mt8"
      :min="min"
      :max="max"
      :step="step"
      :log="log"
      :label="true"
      :modelValue="modelValue"
      :gradient="gradient"
      @update:modelValue="onInput"
      @reset="onReset"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useIndicatorOptionProps } from './useIndicatorOptionProps'
import Slider from '@/components/framework/picker/Slider.vue'
import { countDecimals } from '@/services/productsService'

// Define props and emit
const props = defineProps(useIndicatorOptionProps)
const emit = defineEmits(['update:modelValue'])

// Computed properties for range settings
const min = computed(() =>
  typeof props.definition.min === 'number' ? props.definition.min : 0
)
const max = computed(() =>
  typeof props.definition.max === 'number' ? props.definition.max : 1
)
const log = computed(() => !!props.definition.log)
const step = computed(() =>
  typeof props.definition.step === 'number' ? props.definition.step : 0.1
)
const decimals = computed(() => countDecimals(step.value))

// Computed for the rounded step value
const stepRoundedValue = computed(() => {
  return typeof props.modelValue === 'number'
    ? +props.modelValue.toFixed(decimals.value)
    : props.modelValue
})

// Computed for gradient if available
const gradient = computed(() => {
  return Array.isArray(props.definition.gradient)
    ? props.definition.gradient
    : null
})

// Event handlers
const onInput = (value: any) => emit('update:modelValue', value ? +value : 0)
const onReset = () =>
  emit('update:modelValue', props.definition.default ?? props.definition.value)
</script>

<style lang="scss" scoped>
.indicator-option-range {
  &__value {
    font-size: 0.875rem;
  }
}
</style>
