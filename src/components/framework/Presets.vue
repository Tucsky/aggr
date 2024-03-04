<template>
  <btn class="-arrow mrauto" :class="classes" @click="toggleDropdown">
    {{ label }}
    <dropdown v-model="dropdownTrigger" @opened="onOpened">
      <div class="d-flex btn-group presets-control" @click.stop>
        <input
          ref="query"
          type="text"
          placeholder="Search"
          class="form-control presets-control__query"
          v-model="query"
          @keyup.enter="savePreset"
        />
        <div
          class="mlauto btn -text"
          @click="savePreset()"
          title="Save as"
          v-tippy="{ boundary: 'window', placement: 'left' }"
        >
          <i class="icon-save"></i>
        </div>
        <div
          class="btn -text flex-right"
          @click.stop="toggleUtilityDropdown($event)"
        >
          <i class="icon-cog"></i>
        </div>
      </div>
      <div
        v-for="preset in filteredPresets"
        :key="preset.id"
        class="dropdown-item dropdown-item--group"
        @click="selectPreset(preset)"
      >
        <span class="mr8">{{ preset.label }}</span>

        <div
          class="btn -text mlauto flex-right"
          @click.stop="togglePresetDropdown($event, preset)"
        >
          <i class="icon-more"></i>
        </div>
      </div>
      <dropdown v-model="presetDropdownTrigger">
        <button
          type="button"
          class="dropdown-item"
          @click.stop="selectPreset(dropdownPreset)"
        >
          <i class="icon-check"></i>
          <span>Apply</span>
        </button>
        <button
          type="button"
          class="dropdown-item"
          @click.stop="replacePreset(dropdownPreset)"
        >
          <i class="icon-refresh"></i>
          <span>Update</span>
        </button>
        <button
          type="button"
          class="dropdown-item"
          @click.stop="renamePreset(dropdownPreset)"
        >
          <i class="icon-edit"></i>
          <span>Rename</span>
        </button>
        <button
          type="button"
          class="dropdown-item"
          @click.stop="downloadPreset(dropdownPreset)"
        >
          <i class="icon-download"></i>
          <span>Download</span>
        </button>
        <div class="dropdown-divider"></div>
        <button
          type="button"
          class="dropdown-item"
          @click="deletePreset(dropdownPreset)"
        >
          <i class="icon-trash"></i>
          <span>Remove</span>
        </button>
      </dropdown>
      <dropdown v-model="utilityDropdownTrigger">
        <button
          type="button"
          class="dropdown-item btn -file -text -cases"
          title="Import from preset file"
          v-tippy="{ boundary: 'window', placement: 'left' }"
        >
          <i class="icon-upload"></i>
          <input
            type="file"
            class="input-file"
            @change="handleFile"
            title="Browse"
          />
          <span>Import</span>
        </button>
        <button
          type="button"
          class="dropdown-item btn -text -cases"
          title="Download preset file"
          v-tippy="{ boundary: 'window', placement: 'left' }"
          @click.stop="downloadSettings"
        >
          <i class="icon-download"></i>
          <span>Download</span>
        </button>
        <template v-if="showReset">
          <button
            type="button"
            class="dropdown-item btn -text -red -cases"
            @click="applyDefault"
          >
            <span>Reset</span>
            <i class="icon-eraser"></i>
          </button>
        </template>
      </dropdown>
    </dropdown>
  </btn>
</template>

<script lang="ts">
import Btn from '@/components/framework/Btn.vue'
import dialogService from '@/services/dialogService'
import workspacesService from '@/services/workspacesService'
import importService from '@/services/importService'
import { Preset } from '@/types/types'
import { Component, Vue } from 'vue-property-decorator'
import { downloadAnything, slugify } from '@/utils/helpers'

interface PresetSummary {
  id: string
  label: string
}

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
    },
    showReset: {
      type: Boolean,
      default: true
    },
    placeholder: {
      type: String,
      default: null
    },
    classes: {
      type: String,
      default: '-green'
    }
  },
  components: {
    Btn
  }
})
export default class Presets extends Vue {
  type: string
  adapter: (originalPreset: Preset) => Preset
  placeholder: string
  presets: PresetSummary[] = []

  // container dropdown
  dropdownTrigger: HTMLElement = null

  // selected preset dropdown
  presetDropdownTrigger: HTMLElement = null

  // utility dropdown
  utilityDropdownTrigger: HTMLElement = null

  dropdownPreset: PresetSummary = null
  query = ''

  $refs!: {
    query: HTMLInputElement
  }

  get filteredPresets() {
    if (!this.query.length) {
      return this.presets
    }

    return this.presets.filter(
      preset => preset.label.indexOf(this.query) !== -1
    )
  }

  async toggleDropdown(event) {
    if (!this.dropdownTrigger) {
      await this.getPresets()

      this.dropdownTrigger = event.target
    } else {
      this.dropdownTrigger = null
    }
  }

