<template>
  <div
    class="indicator-preview"
    @mousemove="moveImage"
    @mouseleave="resetImage"
    ref="preview"
    :class="[isImageZoomed && 'indicator-preview--zoomed']"
    :style="{ '--image-height': imageDimensions.height + 'px' }"
  >
    <template v-if="id">
      <Btn class="indicator-preview__close -text" @click="$emit('close')">
        <i class="icon-cross"></i>
      </Btn>
      <code class="indicator-preview__id -filled">
        <small>#{{ id }}</small>
      </code>
    </template>
    <img v-if="image" :src="image" ref="image" @load="onImageLoad" />
  </div>
</template>

<script lang="ts">
import Btn from '@/components/framework/Btn.vue'

export default {
  props: {
    id: {
      type: String,
      default: null
    },
    path: {
      default: null
    },
    preview: {
      default: null
    },
    isInstalled: {
      type: Boolean,
      default: false
    }
  },
  components: {
    Btn
  },
  data() {
    return {
      imageDimensions: { width: 0, height: 0 },
      imagePosition: { x: 0, y: 0 },
      isImageZoomed: false,
      imageObjectUrl: null
    }
  },
  computed: {
    source() {
      return this.preview || this.path
    },
    image() {
      if (this.imageObjectUrl) {
        return this.imageObjectUrl
      }

      if (this.path) {
        return `${import.meta.env.VITE_APP_LIB_URL}${this.path}`
      }

      return null
    }
  },
  watch: {
    source: {
      immediate: true,
      handler() {
        this.loadPreview()
      }
    }
  },
  beforeDestroy() {
    if (this.imageObjectUrl) {
      URL.revokeObjectURL(this.imageObjectUrl)
      this.imageObjectUrl = null
    }
  },
  methods: {
    loadPreview() {
      this.clearPreview()

      const preview = this.preview

      if (preview instanceof Blob || preview instanceof File) {
        this.imageObjectUrl = URL.createObjectURL(preview)
      }
    },
    clearPreview() {
      if (this.imageObjectUrl) {
        URL.revokeObjectURL(this.imageObjectUrl)
        this.imageObjectUrl = null
      }
    },
    onImageLoad(event) {
      const img = event.target as HTMLImageElement
      const pxRatio = window.devicePixelRatio || 1
      this.imageDimensions = {
        height: img.naturalHeight / pxRatio,
        width: img.naturalWidth / pxRatio
      }

      if (this.imageDimensions.width < this.$el.clientWidth) {
        const ratio = this.imageDimensions.height / this.imageDimensions.width
        this.imageDimensions.width = this.$el.clientWidth
        this.imageDimensions.height = this.$el.clientWidth * ratio
      }

      img.style.width = this.imageDimensions.width + 'px'
      img.style.height = this.imageDimensions.height + 'px'

      this.centerImage()
    },
    centerImage() {
      const preview = this.$refs.preview
      const image = this.$refs.image

      if (!image) {
        return
      }

      const previewRect = preview.getBoundingClientRect()
      const imageRect = image.getBoundingClientRect()

      const offsetX = (previewRect.width - imageRect.width) / 2
      const offsetY = (previewRect.height - imageRect.height) / 2

      this.imagePosition.x = offsetX
      this.imagePosition.y = offsetY

      image.style.transform = `translate(${offsetX}px, ${offsetY}px)`
    },
    scheduleImageZoom(event) {
      if (this.isImageZoomed) {
        return
      }

      if (this._imageZoomTimeout) {
        clearTimeout(this._imageZoomTimeout)
      }

      this._imageZoomTimeout = setTimeout(async () => {
        this._imageZoomTimeout = null
        this.isImageZoomed = true
        await this.$nextTick()
        this.moveImage(event)
      }, 1000)
    },
    moveImage(event) {
      const preview = this.$refs.preview
      const image = this.$refs.image

      if (!image) {
        return
      }

      const previewRect = preview.getBoundingClientRect()
      const imageRect = image.getBoundingClientRect()

      if (this.isImageZoomed) {
        previewRect.height = this.imageDimensions.height
        imageRect.height = this.imageDimensions.height
      }

      const maxMoveX = Math.max(0, imageRect.width - previewRect.width)
      const maxMoveY = Math.max(0, imageRect.height - previewRect.height)

      const mouseX = event.clientX - previewRect.left
      const mouseY = event.clientY - previewRect.top

      const moveX = (mouseX / previewRect.width) * maxMoveX
      const moveY = (mouseY / previewRect.height) * maxMoveY

      const newX = Math.min(Math.max(-moveX, -maxMoveX), 0)
      const newY = Math.min(Math.max(-moveY, -maxMoveY), 0)

      this.imagePosition.x = newX
      this.imagePosition.y = newY

      image.style.transform = `translate(${newX}px, ${newY}px)`

      this.scheduleImageZoom(event)
    },
    resetImage() {
      this.isImageZoomed = false
      this.centerImage()

      if (this._imageZoomTimeout) {
        clearTimeout(this._imageZoomTimeout)
        this._imageZoomTimeout = null
      }
    }
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
