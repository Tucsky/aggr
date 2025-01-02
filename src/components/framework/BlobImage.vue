<template>
  <img v-if="imageObjectUrl" :src="imageObjectUrl" />
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'

// Define props with defineProps and withDefaults
const props = withDefaults(
  defineProps<{
    modelValue: Blob | File | null
  }>(),
  {
    modelValue: null
  }
)

// Reactive state for the image URL
const imageObjectUrl = ref<string | null>(null)

/**
 * Function to load the Blob or File and create an object URL.
 */
const loadBlob = () => {
  clearBlob()
  const isBlob = props.modelValue instanceof Blob
  const isFile = props.modelValue instanceof File
  if (isBlob || isFile) {
    imageObjectUrl.value = URL.createObjectURL(props.modelValue)
  }
}

/**
 * Function to clear the previously created object URL.
 */
const clearBlob = () => {
  if (imageObjectUrl.value) {
    URL.revokeObjectURL(imageObjectUrl.value)
    imageObjectUrl.value = null
  }
}

// Watch the 'value' prop for changes and load the Blob immediately
watch(
  () => props.modelValue,
  () => {
    loadBlob()
  },
  { immediate: true }
)

// Cleanup the object URL when the component is unmounted
onBeforeUnmount(() => {
  clearBlob()
})
</script>
