<template>
  <div class="indicator-option-line-style form-group">
    <label>{{ label }}<slot name="description" /></label>
    <dropdown-button
      v-model="modelValue"
      :options="{
        0: 'Solid',
        1: 'Dotted',
        2: 'Dashed',
        3: 'LargeDashed',
        4: 'SparseDotted'
      }"
      class="-outline form-control -arrow"
      :placeholder="definition.placeholder || 'lineStyle'"
      @update:modelValue="onInput"
    ></dropdown-button>
  </div>
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
