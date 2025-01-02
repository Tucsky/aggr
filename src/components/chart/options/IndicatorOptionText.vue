<template>
  <div class="indicator-option-text form-group">
    <label>{{ label }}<slot name="description" /></label>
    <editable
      class="form-control"
      :modelValue="modelValue"
      :placeholder="definition.placeholder"
      @update:modelValue="onInput"
    ></editable>
  </div>
</template>

<script setup lang="ts">
import { useIndicatorOptionProps } from './useIndicatorOptionProps'

// Define props and emit
defineProps(useIndicatorOptionProps)
const emit = defineEmits(['update:modelValue'])

// Emit input event
const onInput = (value: any) => emit('update:modelValue', value)
</script>
