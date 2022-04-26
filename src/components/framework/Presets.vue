<template>
  <dropdown
    :options="presets"
    @output="onSelect"
    @open="bindPaste"
    @close="unbindPaste"
    :placeholder="label"
    class="mrauto"
    selectionClass="ml0 -green -arrow"
  >
    <template v-slot:option-custom>
      <div class="column" @mousedown.prevent>
        <div class="btn -green" @click="savePreset()"><i class="icon-plus"></i></div>
        <div class="btn -blue -file">
          <i class="icon-upload"></i>
          <input type="file" @change="handleFile" />
        </div>
        <div class="btn -red" @click="applyDefault"><i class="icon-eraser"></i><span class="ml8">Reset</span></div>
      </div>
    </template>
    <template v-slot:option="{ value }">
      <i v-if="value.icon" :class="'-lower icon-' + value.icon"></i>

      <span class="mr4">{{ value.label }}</span>

      <button type="button" class="dropdown-option__action btn -accent -small mlauto" @mousedown.prevent @click="openPreset(value.id, value.label)">
        <i class="icon-edit"></i>
      </button>
      <button type="button" class="dropdown-option__action btn -accent -small" @mousedown.prevent @click="deletePreset(value)">
        <i class="icon-trash"></i>
      </button>
    </template>
  </dropdown>
</template>

<script lang="ts">
import dialogService from '@/services/dialogService'
import workspacesService from '@/services/workspacesService'
import importService from '@/services/importService'
import { Preset, PresetType } from '@/types/test'
import { Component, Vue } from 'vue-property-decorator'
import Dropdown from '@/components/framework/Dropdown.vue'
import PresetDialog from '../settings/PresetDialog.vue'

@Component({
  components: { Dropdown },
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

  presets = [
    {
      id: 'custom'
    }
  ] as any

  private _pasteHandler: (event: Event) => void

  created() {
    this.getPresets()
  }

  beforeDestroy() {
    this.unbindPaste()
  }

  async getPresets() {
    this.presets.splice(1, this.presets.length)

    const keys = (await workspacesService.getPresetsKeysByType(this.type)) as string[]

    for (let i = 0; i < keys.length; i++) {
      this.presets.push({
        id: keys[i],
        label: keys[i].split(':').pop()
      })
    }
  }

  async onSelect(index) {
    if (typeof this.presets[index].click === 'function') {
      return
    }

    const preset = await workspacesService.getPreset(this.presets[index].id)

    this.applyPreset(preset)
  }

  async openPreset(id: string, name: string) {
    const preset = await workspacesService.getPreset(id)

    const postClose = await dialogService.openAsPromise(PresetDialog, { preset })

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
    } else if (!(await dialogService.confirm(`Override preset ${name} with current settings ?`))) {
      return
    }

    if (!name) {
      return
    }

    const data = await this.adapter()

    if (!data) {
      this.$store.dispatch('app/showNotice', {
        type: 'error',
        title: isOverride ? `Canceled preset override` : `Canceled preset creation`
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
    if (await dialogService.confirm('Reset ' + this.type + ' to default settings ?')) {
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
    if (await dialogService.confirm('Remove preset ' + preset.label + ' ?')) {
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
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
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
