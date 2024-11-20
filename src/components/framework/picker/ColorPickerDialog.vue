<template>
  <transition name="dialog" :duration="300" @after-leave="close">
    <Dialog
      v-if="opened"
      class="color-picker-dialog"
      :resizable="false"
      ref="dialogRef"
      :mask="false"
      size="small"
      borderless
      @mousedown.native.stop
      @close="hide"
    >
      <template v-slot:header>
        <div>
          <div class="dialog__title">{{ label }}</div>
        </div>
      </template>
      <div
        ref="canvasRef"
        class="color-picker-dialog-canvas"
        @mousedown="startMovingThumbWithMouse"
        @touchstart="startMovingThumbWithTouch"
      >
        <div
          ref="thumbRef"
          class="color-picker-dialog-canvas__thumb"
          tabindex="0"
          aria-label="Color space thumb"
        />
      </div>
      <div class="color-picker-dialog-sliders">
        <Slider
          class="color-picker-dialog-sliders__hue"
          :showCompletion="false"
          :gradient="['#f00', '#ff0', '#0f0', '#0ff', '#00f', '#f0f', '#f00']"
          :max="360"
          v-model="hue"
          @input="updateHue(hue)"
        ></Slider>
        <Slider
          class="color-picker-dialog-sliders__alpha -alpha"
          :gradient="[
            `rgba(${colors.rgb.r * 255}, ${colors.rgb.g * 255}, ${
              colors.rgb.b * 255
            }, 0)`,
            `rgba(${colors.rgb.r * 255}, ${colors.rgb.g * 255}, ${
              colors.rgb.b * 255
            }, 1)`
          ]"
          :min="0"
          :max="1"
          :step="0.01"
          :showCompletion="false"
          v-model="alpha"
          @input="updateAlpha(alpha)"
        >
        </Slider>
      </div>
      <div class="color-picker-dialog-controls">
        <button
          class="btn -text -small"
          @click="switchFormat"
          type="button"
          title="Rotate"
          v-tippy
        >
          <i class="icon-refresh"></i>
        </button>
        <editable
          class="form-control hide-scrollbar"
          :value="displayColor"
          @input="setColorFromProp($event)"
        ></editable>
        <button
          class="btn -text -small"
          @click="submitColor"
          type="button"
          title="Save color"
          v-tippy
        >
          <i class="icon-save"></i>
        </button>
      </div>
      <template v-if="showPalette">
        <div class="color-picker-dialog-colors">
          <button
            type="button"
            class="btn color-picker-dialog-colors__color"
            v-for="clr in swatches"
            :class="[
              clr === outputColor && 'color-picker-dialog-colors__color--active'
            ]"
            :key="clr"
            :style="`color: ${clr}`"
            @click.prevent="setColorFromProp(clr)"
          ></button>
          <button
            type="button"
            class="btn color-picker-dialog-colors__color color-picker-dialog-colors__color--transparent"
            @click.prevent="setTransparent"
            title="Transparent"
            v-tippy="{ distance: 16 }"
          ></button>
          <button
            type="button"
            class="btn -text color-picker-dialog-colors__color color-picker-dialog-colors__color--null"
            @click.prevent="setNull"
            title="Default color"
            v-tippy="{ distance: 16 }"
          >
            <i class="icon-cross -small"></i>
          </button>
        </div>
        <div class="color-picker-dialog-colors">
          <a
            class="color-picker-dialog-colors__color"
            role="button"
            href="#"
            v-for="clr in recentColors"
            :key="clr"
            :style="`color: ${clr}`"
            :class="[
              clr === outputColor && 'color-picker-dialog-colors__color--active'
            ]"
            @click.prevent="selectRecentColor($event, clr)"
          >
          </a>
        </div>
      </template>
    </Dialog>
  </transition>
</template>
<script setup lang="ts">
import {
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  onBeforeMount,
  nextTick
} from 'vue'
import { useDialog } from '@/composables/useDialog'
import Dialog from '@/components/framework/Dialog.vue'
import Slider from '@/components/framework/picker/Slider.vue'
import workspacesService from '@/services/workspacesService'
import {
  clamp,
  colorsAreValueEqual,
  conversions,
  copyColorObject,
  formatAsCssColor,
  parsePropsColor
} from '@/utils/picker'
import {
  getAppBackgroundColor,
  getColorLuminance,
  getLinearShade,
  joinRgba,
  PALETTE,
  splitColorCode
} from '@/utils/colors'

const ALLOWED_VISIBLE_FORMATS = ['hex', 'hsl', 'rgb']

const props = defineProps({
  value: {
    type: String,
    default: '#000'
  },
  label: {
    type: String,
    default: 'Select color'
  },
  outputFormat: {
    type: String,
    default: 'rgb'
  },
  showPalette: {
    type: Boolean,
    default: true
  },
  onInput: {
    type: Function,
    default: null
  }
})

