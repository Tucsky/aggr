<template>
  <Dialog
    @mousedown.native.stop
    @clickOutside="close"
    class="color-picker-dialog"
    :resizable="false"
    :mask="false"
    size="small"
  >
    <template v-slot:header>
      <div>
        <div class="dialog__title">{{ label }}</div>
      </div>
    </template>
    <div
      ref="canvas"
      class="color-picker-dialog-canvas"
      @mousedown="startMovingThumbWithMouse"
      @touchstart="startMovingThumbWithTouch"
    >
      <div
        ref="thumb"
        class="color-picker-dialog-canvas__thumb"
        tabindex="0"
        aria-label="Color space thumb"
      />
    </div>
    <div class="color-picker-dialog-sliders">
      <slider
        class="color-picker-dialog-sliders__hue"
        :showCompletion="false"
        :gradient="['#f00', '#ff0', '#0f0', '#0ff', '#00f', '#f0f', '#f00']"
        :max="360"
        v-model="hue"
        @input="updateHue(hue)"
      ></slider>
      <slider
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
        :value="alpha"
        :showCompletion="false"
        v-model="alpha"
        @input="updateAlpha(alpha)"
      >
      </slider>
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
</template>

<script lang="ts">
const ALLOWED_VISIBLE_FORMATS = ['hex', 'hsl', 'rgb']
import {
  getAppBackgroundColor,
  getColorLuminance,
  getLinearShade,
  joinRgba,
  PALETTE,
  splitColorCode
} from '@/utils/colors'

import Dialog from '@/components/framework/Dialog.vue'
import Slider from '@/components/framework/picker/Slider.vue'
import dialogMixin from '../../../mixins/dialogMixin'
import workspacesService from '@/services/workspacesService'
import {
  clamp,
  colorsAreValueEqual,
  conversions,
  copyColorObject,
  formatAsCssColor,
  isValidHexColor,
  parsePropsColor
} from '@/utils/picker'

