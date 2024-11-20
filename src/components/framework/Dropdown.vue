<template>
  <transition
    name="dropdown"
    @enter="onEnterStart"
    @after-enter="emit('opened')"
    @before-leave="emit('closed')"
  >
    <div
      ref="elementRef"
      class="dropdown hide-scrollbar"
      :class="[
        noScroll && 'dropdown--no-scroll',
        transparent && 'dropdown--transparent'
      ]"
      v-if="triggerElement"
      :style="{ top: top + 'px', left: left + 'px' }"
      @click.stop="!interactive && toggle(null, true)"
    >
      <slot />
    </div>
  </transition>
</template>

<script lang="ts" setup>
import {
  ref,
  watch,
  onMounted,
  onBeforeUnmount,
  defineProps,
  defineEmits,
  nextTick
} from 'vue'
import { isTouchSupported } from '@/utils/touchevent'

const props = defineProps({
  value: {
    type: Object,
    default: null
  },
  margin: {
    type: Number,
    default: 16
  },
  interactive: {
    type: Boolean,
    default: false
  },
  isolate: {
    type: Boolean,
    default: false
  },
  noScroll: {
    type: Boolean,
    default: false
  },
  onSides: {
    type: Boolean,
    default: false
  },
  transparent: {
    type: Boolean,
    default: false
  },
  autoFocus: {
    type: Boolean,
    default: false
  },
  draggable: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['input', 'opened', 'closed'])

// State refs
const triggerElement = ref<any>(props.value || null)
const top = ref<number | null>(null)
const left = ref<number | null>(null)
const elementRef = ref<HTMLElement>()

// Internal refs for resize and outside-click handling
let _resizeHandler: (() => void) | null = null
let _resizeTimeout: ReturnType<typeof setTimeout> | null = null
let clickOutsideHandler: ((event: MouseEvent | TouchEvent) => void) | null =
  null

// Watch for changes in `value` prop to toggle dropdown
watch(
  () => props.value,
  newTrigger => toggle(newTrigger)
)

// Lifecycle hooks
onMounted(() => {
  if (props.value) {
    toggle(props.value)
  }
})

onBeforeUnmount(() => {
  toggle(null, true)
  if (_resizeHandler) {
    window.removeEventListener('resize', _resizeHandler)
  }
  if (clickOutsideHandler) {
    document.removeEventListener(
      isTouchSupported() ? 'touchstart' : 'mousedown',
      clickOutsideHandler
    )
  }
})

// Methods

const toggle = (newTriggerElement: any, emitInput = false) => {
  const nextTrigger =
    newTriggerElement && newTriggerElement !== triggerElement.value
      ? newTriggerElement
      : null

  if (triggerElement.value) {
    close()
  }

  triggerElement.value = nextTrigger

  if (nextTrigger) {
    open(nextTrigger)
  }

  if (emitInput) {
    emit('input', triggerElement.value)
  }
}

const open = async (nextTrigger: any) => {
  if (nextTrigger instanceof HTMLElement) {
    nextTrigger.classList.add('dropdown-trigger')
  }
  document
    .getElementById('app')
    ?.appendChild(triggerElement.value as HTMLElement)

  bindResize()
  await nextTick()

  if (!props.isolate) {
    bindClickOutside()
  }
}

const close = () => {
  if (!triggerElement.value) return
  if (triggerElement.value instanceof HTMLElement) {
    triggerElement.value.classList.remove('dropdown-trigger')
  }
  unbindResize()
  unbindClickOutside()
}

const fitScreen = () => {
  if (
    !triggerElement.value ||
    !(triggerElement.value as HTMLElement).getBoundingClientRect
  )
    return

  const dropdownElement = triggerElement.value as HTMLElement
  const triggerRect =
    triggerElement.value instanceof HTMLElement
      ? triggerElement.value.getBoundingClientRect()
      : triggerElement.value
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const dropdownWidth = dropdownElement.offsetWidth * 1.25

  left.value = Math.max(
    props.margin,
    Math.min(
      triggerRect.left + triggerRect.width / 2 - dropdownWidth / 2,
      viewportWidth - dropdownWidth - props.margin * 2
    )
  )

  const triggerIsLowerThanViewportMiddle = triggerRect.top > viewportHeight / 2
  if (triggerIsLowerThanViewportMiddle) {
    top.value = triggerRect.top - dropdownElement.offsetHeight - props.margin
  } else {
    top.value = triggerRect.top + triggerRect.height + props.margin
  }
}

const onResize = () => {
  if (_resizeTimeout) clearTimeout(_resizeTimeout)
  _resizeTimeout = setTimeout(() => {
    fitScreen()
    _resizeTimeout = null
  }, 500)
}

const bindResize = () => {
  if (_resizeHandler) return
  _resizeHandler = onResize
  window.addEventListener('resize', _resizeHandler)
}

const unbindResize = () => {
  if (_resizeHandler) {
    window.removeEventListener('resize', _resizeHandler)
    _resizeHandler = null
  }
}

const bindClickOutside = () => {
  if (clickOutsideHandler) return

  clickOutsideHandler = (event: MouseEvent | TouchEvent) => {
    let isOutside = true
    let element = event.target as HTMLElement
    let depth = 0

    while (isOutside && depth++ < 10 && (element = element.parentElement)) {
      if (element.classList.contains('dropdown')) {
        isOutside = false
      }
    }

    if (isOutside) {
      toggle(null, true)
    }
  }

  document.addEventListener(
    isTouchSupported() ? 'touchstart' : 'mousedown',
    clickOutsideHandler
  )
}

const unbindClickOutside = () => {
  if (clickOutsideHandler) {
    document.removeEventListener(
      isTouchSupported() ? 'touchstart' : 'mousedown',
      clickOutsideHandler
    )
    clickOutsideHandler = null
  }
}

/**
 * Enter animation started
 */
const onEnterStart = async () => {
  await nextTick()

  fitScreen()

  if (props.autoFocus) {
    const button = elementRef.value.querySelector('button')

    if (button) {
      button.focus()
    }
  }
}

defineExpose({ toggle })
</script>

<style lang="scss" scoped>
.dropdown {
  position: fixed;
  z-index: 10;
  border-radius: 0.75em;
  background-color: var(--theme-background-150);
  box-shadow: rgba(0, 0, 0, 0.2) 0px 18px 50px -10px;
  max-height: 150px;
  max-width: 300px;
  overflow-y: auto;
  text-align: left;

  &--transparent {
    box-shadow: none;
    background: 0;
  }

  &--no-scroll {
    overflow: visible;
  }

  &-enter-active {
    transition:
      all 0.1s $ease-out-expo,
      transform 0.1s $ease-elastic;
    pointer-events: none;
  }

  &-leave-active {
    transition: all 0.2s $ease-out-expo;
  }

  &-leave,
  &-enter-to {
    opacity: 1;
    transform: none;
  }

  &-enter,
  &-leave-to {
    opacity: 0;
    transform: scale(0.8);
  }

  ::v-deep(&-divider) {
    background-color: var(--theme-background-200);
    height: 1px;
    padding: 0;
    margin: 0.5em 0;
    position: relative;

    &[data-label]:before {
      content: attr(data-label);
      position: absolute;
      color: white;
      background-color: var(--theme-background-150);
      color: var(--theme-background-300);
      font-weight: 600;
      padding: 0 0.25rem;
      font-size: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      left: 0.5rem;
      margin-top: -1px;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
      max-width: 80%;
    }

    &:first-child {
      margin-top: 0.75rem;
      background: 0;

      &:before {
        padding-left: 0;
      }
    }
  }

  ::v-deep(&-item) {
    border: 0;
    background: 0;
    padding: 0.625em;
    display: flex;
    align-items: center;
    color: var(--theme-color-base);
    font-family: $font-base;
    width: 100%;
    box-sizing: border-box;
    font-size: 1em;
    border-radius: 0;
    box-shadow: none;
    line-height: 1;
    cursor: pointer;
    text-decoration: none;

    &:hover {
      background-color: var(--theme-color-o10);
    }

    &--active {
      font-weight: 600;
      background-color: var(--theme-background-100);

      &:hover {
        background-color: var(--theme-background-100);
      }
    }

    &--group {
      padding: 0;

      span {
        padding: 0.625em;
      }
    }

    &--narrow {
      padding-block: 0.375rem;
    }

    &__subtitle {
      opacity: 0.5;
      font-size: 0.875em;
      margin-top: 0.25em;
    }

    &__emoji {
      width: 1em;
      padding-right: 1em;
      font-size: 0.75em;
    }

    &__icon {
      padding: 0 0.375rem;
    }

    &--space-between {
      justify-content: space-between;
    }

    > i:first-child {
      margin-right: 0.5em;
    }

    > i:last-child {
      margin-left: 0.5em;
    }
  }
}
</style>
