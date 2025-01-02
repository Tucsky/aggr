<template>
  <div
    class="indicator-preview"
    @mousemove="moveImage"
    @mouseleave="resetImage"
    ref="preview"
    :class="{ 'indicator-preview--zoomed': isImageZoomed }"
    :style="{ '--image-height': imageDimensions.height + 'px' }"
  >
    <template v-if="id">
      <Btn class="indicator-preview__close -text" @click="emit('close')">
        <i class="icon-cross"></i>
      </Btn>
      <code class="indicator-preview__id -filled">
        <small>#{{ id }}</small>
      </code>
    </template>
    <img v-if="image" :src="image" ref="image" @load="onImageLoad" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import Btn from '@/components/framework/Btn.vue'

// Props definition
const props = defineProps<{
  id?: string
  path?: string
  preview?: Blob | File | null
  isInstalled?: boolean
}>()

// Emit setup
const emit = defineEmits(['close'])

// Reactive data
const imageDimensions = ref({ width: 0, height: 0 })
const imagePosition = ref({ x: 0, y: 0 })
const isImageZoomed = ref(false)
const imageObjectUrl = ref<string | null>(null)
const _imageZoomTimeout = ref<number | null>(null)

// Refs
const previewRef = ref<HTMLElement | null>(null)
const imageRef = ref<HTMLImageElement>(null)

// Computed properties for image source
const source = computed(() => props.preview || props.path)
const image = computed(() => {
  if (imageObjectUrl.value) return imageObjectUrl.value
  if (props.path) return `${import.meta.env.VITE_APP_LIB_URL}${props.path}`
  return null
})

// Watch for source changes
watch(
  () => source.value,
  () => {
    loadPreview()
  },
  { immediate: true }
)

// Lifecycle hooks
onMounted(() => {
  loadPreview()
})

onBeforeUnmount(() => {
  if (imageObjectUrl.value) URL.revokeObjectURL(imageObjectUrl.value)
})

// Methods
const loadPreview = () => {
  clearPreview()

  const canCreateObjectUrl =
    props.preview instanceof File || props.preview instanceof Blob
  if (canCreateObjectUrl) {
    imageObjectUrl.value = URL.createObjectURL(props.preview)
  }
}

const clearPreview = () => {
  if (imageObjectUrl.value) {
    URL.revokeObjectURL(imageObjectUrl.value)
    imageObjectUrl.value = null
  }
}

const onImageLoad = (event: Event) => {
  const img = event.target as HTMLImageElement
  const pxRatio = window.devicePixelRatio || 1
  imageDimensions.value = {
    height: img.naturalHeight / pxRatio,
    width: img.naturalWidth / pxRatio
  }

  if (imageDimensions.value.width < previewRef.value.clientWidth) {
    const ratio = imageDimensions.value.height / imageDimensions.value.width
    imageDimensions.value.width = previewRef.value.clientWidth
    imageDimensions.value.height = previewRef.value.clientWidth * ratio
  }

  img.style.width = `${imageDimensions.value.width}px`
  img.style.height = `${imageDimensions.value.height}px`
  centerImage()
}

const centerImage = () => {
  const previewRect = previewRef.value.getBoundingClientRect()
  const imageRect = imageRef.value.getBoundingClientRect()

  const offsetX = (previewRect.width - imageRect.width) / 2
  const offsetY = (previewRect.height - imageRect.height) / 2

  imagePosition.value = { x: offsetX, y: offsetY }
  imageRef.value.style.transform = `translate(${offsetX}px, ${offsetY}px)`
}

const scheduleImageZoom = (event: MouseEvent) => {
  if (isImageZoomed.value || _imageZoomTimeout.value) return

  _imageZoomTimeout.value = window.setTimeout(async () => {
    _imageZoomTimeout.value = null
    isImageZoomed.value = true
    await nextTick()
    moveImage(event)
  }, 1000)
}

const moveImage = (event: MouseEvent) => {
  const previewRect = previewRef.value.getBoundingClientRect()
  const imageRect = imageRef.value.getBoundingClientRect()

  const maxMoveX = Math.max(0, imageRect.width - previewRect.width)
  const maxMoveY = Math.max(0, imageRect.height - previewRect.height)

  const mouseX = event.clientX - previewRect.left
  const mouseY = event.clientY - previewRect.top

  const moveX = (mouseX / previewRect.width) * maxMoveX
  const moveY = (mouseY / previewRect.height) * maxMoveY

  const newX = Math.min(Math.max(-moveX, -maxMoveX), 0)
  const newY = Math.min(Math.max(-moveY, -maxMoveY), 0)

  imagePosition.value = { x: newX, y: newY }
  imageRef.value.style.transform = `translate(${newX}px, ${newY}px)`

  scheduleImageZoom(event)
}

const resetImage = () => {
  isImageZoomed.value = false
  centerImage()

  if (_imageZoomTimeout.value) {
    clearTimeout(_imageZoomTimeout.value)
    _imageZoomTimeout.value = null
  }
}
</script>

<style lang="scss" scoped>
.indicator-preview {
  height: 100px;
  width: 100%;
  position: relative;
  overflow: hidden;
  background-color: var(--theme-background-o75);
  transition: height 0.2s $ease-out-expo;

  &--zoomed {
    height: var(--image-height);
  }

  &__id,
  &__close {
    position: absolute;
    z-index: 1;
    top: 0.5rem;
  }

  &__id {
    left: 0.5rem;
  }

  &__close {
    right: 0.5rem;
  }
}
</style>
