<template>
  <div class="slider" ref="wrapper" :class="{ '-disabled': disabled }">
    <div class="slider__track" ref="trackRef">
      <div
        class="slider__fill"
        ref="fillRef"
        @mousedown="select"
        @touchstart="select"
      ></div>
      <div
        v-if="showCompletion"
        class="slider__completion"
        :style="`width: ${handle.position}%`"
      ></div>

      <div ref="innerRef" class="slider__inner">
        <Tippy
          :offset="[0, 24]"
          :tag="null"
          :hide-on-click="false"
          follow-cursor
        >
          <div
            ref="handleRef"
            class="slider__handle"
            @mousedown="select"
            @touchstart="select"
            :style="`left: ${handle.position}%; background-color: ${handle.color};`"
          ></div>
          <template #content>
            <slot name="tooltip" :modelValue="handle.value">
              {{ +handle.value.toFixed(2) }}
            </slot>
          </template>
        </Tippy>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { getEventCords } from '@/utils/helpers'
import { Tippy } from 'vue-tippy'

// Define props with types and defaults
const props = withDefaults(
  defineProps<{
    gradient?: string[]
    colorCode?: boolean
    label?: boolean
    disabled?: boolean
    step?: number
    min?: number
    max: number
    modelValue: number
    showCompletion?: boolean
    log?: boolean
  }>(),
  {
    gradient: null,
    colorCode: false,
    label: false,
    disabled: false,
    step: 1,
    min: 0,
    max: 255,
    modelValue: 0,
    showCompletion: true,
    log: false
  }
)

const emit = defineEmits(['update:modelValue', 'reset'])

// Reactive state
const handleRef = ref<HTMLElement>()
const handle = ref({
  value: props.modelValue,
  position: 0,
  color: '#fff'
})
const wrapper = ref<HTMLElement>(null)
const trackRef = ref<HTMLElement>(null)
const innerRef = ref<HTMLElement>()
const fillRef = ref<HTMLElement>(null)
const width = ref(0)
const offsetX = ref(0)
const pendingDblClick = ref(false)
const ticking = ref(false)

let dblClickTimeout: NodeJS.Timeout

// Computed properties
const sizeRelatedOptions = computed(() => [
  props.log,
  props.min,
  props.max,
  props.step
])

// Watchers
watch(sizeRelatedOptions, () => {
  updateSize()
  updateHandlePosition(true)
})

watch(
  () => props.gradient,
  newGradient => {
    if (newGradient) initGradient(newGradient)
  }
)

watch(
  () => props.modelValue,
  newValue => {
    handle.value.value = newValue
    updateHandlePosition(true)
  }
)

// Lifecycle hooks
onMounted(async () => {
  window.addEventListener('resize', handleResize)
  updateSize()
  if (props.gradient) initGradient(props.gradient)
  updateHandlePosition(true)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  if (dblClickTimeout) clearTimeout(dblClickTimeout)
  release()
})

function initGradient(gradient: string[]) {
  if (!fillRef.value) return
  if (gradient.length > 1) {
    fillRef.value.style.backgroundImage = `linear-gradient(90deg, ${gradient.join(', ')})`
  } else {
    fillRef.value.style.backgroundImage = ''
    fillRef.value.style.backgroundColor = gradient[0]
    handle.value.color = gradient[0]
  }
}

function handleResize() {
  updateSize()
  updateHandlePosition(true)
}

function select(event: MouseEvent | TouchEvent) {
  event.preventDefault()
  if ((event as MouseEvent).buttons === 2) return

  if (dblClickTimeout) clearTimeout(dblClickTimeout)
  if (pendingDblClick.value) {
    pendingDblClick.value = false
    emit('reset')
    return
  }

  pendingDblClick.value = true
  updateSize()
  ticking.value = false
  updateHandleValue(event)
  updateHandlePosition()

  document.addEventListener('mousemove', dragging)
  document.addEventListener('touchmove', dragging)
  document.addEventListener('mouseup', release)
  document.addEventListener('touchend', release)
}

