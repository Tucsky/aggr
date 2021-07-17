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

  get pane(): Pane {
    return this.$store.state.panes.panes[this.paneId]
  }

  mounted() {
    this.$el.id = this.paneId

    this.refreshZoom()

    this.$nextTick(() => {
      const width = this.$el.clientWidth

      if (typeof this.onResize === 'function') {
        this.onResize(width, this.$el.clientHeight)
      }
    })

    this.$el.addEventListener('mousedown', this.focusPane)
  }

  beforeDestroy() {
    this.$el.removeEventListener('mousedown', this.focusPane)
  }

  refreshZoom() {
    this.$store.dispatch('panes/refreshZoom', this.paneId)
  }

  focusPane() {
    this.$store.commit('app/SET_FOCUSED_PANE', this.paneId)
  }

  onResize?(newWidth: number, newHeight: number)
}
