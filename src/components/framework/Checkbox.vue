<template>
  <label class="checkbox-control" :class="[small && '-small']">
    <input
      type="checkbox"
      class="form-control"
      :checked="modelValue"
      @change="onChange"
    />
    <div :class="iconClass"></div>
    <slot>
      <span v-if="label"></span>
    </slot>
  </label>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  small: {
    type: Boolean,
    default: false
  },
  icon: {
    type: String,
    default: null
  },
  label: {
    type: String,
    default: null
  }
})

// Define emits
const emit = defineEmits(['update:modelValue'])

const iconClass = computed(() => (props.icon ? `icon-${props.icon}` : null))

const onChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.checked)
}
</script>
