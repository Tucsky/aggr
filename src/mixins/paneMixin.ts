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

  get pane(): Pane {
    return this.$store.state.panes.panes[this.paneId]
  }

  mounted() {
    this.$nextTick(() => {
      const width = this.$el.clientWidth

      this.refreshScale(width)

      if (typeof this.onResize === 'function') {
        this.onResize(width, this.$el.clientHeight)
      }
    })
  }

  refreshScale(width) {
    if (width > 768) {
      this.scale = '-xlarge'
    } else if (width > 360) {
      this.scale = '-large'
    } else if (width > 240) {
      this.scale = '-normal'
    } else {
      this.scale = '-small'
    }
  }

  onResize?(newWidth: number, newHeight: number)
}