  togglePresetDropdown(event, preset) {
    if (this.presetDropdownTrigger) {
      this.presetDropdownTrigger = null
    } else {
      this.presetDropdownTrigger = event.currentTarget
      this.dropdownPreset = preset
    }
  }

  toggleUtilityDropdown(event) {
    if (this.utilityDropdownTrigger) {
      this.utilityDropdownTrigger = null
    } else {
      this.utilityDropdownTrigger = event.currentTarget
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

  async selectPreset(presetSummary: PresetSummary) {
    const preset = await workspacesService.getPreset(presetSummary.id)
    this.$emit('apply', {
      ...preset,
      name: presetSummary.label
    })
  }

  async replacePreset(presetSummary: PresetSummary) {
    const preset = await workspacesService.getPreset(presetSummary.id)
    this.savePreset(presetSummary.label, preset)
  }

  async savePreset(name?: string, originalPreset?: Preset) {
    const push = !name

    if (!originalPreset) {
      if (!name || typeof name !== 'string') {
        name = await dialogService.prompt({
          action: 'Save as',
          question: 'Save current settings',
          submitLabel: 'Save',
          input: this.query || this.placeholder
        })

        if (typeof name !== 'string') {
          return
        }
      } else if (
        !(await dialogService.confirm(
          `Override preset ${name} with current settings ?`
        ))
      ) {
        return
      }
    }

    const data = await this.getData(originalPreset)

    if (!data) {
      return
    }

    if (!name) {
      return
    }

    name = this.type + ':' + name
    const now = Date.now()
    const original = await workspacesService.getPreset(name)

    await workspacesService.savePreset(
      {
        name,
        data,
        createdAt: original ? original.createdAt : now,
        updatedAt: original ? now : null
      },
      this.type
    )

    if (push) {
      const index = this.presets.findIndex(preset => preset.id === name)
      if (index !== -1) {
        this.presets.splice(index, 1)
      }
      this.presets.push({
        id: name,
        label: name.split(':').pop()
      })
    }

    this.query = ''
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

  async handleFile(event: Event) {
    const file = (event.target as HTMLInputElement).files[0]

    if (!file) {
      return
    }

    try {
      const preset = await importService.importPreset(file, this.type)
      if (preset) {
        this.presets.push({
          id: preset.name,
          label: preset.name.split(':').pop()
        })
      }
    } catch (error) {
      this.$store.dispatch('app/showNotice', {
        title: error.message,
        type: 'error'
      })
    }
  }

  async renamePreset(presetSummary: PresetSummary) {
    const name = (
      (await dialogService.prompt({
        action: 'Rename',
        input: presetSummary.label
      })) || ''
    ).trim()

    if (name && name !== presetSummary.label) {
      const preset = await workspacesService.getPreset(presetSummary.id)
      await workspacesService.removePreset(presetSummary.id)

      const meta = presetSummary.id.split(':')
      meta[meta.length - 1] = name
      preset.name = meta.join(':')

      await workspacesService.savePreset(preset)
      this.presets.splice(this.presets.indexOf(presetSummary), 1, {
        id: preset.name,
        label: name
      })
    }
  }

  async deletePreset(presetSummary: PresetSummary) {
    if (
      await dialogService.confirm(
        'Remove preset "' + presetSummary.label + '" ?'
      )
    ) {
      await workspacesService.removePreset(presetSummary.id)
      this.presets.splice(this.presets.indexOf(presetSummary), 1)
    }
  }

  async getData(originalPreset?: Preset) {
    const data = await this.adapter(originalPreset)

    if (!data) {
      return
    }

    if ((data as any)._id) {
      delete (data as any)._id
    }

    return data
  }

  async downloadPreset(presetSummary: PresetSummary) {
    const preset = await workspacesService.getPreset(presetSummary.id)
    downloadAnything(
      {
        ...preset,
        type: 'preset'
      },
      slugify(presetSummary.label)
    )
  }

  async downloadSettings() {
    const name = this.placeholder || this.type.split(':').pop()
    const data = await this.getData()

    if (!data) {
      return
    }

    downloadAnything(
      {
        name: this.type + ':' + name,
        type: 'preset',
        data
      },
      slugify(name)
    )
  }

  async onOpened() {
    await this.$nextTick()

    this.$refs.query.focus()
  }
}
</script>
<style lang="scss">
.presets-control {
  background-color: var(--theme-background-150);

  &__query {
    border: 0;
    width: 7rem;
    flex-grow: 1;
  }

  .d-flex {
    .btn {
      border-radius: 0;
      color: var(--theme-color-100);

      &:hover {
        color: var(--theme-color-base);
      }
    }

    &:last-child {
      .btn:first-child {
        border-radius: 0 0.25rem 0 0;
      }

      .btn:last-child {
        border-radius: 0 0 0.25rem 0;
      }
    }
  }
}
</style>
