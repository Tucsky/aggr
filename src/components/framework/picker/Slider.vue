<template>
  <div class="slider" ref="wrapper" :class="{ '-vertical': vertical, '-disabled': disabled }">
    <div class="slider__track" ref="track">
      <div class="slider__fill" ref="fill" v-on="trackSlide ? { mousedown: select, touchstart: select } : {}"></div>
      <div v-if="showCompletion && handles[0]" class="slider__completion" :style="`width: ${handles[0].positionX}px`"></div>
      <div
        class="slider__handle"
        v-for="(handle, index) in handles"
        :key="index"
        @mousedown="select"
        @touchstart="select"
        :style="`transform: translate(${handle.positionX}px, ${handle.positionY}px); background-color: ${handle.color};`"
      >
        <div class="slider__label" v-if="label">
          <slot name="tooltip" :value="handle.value">
            {{ handle.value }}
          </slot>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mix } from 'color-fns'
import { getClosestValue, debounce, getEventCords } from '../../../utils/picker'

export default {
  name: 'VerteSlider',
  props: {
    gradient: Array,
    colorCode: { type: Boolean, default: false },
    label: { type: Boolean, default: false },
    trackSlide: { type: Boolean, default: true },
    vertical: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    min: { type: Number, default: 0 },
    max: { type: Number, default: 255 },
    step: { type: Number, default: 1 },
    value: { type: Number, default: 0 },
    handlesValue: { type: Array, default: () => [0] },
    showCompletion: { type: Boolean, default: true }
  },
  data: () => ({
    fill: {
      translate: 0,
      scale: 0
    },
    multiple: false,
    currentValue: 0,
    handles: [],
    values: []
  }),
  watch: {
    gradient(val) {
      this.initGradient(val)
      this.reloadHandlesColor()
    },
    values() {
      this.multiple = this.values.length > 1
      this.fill = this.multiple ? false : this.fill || {}
    },
    value(val, oldVal) {
      if (val === oldVal || val === this.currentValue) return

      this.updateValue(this.value, true)
    }
  },
  methods: {
    init() {
      this.$emitInputEvent = debounce(() => {
        this.$emit('input', this.currentValue)
      })
      this.multiple = this.values.length > 1
      this.values = this.handlesValue
      this.handles = this.handlesValue.map(value => {
        return { value, positionX: 0, positionY: 0, color: '#fff' }
      })
      if (this.values.length === 1) {
        this.values[0] = Number(this.value)
      }
      this.values.sort()

      this.initElements()
      if (this.gradient) {
        this.initGradient(this.gradient)
      }
      this.initEvents()
      this.values.forEach((handle, index) => {
        this.activeHandle = index
        this.updateValue(handle, true)
      })
    },
    initElements() {
      this.wrapper = this.$refs.wrapper
      this.track = this.$refs.track
      this.fill = this.$refs.fill

      if (this.classes) {
        this.wrapper.classList.add(...this.classes)
      }
    },
    initGradient(gradient) {
      if (gradient.length > 1) {
        this.fill.style.backgroundImage = `linear-gradient(90deg, ${gradient})`
        return
      }
      this.fill.style.backgroundImage = ''
      this.fill.style.backgroundColor = gradient[0]
      this.handles.forEach(handle => {
        handle.style.color = gradient[0]
      })
    },
    handleResize() {
      this.updateSize()
      this.updateValue(this.currentValue, true)
    },
    initEvents() {
      window.addEventListener('resize', this.handleResize)
    },
    beforeDestroy() {
      this.removeEventListener('resize', this.handleResize)
    },
    /**
     * fire select events
     */
    select(event) {
      event.preventDefault()

      // check if  left mouse is clicked
      if (event.buttons === 2) return

      if (this._dblClickTimeout) {
        clearTimeout(this._dblClickTimeout)
      }

      // check if a double click
      if (this.pendingDblClick) {
        this.pendingDblClick = false
        this.$emit('reset')
        return
      }

      // next click might be double click, for the next 150ms
      this.pendingDblClick = true

      this.updateSize()
      this.track.classList.add('slider--dragging')
      this.ticking = false

      const stepValue = this.getStepValue(event)

      if (this.multiple) {
        const closest = getClosestValue(this.values, stepValue)
        this.activeHandle = this.values.indexOf(closest)
      }
      this.updateValue(stepValue)

      this.tempDrag = this.dragging.bind(this)
      this.tempRelease = this.release.bind(this)
      document.addEventListener('mousemove', this.tempDrag)
      document.addEventListener('touchmove', this.tempDrag)
      document.addEventListener('touchend', this.tempRelease)
      document.addEventListener('mouseup', this.tempRelease)
    },
    /**
     * dragging motion
     */
    dragging(event) {
      const stepValue = this.getStepValue(event)
      if (!this.ticking) {
        window.requestAnimationFrame(() => {
          this.updateValue(stepValue)
          this.ticking = false
        })

        this.ticking = true
      }
    },
    /**
     * release handler
     */
    release() {
      this.track.classList.remove('slider--dragging')
      document.removeEventListener('mousemove', this.tempDrag)
      document.removeEventListener('touchmove', this.tempDrag)
      document.removeEventListener('mouseup', this.tempRelease)
      document.removeEventListener('touchend', this.tempRelease)

      if (this.pendingDblClick) {
        this._dblClickTimeout = window.setTimeout(() => {
          this.pendingDblClick = false
          this._dblClickTimeout = null
        }, 150)
      }
    },
    getStepValue(event) {
      const { x, y } = getEventCords(event)

      let stepValue

      if (this.vertical) {
        const mouseValue = y - this.currentY
        const stepCount = parseInt((this.height - mouseValue) / this.stepHeight + 0.5, 10)
        stepValue = stepCount * this.step + this.min
      } else {
        const mouseValue = x - this.currentX
        const stepCount = parseInt(mouseValue / this.stepWidth + 0.5, 10)
        stepValue = stepCount * this.step + this.min
      }

      if (!this.decimalsCount) {
        return stepValue
      }
      return Number(stepValue.toFixed(this.decimalsCount))
    },
    updateSize() {
      const trackRect = this.track.getBoundingClientRect()

      if (this.vertical) {
        this.currentY = trackRect.top

        this.height = this.$el.clientHeight

        if (!this.height) {
          this.height = parseInt(this.track.parentElement.style.height)
        }

        if (!this.height && trackRect.height) {
          this.height = trackRect.height
        }

        this.stepHeight = (this.height / (this.max - this.min)) * this.step
      } else {
        this.currentX = trackRect.left

        this.width = this.$el.clientWidth

        if (!this.width) {
          this.width = parseInt(this.track.parentElement.style.width)
        }

        if (!this.width && trackRect.width) {
          this.width = trackRect.width
        }

        this.stepWidth = (this.width / (this.max - this.min)) * this.step
      }
    },
    /**
     * get the filled area percentage
     * @param  {Object} slider
     * @param  {Number} value
     * @return {Number}
     */
    getPositionPercentage(value) {
      return ((value - this.min) / (this.max - this.min)).toFixed(2)
    },
    normalizeValue(value) {
      if (isNaN(Number(value))) {
        return this.value
      }
      if (this.multiple) {
        const prevValue = this.values[this.activeHandle - 1] || this.min
        const nextValue = this.values[this.activeHandle + 1] || this.max
        value = Math.min(Math.max(Number(value), prevValue), nextValue)
      }
      return Math.min(Math.max(Number(value), this.min), this.max)
    },
    addHandle(value) {
      const closest = getClosestValue(this.values, value)
      const closestIndex = this.values.indexOf(closest)
      const closestValue = this.values[closestIndex]
      const newIndex = closestValue <= value ? closestIndex + 1 : closestIndex
      this.handles.splice(newIndex, 0, {
        value,
        positionX: 0,
        positionY: 0,
        color: '#fff'
      })
      this.values.splice(newIndex, 0, value)

      this.activeHandle = newIndex
      this.currentValue = null
      this.updateValue(value)
    },
    removeHandle(index) {
      this.handles.splice(index, 1)
      this.values.splice(index, 1)
      this.activeHandle = index === 0 ? index + 1 : index - 1
    },
    /**
     * get the handle color
     * @param  {Number} positionPercentage
     * @return {Number} handle hex color code
     */
    getHandleColor(positionPercentage) {
      const colorCount = this.gradient.length - 1
      const region = positionPercentage
      for (let i = 1; i <= colorCount; i++) {
        // check the current zone
        if (region >= (i - 1) / colorCount && region <= i / colorCount) {
          // get the active color percentage
          const colorPercentage = (region - (i - 1) / colorCount) / (1 / colorCount)
          // return the mixed color based on the zone boundary colors
          return mix(this.gradient[i - 1], this.gradient[i], colorPercentage)
        }
      }
      return 'rgb(0, 0, 0)'
    },
    /**
     * update the slider fill, value and color
     * @param {Number} value
     */

    reloadHandlesColor() {
      this.handles.forEach((handle, index) => {
        const positionPercentage = this.getPositionPercentage(handle.value)
        const color = this.getHandleColor(positionPercentage)
        this.handles[index].color = color.toString()
      })
    },

    updateValue(value, muted = false) {
      // if (Number(value) === this.value) return;

      window.requestAnimationFrame(() => {
        const normalized = this.normalizeValue(value)
        const positionPercentage = this.getPositionPercentage(normalized)

        if (this.fill) {
          this.fill.translate = positionPercentage * (this.vertical ? this.height : this.width)
          this.fill.scale = 1 - positionPercentage
        }

        this.values[this.activeHandle] = normalized
        this.handles[this.activeHandle].value = normalized

        if (this.vertical) {
          this.handles[this.activeHandle].positionY = (1 - positionPercentage) * this.height
        } else {
          this.handles[this.activeHandle].positionX = positionPercentage * this.width
        }

        this.currentValue = normalized

        if (this.gradient) {
          const color = this.getHandleColor(positionPercentage)
          this.handles[this.activeHandle].color = color.toString()
          if (this.colorCode) {
            this.currentValue = color
          }
        }

        if (muted) return
        this.$emitInputEvent()
      })
    }
  },
  created() {
    const stepSplited = this.step.toString().split('.')[1]
    this.currentValue = this.value
    this.decimalsCount = stepSplited ? stepSplited.length : 0
  },
  mounted() {
    this.init()

    this.$nextTick(() => {
      this.updateSize()
      this.updateValue(undefined, true)
    })
  },
  destroyed() {
    window.removeEventListener('resize', this.handleResize)

    if (this._updateSizeTimeout) {
      clearTimeout(this._updateSizeTimeout)
    }
  }
}
</script>

