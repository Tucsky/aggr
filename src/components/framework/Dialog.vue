<template>
  <div
    class="dialog"
    :class="[
      impliedSize && `dialog--size-${impliedSize}`,
      currentSize && `dialog--${currentSize}`,
      contrasted && `dialog--contrasted`,
      borderless && `dialog--borderless`,
      moved && `dialog--moved`,
      mask && 'dialog--mask'
    ]"
  >
    <div v-if="mask" class="dialog__mask" @click="clickOutside" />
    <div
      ref="content"
      class="dialog__content"
      :class="contentClass"
      @click.stop
      @mousedown="onMouseDown"
    >
      <i
        v-if="resizable"
        class="dialog__resize icon-up-thin"
        @mousedown="handleResize"
        @touchstart="handleResize"
      ></i>
      <header
        v-if="$slots.header"
        class="dialog__header-wrapper"
        @mousedown="handleDrag"
        @touchstart="handleDrag"
      >
        <slot name="cover"></slot>
        <div class="dialog__header">
          <slot name="header"></slot>
          <button
            type="button"
            class="dialog__close btn -link -text -no-grab"
            @click="close"
          >
            <i class="icon-cross"></i>
          </button>
        </div>
        <div class="dialog__subheader" v-if="$slots.subheader">
          <slot name="subheader" />
        </div>
      </header>
      <div ref="body" class="dialog__body hide-scrollbar" :class="bodyClass">
        <slot></slot>
      </div>
      <footer v-if="$slots.footer" class="dialog__footer d-flex">
        <slot name="footer"></slot>
      </footer>
    </div>
  </div>
</template>

<script lang="ts">
import dialogService, { DialogPosition } from '@/services/dialogService'
import { Component, Vue } from 'vue-property-decorator'
import { getEventCords } from '../../utils/helpers'

@Component({
  name: 'Dialog',
  props: {
    mask: {
      type: Boolean,
      default: true
    },
    contrasted: {
      type: Boolean,
      default: false
    },
    borderless: {
      type: Boolean,
      default: false
    },
    resizable: {
      type: Boolean,
      default: true
    },
    size: {
      type: String,
      default: null
    },
    bodyClass: {
      type: String,
      required: false
    },
    contentClass: {
      type: String,
      required: false
    },
    closeOnEscape: {
      type: Boolean,
      default: true
    }
  }
})
export default class Dialog extends Vue {
  size: string
  closeOnEscape: boolean
  delta = { x: 0, y: 0 }
  impliedSize = null
  currentSize = null
  moved = false

  private _deinteractionTimeout: number
  private _windowResizeTimeout: number
  private _handleTranslateMove: (event: any) => void
  private _handleTranslateRelease: () => void
  private _handleResizeMove: (event: any) => void
  private _handleResizeRelease: () => void
  private _handleEscKey: (event: any) => void
  private _handleWindowResize: (event: any) => void
  private _resizeOrigin: any

  $refs!: {
    content: HTMLElement
    body: HTMLElement
  }
  position: DialogPosition = {}
  private _persistTimeout: NodeJS.Timeout

  created() {
    if (this.size) {
      this.impliedSize = this.size
    }
  }

  async mounted() {
    const parentDialog = this.$parent as any
    if (this.$parent && parentDialog.dialogId) {
      this.setPosition(
        dialogService.dialogPositions[parentDialog.dialogId],
        true
      )
    }

    if (this.closeOnEscape) {
      this.bindEscKey()
    }

    this.bindWindowResize()

    await this.$nextTick()
    this.detectSize(this.$refs.content.clientWidth)

    this.$emit('mounted')
  }
  beforeDestroy() {
    this.persistPosition()

    if (this._handleTranslateRelease) {
      this._handleTranslateRelease()
    }

    if (this._handleResizeRelease) {
      this._handleResizeRelease()
    }

    if (this._handleEscKey) {
      document.removeEventListener('keydown', this._handleEscKey)
    }

    if (this._handleWindowResize) {
      window.removeEventListener('resize', this._handleWindowResize)
    }
  }

  persistPosition() {
    const dialogPosition = this.position
    const parentDialog = this.$parent as any

    if (parentDialog && parentDialog.dialogId) {
      dialogService.dialogPositions[parentDialog.dialogId] = {
        x: dialogPosition.x,
        y: dialogPosition.y,
        w: dialogPosition.w,
        h: dialogPosition.h
      }
    }
  }

