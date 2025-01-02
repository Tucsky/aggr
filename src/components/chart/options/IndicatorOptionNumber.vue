<template>
  <div class="indicator-option-number form-group">
    <label>{{ label }}</label>
    <editable
      class="form-control"
      :modelValue="modelValue"
      :min="min"
      :max="max"
      :step="step"
      @update:modelValue="emit('update:modelValue', $event)"
    ></editable>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useIndicatorOptionProps } from './useIndicatorOptionProps'

const emit = defineEmits(['update:modelValue'])

// Import props
const props = defineProps(useIndicatorOptionProps)

// Use props as needed
const min = computed(() =>
  typeof props.definition.min === 'number' ? props.definition.min : null
)
const max = computed(() =>
  typeof props.definition.max === 'number' ? props.definition.max : null
)
const step = computed(() =>
  typeof props.definition.step === 'number' ? props.definition.step : null
)
</script>
