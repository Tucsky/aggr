import dialogService from '@/services/dialogService'
import { parseMarket } from '@/services/productsService'
import workspacesService from '@/services/workspacesService'
import { Pane } from '@/store/panes'
import panesSettings from '@/store/panesSettings'
import { Preset } from '@/types/types'
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
    const name = this.$store.state.panes.panes[this.paneId].name

    if (!name) {
      if (!name && this.$store.state.panes.panes[this.paneId].markets.length) {
        const [, pair] = parseMarket(
          this.$store.state.panes.panes[this.paneId].markets[0]
        )
        return pair + ' - ' + this.$store.state.panes.panes[this.paneId].type
      } else {
        return this.paneId
      }
    }

    return name
  }

  set name(value: string) {
    this.$store.commit('panes/SET_PANE_NAME', { id: this.paneId, name: value })
  }

  async renamePane() {
    const name = await dialogService.prompt({
      action: 'Rename',
      input: this.name
    })

    if (name !== null && name !== this.name) {
      this.name = name
    }
  }

  async resetPane(preset?: Preset) {
    await (this as any).close()

    let presetData = preset ? preset.data : null

    if (!presetData) {
      presetData = JSON.parse(
        JSON.stringify(
          panesSettings[this.$store.state.panes.panes[this.paneId].type].state
        )
      )
    }

    await this.$store.dispatch('panes/resetPane', {
      id: this.paneId,
      data: presetData
    })
  }

  async getPreset() {
    let storedState = await workspacesService.getState(this.paneId)

    if (!storedState) {
      await workspacesService.saveState(
        this.paneId,
        this.$store.state[this.paneId]
      )

      storedState = await workspacesService.getState(this.paneId)
    }

    return storedState
  }
}
