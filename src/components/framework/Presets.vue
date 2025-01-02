<template>
  <Btn class="-arrow mrauto" :class="classes" @click="toggleDropdown">
    {{ label }}
    <Dropdown v-model="dropdownTrigger" @opened="onOpened">
      <!-- Presets Control -->
      <div class="d-flex btn-group presets-control" @click.stop>
        <input
          ref="queryInput"
          type="text"
          placeholder="Search"
          class="form-control presets-control__query"
          v-model="query"
          @keyup.enter="savePreset()"
        />
        <Btn
          class="mlauto btn -text"
          @click="savePreset"
          title="Save as"
          v-tippy="{ boundary: 'window', placement: 'left' }"
        >
          <i class="icon-save"></i>
        </Btn>
        <Btn
          class="btn -text flex-right"
          @click.stop="toggleUtilityDropdown($event)"
        >
          <i class="icon-cog"></i>
        </Btn>
      </div>

      <!-- Preset Items -->
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

      <!-- Preset Dropdown -->
      <Dropdown v-model="presetDropdownTrigger">
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
      </Dropdown>

      <!-- Utility Dropdown -->
      <Dropdown v-model="utilityDropdownTrigger">
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
      </Dropdown>
    </Dropdown>
  </Btn>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import store from '@/store'
import Btn from '@/components/framework/Btn.vue'
import Dropdown from '@/components/framework/Dropdown.vue'
import dialogService from '@/services/oldDialogService'
import workspacesService from '@/services/workspacesService'
import importService from '@/services/importService'
import { downloadAnything, slugify } from '@/utils/helpers'
import { Preset } from '@/types/types'

interface PresetSummary {
  id: string
  label: string
}

// Define props with types and default values
const props = withDefaults(
  defineProps<{
    type: string
    adapter: (originalPreset: Preset) => Promise<Preset>
    label?: string
    showReset?: boolean
    placeholder?: string | null
    classes?: string
  }>(),
  {
    label: 'Presets',
    showReset: true,
    placeholder: null,
    classes: '-green'
  }
)

// Define emits
const emit = defineEmits<{
  (e: 'apply', preset?: Preset): void
}>()

// References
const queryInput = ref<HTMLInputElement | null>(null)

// Reactive variables
const presets = ref<PresetSummary[]>([])
const dropdownTrigger = ref<HTMLElement | null>(null)
const presetDropdownTrigger = ref<HTMLElement | null>(null)
const utilityDropdownTrigger = ref<HTMLElement | null>(null)
const dropdownPreset = ref<PresetSummary | null>(null)
const query = ref<string>('')

// Computed property for filtered presets
const filteredPresets = computed(() => {
  if (!query.value.length) {
    return presets.value
  }
  return presets.value.filter(preset =>
    preset.label.toLowerCase().includes(query.value.toLowerCase())
  )
})

// Toggle the main dropdown
const toggleDropdown = async (event: MouseEvent) => {
  if (!dropdownTrigger.value) {
    await getPresets()
    dropdownTrigger.value = event.currentTarget as HTMLElement
  } else {
    dropdownTrigger.value = null
  }
}

// Toggle the preset-specific dropdown
const togglePresetDropdown = (event: Event, preset: PresetSummary) => {
  if (presetDropdownTrigger.value) {
    presetDropdownTrigger.value = null
  } else {
    presetDropdownTrigger.value = event.currentTarget as HTMLElement
    dropdownPreset.value = preset
  }
}

// Toggle the utility dropdown
const toggleUtilityDropdown = (event: Event) => {
  if (utilityDropdownTrigger.value) {
    utilityDropdownTrigger.value = null
  } else {
    utilityDropdownTrigger.value = event.currentTarget as HTMLElement
  }
}

// Fetch presets from the store
const getPresets = async () => {
  const keys = await workspacesService.getPresetsKeysByType(props.type)
  presets.value = keys.map(key => ({
    id: key,
    label: key.split(':').pop() || key
  }))
}

// Select a preset to apply
const selectPreset = async (presetSummary: PresetSummary) => {
  const preset = await workspacesService.getPreset(presetSummary.id)
  emit('apply', {
    ...preset,
    name: presetSummary.label
  })
  dropdownTrigger.value = null
}

