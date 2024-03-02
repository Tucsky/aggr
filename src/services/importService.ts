import { Preset } from '@/types/types'
import dialogService from './dialogService'
import workspacesService from './workspacesService'
import SettingsImportConfirmation from '../components/settings/ImportConfirmation.vue'
import store from '@/store'
import notificationService from './notificationService'
import { PaneType } from '../store/panes'

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
      title: `Imported sound ${file.name}`,
      type: 'info'
    })

    return uploadedSound
  }

  async importPreset(file: File, presetType?: string) {
    const preset: Preset = await this.getJSON(file)

    if (!preset.data) {
      throw new Error('Preset is empty')
    }

    const type = preset.name.split(':')[0]
    const isPresetAPane = Object.values(PaneType).includes(type as PaneType)

    await workspacesService.savePreset(preset, presetType)

    if (isPresetAPane) {
      store.dispatch('panes/addPane', {
        type: preset.type,
        settings: preset.data,
        markets: preset.markets
      })
    }

    store.dispatch('app/showNotice', {
      title: `Imported ${preset.name} as preset for ${type}`,
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
        title: `Imported workspace ${workspace.name}`,
        type: 'info'
      })

      return workspace
    }

    return null
  }

  async importIndicator(
    json,
    { save = false, addToChart = false, openLibrary = false }
  ) {
    const name = json.name.replace(/^indicators?:/, '')
    const now = Date.now()
    let indicator = {
      id: null,
      name,
      displayName: json.data.displayName || name,
      author: json.data.author || null,
      script: json.data.script || '',
      options: json.data.options || {},
      description: json.data.description || null,
      createdAt: json.data.createdAt || now,
      updatedAt: json.data.updatedAt || json.data.createdAt || now,
      preview: json.data.preview || null
    }

    openLibrary =
      dialogService.mountedComponents['indicator-library'] || openLibrary

    if (save || openLibrary) {
      indicator = await workspacesService.saveIndicator(indicator)
    }

    if (indicator.id && json.data.presets) {
      for (const preset of json.data.presets) {
        await workspacesService.savePreset({
          ...preset,
          name: preset.name.replace(
            `:${json.data.libraryId}:`,
            `:${indicator.id}:`
          )
        })
      }
    }

    if (openLibrary) {
      if (!dialogService.isDialogOpened('indicator-library')) {
        dialogService.open(
          (await import('@/components/indicators/IndicatorLibraryDialog.vue'))
            .default,
          {},
          'indicator-library'
        )
      }

      const indicatorLibraryDialog =
        dialogService.mountedComponents['indicator-library']

      store.dispatch('app/showNotice', {
        title: `indicator "${indicator.id}" imported successfully`
      })

      if (indicatorLibraryDialog) {
        indicatorLibraryDialog.setSelection(indicator)
      }
    }

    if (addToChart) {
      const paneId = store.getters['panes/getFocusedPaneId']('chart')

      if (paneId) {
        store.dispatch(paneId + '/addIndicator', indicator)
      }
    }
  }

  async importAnything(file: File) {
    if (file.type === 'application/json' || file.type === 'text/plain') {
      const json = await this.getJSON(file)

      if (!notificationService.hasDismissed('import-security-warning')) {
        if (
          !(await dialogService.confirm({
            title: 'Security Warning',
            message: `⚠️ Proceed with <strong>Caution</strong>!<br><br>
            <p>Importing a custom script into AGGR poses security risks and AGGR is not liable for any consequences; ensure you trust the source and understand the risks before proceeding.</p>`,
            ok: `Accept and Proceed`,
            requireScroll: true,
            html: true
          }))
        ) {
          return
        }

        notificationService.dismiss('import-security-warning')
      }

      if (json.formatName) {
        await this.importDatabase(file)
      } else if (json.type && json.data) {
        if (json.type === 'indicator' && json.name.split(':').length < 3) {
          this.importIndicator(json, {
            addToChart: true
          })
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

    await import('dexie')
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