  handleDrag(event) {
    if (
      this._handleTranslateRelease ||
      event.button === 2 ||
      event.target.classList.contains('-no-grab') ||
      event.target.parentElement.classList.contains('-no-grab')
    ) {
      return
    }

    const lastMove = Object.assign({}, this.delta)
    const startPosition = getEventCords(event)
    const startOffset = this.$refs.content.offsetTop
    const minY = startOffset * -1

    this._handleTranslateMove = evnt => {
      this.moved = true
      const endPosition = getEventCords(evnt)

      const x = lastMove.x + endPosition.x - startPosition.x
      const y = Math.max(minY, lastMove.y + endPosition.y - startPosition.y)

      this.delta.x = x
      this.delta.y = y

      this.setPosition(
        {
          x,
          y
        },
        true
      )
    }

    this._handleTranslateRelease = () => {
      document.removeEventListener('mousemove', this._handleTranslateMove)
      document.removeEventListener('mouseup', this._handleTranslateRelease)
      document.removeEventListener('touchmove', this._handleTranslateMove)
      document.removeEventListener('touchend', this._handleTranslateRelease)
      window.removeEventListener('blur', this._handleTranslateRelease)

      delete this._handleTranslateRelease
    }

    document.addEventListener('mousemove', this._handleTranslateMove)
    document.addEventListener('mouseup', this._handleTranslateRelease)
    document.addEventListener('touchmove', this._handleTranslateMove)
    document.addEventListener('touchend', this._handleTranslateRelease)
    window.addEventListener('blur', this._handleTranslateRelease)
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
      }, 100) as unknown as number
    }

    document.addEventListener('mouseup', handler)
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

  handleResize(event) {
    this._resizeOrigin = getEventCords(event)

    const padding = parseInt(getComputedStyle(this.$refs.body).padding)

    this.setPosition({
      w: this.$refs.content.clientWidth,
      h: this.$refs.body.clientHeight - padding * 2
    })

    this._handleResizeMove = event => {
      const coordinates = getEventCords(event)

      const dialogWidth =
        parseInt(this.$refs.content.style.width) +
        (coordinates.x - this._resizeOrigin.x) * 2
      const dialogHeight =
        parseInt(this.$refs.body.style.height) +
        (coordinates.y - this._resizeOrigin.y) * 2

      this.setPosition(
        {
          w: dialogWidth,
          h: dialogHeight
        },
        true
      )

      this._resizeOrigin = coordinates
    }

    this._handleResizeRelease = () => {
      document.removeEventListener('mousemove', this._handleResizeMove)
      document.removeEventListener('mouseup', this._handleResizeRelease)
      document.removeEventListener('touchmove', this._handleResizeMove)
      document.removeEventListener('touchend', this._handleResizeRelease)
      window.removeEventListener('blur', this._handleResizeRelease)

      document.body.classList.remove('-unselectable')
      delete this._handleResizeRelease
    }

    document.addEventListener('mousemove', this._handleResizeMove)
    document.addEventListener('mouseup', this._handleResizeRelease)
    document.addEventListener('touchmove', this._handleResizeMove)
    document.addEventListener('touchend', this._handleResizeRelease)
    window.addEventListener('blur', this._handleResizeRelease)

    document.body.classList.add('-unselectable')
  }

  savePosition(position) {
    this.position = {
      ...this.position,
      ...position
    }
  }

  setPosition(position, savePosition?: boolean) {
    if (!position) {
      return
    }

    if (typeof position.w === 'number' && typeof position.h === 'number') {
      this.lockSize(position)
      this.detectSize(position.w)
    }

    if (typeof position.x === 'number' && typeof position.y === 'number') {
      this.$refs.content.style.transform = `translate(${position.x}px, ${position.y}px)`
      this.delta.x = Math.round(position.x)
      this.delta.y = Math.round(position.y)
    }

    if (savePosition) {
      if (
        typeof position.w === 'number' &&
        typeof position.h === 'number' &&
        (position.w !== this.position?.w || position.h !== this.position?.h)
      ) {
        this.$emit('resize')
      }

      this.savePosition(position)
    }

    if (this._persistTimeout) {
      clearTimeout(this._persistTimeout)

      this._persistTimeout = setTimeout(() => this.persistPosition(), 100)
    }
  }

  bindEscKey() {
    if (this._handleEscKey) {
      return
    }

    this._handleEscKey = event => {
      if (
        event.key === 'Escape' &&
        this.$el === this.$el.parentElement.querySelector('.dialog:last-child')
      ) {
        event.stopPropagation()
        this.close()
      }
    }

    document.addEventListener('keydown', this._handleEscKey)
  }

  bindWindowResize() {
    if (this._handleWindowResize) {
      return
    }

    this._handleWindowResize = () => {
      if (this._windowResizeTimeout) {
        clearTimeout(this._windowResizeTimeout)
      }
      this._windowResizeTimeout = setTimeout(() => {
        this.detectSize(this.$refs.content.clientWidth)
        this._windowResizeTimeout = null
      }) as unknown as number
    }

    window.addEventListener('resize', this._handleWindowResize)
  }

  lockSize(position) {
    if (!position) {
      position = {
        w: this.$refs.content.clientWidth,
        h: this.$refs.body.clientHeight
      }
    }
    this.$refs.content.style.maxWidth = '100vw'
    this.$refs.body.style.maxHeight = '100vh'
    this.$refs.content.style.width = position.w + 'px'
    this.$refs.body.style.height = position.h + 'px'
    this.moved = true
  }

  detectSize(w) {
    if (w >= 840) {
      this.currentSize = 'large'
    } else if (w > 420) {
      this.currentSize = 'medium'
    } else {
      this.currentSize = 'small'
    }
  }
}
</script>
