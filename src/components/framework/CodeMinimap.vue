<template>
  <div class="code-minimap" v-if="totalHeight > visibleHeight">
    <canvas class="code-minimap" ref="canvas"></canvas>
    <div
      v-if="visibleHeight !== null"
      class="code-minimap__bounds"
      :style="{ top: top + '%', bottom: bottom + '%' }"
      @mousedown="handleMove"
      @touchstart="handleMove"
    ></div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import { getEventCords } from '../../utils/helpers'

@Component({
  name: 'CodeMinimap'
})
export default class extends Vue {
  totalHeight = null
  offsetTop = null
  visibleHeight = null

  private content
  private editorElement
  private textareaElement
  private y: number

  get top() {
    return (this.offsetTop / this.totalHeight) * 100
  }

  get bottom() {
    return (
      ((this.totalHeight - (this.offsetTop + this.visibleHeight)) /
        this.totalHeight) *
      100
    )
  }

  mounted() {
    this.$nextTick(() => {
      this.bindEditor()
      this.updateContent()
    })
  }
  beforeDestroy() {
    this.editorElement.removeEventListener('scroll', this.handleScroll)
    this.textareaElement.removeEventListener('blur', this.updateContent)
  }
  bindEditor() {
    this.editorElement = this.$el.previousElementSibling
    this.textareaElement = this.editorElement.querySelector('textarea')
    this.editorElement.addEventListener('scroll', this.handleScroll)
    this.textareaElement.addEventListener('blur', this.updateContent)
  }
  handleScroll(event) {
    this.offsetTop = event.currentTarget.scrollTop
  }
  updateContent() {
    this.content = this.textareaElement.value.split('\n')

    this.updateSize()
  }
  updateSize() {
    this.totalHeight = this.editorElement.scrollHeight
    this.visibleHeight = this.editorElement.clientHeight
    this.offsetTop = this.editorElement.scrollTop

    if (this.totalHeight <= this.visibleHeight) {
      return
    }

    this.$nextTick(() => {
      const canvas = this.$refs.canvas as HTMLCanvasElement

      canvas.width = this.$el.clientWidth
      canvas.height = this.$el.parentElement.clientHeight

      const ctx = canvas.getContext('2d')

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      this.renderMinimap()
    })
  }

  renderMinimap() {
    const canvas = this.$refs.canvas as HTMLCanvasElement
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(
      '--theme-color-200'
    )
    ctx.font = `monospace`

    const x = 4
    const y = 8

    const lineheight = canvas.height / this.content.length

    for (let i = 0; i < this.content.length; i++) {
      ctx.fillText(
        this.content[i]
          .replace(/\b\w+\b/g, String.fromCharCode(8210))
          .replace(/[^\u2012\s]/g, ''),
        x,
        y + i * lineheight
      )
    }
  }

  handleMove(event) {
    this.y = getEventCords(event).y

    document.addEventListener('mousemove', this.move)
    document.addEventListener('mouseup', this.release)
    document.addEventListener('touchmove', this.move)
    document.addEventListener('touchend', this.release)

    document.body.classList.add('-unselectable')
  }
  move(event) {
    const y = getEventCords(event).y

    const offset = this.y - getEventCords(event).y
    const percentOffset =
      offset / (this.$refs.canvas as HTMLCanvasElement).height
    this.editorElement.scrollTop -= percentOffset * this.totalHeight
    this.y = y
  }

  release() {
    document.removeEventListener('mousemove', this.move)
    document.removeEventListener('mouseup', this.release)
    document.removeEventListener('touchmove', this.move)
    document.removeEventListener('touchend', this.release)

    document.body.classList.remove('-unselectable')

    this.$emit('move', { top: this.top, bottom: this.bottom })
  }
}
</script>
<style lang="scss" scoped>
.code-minimap {
  position: relative;

  canvas {
    width: 100%;
    height: 100%;
    position: relative;
    pointer-events: none;
    z-index: 1;
  }

  &__bounds {
    position: absolute;
    left: 0;
    right: 0;
    background-color: var(--theme-background-150);
  }
}
</style>
