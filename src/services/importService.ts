import { Preset } from '@/types/test'
import dialogService from './dialogService'
import workspacesService from './workspacesService'
import SettingsImportConfirmation from '../components/settings/ImportConfirmation.vue'
import IndicatorDialog from '../components/chart/IndicatorDialog.vue'
import store from '@/store'
import { slugify } from '../utils/helpers'
import { IndicatorSettings } from '../store/panesSettings/chart'

class ImportService {
  getJSON(file: File) {
    return new Promise<any>((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = event => {
        try {
          const json = JSON.parse(event.target.result as string)

          resolve(json)
        } catch (error) {
          reject(error)
        }
      }

      reader.readAsText(file)
    }).catch(() => {
      throw new Error('Unable to read file')
    })
  }

  async importSound(file: File) {
    if (file.type.indexOf('audio') !== 0) {
      throw new Error('File must be audio file')
    }

    let uploadedSound = await workspacesService.getSound(file.name)

    if (uploadedSound) {
      return
    }

    uploadedSound = {
      name: file.name,
      data: new Blob([file], { type: file.type })
    }

    await workspacesService.saveSound(uploadedSound)

    store.dispatch('app/showNotice', {
      title: `Successfully imported sound ${file.name}`,
      type: 'info'
    })

    return uploadedSound
  }

  async importPreset(file: File, presetType?: string) {
    const preset: Preset = await this.getJSON(file)

    if (!preset.data) {
      throw new Error('Preset is empty')
    }

    if (presetType && preset.type !== presetType) {
      throw new Error('Preset is not ' + presetType + ' type')
    }

    await workspacesService.savePreset(preset)

    store.dispatch('app/showNotice', {
      title: `Successfully imported preset ${preset.name}`,
      type: 'info'
    })

    return preset
  }

  async importWorkspace(file: File) {
    const workspace = await this.getJSON(file)

    if (!workspace.id || !workspace.name || !workspace.states) {
      throw new Error('Unrecognized workspace file')
    }

    if (Object.keys(workspace.states).length === 0) {
      throw new Error('Workspace seems empty')
    }

    for (const paneId in workspace.states) {
      const pane = workspace.states[paneId]

      if (pane.type === 'website') {
        pane.locked = true
      }
    }

    if (
      (await workspacesService.getWorkspace(workspace.id)) &&
      !(await dialogService.confirm({
        message: `Workspace ${workspace.id} already exists`,
        ok: 'Import anyway',
        cancel: 'Annuler'
      }))
    ) {
      return
    }

    if (
      await dialogService.openAsPromise(SettingsImportConfirmation, {
        workspace
      })
    ) {
      await workspacesService.addAndSetWorkspace(workspace)

      store.dispatch('app/showNotice', {
        title: `Successfully imported workspace ${workspace.name}`,
        type: 'info'
      })

      return workspace
    }

    return null
  }

  importIndicator(json) {
    let chartPaneId

    if (store.state.app.focusedPaneId && store.state.panes.panes[store.state.app.focusedPaneId].type === 'chart') {
      chartPaneId = store.state.app.focusedPaneId
    } else {
      for (const id in store.state.panes.panes) {
        if (store.state.panes.panes[id].type === 'chart') {
          chartPaneId = id
          break
        }
      }
    }

    if (!chartPaneId) {
      throw new Error('No chart found')
    }

    const name = json.name
      .split(':')
      .slice(1)
      .join(':')

    const indicator: IndicatorSettings = {
      id: slugify(name),
      name: name,
      script: json.data.script || '',
      options: json.data.options || {},
      unsavedChanges: true
    }

    store.dispatch(chartPaneId + '/addIndicator', indicator)

    dialogService.open(IndicatorDialog, { paneId: chartPaneId, indicatorId: indicator.id }, 'indicator')
  }

  async importAnything(file: File) {
    if (file.type === 'application/json') {
      const json = await this.getJSON(file)

      if (json.type && json.data) {
        if (json.type === 'indicator') {
          this.importIndicator(json)
        } else {
          await this.importPreset(file)
        }
      } else {
        await this.importWorkspace(file)
      }
    } else if (/^audio\//.test(file.type)) {
      await this.importSound(file)
    }
  }
}

export default new ImportService()
