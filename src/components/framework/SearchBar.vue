<template>
  <div class="search-bar form-control">
    <input
      type="text"
      class="search-bar__input form-control w-100"
      placeholder="Search"
      :value="value"
      @input="onInput"
      v-autofocus
    />
    <slot />
  </div>
</template>

<script setup lang="ts">
import { defineProps, withDefaults, defineEmits } from 'vue'

// Define props with defaults
withDefaults(
  defineProps<{
    value?: string
  }>(),
  {
    value: ''
  }
)

// Define emits
const emit = defineEmits<{
  (e: 'input', value: string): void
}>()

// Handle input event
const onInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('input', target.value)
}
</script>

<style lang="scss" scoped>
.search-bar {
  position: relative;
  display: flex;
  gap: 0.5rem;

  &__input {
    border: 0;
    padding: 0;
    flex-grow: 1;
    min-height: 0;
  }

  > .btn {
    margin: -0.25rem;
  }
}
</style>
