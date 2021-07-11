import { Pane } from '@/store/panes'
import { isElementInteractive } from '@/utils/helpers'
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
    this.$el.id = this.paneId

    this.$el.addEventListener('mouseenter', this.showHeader)
    this.$el.addEventListener('touchend', this.showHeader)

    this.refreshZoom()

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
    this.$el.removeEventListener('touchend', this.showHeader)
  }

  showHeader(event) {
    if (this.hovered) {
      if (event.type === 'touchend' && !isElementInteractive(event.target)) {
        this.hideHeader()
      }
      return
    }

    this.hovered = true

    const offsetTop = parseFloat(this.$el.parentElement.style.transform.match(/,\s*(\d+)px\s*,/)[1])

    if (offsetTop) {
      this.$nextTick(() => {
        const paneHeader = this.$el.querySelector('.pane-header') as HTMLElement

        if (paneHeader) {
          paneHeader.style.transform = 'translateY(-50%)'
        }
      })
    }

    if (event.type === 'touchend') {
      document.addEventListener('touchend', this.hideHeader)
    } else {
      this.$el.addEventListener('mouseleave', this.hideHeader)
    }
  }

  hideHeader(event?) {
    if (!this.hovered) {
      return
    }

    if (event) {
      if (this.$el.parentElement.classList.contains('-highlight')) {
        return
      }
      if (event.type === 'touchend') {
        if (this.$el.contains(event.target)) {
          return
        }

        this.hovered = false

        document.removeEventListener('touchend', this.hideHeader)
      } else {
        this.hovered = false

        this.$el.removeEventListener('mouseleave', this.hideHeader)
      }
    } else {
      this.hovered = false

      document.removeEventListener('touchend', this.hideHeader)
      this.$el.removeEventListener('mouseleave', this.hideHeader)
    }
  }

  refreshZoom() {
    this.$store.dispatch('panes/refreshZoom', this.paneId)
  }

  onResize?(newWidth: number, newHeight: number)
}
