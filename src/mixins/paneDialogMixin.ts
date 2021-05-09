import dialogService from '@/services/dialogService'
import { Pane } from '@/store/panes'
import { sleep } from '@/utils/helpers'
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
export default class PaneDialogMixin extends Vue {
  paneId: string

  get pane(): Pane {
    return this.$store.state.panes.panes[this.paneId]
  }

  get name() {
    return this.$store.state.panes.panes[this.paneId].name
  }

  set name(value: string) {
    this.$store.commit('panes/SET_PANE_NAME', { id: this.paneId, name: value })
  }

  async renamePane() {
    const name = await dialogService.prompt({
      action: 'Rename',
      input: this.name
    })

    if (name && name !== this.name) {
      this.name = name
    }
  }

  async resetPane() {
    ;(this as any).destroy()

    await sleep(100)

    await this.$store.dispatch('panes/resetPane', this.paneId)
  }
}
