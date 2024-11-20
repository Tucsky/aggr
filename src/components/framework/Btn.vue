<template>
  <component
    :is="tag"
    :type="type"
    :href="href"
    :target="target"
    class="btn"
    @click="onClick"
  >
    <loader v-if="isLoading" class="btn__loader" small />
    <slot />
  </component>
</template>

<script setup lang="ts">
import { ref, computed, watch, defineProps, defineEmits } from 'vue'
import Loader from '@/components/framework/Loader.vue'

// Define props
const props = defineProps({
  loading: {
    type: Boolean,
    default: false
  },
  type: {
    type: String,
    default: 'button'
  },
  href: {
    type: String,
    default: null
  },
  target: {
    type: String,
    default: null
  }
})

// Define emits
const emit = defineEmits(['click'])

// Reactive state
const isLoading = ref(props.loading)

// Computed property for determining the tag type
const tag = computed(() => (props.href ? 'a' : 'button'))

// Watcher for loading prop
watch(
  () => props.loading,
  newVal => {
    isLoading.value = newVal
  }
)

// Click event handler
const onClick = (event: Event) => {
  if (!isLoading.value) {
    emit('click', event)
  }
}

defineExpose({ isLoading })
</script>

<style lang="scss" scoped>
.btn {
  &__loader {
    width: 0.5em;
    height: 0.5em;

    &:first-child + * {
      display: none;
    }
  }
}
</style>
