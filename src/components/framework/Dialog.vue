<template>
  <div
    class="dialog"
    :class="[
      theoricalSize && `dialog--size-${theoricalSize}`,
      currentSize && `dialog--${currentSize}`,
      contrasted && `dialog--contrasted`,
      borderless && `dialog--borderless`,
      resized && `dialog--resized`,
      mask && 'dialog--mask'
    ]"
  >
    <div v-if="mask" class="dialog__mask" @click="onClickOutside" />
    <div
      ref="content"
      class="dialog__content"
      :class="contentClass"
      @click.stop
      @mousedown="onDialogMouseDown"
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
import { isTouchSupported } from '@/utils/touchevent'

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

enum DialogSizeEnum {
  WIDE = 'wide',
  LARGE = 'large',
  MEDIUM = 'medium',
  SMALL = 'small'
}

const emit = defineEmits(['mounted', 'resize', 'close'])

const delta = ref({ x: 0, y: 0 })
const theoricalSize = ref<DialogSizeEnum>(props.size as DialogSizeEnum) // theorical size
const currentSize = ref<DialogSizeEnum>(null) // actual size
const resized = ref(false) // manually resized by user
const position = ref<DialogPosition>({}) // current position/size (storage, not bound to style)
const content = ref<HTMLElement | null>(null) // the dialog content (header + body + footer)
const body = ref<HTMLElement | null>(null) // body

// Temporary handlers
let _handleTranslateMove: ((event: any) => void) | null = null
let _handleTranslateRelease: (() => void) | null = null
let _handleResizeMove: ((event: any) => void) | null = null
let _handleResizeRelease: (() => void) | null = null
let _handleEscKey: ((event: any) => void) | null = null
let _handleWindowResize: (() => void) | null = null

// temporary storages
let _resizeOrigin: any = null // to track delta when resizing
let _persistTimeout: NodeJS.Timeout | null = null
let _deinteractionTimeout: NodeJS.Timeout | null = null
let _windowResizeTimeout: NodeJS.Timeout | null = null

// Created lifecycle logic
if (props.size) theoricalSize.value = props.size as DialogSizeEnum

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
    resized.value = true
    const endPosition = getEventCords(evnt)
    const x = lastMove.x + endPosition.x - startPosition.x
    const y = Math.max(minY, lastMove.y + endPosition.y - startPosition.y)

    delta.value = { x, y }
    setPosition({ x, y }, true)
  }

  _handleTranslateRelease = () => {
    if (isTouchSupported()) {
      document.removeEventListener('touchmove', _handleTranslateMove)
      document.removeEventListener('touchend', _handleTranslateRelease)
    } else {
      document.removeEventListener('mousemove', _handleTranslateMove)
      document.removeEventListener('mouseup', _handleTranslateRelease)
    }
    window.removeEventListener('blur', _handleTranslateRelease)
    _handleTranslateRelease = null
  }

  if (isTouchSupported()) {
    document.addEventListener('touchmove', _handleTranslateMove)
    document.addEventListener('touchend', _handleTranslateRelease)
  } else {
    document.addEventListener('mousemove', _handleTranslateMove)
    document.addEventListener('mouseup', _handleTranslateRelease)
  }
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
    if (event.type === 'touchstart') {
      document.removeEventListener('touchmove', _handleResizeMove)
      document.removeEventListener('touchend', _handleResizeRelease)
    } else {
      document.removeEventListener('mousemove', _handleResizeMove)
      document.removeEventListener('mouseup', _handleResizeRelease)
    }
    window.removeEventListener('blur', _handleResizeRelease)

    document.body.classList.remove('-unselectable')
    _handleResizeRelease = null
  }

  if (event.type === 'touchstart') {
    document.addEventListener('touchmove', _handleResizeMove)
    document.addEventListener('touchend', _handleResizeRelease)
  } else {
    document.addEventListener('mousemove', _handleResizeMove)
    document.addEventListener('mouseup', _handleResizeRelease)
  }
  window.addEventListener('blur', _handleResizeRelease)

  document.body.classList.add('-unselectable')
}

const onClickOutside = () => {
  if (dialogService.isInteracting) return
  emit('close')
}

const close = () => {
  emit('close')
}

/**
 * Keep track of direct interaction with Dialog
 * Prevents hiding the Dialog when mousedown started inside and ended outside
 */
const onDialogMouseDown = () => {
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

/**
 * Refresh current dialog's breakpoint
 * @param w
 */
const refreshBreakpoint = w => {
  if (w >= 840) currentSize.value = DialogSizeEnum.LARGE
  else if (w > 420) currentSize.value = DialogSizeEnum.MEDIUM
  else currentSize.value = DialogSizeEnum.SMALL
}

const setArbitrarySize = position => {
  content.value.style.width = position.w + 'px'
  body.value.style.height = position.h + 'px'

  if (resized.value) {
    return
  }

  content.value.style.maxWidth = '100vw'
  body.value.style.maxHeight = '100vh'
  resized.value = true
}

const setPosition = (pos, shouldSavePosition = false) => {
  if (!pos) return

  if (typeof pos.w === 'number' && typeof pos.h === 'number') {
    setArbitrarySize(pos)

    if (position.value.w !== pos.w || position.value.h !== pos.h) {
      refreshBreakpoint(pos.w)
    }
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

    position.value = { ...position.value, ...pos }
  }

  if (_persistTimeout) clearTimeout(_persistTimeout)
  _persistTimeout = setTimeout(persistPosition, 100)
}

// Lifecycle hooks
onMounted(async () => {
  const parentDialog = getCurrentInstance()?.proxy.$parent as DialogComponent
  if (parentDialog && parentDialog.dialogId) {
    const savedPosition = dialogService.dialogPositions[parentDialog.dialogId]
    if (typeof savedPosition?.x === 'number') {
      const innerWidth = window.innerWidth / 3
      const innerHeight = window.innerHeight / 3
      savedPosition.x = Math.max(
        -innerWidth,
        Math.min(innerWidth, savedPosition.x)
      )
      savedPosition.y = Math.max(
        -innerHeight,
        Math.min(innerHeight, savedPosition.y)
      )
    }

    setPosition(savedPosition, true)
  }

  await nextTick()
  refreshBreakpoint(content.value.clientWidth)
  emit('mounted')
})

onBeforeUnmount(() => {
  if (_handleTranslateRelease) _handleTranslateRelease()
  if (_handleResizeRelease) _handleResizeRelease()
  if (_handleEscKey) document.removeEventListener('keydown', _handleEscKey)
  if (_handleWindowResize)
    window.removeEventListener('resize', _handleWindowResize)
})

const bindGlobalEvents = () => {
  if (props.closeOnEscape && !_handleEscKey) {
    _handleEscKey = event => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('keydown', _handleEscKey)
  }

  if (!_handleWindowResize) {
    _handleWindowResize = () => {
      if (_windowResizeTimeout) clearTimeout(_windowResizeTimeout)
      _windowResizeTimeout = setTimeout(() => {
        refreshBreakpoint(content.value.clientWidth)
        _windowResizeTimeout = null
      }, 100)
    }

    window.addEventListener('resize', _handleWindowResize)
  }
}

// Bind resize event on window
bindGlobalEvents()

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

defineExpose({
  content,
  body,
  currentSize
})
</script>
