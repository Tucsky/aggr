<template>
  <div class="tabs">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, provide } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['update:modelValue'])

const selectedTab = ref<string | null>(props.modelValue)

// Provide the selected tab name and a method to select a tab
provide('selectedTab', selectedTab)
provide('selectTab', (name: string) => {
  if (selectedTab.value !== name) {
    selectedTab.value = name
    emit('update:modelValue', name)
  }
})

// Watch for external changes to modelValue
watch(
  () => props.modelValue,
  newValue => {
    if (newValue !== selectedTab.value) {
      selectedTab.value = newValue
    }
  }
)
</script>

<style lang="scss" scoped>
.tabs {
  padding: 0 1rem;
  flex-shrink: 0;
  display: flex;
  align-items: stretch;
  list-style: none;
  margin: 0;
  height: 2.5rem;
  box-shadow: inset 0 -1px 0 var(--theme-background-200);
}
</style>