const emit = defineEmits(['close', 'input'])

const { opened, close, hide } = useDialog()
defineExpose({ close, setColorFromProp })

const colors = ref({
  hex: '#ffffffff',
  hsl: { h: 0, s: 0, l: 1, a: 1 },
  hsv: { h: 0, s: 0, v: 1, a: 1 },
  rgb: { r: 1, g: 1, b: 1, a: 1 }
})
const activeFormat = ref('rgb')
const recentColors = ref<string[]>([])
const movingFromCanvas = ref(false)
const hue = ref<number | null>(null)
const alpha = ref(1)
const dialogRef = ref<InstanceType<typeof Dialog> | null>(null)
const canvasRef = ref<HTMLElement | null>(null)
const thumbRef = ref<HTMLElement | null>(null)

const swatches = computed(() => PALETTE)
const outputColor = computed(() => {
  const activeColor = colors.value[props.outputFormat]
  return formatAsCssColor(activeColor, props.outputFormat)
})
const displayColor = computed(() => {
  if (activeFormat.value === props.outputFormat) return outputColor.value
  const activeColor = colors.value[activeFormat.value]
  return formatAsCssColor(activeColor, activeFormat.value)
})

onBeforeMount(() => {
  workspacesService.getColors().then(retrievedColors => {
    recentColors.value.push(...retrievedColors)
  })

  if (props.value && typeof props.value === 'string') {
    setColorFromProp(props.value, true)
  }
})

onMounted(async () => {
  const passive = { passive: true }
  document.addEventListener('mousemove', moveThumbWithMouse, passive)
  document.addEventListener('touchmove', moveThumbWithTouch, passive)
  document.addEventListener('mouseup', stopMovingThumb, passive)
  document.addEventListener('touchend', stopMovingThumb)

  await nextTick()
  updateCanvas(colors.value)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousemove', moveThumbWithMouse)
  document.removeEventListener('touchmove', moveThumbWithTouch)
  document.removeEventListener('mouseup', stopMovingThumb)
  document.removeEventListener('touchend', stopMovingThumb)
})

function setColor(format: string, color: any, silent?: boolean) {
  if (!colorsAreValueEqual(colors.value[format], color)) {
    colors.value[format] = color
    applyColorUpdates(format)
    if (!silent && typeof props.onInput === 'function') {
      props.onInput(outputColor.value)
    }
  }
}

const switchFormat = () => {
  const activeFormatIndex = ALLOWED_VISIBLE_FORMATS.findIndex(
    format => format === activeFormat.value
  )

  const newFormatIndex =
    activeFormatIndex === ALLOWED_VISIBLE_FORMATS.length - 1
      ? 0
      : activeFormatIndex + 1

  activeFormat.value = ALLOWED_VISIBLE_FORMATS[newFormatIndex]
}

const addColorToHistory = color => {
  if (recentColors.value.indexOf(color) !== -1) {
    return
  }

  workspacesService.saveColor(color)
  recentColors.value.push(color)

  if (recentColors.value.length > 32) {
    workspacesService.removeColor(recentColors.value.shift())
  }
}

const selectRecentColor = (event, color) => {
  if (event.shiftKey) {
    const index = recentColors.value.indexOf(color)

    if (index !== -1) {
      workspacesService.removeColor(recentColors.value.splice(index, 1)[0])
    }

    return
  }

  setColorFromProp(color)
}
const submitColor = () => {
  addColorToHistory(outputColor.value)
}
const updateHue = value => {
  const hsvColor = copyColorObject(colors.value.hsv)
  hsvColor.h = value / 360

  setColor('hsv', hsvColor)
}
const updateAlpha = value => {
  const hsvColor = copyColorObject(colors.value.hsv)
  hsvColor.a = value

  setColor('hsv', hsvColor)
}

const setTransparent = () => {
  updateAlpha(0)
}

const setNull = () => {
  setColorFromProp('rgba(0,0,0,0)', true)
  emit('input', null)
}

function setColorFromProp(propsColor: string | any, silent = false) {
  if (propsColor === null) return
  const result = parsePropsColor(propsColor)
  if (result) {
    activeFormat.value = result.format
    if (result.color.a === 1 && !silent && alpha.value < 1) {
      result.color.a = alpha.value
    }
    setColor(result.format, result.color, silent)
  }
}

function moveThumbWithTouch(event: TouchEvent) {
  if (!movingFromCanvas.value) return
  const touchPoint = event.touches[0]
  moveThumb(touchPoint.clientX, touchPoint.clientY)
}

/**
 * @param {MouseEvent} event
 */
