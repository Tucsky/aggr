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
  scale = '-normal'

  mounted() {
    this.$nextTick(() => {
      const width = this.$el.clientWidth

      this.refreshScale(width)

      if (typeof this.onResize === 'function') {
        this.onResize(width, this.$el.clientHeight)
      }
    })
  }

  get pane(): Pane {
    return this.$store.state.panes.panes[this.paneId]
  }

  refreshScale(width) {
    if (width > 768) {
      this.scale = '-wide'
    } else if (width > 420) {
      this.scale = '-large'
    } else if (width > 240) {
      this.scale = '-normal'
    } else {
      this.scale = '-small'
    }
  }

  onResize?(newWidth: number, newHeight: number)
}
