<template>
  <div class="slider" ref="wrapper" :class="{ '-disabled': disabled }">
    <div class="slider__track" ref="track">
      <div
        class="slider__fill"
        ref="fill"
        @mousedown="select"
        @touchstart="select"
      ></div>
      <div
        v-if="showCompletion"
        class="slider__completion"
        :style="`width: ${handle.position}%`"
      ></div>
      <div ref="inner" class="slider__inner">
        <tippy :distance="24" follow-cursor>
          <template v-slot:trigger>
            <div
              class="slider__handle"
              @mousedown="select"
              @touchstart="select"
              :style="`left: ${handle.position}%; background-color: ${handle.color};`"
            />
          </template>

          <slot name="tooltip" :value="handle.value">
            {{ +handle.value.toFixed(2) }}
          </slot>
        </tippy>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import {
  ref,
  computed,
  defineProps,
  defineEmits,
  onMounted,
  onBeforeUnmount,
  watch,
  withDefaults
} from 'vue'
import { getEventCords } from '@/utils/helpers'

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

const emit = defineEmits(['modelValue', 'reset'])

// Reactive state
const handle = ref({
  value: props.modelValue,
  position: 0,
  color: '#fff'
})
const wrapper = ref<HTMLElement | null>(null)
const track = ref<HTMLElement | null>(null)
const inner = ref<HTMLElement | null>(null)
const fill = ref<HTMLElement | null>(null)
const width = ref(0)
const offsetX = ref(0)
const dblClickTimeout = ref<NodeJS.Timeout | null>(null)
const pendingDblClick = ref(false)
const ticking = ref(false)

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
onMounted(() => {
  window.addEventListener('resize', handleResize)
  initElements()
  updateSize()
  if (props.gradient) initGradient(props.gradient)
  updateHandlePosition(true)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  if (dblClickTimeout.value) clearTimeout(dblClickTimeout.value)
  release()
})

// Methods
function initElements() {
  wrapper.value = document.querySelector('.wrapper') as HTMLElement
  track.value = document.querySelector('.track') as HTMLElement
  inner.value = document.querySelector('.inner') as HTMLElement
  fill.value = document.querySelector('.fill') as HTMLElement
}

function initGradient(gradient: string[]) {
  if (!fill.value) return
  if (gradient.length > 1) {
    fill.value.style.backgroundImage = `linear-gradient(90deg, ${gradient.join(', ')})`
  } else {
    fill.value.style.backgroundImage = ''
    fill.value.style.backgroundColor = gradient[0]
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

  if (dblClickTimeout.value) clearTimeout(dblClickTimeout.value)
  if (pendingDblClick.value) {
    pendingDblClick.value = false
    emit('reset')
    return
  }

  pendingDblClick.value = true
  updateSize()
  track.value?.classList.add('slider--dragging')
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
  track.value?.classList.remove('slider--dragging')
  document.removeEventListener('mousemove', dragging)
  document.removeEventListener('touchmove', dragging)
  document.removeEventListener('mouseup', release)
  document.removeEventListener('touchend', release)

  if (pendingDblClick.value) {
    dblClickTimeout.value = setTimeout(() => {
      pendingDblClick.value = false
      dblClickTimeout.value = null
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

  if (!silent) emit('modelValue', value)
}

function updateSize() {
  if (!inner.value) return
  width.value = inner.value.offsetWidth
  offsetX.value = inner.value.getBoundingClientRect().left
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

  &:hover,
  &--dragging {
    .slider__label {
      visibility: visible;
      opacity: 1;
    }
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

.slider__label {
  position: absolute;
  bottom: 2rem;
  left: 50%;
  z-index: 999;
  padding: 0.5rem;
  min-width: 1rem;
  border-radius: 4px;
  filter: drop-shadow(-1em -1em 3em var(--theme-background-base));
  color: white;
  background-color: rgba(black, 0.75);
  text-align: center;
  font-size: 14px;
  line-height: 1rem;
  transform: translate(-50%, 0);
  white-space: nowrap;
  visibility: hidden;
  opacity: 0;

  &:before {
    position: absolute;
    bottom: -0.5rem;
    left: 50%;
    display: block;
    width: 0;
    height: 0;
    border-width: 0.5rem 0.5rem 0 0.5rem;
    border-style: solid;
    border-color: rgba(black, 0.75) transparent transparent transparent;
    content: '';
    transform: translate3d(-50%, 0, 0);
  }
}

.slider__inner {
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