const startMovingThumbWithMouse = event => {
  movingFromCanvas.value = true
  moveThumbWithMouse(event)
}

/**
 * @param {TouchEvent} event
 */
const startMovingThumbWithTouch = event => {
  movingFromCanvas.value = true
  moveThumbWithTouch(event)
}

function moveThumbWithMouse(event: MouseEvent) {
  if (event.buttons !== 1 || !movingFromCanvas.value) return
  moveThumb(event.clientX, event.clientY)
}

function moveThumb(clientX: number, clientY: number) {
  const newThumbPosition = getNewThumbPosition(clientX, clientY)
  const hsvColor = copyColorObject(colors.value.hsv)
  hsvColor.s = newThumbPosition.x
  hsvColor.v = newThumbPosition.y
  setColor('hsv', hsvColor)
}

function stopMovingThumb() {
  movingFromCanvas.value = false
}

function getNewThumbPosition(clientX: number, clientY: number) {
  const rect = canvasRef.value.getBoundingClientRect()
  const x = clientX - rect.left
  const y = clientY - rect.top
  return {
    x: clamp(x / rect.width, 0, 1),
    y: clamp(1 - y / rect.height, 0, 1)
  }
}

function applyColorUpdates(sourceFormat: string) {
  for (const [format, convert] of conversions[sourceFormat]) {
    colors.value[format] = convert(colors.value[sourceFormat])
  }
  hue.value = colors.value.hsl.h * 360
  alpha.value = colors.value.rgb.a
  updateCanvas(colors.value)
}

function updateCanvas(colors: any) {
  if (!canvasRef.value) return
  dialogRef.value.content.style.setProperty(
    '--vacp-hsl-h',
    String(colors.hsl.h)
  )
  dialogRef.value.content.style.setProperty(
    '--text-color',
    getLinearShadeText(outputColor.value)
  )
  dialogRef.value.content.style.setProperty(
    '--background-color',
    outputColor.value
  )
  canvasRef.value.setAttribute(
    'style',
    `
    position: relative;
    background-color: hsl(calc(var(--vacp-hsl-h) * 360) 100% 50%); /* 1. */
    background-image:
      linear-gradient(to top, #000, transparent),  /* 2. */
      linear-gradient(to right, #fff, transparent) /* 2. */
    ;
  `
  )
  thumbRef.value.setAttribute(
    'style',
    `
    box-sizing: border-box;
    position: absolute;
    left: ${colors.hsv.s * 100}%;   /* 3. */
    bottom: ${colors.hsv.v * 100}%; /* 3. */
  `
  )
}

function getLinearShadeText(backgroundColor: string) {
  if (!backgroundColor) return ''
  const color = splitColorCode(backgroundColor, getAppBackgroundColor())
  const scaledColor = getLinearShade(
    color,
    0.75 * (getColorLuminance(color) > 0 ? -1 : 1)
  )
  return joinRgba(scaledColor)
}
</script>
<style lang="scss">
.color-picker-dialog {
  .dialog__content {
    background-color: transparent;
    width: 275px;

    .dialog__body {
      padding: 0;
      background-color: var(--theme-background-100);
    }

    .dialog__header {
      background-color: var(--background-color);
    }

    .dialog__title,
    .dialog__close {
      color: var(--text-color);
    }

    header,
    footer {
      border: 0;
    }
  }

  &-sliders {
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  &-controls {
    padding: 0 0.5rem 1rem;
    display: flex;

    .form-control {
      flex-grow: 1;
      white-space: nowrap;
      overflow: auto;
    }
  }

  &-canvas {
    width: 100%;
    height: 100px;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;

    &__thumb {
      width: 1rem;
      height: 1rem;
      margin: 0 0 -0.5rem -0.5rem;
      border-radius: 50%;
      border: 1px solid white;
      box-shadow: 0 0 0 1px black;
    }
  }

  &-colors {
    padding: 0 12px 4px;
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    align-items: center;

    &__color {
      background-color: white;
      overflow: hidden;
      margin: 2px;
      width: 21px;
      height: 12px;
      padding: 0;
      background-color: currentColor;
      border-radius: 3px;
      opacity: 1;
      transition: transform 0.2s $ease-elastic;

      &:hover {
        background-color: currentColor;
        outline: 1px solid currentColor;
      }

      &--active {
        outline: 1px solid white;
        transform: scale(1.1);
      }

      &--transparent {
        background-color: transparent !important;
        background-image: $checkerboard;
        background-size: 6px 6px;
        background-position:
          0 0,
          3px -3px,
          0 3px,
          -3px 0px;
      }

      &--null {
        background: 0;
        text-align: center;

        .icon-cross {
          margin: 0 auto;
          font-size: 0.625rem;
        }
      }
    }
  }
}
</style>
