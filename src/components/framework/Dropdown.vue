<template>
  <div ref="elementRef" class="dropdown__container">
    <transition
      name="dropdown"
      @after-enter="onAfterEnter"
      @after-leave="onAfterLeave"
    >
      <div
        class="dropdown hide-scrollbar"
        :class="[
          noScroll && 'dropdown--no-scroll',
          transparent && 'dropdown--transparent'
        ]"
        v-if="triggerElement"
        @click.stop="!interactive && toggle(null, true)"
      >
        <slot />
      </div>
    </transition>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { isTouchSupported } from '@/utils/touchevent'
import {
  createPopper,
  Instance as PopperInstance,
  Placement
} from '@popperjs/core'

const props = defineProps({
  modelValue: {
    type: HTMLElement,
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
  transparent: {
    type: Boolean,
    default: false
  },
  autoFocus: {
    type: Boolean,
    default: false
  },
  placement: {
    type: String as () => Placement,
    default: 'bottom' // Default placement; can be 'top', 'bottom', 'left', 'right', etc.
  }
})

const emit = defineEmits(['update:modelValue', 'opened', 'closed'])

// State refs
const triggerElement = ref<any>(props.modelValue || null)
const elementRef = ref<HTMLElement>()
let popperInstance: PopperInstance | null = null

// Internal refs for resize and outside-click handling
let clickOutsideHandler: ((event: MouseEvent | TouchEvent) => void) | null =
  null

// Watch for changes in `modelValue` prop to toggle dropdown
watch(
  () => props.modelValue,
  newTrigger => toggle(newTrigger)
)

// Lifecycle hooks
onMounted(() => {
  if (props.modelValue) {
    toggle(props.modelValue)
  }
})

onBeforeUnmount(() => {
  toggle(null, true)

  destroyPopperInstance()
})

// Methods

const toggle = async (newTriggerElement: any, emitInput = false) => {
  const nextTrigger =
    newTriggerElement && newTriggerElement !== triggerElement.value
      ? newTriggerElement
      : null

  if (triggerElement.value) {
    close()
  }

  triggerElement.value = nextTrigger

  if (
    nextTrigger &&
    (nextTrigger.getBoundingClientRect ||
      typeof nextTrigger.top !== 'undefined')
  ) {
    await open(nextTrigger)
  }

  if (emitInput) {
    emit('update:modelValue', triggerElement.value)
  }
}

const open = async (nextTrigger: any) => {
  if (nextTrigger instanceof HTMLElement) {
    nextTrigger.classList.add('dropdown-trigger')
  }

  await nextTick()

  // document.getElementById('app')?.appendChild(elementRef.value as HTMLElement)

  createPopperInstance()

  if (!props.isolate) {
    bindClickOutside()
  }
}

const close = () => {
  if (triggerElement.value instanceof HTMLElement) {
    triggerElement.value.classList.remove('dropdown-trigger')
  }

  unbindClickOutside()
}

const createPopperInstance = () => {
  if (!triggerElement.value || !elementRef.value) {
    return
  }

  if (popperInstance) {
    popperInstance.update()
    return
  }

  popperInstance = createPopper(triggerElement.value, elementRef.value, {
    placement: props.placement,
    modifiers: [
      {
        name: 'offset',
        options: {
          offset: [props.margin, props.margin]
        }
      },
      {
        name: 'preventOverflow',
        options: {
          padding: props.margin
        }
      },
      {
        name: 'flip',
        options: {
          fallbackPlacements: ['top', 'right', 'left']
        }
      }
    ]
  })
}

const destroyPopperInstance = () => {
  if (popperInstance) {
    popperInstance.destroy()
    popperInstance = null
  }
}

const bindClickOutside = () => {
  if (clickOutsideHandler) return

  clickOutsideHandler = (event: MouseEvent | TouchEvent) => {
    if (event.defaultPrevented || (event as any).button === 2) {
      return
    }

    let isOutside = true
    let element = event.target as HTMLElement | null
    let depth = 0

    while (isOutside && depth++ < 10 && element && (element = element.parentElement)) {
      if (element.classList.contains('dropdown')) {
        isOutside = false
      }
    }

    if (
      isOutside &&
      (typeof triggerElement.value.top !== 'undefined' ||
        (!triggerElement.value.contains(event.target) &&
          triggerElement.value !== event.target))
    ) {
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

const onAfterEnter = () => {
  emit('opened')

  if (props.autoFocus) {
    const button = elementRef.value?.querySelector('button') as HTMLElement

    if (button) {
      button.focus()
    }
  }
}

const onAfterLeave = () => {
  emit('closed')
}

defineExpose({ toggle })
</script>

<style lang="scss" scoped>
.dropdown {
  z-index: 10;
  border-radius: 0.75em;
  background-color: var(--theme-background-150);
  box-shadow: rgba(0, 0, 0, 0.2) 0px 18px 50px -10px;
  max-height: 150px;
  max-width: 300px;
  overflow-y: auto;
  text-align: left;

  &__container {
    position: absolute;
  }

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

  &-enter-from,
  &-leave-to {
    opacity: 0;
    transform: scale(0.8);
  }

  :deep(.dropdown-divider) {
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

  :deep(.dropdown-item) {
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

    &.dropdown-item--active {
      font-weight: 600;
      background-color: var(--theme-background-100);

      &:hover {
        background-color: var(--theme-background-100);
      }
    }

    &.dropdown-item--group {
      padding: 0;

      span {
        padding: 0.625em;
      }
    }

    &.dropdown-item--narrow {
      padding-block: 0.375rem;
    }

    .dropdown-item__subtitle {
      opacity: 0.5;
      font-size: 0.875em;
      margin-top: 0.25em;
    }

    .dropdown-item__emoji {
      width: 1em;
      padding-right: 1em;
      font-size: 0.75em;
    }

    .dropdown-item__icon {
      padding: 0 0.375rem;
    }

    &.dropdown-item--space-between {
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
