<template>
  <div class="indicator-option-exchange form-group">
    <label>{{ label }}<slot name="description" /></label>
    <dropdown-button
      v-model="value"
      :options="exchanges"
      :placeholder="definition.placeholder"
      class="-outline form-control -arrow"
      @input="onInput"
    ></dropdown-button>
  </div>
</template>

<script setup lang="ts">
import store from '@/store'
import { computed, defineEmits, defineProps } from 'vue'
import { useIndicatorOptionProps } from './useIndicatorOptionProps'
import DropdownButton from '@/components/framework/DropdownButton.vue'

// Define props and emit
defineProps(useIndicatorOptionProps)
const emit = defineEmits(['input'])

// Computed property for exchanges options
const exchanges = computed(() => {
  return store.getters['exchanges/getExchanges'].reduce(
    (acc: Record<string, string>, exchange: string) => {
      acc[exchange] = exchange
      return acc
    },
    { null: 'Choose' }
  )
})

// Emit input event
const onInput = (value: any) => {
  emit('input', value)
}
</script>
