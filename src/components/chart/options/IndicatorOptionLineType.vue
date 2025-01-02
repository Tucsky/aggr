<template>
  <label class="indicator-option-line-type form-group">
    <label>{{ label }}<slot name="description" /></label>
    <dropdown-button
      v-model="modelValue"
      :options="{ 0: 'Simple', 1: 'with steps' }"
      class="-outline form-control -arrow"
      :placeholder="definition.placeholder || 'lineType'"
      @update:modelValue="onInput"
    ></dropdown-button>
  </label>
</template>

<script setup lang="ts">
import { useIndicatorOptionProps } from './useIndicatorOptionProps'
import DropdownButton from '@/components/framework/DropdownButton.vue'

// Define props and emit
defineProps(useIndicatorOptionProps)
const emit = defineEmits(['update:modelValue'])

// Emit input event
const onInput = (value: any) => {
  emit('update:modelValue', value)
}
</script>
