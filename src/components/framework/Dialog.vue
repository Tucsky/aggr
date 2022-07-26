<template>
  <div class="dialog" @click="clickOutside" :class="{ '-mask': mask }">
    <div
      ref="dialogContent"
      class="dialog-content"
      :class="contentClass"
      @click.stop
      :style="{ transform: `translate(${delta.x}px, ${delta.y}px)` }"
      @mousedown="onMouseDown"
    >
      <header
        v-if="header"
        @mousedown="handleDrag"
        @touchstart="handleDrag"
        :style="{ color: headerColor, background: headerBackground }"
      >
        <slot name="header"></slot>
        <div class="dialog-controls">
          <slot name="controls"></slot>

          <a
            href="javascript:void(0);"
            class="dialog-controls__close -link -text -no-grab"
            @click="close"
            @touchend="close"
          >
            <i class="icon-cross"></i>
          </a>
        </div>
      </header>
      <div class="dialog-body hide-scrollbar" :class="bodyClass">
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import dialogService from '@/services/dialogService'
import { getColorLuminance, splitColorCode } from '@/utils/colors'
import { Component, Vue } from 'vue-property-decorator'
import { getEventCords } from '../../utils/helpers'

@Component({
  name: 'Dialog',
  props: {
    open: {
      type: Boolean
    },
    mask: {
      type: Boolean,
      default: true
    },
    header: {
      type: Boolean,
      default: true
    },
    headerBackground: {
      required: false
    },
    bodyClass: {
      required: false
    },
    contentClass: {
      required: false
    },
    startPosition: {
      required: false
    }
  }
})
export default class extends Vue {
  startPosition: { x: number; y: number }
  headerBackground: string
  delta = { x: 0, y: 0 }
  target = { x: 0, y: 0 }
  animating = false
  private _deinteractionTimeout: number
  private _handleRelease: () => void
  private _handleDragging: (evnt: any) => void

  $refs!: {
    dialogContent: HTMLElement
  }

  get headerColor() {
    if (this.headerBackground) {
      const lum = getColorLuminance(splitColorCode(this.headerBackground))
      return lum > 0 ? 'black' : 'white'
    }

    return null
  }

  created() {
    if (this.startPosition) {
      if (this.startPosition.x) {
        this.delta.x = window.innerWidth * this.startPosition.x
      }

      if (this.startPosition.y) {
        this.delta.y = window.innerHeight * this.startPosition.y
      }
    }
  }

  beforeDestroy() {
    if (this._handleRelease) {
      this._handleRelease()
    }
  }

  handleDrag(event) {
    if (
      event.button === 2 ||
      event.target.classList.contains('-no-grab') ||
      event.target.parentElement.classList.contains('-no-grab')
    ) {
      return
    }
    event.preventDefault()
    const lastMove = Object.assign({}, this.delta)
    const startPosition = getEventCords(event)
    const startOffset = this.$refs.dialogContent.offsetTop
    const minY = startOffset * -1

    this._handleDragging = evnt => {
      const endPosition = getEventCords(evnt)

      const x = lastMove.x + endPosition.x - startPosition.x
      const y = Math.max(minY, lastMove.y + endPosition.y - startPosition.y)

      this.target.x = x
      this.target.y = y

      this.animate()
    }
    this._handleRelease = () => {
      document.removeEventListener('mousemove', this._handleDragging)
      document.removeEventListener('mouseup', this._handleRelease)
      document.removeEventListener('touchmove', this._handleDragging)
      document.removeEventListener('touchend', this._handleRelease)

      delete this._handleRelease
    }
    document.addEventListener('mousemove', this._handleDragging)
    document.addEventListener('mouseup', this._handleRelease)
    document.addEventListener('touchmove', this._handleDragging)
    document.addEventListener('touchend', this._handleRelease)
  }

  onMouseDown() {
    if (this._deinteractionTimeout) {
      clearTimeout(this._deinteractionTimeout)
    }

    dialogService.isInteracting = true

    const handler = () => {
      document.removeEventListener('mouseup', handler)

      this._deinteractionTimeout = setTimeout(() => {
        dialogService.isInteracting = false
        this._deinteractionTimeout = null
      }, 100)
    }

    document.addEventListener('mouseup', handler)
  }

  animate() {
    this.delta.x = this.target.x
    this.delta.y = this.target.y
    const distance =
      Math.abs(this.delta.x - this.target.x) +
      Math.abs(this.delta.y - this.target.y)

    if (distance > 10 && !this.animating) {
      this.animating = true
      return requestAnimationFrame(this.animate)
    }

    this.animating = false
  }

  clickOutside() {
    if (dialogService.isInteracting) {
      return false
    }

    this.$emit('clickOutside')
  }

  close() {
    this.$emit('clickOutside')
  }
}
</script>
