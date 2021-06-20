<template>
  <div class="verte-picker" ref="picker" :class="`verte-picker--${mode}`">
    <div class="verte-picker__origin" ref="origin">
      <canvas class="verte-picker__canvas" ref="canvas" @mousedown="handleSelect" @touchstart="handleSelect"></canvas>
      <div class="verte-picker__cursor" ref="cursor" :style="`transform: translate3d(${cursor.x}px, ${cursor.y}px, 0)`"></div>
    </div>
    <slider
      class="verte-picker__slider"
      v-if="mode === 'square'"
      :showCompletion="false"
      :gradient="['#f00', '#ff0', '#0f0', '#0ff', '#00f', '#f0f', '#f00']"
      :editable="false"
      :max="360"
      v-model="currentHue"
    ></slider>
    <slider
      class="verte-picker__slider"
      v-if="mode === 'wheel'"
      :showCompletion="false"
      :gradient="[`hsl(${currentColor.hue},0%,${currentColor.lum}%)`, `hsl(${currentColor.hue},100%,${currentColor.lum}%)`]"
      :editable="false"
      :max="100"
      v-model="currentSat"
    ></slider>
  </div>
</template>

<script>
import Slider from './Slider.vue'
import { toHsl, parseHsl, formatHsl } from 'color-fns'
import { getCartesianCoords, getPolarCoords, getEventCords } from '../../../utils/picker'

