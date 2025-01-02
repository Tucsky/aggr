<template>
  <label class="indicator-option-dropdown form-group">
    <label>{{ label }}<slot name="description" /></label>
    <dropdown-button
      :modelValue="modelValue"
      :options="options"
      class="-outline form-control -arrow"
      :placeholder="definition.placeholder"
      @update:modelValue="onInput"
    ></dropdown-button>
  </label>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useIndicatorOptionProps } from './useIndicatorOptionProps'
import DropdownButton from '@/components/framework/DropdownButton.vue'

// Define props and emit
const props = defineProps(useIndicatorOptionProps)
const emit = defineEmits(['update:modelValue'])

// Computed property for dropdown options
const options = computed(() => {
  if (!props.definition.options) return []

  if (Array.isArray(props.definition.options)) {
    return props.definition.options.reduce(
      (acc: Record<string, string>, option: string) => {
        acc[option] = option || 'Choose'
        return acc
      },
      {}
    )
  }

  return props.definition.options
})

// Emit input event
const onInput = (value: any) => {
  emit('update:modelValue', value)
}
</script>