<style lang="scss">
.slider {
  position: relative;
  display: flex;
  align-items: center;
  box-sizing: border-box;
  z-index: 1;

  &.-alpha {
    .slider__track {
      background-image: $checkerboard;
      background-size: 6px 6px;
      background-position: 0 0, 3px -3px, 0 3px, -3px 0px;
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

  &.-vertical {
    .slider__track {
      width: 8px;
      height: 100%;
    }

    .slider__handle {
      margin: -8px -4px 0 -4px;
    }

    .slider__label {
      left: -40px;
      bottom: -6px;

      &:before {
        left: auto;
        right: -0.5em;
        top: 50%;
        border-width: 0.5em 0 0.5em 0.5em;
        border-color: transparent transparent transparentvar(--theme-background-100);
        transform: translate3d(-1px, -50%, 0);
      }
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
  margin: -4px 0 0 -8px;
  width: 12px;
  height: 12px;
  border: 2px solid white;
  background-color: currentColor;
  border-radius: 50%;
  box-shadow: 0 1px 4px -2px rgba(black, 10%), 0 1px 2px rgba(black, 20%);
  transition: box-shadow 0.2s $ease-out-expo;
  cursor: grab;

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
  bottom: 25px;
  left: 6px;
  z-index: 999;
  padding: 0.5em;
  min-width: 3em;
  border-radius: 4px;
  background-color: var(--theme-background-150);
  color: white;
  text-align: center;
  font-size: 14px;
  line-height: 1em;
  transform: translate(-50%, 0);
  white-space: nowrap;
  visibility: hidden;
  opacity: 0;

  &:before {
    position: absolute;
    bottom: -0.5em;
    left: 50%;
    display: block;
    width: 0;
    height: 0;
    border-width: 0.5em 0.5em 0 0.5em;
    border-style: solid;
    border-color: var(--theme-background-150) transparent transparent transparent;
    content: '';
    transform: translate3d(-50%, 0, 0);
  }
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
  background-color: $green;

  pointer-events: none;
}
</style>
