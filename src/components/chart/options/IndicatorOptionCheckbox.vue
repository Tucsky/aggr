<template>
  <label class="indicator-option-checkbox checkbox-control">
    <input
      type="checkbox"
      class="form-control"
      :checked="value"
      @change="onChange"
    />
    <span>{{ label }}<slot name="description" /></span>
    <div></div>
  </label>
</template>
<script setup lang="ts">
import { useIndicatorOptionProps } from './useIndicatorOptionProps'

const emit = defineEmits(['input'])

// Import props directly
defineProps(useIndicatorOptionProps)

const onChange = (event: Event) => {
  const target = event.target as HTMLInputElement

  emit('input', target.checked)
}
</script>
<style lang="scss" scoped>
.indicator-option-checkbox {
  > span {
    flex-grow: 1;
    word-break: break-word;

    > i {
      line-height: 0.875;
      vertical-align: bottom;
    }
  }
}
</style>
