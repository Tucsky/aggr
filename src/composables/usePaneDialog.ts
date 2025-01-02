import { computed } from 'vue'
import store from '@/store'
import dialogService from '@/services/oldDialogService'
import { parseMarket } from '@/services/productsService'
import workspacesService from '@/services/workspacesService'
import panesSettings from '@/store/panesSettings'
import { Preset } from '@/types/types'

export function usePaneDialog(paneId: string) {
  // Computed property for accessing the pane
  const pane = computed(() => store.state.panes.panes[paneId])

  // Two-way computed property for pane name
  const name = computed({
    get() {
      const paneName = store.state.panes.panes[paneId].name

      if (!paneName) {
        if (pane.value?.markets.length) {
          const [, pair] = parseMarket(pane.value.markets[0])
          return `${pair} - ${pane.value.type}`
        } else {
          return paneId
        }
      }
      return paneName
    },
    set(value: string) {
      store.commit('panes/SET_PANE_NAME', { id: paneId, name: value })
    }
  })

  // Method to rename the pane
  const renamePane = async () => {
    const newName = await dialogService.prompt({
      action: 'Rename',
      input: name.value
    })

    if (newName !== null && newName !== name.value) {
      name.value = newName
    }
  }

  // Method to reset the pane
  const resetPane = async (preset?: Preset) => {
    await close()

    let presetData = preset ? preset.data : null
    if (!presetData) {
      presetData = JSON.parse(
        JSON.stringify(
          panesSettings[store.state.panes.panes[paneId].type].state
        )
      )
    }

    await store.dispatch('panes/resetPane', {
      id: paneId,
      data: presetData
    })
  }

  // Method to get the pane's preset
  const getPreset = async () => {
    let storedState = await workspacesService.getState(paneId)

    if (!storedState) {
      await workspacesService.saveState(paneId, store.state[paneId])
      storedState = await workspacesService.getState(paneId)
    }

    return storedState
  }

  return { pane, name, renamePane, resetPane, getPreset }
}
