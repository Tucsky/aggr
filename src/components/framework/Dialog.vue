<template>
  <div
    class="dialog"
    :class="[
      impliedSize && `dialog--size-${impliedSize}`,
      currentSize && `dialog--${currentSize}`,
      contrasted && `dialog--contrasted`,
      borderless && `dialog--borderless`,
      moved && `dialog--moved`,
      mask && 'dialog--mask'
    ]"
  >
    <div v-if="mask" class="dialog__mask" @click="clickOutside" />
    <div
      ref="content"
      class="dialog__content"
      :class="contentClass"
      @click.stop
      @mousedown="onMouseDown"
    >
      <i
        v-if="resizable"
        class="dialog__resize icon-up-thin"
        @mousedown="handleResize"
        @touchstart="handleResize"
      ></i>
      <header
        v-if="$slots.header"
        class="dialog__header-wrapper"
        @mousedown="handleDrag"
        @touchstart="handleDrag"
      >
        <slot name="cover"></slot>
        <div class="dialog__header">
          <slot name="header"></slot>
          <button
            type="button"
            class="dialog__close btn -link -text -no-grab"
            @click="close"
          >
            <i class="icon-cross"></i>
          </button>
        </div>
        <div class="dialog__subheader" v-if="$slots.subheader">
          <slot name="subheader" />
        </div>
      </header>
      <div ref="body" class="dialog__body hide-scrollbar" :class="bodyClass">
        <slot></slot>
      </div>
      <footer v-if="$slots.footer" class="dialog__footer d-flex">
        <slot name="footer"></slot>
      </footer>
    </div>
  </div>
</template>
<script setup lang="ts">
import {
  ref,
  onMounted,
  onBeforeUnmount,
  nextTick,
  getCurrentInstance
} from 'vue'
import dialogService, {
  DialogComponent,
  DialogPosition
} from '@/services/dialogService'
import { getEventCords } from '../../utils/helpers'

const props = defineProps({
  mask: { type: Boolean, default: true },
  contrasted: { type: Boolean, default: false },
  borderless: { type: Boolean, default: false },
  resizable: { type: Boolean, default: true },
  size: { type: String, default: null },
  bodyClass: String,
  contentClass: String,
  closeOnEscape: { type: Boolean, default: true }
})

const emit = defineEmits(['mounted', 'resize', 'clickOutside'])

const delta = ref({ x: 0, y: 0 })
const impliedSize = ref(props.size)
const currentSize = ref(null)
const moved = ref(false)
const position = ref<DialogPosition>({})
const content = ref<HTMLElement | null>(null)
const body = ref<HTMLElement | null>(null)

let _handleTranslateMove: ((event: any) => void) | null = null
let _handleTranslateRelease: (() => void) | null = null
let _handleResizeMove: ((event: any) => void) | null = null
let _handleResizeRelease: (() => void) | null = null
let _handleEscKey: ((event: any) => void) | null = null
let _handleWindowResize: (() => void) | null = null
let _resizeOrigin: any = null
let _persistTimeout: NodeJS.Timeout | null = null
let _deinteractionTimeout: NodeJS.Timeout | null = null
let _windowResizeTimeout: NodeJS.Timeout | null = null

// Created lifecycle logic
if (props.size) impliedSize.value = props.size

// Handle drag functionality
const handleDrag = event => {
  if (
    _handleTranslateRelease ||
    event.button === 2 ||
    event.target.classList.contains('-no-grab') ||
    event.target.parentElement.classList.contains('-no-grab')
  ) {
    return
  }

  const lastMove = { ...delta.value }
  const startPosition = getEventCords(event)
  const startOffset = content.value?.offsetTop || 0
  const minY = startOffset * -1

  _handleTranslateMove = evnt => {
    moved.value = true
    const endPosition = getEventCords(evnt)
    const x = lastMove.x + endPosition.x - startPosition.x
    const y = Math.max(minY, lastMove.y + endPosition.y - startPosition.y)

    delta.value = { x, y }
    setPosition({ x, y }, true)
  }

  _handleTranslateRelease = () => {
    document.removeEventListener('mousemove', _handleTranslateMove)
    document.removeEventListener('mouseup', _handleTranslateRelease)
    document.removeEventListener('touchmove', _handleTranslateMove)
    document.removeEventListener('touchend', _handleTranslateRelease)
    window.removeEventListener('blur', _handleTranslateRelease)
    _handleTranslateRelease = null
  }

  document.addEventListener('mousemove', _handleTranslateMove)
  document.addEventListener('mouseup', _handleTranslateRelease)
  document.addEventListener('touchmove', _handleTranslateMove)
  document.addEventListener('touchend', _handleTranslateRelease)
  window.addEventListener('blur', _handleTranslateRelease)
}

