<template>
  <label class="indicator-option-line-type form-group">
    <label>{{ label }}<slot name="description" /></label>
    <dropdown-button
      v-model="value"
      :options="{ 0: 'Simple', 1: 'with steps' }"
      class="-outline form-control -arrow"
      :placeholder="definition.placeholder || 'lineType'"
      @input="onInput"
    ></dropdown-button>
  </label>
</template>

<script setup lang="ts">
import { defineEmits, defineProps } from 'vue'
import { useIndicatorOptionProps } from './useIndicatorOptionProps'
import DropdownButton from '@/components/framework/DropdownButton.vue'

// Define props and emit
defineProps(useIndicatorOptionProps)
const emit = defineEmits(['input'])

// Emit input event
const onInput = (value: any) => {
  emit('input', value)
}
</script>