export default {
  name: 'ColorPickerDialog',
  mixins: [dialogMixin],
  components: {
    Dialog,
    Slider
  },
  props: {
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
    }
  },
  data: () => ({
    colors: {
      hex: '#ffffffff',
      hsl: { h: 0, s: 0, l: 1, a: 1 },
      hsv: { h: 0, s: 0, v: 1, a: 1 },
      rgb: { r: 1, g: 1, b: 1, a: 1 }
    },
    activeFormat: 'rgb',
    recentColors: [],
    movingFromCanvas: false,
    hue: null,
    alpha: 1
  }),
  computed: {
    swatches: () => PALETTE,
    outputColor() {
      const activeColor = this.colors[this.outputFormat]

      const cssColor = formatAsCssColor(activeColor, this.outputFormat)

      return cssColor
    },
    displayColor() {
      if (this.activeFormat === this.outputFormat) {
        return this.outputColor
      }

      const activeColor = this.colors[this.activeFormat]

      const cssColor = formatAsCssColor(activeColor, this.activeFormat)

      return cssColor
    }
  },
  created() {
    workspacesService.getColors().then(colors => {
      for (const color of colors) {
        this.recentColors.push(color)
      }
    })

    if (this.value && typeof this.value === 'string') {
      this.setColorFromProp(this.value, true)
    }
  },
  mounted() {
    const passive = { passive: true }
    document.addEventListener('mousemove', this.moveThumbWithMouse, passive)
    document.addEventListener('touchmove', this.moveThumbWithTouch, passive)
    document.addEventListener('mouseup', this.stopMovingThumb, passive)
    document.addEventListener('touchend', this.stopMovingThumb)

    this.updateCanvas(this.colors)
  },

  beforeDestroy() {
    document.removeEventListener('mousemove', this.moveThumbWithMouse)
    document.removeEventListener('touchmove', this.moveThumbWithTouch)
    document.removeEventListener('mouseup', this.stopMovingThumb)
    document.removeEventListener('touchend', this.stopMovingThumb)
  },
  methods: {
    /**
     * @param {string | ColorHsl | ColorHsv | ColorHwb | ColorRgb} propsColor
     * @param {boolean} silent
     */
    setColorFromProp(propsColor, silent = false) {
      if (propsColor === null) {
        return
      }

      const result = parsePropsColor(propsColor)

      if (result !== null) {
        this.activeFormat = result.format

        if (result.color.a === 1 && !silent && this.alpha && this.alpha < 1) {
          result.color.a = this.alpha
        }

        this.setColor(result.format, result.color, silent)
      }
    },
    /**
     * @param {MouseEvent} event
     */
    startMovingThumbWithMouse(event) {
      this.movingFromCanvas = true
      this.moveThumbWithMouse(event)
    },

    /**
     * @param {TouchEvent} event
     */
    startMovingThumbWithTouch(event) {
      this.movingFromCanvas = true
      this.moveThumbWithTouch(event)
    },

    /**
     * @param {MouseEvent} event
     */
    moveThumbWithMouse(event) {
      if (event.buttons !== 1 || this.movingFromCanvas === false) {
        return
      }

      this.moveThumb(event.clientX, event.clientY)
    },

    /**
     * @param {TouchEvent} event
     */
    moveThumbWithTouch(event) {
      if (this.movingFromCanvas === false) {
        return
      }

      const touchPoint = /** @type {Touch} */ event.touches[0]
      this.moveThumb(touchPoint.clientX, touchPoint.clientY)
    },

    /**
     * @param {number} clientX
     * @param {number} clientY
     */
    moveThumb(clientX, clientY) {
      const newThumbPosition = this.getNewThumbPosition(clientX, clientY)
      const hsvColor = copyColorObject(this.colors.hsv)
      hsvColor.s = newThumbPosition.x
      hsvColor.v = newThumbPosition.y
      this.setColor('hsv', hsvColor)
    },

    stopMovingThumb() {
      this.movingFromCanvas = false
    },

    /**
     * @param {HTMLElement} canvasElement
     * @param {number} clientX
     * @param {number} clientY
     * @returns {{ x: number, y: number }}
     */
    getNewThumbPosition(clientX, clientY) {
      const rect = this.$refs.canvas.getBoundingClientRect()
      const x = clientX - rect.left
      const y = clientY - rect.top
      const position = {
        x: clamp(x / rect.width, 0, 1),
        y: clamp(1 - y / rect.height, 0, 1)
      }

      return position
    },

    /**
     * @param {ColorFormat} sourceFormat
     */
    applyColorUpdates(sourceFormat) {
      for (const [format, convert] of conversions[sourceFormat]) {
        this.colors[format] = convert(this.colors[sourceFormat])
      }

      this.hue = this.colors.hsl.h * 360
      this.alpha = this.colors.rgb.a

      this.updateCanvas(this.colors)
    },

    /**
     * @param {any} colors
     * @param {VisibleColorFormat} activeFormat
     * @returns {{ colors: any, cssColor: string }}
     */
    getEventData(colors, activeFormat) {
      const cssColor = formatAsCssColor(colors[activeFormat], activeFormat)

      return {
        colors,
        cssColor
      }
    },

    /**
     * @param {ColorFormat} format
     * @param {string | ColorHsl | ColorHsv | ColorHwb | ColorRgb} color
     * @param {boolean} silent
     */
    setColor(format, color, silent) {
      const normalizedColor = color

      if (!colorsAreValueEqual(this.colors[format], normalizedColor)) {
        this.colors[format] = normalizedColor
        this.applyColorUpdates(format)

        if (!silent) {
          this.$emit('input', this.outputColor)
        }
      }
    },

    addColorToHistory(color) {
      if (this.recentColors.indexOf(color) !== -1) {
        return
      }

      workspacesService.saveColor(color)
      this.recentColors.push(color)

      if (this.recentColors.length > 32) {
        workspacesService.removeColor(this.recentColors.shift())
      }
    },
    switchFormat() {
      const activeFormatIndex = ALLOWED_VISIBLE_FORMATS.findIndex(
        format => format === this.activeFormat
      )

      const newFormatIndex =
        activeFormatIndex === ALLOWED_VISIBLE_FORMATS.length - 1
          ? 0
          : activeFormatIndex + 1

      this.activeFormat = ALLOWED_VISIBLE_FORMATS[newFormatIndex]
    },
    submitColor() {
      this.addColorToHistory(this.outputColor)
    },
    updateHue(value) {
      const hsvColor = copyColorObject(this.colors.hsv)
      hsvColor.h = value / 360

      this.setColor('hsv', hsvColor)
    },
    updateAlpha(value) {
      const hsvColor = copyColorObject(this.colors.hsv)
      hsvColor.a = value

      this.setColor('hsv', hsvColor)
    },
    updateHexColorValue(value) {
      if (isValidHexColor(value)) {
        this.setColor('hex', value)
      }
    },
    updateCanvas(colors) {
      if (!this.$el) {
        return
      }

      this.$el.style.setProperty('--vacp-hsl-h', String(colors.hsl.h))
      this.$el.style.setProperty(
        '--text-color',
        this.getLinearShadeText(this.outputColor)
      )
      this.$el.style.setProperty('--background-color', this.outputColor)
      this.$refs.canvas.setAttribute(
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
      this.$refs.thumb.setAttribute(
        'style',
        `
    box-sizing: border-box;
    position: absolute;
    left: ${colors.hsv.s * 100}%;   /* 3. */
    bottom: ${colors.hsv.v * 100}%; /* 3. */
  `
      )
    },
    setNull() {
      this.setColorFromProp('rgba(0,0,0,0)', true)
      this.$emit('input', null)
    },
    setTransparent() {
      this.updateAlpha(0)
    },
    selectRecentColor(event, color) {
      if (event.shiftKey) {
        const index = this.recentColors.indexOf(color)

        if (index !== -1) {
          workspacesService.removeColor(this.recentColors.splice(index, 1)[0])
        }

        return
      }

      this.setColorFromProp(color)
    },
    getLinearShadeText(backgroundColor) {
      if (!backgroundColor) {
        return
      }

      const color = splitColorCode(backgroundColor, getAppBackgroundColor())
      const scaledColor = getLinearShade(
        color,
        0.75 * (getColorLuminance(color) > 0 ? -1 : 1)
      )

      return joinRgba(scaledColor)
    }
  }
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