// Handle resize functionality
const handleResize = event => {
  _resizeOrigin = getEventCords(event)
  const padding = parseInt(getComputedStyle(body.value).padding)

  setPosition({
    w: content.value.clientWidth,
    h: body.value.clientHeight - padding * 2
  })

  _handleResizeMove = event => {
    const coordinates = getEventCords(event)
    const dialogWidth =
      parseInt(content.value.style.width) +
      (coordinates.x - _resizeOrigin.x) * 2
    const dialogHeight =
      parseInt(body.value.style.height) + (coordinates.y - _resizeOrigin.y) * 2

    setPosition({ w: dialogWidth, h: dialogHeight }, true)
    _resizeOrigin = coordinates
  }

  _handleResizeRelease = () => {
    document.removeEventListener('mousemove', _handleResizeMove)
    document.removeEventListener('mouseup', _handleResizeRelease)
    document.removeEventListener('touchmove', _handleResizeMove)
    document.removeEventListener('touchend', _handleResizeRelease)
    window.removeEventListener('blur', _handleResizeRelease)

    document.body.classList.remove('-unselectable')
    _handleResizeRelease = null
  }

  document.addEventListener('mousemove', _handleResizeMove)
  document.addEventListener('mouseup', _handleResizeRelease)
  document.addEventListener('touchmove', _handleResizeMove)
  document.addEventListener('touchend', _handleResizeRelease)
  window.addEventListener('blur', _handleResizeRelease)

  document.body.classList.add('-unselectable')
}

const clickOutside = () => {
  if (dialogService.isInteracting) return
  emit('clickOutside')
}

const close = () => {
  emit('clickOutside')
}

const onMouseDown = () => {
  if (_deinteractionTimeout) clearTimeout(_deinteractionTimeout)
  dialogService.isInteracting = true

  const handler = () => {
    document.removeEventListener('mouseup', handler)
    _deinteractionTimeout = setTimeout(() => {
      dialogService.isInteracting = false
      _deinteractionTimeout = null
    }, 100)
  }
  document.addEventListener('mouseup', handler)
}

const detectSize = w => {
  if (w >= 840) currentSize.value = 'large'
  else if (w > 420) currentSize.value = 'medium'
  else currentSize.value = 'small'
}

const lockSize = position => {
  if (!position) {
    position = { w: content.value.clientWidth, h: body.value.clientHeight }
  }
  content.value.style.maxWidth = '100vw'
  body.value.style.maxHeight = '100vh'
  content.value.style.width = position.w + 'px'
  body.value.style.height = position.h + 'px'
  moved.value = true
}

const savePosition = newPosition => {
  position.value = { ...position.value, ...newPosition }
}

const setPosition = (pos, shouldSavePosition = false) => {
  if (!pos) return

  if (typeof pos.w === 'number' && typeof pos.h === 'number') {
    lockSize(pos)
    detectSize(pos.w)
  }

  if (typeof pos.x === 'number' && typeof pos.y === 'number') {
    content.value.style.transform = `translate(${pos.x}px, ${pos.y}px)`
    delta.value = { x: Math.round(pos.x), y: Math.round(pos.y) }
  }

  if (shouldSavePosition) {
    const { w: savedW, h: savedH } = position.value
    if (
      typeof pos.w === 'number' &&
      typeof pos.h === 'number' &&
      (pos.w !== savedW || pos.h !== savedH)
    ) {
      emit('resize')
    }

    savePosition(pos)
  }

  if (_persistTimeout) clearTimeout(_persistTimeout)
  _persistTimeout = setTimeout(persistPosition, 100)
}

// Lifecycle hooks
onMounted(async () => {
  const parentDialog = getCurrentInstance()?.proxy.$parent as DialogComponent
  if (parentDialog && parentDialog.dialogId) {
    dialogService.dialogPositions[parentDialog.dialogId] = { ...position.value }
  }

  if (props.closeOnEscape) {
    _handleEscKey = event => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('keydown', _handleEscKey)
  }

  await nextTick()
  detectSize(content.value.clientWidth)
  emit('mounted')
})

onBeforeUnmount(() => {
  if (_handleTranslateRelease) _handleTranslateRelease()
  if (_handleResizeRelease) _handleResizeRelease()
  if (_handleEscKey) document.removeEventListener('keydown', _handleEscKey)
  if (_handleWindowResize)
    window.removeEventListener('resize', _handleWindowResize)
})

const bindWindowResize = () => {
  if (_handleWindowResize) return

  _handleWindowResize = () => {
    if (_windowResizeTimeout) clearTimeout(_windowResizeTimeout)
    _windowResizeTimeout = setTimeout(() => {
      detectSize(content.value.clientWidth)
      _windowResizeTimeout = null
    }, 100)
  }

  window.addEventListener('resize', _handleWindowResize)
}

// Bind resize event on window
bindWindowResize()

// Persist position and settings if applicable when window unloads or before component is destroyed
const persistPosition = () => {
  const dialogPosition = { ...position.value }
  const parentDialog = getCurrentInstance()?.proxy.$parent as DialogComponent
  if (parentDialog && parentDialog.dialogId) {
    dialogService.dialogPositions[parentDialog.dialogId] = {
      x: dialogPosition.x,
      y: dialogPosition.y,
      w: dialogPosition.w,
      h: dialogPosition.h
    }
  }
}

// Ensuring everything cleans up properly on unmount
onBeforeUnmount(() => {
  persistPosition()
  if (_handleTranslateRelease) _handleTranslateRelease()
  if (_handleResizeRelease) _handleResizeRelease()
  if (_handleEscKey) document.removeEventListener('keydown', _handleEscKey)
  if (_handleWindowResize)
    window.removeEventListener('resize', _handleWindowResize)
})
</script>