function dragging(event: MouseEvent | TouchEvent) {
  updateHandleValue(event)
  if (!ticking.value) {
    window.requestAnimationFrame(() => {
      updateHandlePosition()
      ticking.value = false
    })
    ticking.value = true
  }
}

function release() {
  document.removeEventListener('mousemove', dragging)
  document.removeEventListener('touchmove', dragging)
  document.removeEventListener('mouseup', release)
  document.removeEventListener('touchend', release)

  if (pendingDblClick.value) {
    dblClickTimeout = setTimeout(() => {
      pendingDblClick.value = false
      dblClickTimeout = null
    }, 150)
  }
}

// Calculate the current slider value from the event
function updateHandleValue(event: MouseEvent | TouchEvent) {
  const { x } = getEventCords(event)
  const range = props.max - props.min
  const logScale =
    width.value / (Math.log(props.max + 1) - Math.log(props.min + 1))
  let value = props.log
    ? Math.exp((x - offsetX.value) / logScale + Math.log(props.min + 1)) - 1
    : ((x - offsetX.value) / width.value) * range + props.min

  // Constrain and round value based on the step
  value = Math.min(props.max, Math.max(props.min, value))
  const stepValue = Math.round(value / props.step) * props.step
  handle.value.value = stepValue
}

// Update the handle position based on the slider value
function updateHandlePosition(silent = false) {
  const { value } = handle.value
  const range = props.max - props.min
  const logScale = Math.log(props.max + 1) - Math.log(props.min + 1)

  handle.value.position = props.log
    ? ((Math.log(value + 1) - Math.log(props.min + 1)) / logScale) * 100
    : ((value - props.min) / range) * 100

  if (!silent) emit('update:modelValue', value)
}

function updateSize() {
  if (!innerRef.value) return
  width.value = innerRef.value.offsetWidth
  offsetX.value = innerRef.value.getBoundingClientRect().left
}
</script>

<style lang="scss">
.slider {
  position: relative;
  display: flex;
  align-items: center;
  box-sizing: border-box;

  &.-alpha {
    .slider__track {
      background-image: $checkerboard;
      background-size: 6px 6px;
      background-position:
        0 0,
        3px -3px,
        0 3px,
        -3px 0px;
    }
  }

  &.-disabled {
    opacity: 0.5;
    pointer-events: none;
  }
}

.slider__input {
  margin-bottom: 0;
  padding: 0.3em;
  margin-left: 0.2em;
  max-width: 70px;
  width: 20%;
  border: 0;
  text-align: center;
  font-size: 12px;
  -webkit-appearance: none;
  appearance: none;
  -moz-appearance: textfield;

  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  &:focus {
    outline: none;
    border-color: $blue;
  }
}

.slider__track {
  position: relative;
  flex: 1;
  margin: 0;
  width: auto;
  height: 8px;
  background: var(--theme-background-200);
  will-change: transfom;
  border-radius: 10px;
  cursor: pointer;
  padding: 0;
}

.slider__handle {
  position: relative;
  position: absolute;
  top: 0;
  left: 0;
  will-change: transform;
  color: black;
  margin: -0.75rem -0.5rem;
  width: 1rem;
  height: 1rem;
  border: 0;
  background-color: currentColor;
  border-radius: 50%;
  cursor: grab;
  box-shadow: 0 1px 0 1px rgba(black, 0.2);

  &:active,
  &:hover {
    box-shadow: 0 0 0 0.5em rgba(white, 0.2);
  }

  &:active {
    cursor: grabbing;
  }
}

.slider__inner {
  display: block;
  position: relative;
  margin: 0 0.5rem;
}

.slider__fill {
  width: 100%;
  height: 100%;
  transform-origin: left top;
  border-radius: 10px;
}

.slider__completion {
  position: absolute;
  top: 0;
  height: 100%;

  border-radius: 10px;
  background-color: var(--theme-buy-base);

  pointer-events: none;
}
</style>
