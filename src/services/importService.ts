import { Preset } from '@/types/types'
import dialogService from './dialogService'
import workspacesService from './workspacesService'
import SettingsImportConfirmation from '../components/settings/ImportConfirmation.vue'
import store from '@/store'
import { slugify, uniqueName } from '../utils/helpers'
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

    await workspacesService.savePreset(preset, presetType)

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
        message: `Workspace "${workspace.id}" already exists`,
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

  async importIndicator(json) {
    let chartPaneId

    if (
      store.state.app.focusedPaneId &&
      store.state.panes.panes[store.state.app.focusedPaneId].type === 'chart'
    ) {
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

    const ids = await workspacesService.getIndicatorsIds()
    const name = json.name
      .split(':')
      .slice(1)
      .join(':')

    const id = uniqueName(slugify(name), ids)

    const indicator: IndicatorSettings = {
      id: id,
      name: name,
      script: json.data.script || '',
      options: json.data.options || {},
      description: json.data.description || null,
      unsavedChanges: true
    }

    store.dispatch(chartPaneId + '/addIndicator', indicator)

    dialogService.openIndicator(chartPaneId, indicator.id)
  }

  async importAnything(file: File) {
    if (file.type === 'application/json' || file.type === 'text/plain') {
      const json = await this.getJSON(file)

      if (json.formatName) {
        await this.importDatabase(file)
      } else if (json.type && json.data) {
        if (json.type === 'indicator' && json.name.split(':').length < 3) {
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

  async importDatabase(file) {
    if (
      !(await dialogService.confirm({
        message: `This action will override ALL your aggr data.`,
        ok: 'Yes override please',
        cancel: 'Cancel'
      })) ||
      !(await dialogService.confirm({
        message: `Are you sure ?`,
        ok: 'Proceed with import',
        cancel: 'Cancel'
      }))
    ) {
      return
    }

    ;(await import('dexie')) as any
    const { importDB } = await import('dexie-export-import')

    const currentWorkspaceId = workspacesService.workspace.id

    await workspacesService.reset()

    let id

    const match = file.name.match(/aggr-(\w{4})/)

    if (match && match[1]) {
      id = match[1]
    }

    await importDB(file)

    setTimeout(() => {
      if (id) {
        localStorage.setItem('workspace', id)
        window.location.href = window.location.href.replace(
          currentWorkspaceId,
          ''
        )
      } else {
        window.location.reload()
      }
    }, 250)
  }
}

export default new ImportService()
