<template>
  <button
    type="button"
    class="btn -green -arrow mrauto"
    @click="toggleDropdown"
  >
    Presets
    <dropdown
      v-model="dropdownTrigger"
      @input="$event ? bindPaste : unbindPaste"
    >
      <div class="d-flex btn-group" @click.stop>
        <div class="btn -green" @click="savePreset()">
          <i class="icon-plus mr8"></i>
          <small>new</small>
        </div>
        <div class="btn -blue -file">
          <i class="icon-upload mr8"></i>
          <small>import</small>
          <input type="file" @change="handleFile" title="Browse" />
        </div>
        <div class="-fill"></div>
        <div class="btn -red flex-grow-1 flex-right" @click="applyDefault">
          <i class="icon-eraser mr8"></i>
          <small>Reset</small>
        </div>
      </div>
      <div
        v-for="preset in presets"
        :key="preset.id"
        class="dropdown-item"
        @click="selectPreset(preset.id)"
      >
        <span class="mr8">{{ preset.label }}</span>

        <button
          type="button"
          class="dropdown-option__action btn -small mlauto -text"
          @click.stop="openPreset(preset.id, preset.label)"
        >
          <i class="icon-edit"></i>
        </button>
        <button
          type="button"
          class="dropdown-option__action btn -small ml4 -text"
          @click.stop="deletePreset(preset)"
        >
          <i class="icon-trash"></i>
        </button>
      </div>
    </dropdown>
  </button>
</template>

<script lang="ts">
import dialogService from '@/services/dialogService'
import workspacesService from '@/services/workspacesService'
import importService from '@/services/importService'
import { Preset, PresetType } from '@/types/types'
import { Component, Vue } from 'vue-property-decorator'
import PresetDialog from '../settings/PresetDialog.vue'

@Component({
  props: {
    type: {
      required: true
    },
    adapter: {
      required: true
    },
    label: {
      default: 'Presets'
    }
  }
})
export default class extends Vue {
  type: PresetType
  adapter: Function
  dropdownTrigger = null
  presets = []

  private _pasteHandler: (event: Event) => void

  created() {
    this.getPresets()
  }

  beforeDestroy() {
    this.unbindPaste()
  }

  toggleDropdown(event) {
    if (!this.dropdownTrigger) {
      this.dropdownTrigger = event.currentTarget
    } else {
      this.dropdownTrigger = null
    }
  }

  async getPresets() {
    this.presets.splice(1, this.presets.length)

    const keys = (await workspacesService.getPresetsKeysByType(
      this.type
    )) as string[]

    this.presets = keys.map(key => ({
      id: key,
      label: key.split(':').pop()
    }))
  }

  async selectPreset(key) {
    const preset = await workspacesService.getPreset(key)

    this.applyPreset(preset)
  }

  async openPreset(id: string, name: string) {
    const preset = await workspacesService.getPreset(id)

    const postClose = await dialogService.openAsPromise(PresetDialog, {
      preset
    })

    if (postClose === 'replace') {
      this.savePreset(name)
    } else if (postClose === 'set') {
      this.applyPreset(preset)
    }

    this.getPresets()
  }

  async savePreset(name?: string) {
    const isOverride = !!name

    if (!name || typeof name !== 'string') {
      name = await dialogService.prompt('Enter a name')
    } else if (
      !(await dialogService.confirm(
        `Override preset ${name} with current settings ?`
      ))
    ) {
      return
    }

    if (!name) {
      return
    }

    const data = await this.adapter()

    if (!data) {
      this.$store.dispatch('app/showNotice', {
        type: 'error',
        title: isOverride
          ? `Canceled preset override`
          : `Canceled preset creation`
      })

      return
    }

    if (data._id) {
      delete data._id
    }

    name = this.type + ':' + name

    const now = Date.now()
    const original = await workspacesService.getPreset(name)

    await workspacesService.savePreset(
      {
        name,
        type: this.type,
        data,
        createdAt: original ? original.createdAt : now,
        updatedAt: original ? now : null
      },
      this.type
    )

    await this.getPresets()
  }

  async applyDefault() {
    if (
      await dialogService.confirm(
        'Reset ' + this.type + ' to default settings ?'
      )
    ) {
      this.$emit('apply')
    }
  }

  async applyPreset(preset: Preset) {
    this.$emit('apply', preset.data)
  }

  async handleFile(event: Event) {
    const file = (event.target as HTMLInputElement).files[0]

    if (!file) {
      return
    }

    try {
      if (await importService.importPreset(file, this.type)) {
        await this.getPresets()
      }
    } catch (error) {
      this.$store.dispatch('app/showNotice', {
        title: error.message,
        type: 'error'
      })
    }
  }

  async deletePreset(preset) {
    if (await dialogService.confirm('Remove preset "' + preset.label + '" ?')) {
      await workspacesService.removePreset(preset.id)
      await this.getPresets()
    }
  }

  bindPaste() {
    if (this._pasteHandler) {
      return
    }

    this._pasteHandler = this.onPaste.bind(this)
    document.addEventListener('paste', this._pasteHandler)
  }

  unbindPaste() {
    if (!this._pasteHandler) {
      return
    }

    document.removeEventListener('paste', this._pasteHandler)
    this._pasteHandler = null
  }

  async onPaste(event) {
    if (document.activeElement) {
      if (
        document.activeElement.tagName === 'INPUT' ||
        document.activeElement.tagName === 'TEXTAREA'
      ) {
        return
      }
    }

    try {
      const preset = JSON.parse(event.clipboardData.getData('text/plain'))

      if (!preset.name || !preset.type || !preset.data) {
        throw new Error('missing name or type or data property')
      }

      const now = +new Date()

      await workspacesService.savePreset(
        {
          name: preset.name,
          type: preset.type,
          data: preset.data,
          createdAt: now,
          updatedAt: null
        },
        this.type
      )

      await this.getPresets()
    } catch (error) {
      this.$store.dispatch('app/showNotice', {
        type: 'error',
        title: `Unable to parse preset (paste error)\n${error.message}`
      })
    }
  }
}
</script>
