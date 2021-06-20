<template>
  <dropdown :options="presets" @output="onSelect" class="mrauto form-control">
    <template v-slot:selection>
      {{ label }}
    </template>
    <template v-slot:option="{ value }">
      <i v-if="value.icon" :class="'-lower icon-' + value.icon"></i>

      <i v-if="value.id" class="icon-refresh -action  -lower" @click.stop="savePreset(value.label)" title="Update"></i>
      <i v-if="value.id" class="icon-trash -action mr8 -lower" @click.stop="removePreset(value.id)" title="Delete"></i>

      <span>{{ value.label }}</span>
    </template>
  </dropdown>
</template>

<script lang="ts">
import dialogService from '@/services/dialogService'
import workspacesService from '@/services/workspacesService'
import { PresetType } from '@/types/test'
import { Component, Vue } from 'vue-property-decorator'
import Dropdown from '@/components/framework/Dropdown.vue'

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
      icon: 'plus',
      label: 'Save as',
      click: this.savePreset
    },
    {
      icon: 'warning',
      label: 'Apply default',
      click: this.applyDefault
    }
  ] as any

  created() {
    this.getPresets()
  }

  async getPresets() {
    this.presets.splice(2, this.presets.length)

    const keys = (await workspacesService.getPresetsKeysByType(this.type)) as string[]

    for (let i = 0; i < keys.length; i++) {
      this.presets.push({
        id: keys[i],
        label: keys[i]
          .split(':')
          .slice(1)
          .join(':')
      })
    }
  }

  async onSelect(index) {
    if (typeof this.presets[index].click === 'function') {
      return
    }

    const preset = await workspacesService.getPreset(this.presets[index].id)

    this.$emit('apply', preset.data)
  }

  async savePreset(name?: string) {
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
        title: `Preset should contain data. Not saving this preset.`
      })

      return
    }

    if (data._id) {
      delete data._id
    }

    await workspacesService.savePreset({
      name: this.type + ':' + name,
      type: this.type,
      data
    })

    await this.getPresets()
  }

  async applyDefault() {
    if (await dialogService.confirm('Reset ' + this.type + ' to default settings ?')) {
      this.$emit('apply')
    }
  }

  async removePreset(id) {
    if (await dialogService.confirm('Remove preset ' + id + ' ?')) {
      await workspacesService.removePreset(id)

      await this.getPresets()
    }
  }
}
</script>
