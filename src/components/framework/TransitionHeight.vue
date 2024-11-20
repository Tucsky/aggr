<template>
  <component
    ref="elementRef"
    :is="type"
    class="transition-height"
    :name="name"
    :tag="tag"
    :duration="duration"
    @before-enter="beforeEnter"
    @enter="enter"
    @before-leave="beforeLeave"
    @after-enter="afterEnter"
    @leave="leave"
  >
    <slot />
  </component>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

// Props
const props = defineProps({
  single: {
    type: Boolean,
    default: false
  },
  name: {
    type: String,
    default: 'transition-height'
  },
  tag: {
    type: String,
    default: 'div'
  },
  duration: {
    type: Number,
    default: null
  },
  stepper: {
    type: Boolean,
    default: false
  },
  wrapped: {
    type: Boolean,
    default: false
  },
  autoWidth: {
    type: Boolean,
    default: false
  },
  fillHeight: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['after-enter'])

// Refs
const elementRef = ref()

// Computed properties
const type = computed(() => (props.single ? 'transition' : 'transition-group'))

// Methods
function beforeEnter(element) {
  if (props.stepper) {
    elementRef.value.$el.style.height = `${elementRef.value.$el.clientHeight}px`
    element.style.top = '0px'
    element.style.left = '0px'
    element.style.right = '0px'
  }

  element.style.position = 'absolute'

  if (props.autoWidth) {
    element.style.left = '0px'
    element.style.right = '0px'
  }

  if (props.fillHeight) {
    element.style.bottom = '0px'
  }
}

async function enter(element) {
  const height = getElementHeight(element)

  if (props.stepper) {
    elementRef.value.$el.style.height = height
  } else {
    if (props.autoWidth) {
      element.style.left = '0px'
      element.style.right = '0px'
    }
    element.style.height = '0px'
    element.style.position = ''

    setTimeout(() => {
      element.style.height = height
    }, 100)
  }
}

function afterEnter(element) {
  if (props.stepper) {
    elementRef.value.$el.style.height = ''
    element.style.top = ''
    element.style.left = ''
    element.style.right = ''
  }

  element.style.position = ''
  element.style.left = ''
  element.style.right = ''
  element.style.bottom = ''
  element.style.height = ''

  // Emit event after enter transition completes
  emit('after-enter', element)
}

function beforeLeave(element) {
  element.style.height = `${element.clientHeight}px`
}

function leave(element) {
  setTimeout(() => {
    element.style.height = '0px'
  })
}

function getElementHeight(element) {
  let height

  if (props.wrapped) {
    height = element.children[0].clientHeight
  } else {
    height = element.clientHeight
  }

  return height ? `${height}px` : '0px'
}
</script>

<style lang="scss">
.transition-height {
  transition: height 0.25s $ease-out-expo;

  &-leave-active,
  &-enter-active {
    overflow: hidden;
    transition: all 0.25s $ease-out-expo;
  }

  &-enter,
  &-leave-to {
    opacity: 0;
  }
}

.transition-height-scale {
  &-enter-active {
    transition:
      all 0.25s $ease-out-expo 0.15s,
      height 0.375s $ease-out-expo;
  }

  &-leave-active {
    transition: all 0.15s $ease-out-expo;
  }

  &-enter,
  &-leave-to {
    opacity: 0;
    transform: scale(0.8);
  }
}

.slide-fade-right,
.slide-fade-left {
  &-enter-active,
  &-leave-active {
    transition: all 0.25s $ease-out-expo;
  }

  &-enter,
  &-leave-to {
    opacity: 0;
  }
}

.slide-fade-left {
  &-enter {
    transform: translateX(-2rem);
  }

  &-leave-to {
    transform: translateX(2rem);
  }
}

.slide-fade-right {
  &-enter {
    transform: translateX(2rem);
  }

  &-leave-to {
    transform: translateX(-2rem);
  }
}
</style>
