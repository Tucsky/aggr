<template>
  <img v-if="imageObjectUrl" :src="imageObjectUrl" />
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'

// Define props with defineProps and withDefaults
const props = withDefaults(
  defineProps<{
    value: Blob | File | null
  }>(),
  {
    value: null
  }
)

// Reactive state for the image URL
const imageObjectUrl = ref<string | null>(null)

/**
 * Function to load the Blob or File and create an object URL.
 */
const loadBlob = () => {
  clearBlob()
  const isBlob = props.value instanceof Blob
  const isFile = props.value instanceof File
  if (isBlob || isFile) {
    imageObjectUrl.value = URL.createObjectURL(props.value)
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
  () => props.value,
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
