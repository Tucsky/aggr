<template>
  <div class="indicator-option-text form-group">
    <label>{{ label }}<slot name="description" /></label>
    <editable
      class="form-control"
      :value="value"
      :placeholder="definition.placeholder"
      @input="onInput"
    ></editable>
  </div>
</template>

<script setup lang="ts">
import { defineEmits, defineProps } from 'vue'
import { useIndicatorOptionProps } from './useIndicatorOptionProps'

// Define props and emit
defineProps(useIndicatorOptionProps)
const emit = defineEmits(['input'])

// Emit input event
const onInput = (value: any) => emit('input', value)
</script>
