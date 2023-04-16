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
  protected _onStoreMutation: () => void

  get pane(): Pane {
    return this.$store.state.panes.panes[this.paneId]
  }

  mounted() {
    this.$el.id = this.paneId

    this.refreshZoom()

    this.$nextTick(() => {
      const width = this.$el.clientWidth

      if (typeof this.onResize === 'function') {
        this.onResize(width, this.$el.clientHeight, true)
      }
    })

    this.$el.addEventListener('mousedown', this.focusPane)
  }

  beforeDestroy() {
    this.$el.removeEventListener('mousedown', this.focusPane)

    if (this._onStoreMutation) {
      this._onStoreMutation()
    }
  }

  refreshZoom() {
    this.$store.dispatch('panes/refreshZoom', {
      id: this.paneId
    })
  }

  focusPane() {
    this.$store.commit('app/SET_FOCUSED_PANE', this.paneId)
  }

  onResize?(newWidth: number, newHeight: number, isMounting?: boolean)
}
