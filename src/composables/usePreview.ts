import { ref, onMounted, onBeforeUnmount } from 'vue'
import { getEventCords } from '@/utils/helpers'
import { isTouchSupported } from '@/utils/touchevent'

const PREVIEW_SIZE = {
  originalWidth: 500,
  originalHeight: 100,
  displayWidth: 300,
  displayHeight: 100
}

export function usePreview() {
  const previewCanvasElement = ref<HTMLCanvasElement | null>(null)
  const previewImageElement = ref<HTMLImageElement | null>(null)
  const previewObjectUrl = ref<string | null>(null)
  const currentPreviewId = ref<string | null>(null)
  let previewCtx: CanvasRenderingContext2D | null = null

  function mountPreview() {
    const pxRatio = window.devicePixelRatio || 1
    const canvas = document.createElement('canvas')
    canvas.width = PREVIEW_SIZE.displayWidth * pxRatio
    canvas.height = PREVIEW_SIZE.displayHeight * pxRatio
    canvas.style.width = `${PREVIEW_SIZE.displayWidth}px`
    canvas.style.height = `${PREVIEW_SIZE.displayHeight}px`
    canvas.style.top = `-1rem`
    canvas.style.left = `0`
    canvas.style.position = `absolute`
    canvas.style.pointerEvents = `none`
    canvas.style.zIndex = `11`
    canvas.style.borderRadius = `0.75rem`
    document.getElementById('app')?.appendChild(canvas)

    previewCanvasElement.value = canvas
    previewCtx = canvas.getContext('2d')
  }

  async function showPreview(json: any) {
    if (isTouchSupported()) return

    if (!json.preview && json.imagePath) {
      try {
        json.preview = await fetch(
          `${import.meta.env.VITE_APP_LIB_URL}${json.imagePath}`
        ).then(response => {
          if (!response.ok) throw new Error('Network response was not ok')
          return response.blob()
        })
      } catch {
        json.imagePath = null
        clearPreview()
        return
      }
    }

    if (json.id !== currentPreviewId.value) {
      clearPreview()
      currentPreviewId.value = json.id

      if (json.preview instanceof Blob) {
        previewObjectUrl.value = URL.createObjectURL(json.preview)
        const image = new Image()
        image.src = previewObjectUrl.value
        image.addEventListener('load', onLoad)
        previewImageElement.value = image
      }
    }
  }

  function onLoad() {
    const image = previewImageElement.value
    if (!image || !previewCtx) return

    const { width, height } = image
    const pxRatio = window.devicePixelRatio || 1

    previewCtx.drawImage(
      image,
      width - PREVIEW_SIZE.displayWidth * pxRatio,
      0,
      PREVIEW_SIZE.displayWidth * pxRatio,
      height,
      0,
      0,
      PREVIEW_SIZE.displayWidth * pxRatio,
      PREVIEW_SIZE.displayHeight * pxRatio
    )
    URL.revokeObjectURL(previewObjectUrl.value as string)
    previewObjectUrl.value = null
    previewImageElement.value = null
  }

  function movePreview(event: MouseEvent | TouchEvent) {
    if (!previewCanvasElement.value) return

    const coordinates = getEventCords(event)
    previewCanvasElement.value.style.transform = `translate(${
      coordinates.x - PREVIEW_SIZE.displayWidth / 2
    }px, ${coordinates.y - PREVIEW_SIZE.displayHeight}px)`
  }

  function clearPreview() {
    if (previewCtx && previewCanvasElement.value) {
      previewCtx.clearRect(
        0,
        0,
        previewCanvasElement.value.width,
        previewCanvasElement.value.height
      )
    }
    currentPreviewId.value = null

    if (previewImageElement.value) {
      previewImageElement.value.removeEventListener('load', onLoad)
      previewImageElement.value.src = ''
      previewImageElement.value = null
    }

    if (previewObjectUrl.value) {
      URL.revokeObjectURL(previewObjectUrl.value)
      previewObjectUrl.value = null
    }
  }

  onMounted(() => {
    mountPreview()
  })

  onBeforeUnmount(() => {
    if (previewCanvasElement.value) {
      document.getElementById('app')?.removeChild(previewCanvasElement.value)
    }
  })

  return {
    showPreview,
    movePreview,
    clearPreview
  }
}