export default {
  name: 'VertePicker',
  components: {
    Slider
  },
  props: {
    edge: { type: Number, default: 250 },
    diameter: { type: Number, default: 250 },
    satSlider: { type: Boolean, default: true },
    alpha: { type: Number, default: 1 },
    value: { type: String, default: '#fff' }
  },
  data: () => ({
    mode: 'square',
    currentHue: 0,
    currentSat: 0,
    currentColor: '',
    cursor: {},
    preventUpdating: false,
    preventEcho: false
  }),
  watch: {
    // handles external changes.
    value(val) {
      if (this.preventUpdating) {
        this.preventUpdating = false
        return
      }
      this.handleValue(val, true)
    },
    currentSat() {
      this.updateWheelColors()
      this.updateColor()
    },
    currentHue() {
      this.updateSquareColors()
      this.updateColor()
    }
  },
  methods: {
    initSquare() {
      // setup canvas
      const edge = this.edge
      this.$refs.canvas.width = edge
      this.$refs.canvas.height = edge - 100
      this.ctx = this.$refs.canvas.getContext('2d')
      this.updateSquareColors()
    },
    initWheel() {
      // setup canvas
      this.$refs.canvas.width = this.diameter
      this.$refs.canvas.height = this.diameter
      this.ctx = this.$refs.canvas.getContext('2d')

      // draw wheel circle path
      this.circle = {
        path: new Path2D(), // eslint-disable-line
        xCords: this.diameter / 2,
        yCords: this.diameter / 2,
        radius: this.diameter / 2
      }
      this.circle.path.moveTo(this.circle.xCords, this.circle.yCords)
      this.circle.path.arc(this.circle.xCords, this.circle.yCords, this.circle.radius, 0, 360)
      this.circle.path.closePath()
      this.updateWheelColors()
    },
    // this function calls when the color changed from outside the picker
    handleValue(color) {
      const { width, height } = this.pickerRect
      this.currentColor = toHsl(color)
      // prvent upadtion picker slider for causing
      // echo udationg to the current color value
      this.preventEcho = true

      if (this.mode === 'wheel') {
        const r = (100 - this.currentColor.lum) * (this.diameter / 200)
        const radius = this.diameter / 2
        const coords = getCartesianCoords(r, this.currentColor.hue / 360)
        this.cursor = { x: coords.x + radius, y: coords.y + radius }
        this.currentSat = this.currentColor.sat
      }

      if (this.mode === 'square') {
        const x = (this.currentColor.sat / 100) * width
        const y = ((100 - this.currentColor.lum) / 100) * height
        this.cursor = { x, y }
        this.currentHue = this.currentColor.hue
      }
    },
    updateCursorPosition({ x, y }) {
      const { left, top, width, height } = this.pickerRect
      const normalized = {
        x: Math.min(Math.max(x - left, 0), width),
        y: Math.min(Math.max(y - top, 0), height)
      }

      if (this.mode === 'wheel' && !this.ctx.isPointInPath(this.circle.path, normalized.x, normalized.y)) {
        return
      }

      this.cursor = normalized
      this.updateColor()
    },
    // select color and update it to verte component
    // this function calls when the color changed from the picker
    updateColor() {
      if (this.preventEcho) {
        this.preventEcho = false
        return
      }

      this.currentColor = this.getCanvasColor()
      this.preventUpdating = true
      this.$emit('change', this.currentColor)
      this.$emit('input', this.currentColor)
    },
    updateWheelColors() {
      if (!this.circle) return
      const { width, height } = this.pickerRect

      const x = this.circle.xCords
      const y = this.circle.yCords
      const radius = this.circle.radius
      const sat = this.satSlider ? this.currentSat : 100
      this.ctx.clearRect(0, 0, width, height)

      for (let angle = 0; angle < 360; angle += 1) {
        const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius)
        const startAngle = ((angle - 2) * Math.PI) / 180
        const endAngle = ((angle + 2) * Math.PI) / 180

        this.ctx.beginPath()
        this.ctx.moveTo(x, y)
        this.ctx.arc(x, y, radius, startAngle, endAngle)
        this.ctx.closePath()

        gradient.addColorStop(0, `hsl(${angle}, ${sat}%, 100%)`)
        gradient.addColorStop(0.5, `hsl(${angle}, ${sat}%, 50%)`)
        gradient.addColorStop(1, `hsl(${angle}, ${sat}%, 0%)`)
        this.ctx.fillStyle = gradient
        this.ctx.fill()
      }
    },
    updateSquareColors() {
      const { width, height } = this.pickerRect
      this.ctx.clearRect(0, 0, width, height)

      this.ctx.fillStyle = `hsl(${this.currentHue}, 100%, 50%)`
      this.ctx.fillRect(0, 0, width, height)

      const grdBlack = this.ctx.createLinearGradient(0, 0, width, 0)
      grdBlack.addColorStop(0, `hsl(0, 0%, 50%)`)
      grdBlack.addColorStop(1, `hsla(0, 0%, 0%, 0)`)
      this.ctx.fillStyle = grdBlack
      this.ctx.fillRect(0, 0, width, height)

      const grdWhite = this.ctx.createLinearGradient(0, 0, 0, height)
      grdWhite.addColorStop(0, `hsl(0, 0%, 100%)`)
      grdWhite.addColorStop(0.5, `hsla(0, 0%, 100%, 0)`)
      grdWhite.addColorStop(0.5, `hsla(0, 0%, 0%, 0)`)
      grdWhite.addColorStop(1, `hsl(0, 0%, 0%) `)
      this.ctx.fillStyle = grdWhite
      this.ctx.fillRect(0, 0, width, height)
    },
    getCanvasColor() {
      const { x, y } = this.cursor
      let sat = 0
      let lum = 0
      let hue = 0

      if (this.mode === 'wheel') {
        const radius = this.diameter / 2
        const xShitft = x - radius
        const yShitft = (y - radius) * -1
        const { r, theta } = getPolarCoords(xShitft, yShitft)
        lum = ((radius - r) * 100) / radius
        hue = !~Math.sign(theta) ? -theta : 360 - theta
        sat = this.currentSat
      }

      if (this.mode === 'square') {
        const { width, height } = this.pickerRect
        sat = (x * 100) / width
        lum = 100 - (y * 100) / height
        hue = this.currentHue
      }

      return parseHsl(
        formatHsl({
          alpha: this.alpha,
          hue: Math.round(hue),
          sat: Math.round(sat),
          lum: Math.round(lum)
        })
      )
    },
    handleSelect(event) {
      event.preventDefault()
      this.pickerRect = this.$refs.canvas.getBoundingClientRect()
      this.updateCursorPosition(getEventCords(event))
      const tempFunc = evnt => {
        window.requestAnimationFrame(() => {
          this.updateCursorPosition(getEventCords(evnt))
        })
      }
      const handleRelase = () => {
        document.removeEventListener('mousemove', tempFunc)
        document.removeEventListener('touchmove', tempFunc)
        document.removeEventListener('mouseup', handleRelase)
        document.removeEventListener('touchend', handleRelase)
      }
      document.addEventListener('mousemove', tempFunc)
      document.addEventListener('touchmove', tempFunc)
      document.addEventListener('mouseup', handleRelase)
      document.addEventListener('touchend', handleRelase)
    }
  },
  mounted() {
    this.$nextTick(() => {
      this.pickerRect = { ...this.$refs.canvas.getBoundingClientRect(), width: this.$refs.canvas.clientWidth, height: this.$refs.canvas.clientHeight }

      if (this.mode === 'wheel') {
        this.initWheel()
      }
      if (this.mode === 'square') {
        this.initSquare()
      }
      this.$nextTick(() => {
        this.handleValue(this.value)
      })
    })
  }
}
</script>

<style lang="scss">
.verte-picker {
  width: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;

  &--wheel {
    .verte-picker__origin {
      height: 250px;
    }
  }

  &__origin {
    user-select: none;
    position: relative;
    margin: 0 auto;
    overflow: hidden;
    height: 150px;
    width: 250px;
  }
  &__slider {
    margin: 1rem 1rem 0;
  }

  &__canvas {
    display: block;
    width: 100%;
    height: 100%;
  }

  &__cursor {
    position: absolute;
    top: 0;
    left: 0;
    margin: -6px;
    width: 12px;
    height: 12px;
    border: 1px solid white;
    border-radius: 50%;
    will-change: transform;
    pointer-events: none;
    background-color: transparent;
    box-shadow: white 0px 0px 0px 1.5px, rgba(black, 0.3) 0px 0px 1px 1px inset, rgba(black, 0.4) 0px 0px 1px 2px;
  }

  &__input {
    display: flex;
    margin-bottom: 10px;
  }
}
</style>
