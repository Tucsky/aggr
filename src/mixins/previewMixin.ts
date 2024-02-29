import Vue from 'vue'
import Component from 'vue-class-component'
import { getEventCords } from '@/utils/helpers'
import { isTouchSupported } from '@/utils/touchevent'

const PREVIEW_SIZE = {
  originalWidth: 500,
  originalHeight: 100,
  displayWidth: 300,
  displayHeight: 100
}

@Component
export default class PreviewMixin extends Vue {
  previewCanvasElement: HTMLCanvasElement
  previewImageElement: HTMLImageElement
  previewObjectUrl: string
  currentPreviewId: string
  previewCtx: CanvasRenderingContext2D

  mounted() {
    this.mountPreview()
  }

  beforeDestroy() {
    document.getElementById('app').removeChild(this.previewCanvasElement)
  }

  mountPreview() {
    const pxRatio = window.devicePixelRatio || 1
    this.previewCanvasElement = document.createElement('canvas')
    this.previewCanvasElement.width = PREVIEW_SIZE.displayWidth * pxRatio
    this.previewCanvasElement.height = PREVIEW_SIZE.displayHeight * pxRatio
    this.previewCanvasElement.style.width = `${PREVIEW_SIZE.displayWidth}px`
    this.previewCanvasElement.style.height = `${PREVIEW_SIZE.displayHeight}px`
    this.previewCanvasElement.style.top = `-1rem`
    this.previewCanvasElement.style.left = `0`
    this.previewCanvasElement.style.position = `absolute`
    this.previewCanvasElement.style.pointerEvents = `none`
    this.previewCanvasElement.style.zIndex = `11`
    this.previewCanvasElement.style.borderRadius = `0.75rem`
    document.getElementById('app').appendChild(this.previewCanvasElement)

    this.previewCtx = this.previewCanvasElement.getContext('2d')
  }

  async showPreview(json) {
    if (isTouchSupported()) {
      return
    }

    if (!json.preview) {
      if (json.imagePath) {
        json.preview = await fetch(
          `${import.meta.env.VITE_APP_LIB_URL}${json.imagePath}`
        ).then(response => {
          if (!response.ok) {
            json.imagePath = null
            throw new Error('Network response was not ok')
          }
          return response.blob()
        })
      }

      if (!json.preview) {
        this.clearPreview()
        return
      }
    }

    if (json.id !== this.currentPreviewId) {
      this.clearPreview()

      this.currentPreviewId = json.id

      if (json.preview instanceof Blob) {
        this.previewObjectUrl = URL.createObjectURL(json.preview)
        this.previewImageElement = new Image()
        this.previewImageElement.src = this.previewObjectUrl
        this.previewImageElement.addEventListener('load', this.onLoad)
      }
    }
  }

  onLoad() {
    const { width, height } = this.previewImageElement
    const pxRatio = window.devicePixelRatio || 1

    this.previewCtx.drawImage(
      this.previewImageElement,
      width - PREVIEW_SIZE.displayWidth * pxRatio,
      0,
      PREVIEW_SIZE.displayWidth * pxRatio,
      height,
      0,
      0,
      PREVIEW_SIZE.displayWidth * pxRatio,
      PREVIEW_SIZE.displayHeight * pxRatio
    )
    URL.revokeObjectURL(this.previewObjectUrl)
    this.previewObjectUrl = null
    this.previewImageElement = null
  }

  movePreview(event) {
    if (!this.previewCanvasElement) {
      return
    }

    const coordinates = getEventCords(event)
    this.previewCanvasElement.style.transform = `translate(${
      coordinates.x - PREVIEW_SIZE.displayWidth / 2
    }px, ${coordinates.y - PREVIEW_SIZE.displayHeight}px)`
  }

  clearPreview() {
    this.previewCtx.clearRect(
      0,
      0,
      this.previewCanvasElement.width,
      this.previewCanvasElement.height
    )
    this.currentPreviewId = null

    if (this.previewImageElement) {
      this.previewImageElement.removeEventListener('load', this.onLoad)
      this.previewImageElement.src = ''
      this.previewImageElement = null
    }

    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl)
      this.previewObjectUrl = null
    }
  }
}