// Replace an existing preset
const replacePreset = async (presetSummary: PresetSummary) => {
  const preset = await workspacesService.getPreset(presetSummary.id)
  await savePreset(presetSummary.label, preset)
}

// Save a preset (either new or replacing an existing one)
const savePreset = async (name?: string, originalPreset?: Preset) => {
  const push = !name

  if (!originalPreset) {
    if (!name || typeof name !== 'string') {
      name = await dialogService.prompt({
        action: 'Save as',
        question: 'Save current settings',
        submitLabel: 'Save',
        input: query.value || props.placeholder
      })

      if (typeof name !== 'string') {
        return
      }
    } else {
      const confirm = await dialogService.confirm(
        `Override preset ${name} with current settings?`
      )
      if (!confirm) {
        return
      }
    }
  }

  const data = await getData(originalPreset)

  if (!data) {
    return
  }

  if (!name) {
    return
  }

  name = `${props.type}:${name}`
  const now = Date.now()
  const original = await workspacesService.getPreset(name)

  await workspacesService.savePreset(
    {
      name,
      data,
      createdAt: original ? original.createdAt : now,
      updatedAt: original ? now : null
    },
    props.type
  )

  if (push) {
    const existingIndex = presets.value.findIndex(preset => preset.id === name)
    if (existingIndex !== -1) {
      presets.value.splice(existingIndex, 1)
    }
    presets.value.push({
      id: name,
      label: name.split(':').pop() || name
    })
  }

  query.value = ''
}

// Apply default settings
const applyDefault = async () => {
  const confirmed = await dialogService.confirm(
    `Reset ${props.type} to default settings?`
  )
  if (confirmed) {
    emit('apply')
  }
}

// Handle file import
const handleFile = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  try {
    const preset = await importService.importPreset(file, props.type)
    if (preset) {
      presets.value.push({
        id: preset.name,
        label: preset.name.split(':').pop() || preset.name
      })
    }
  } catch (error: any) {
    store.dispatch('app/showNotice', {
      title: error.message,
      type: 'error'
    })
  }
}

// Rename a preset
const renamePreset = async (presetSummary: PresetSummary) => {
  const newName = (
    await dialogService.prompt({
      action: 'Rename',
      input: presetSummary.label
    })
  )?.trim()

  if (newName && newName !== presetSummary.label) {
    const preset = await workspacesService.getPreset(presetSummary.id)
    await workspacesService.removePreset(presetSummary.id)

    const meta = preset.name.split(':')
    meta[meta.length - 1] = newName
    preset.name = meta.join(':')

    await workspacesService.savePreset(preset)
    const index = presets.value.findIndex(
      preset => preset.id === presetSummary.id
    )
    if (index !== -1) {
      presets.value.splice(index, 1, {
        id: preset.name,
        label: newName
      })
    }
  }
}

// Delete a preset
const deletePreset = async (presetSummary: PresetSummary) => {
  const confirmed = await dialogService.confirm(
    `Remove preset "${presetSummary.label}"?`
  )
  if (confirmed) {
    await workspacesService.removePreset(presetSummary.id)
    presets.value = presets.value.filter(
      preset => preset.id !== presetSummary.id
    )
  }
}

// Get preset data via adapter
const getData = async (originalPreset?: Preset): Promise<any> => {
  const data = await props.adapter(originalPreset)

  if (!data) {
    return null
  }

  if ('_id' in data) {
    delete data._id
  }

  return data
}

// Download a preset as a file
const downloadPreset = async (presetSummary: PresetSummary) => {
  const preset = await workspacesService.getPreset(presetSummary.id)
  downloadAnything(
    {
      ...preset,
      type: 'preset'
    },
    slugify(presetSummary.label)
  )
}

// Download current settings as a preset file
const downloadSettings = async () => {
  const name = props.placeholder || props.type.split(':').pop() || 'Preset'
  const data = await getData()

  if (!data) {
    return
  }

  downloadAnything(
    {
      name: `${props.type}:${name}`,
      type: 'preset',
      data
    },
    slugify(name)
  )
}

// Handle dropdown opened event
const onOpened = async () => {
  await nextTick()
  queryInput.value?.focus()
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
