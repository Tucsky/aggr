import { Pane } from '@/store/panes'
import Vue from 'vue'
import Component from 'vue-class-component'

@Component({
  props: {
    paneId: {
      required: true,
      type: String
    }
  }
})
export default class PaneMixin extends Vue {
  paneId: string
  hovered = false

  get pane(): Pane {
    return this.$store.state.panes.panes[this.paneId]
  }

  mounted() {
    this.$el.addEventListener('mouseenter', this.showHeader)
    this.$el.addEventListener('touchstart', this.showHeader)

    this.$nextTick(() => {
      const width = this.$el.clientWidth

      if (typeof this.onResize === 'function') {
        this.onResize(width, this.$el.clientHeight)
      }
    })
  }

  beforeDestroy() {
    if (this.hovered) {
      this.hideHeader()
    }

    this.$el.removeEventListener('mouseenter', this.showHeader)
    this.$el.removeEventListener('touchstart', this.showHeader)
  }

  showHeader(event) {
    if (this.hovered) {
      return
    }

    this.hovered = true

    if (event.type === 'touchstart') {
      document.addEventListener('touchstart', this.hideHeader)
    } else {
      this.$el.addEventListener('mouseleave', this.hideHeader)
    }
  }

  hideHeader(event?) {
    if (!this.hovered) {
      return
    }

    if (event) {
      if (event.type === 'touchstart') {
        if (this.$el.contains(event.target)) {
          return
        }

        this.hovered = false

        document.removeEventListener('touchstart', this.hideHeader)
      } else {
        this.hovered = false

        this.$el.removeEventListener('mouseleave', this.hideHeader)
      }
    } else {
      this.hovered = false

      console.log('remove both touchstart & mouseleave listeners')

      document.removeEventListener('touchstart', this.hideHeader)
      this.$el.removeEventListener('mouseleave', this.hideHeader)
    }
  }

  onResize?(newWidth: number, newHeight: number)
}
