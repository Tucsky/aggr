<template>
  <div class="installed-indicators">
    <SearchBar v-model="query" />
    <IndicatorTable
      class="table--inset"
      :indicators="indicators"
      :query="query"
      show-enabled
      show-dropdown
      @selected="emit('selected', $event)"
      @enabled="toggleEnabled"
      @dropdown="toggleDropdown"
    />
    <Dropdown v-model="dropdownTrigger">
      <button type="button" class="dropdown-item" @click="selectIndicator()">
        <i class="icon-plus"></i>
        <span>Add to chart</span>
      </button>
      <button type="button" class="dropdown-item" @click="duplicateIndicator()">
        <i class="icon-copy-paste"></i>
        <span>Duplicate</span>
      </button>
      <button type="button" class="dropdown-item" @click="downloadIndicator()">
        <i class="icon-download"></i>
        <span>Download</span>
      </button>
      <div class="dropdown-divider"></div>
      <button type="button" class="dropdown-item" @click="removeIndicator()">
        <i class="icon-trash"></i>
        <span>Remove</span>
      </button>
    </Dropdown>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { downloadAnything } from '@/utils/helpers'
import SearchBar from '@/components/framework/SearchBar.vue'
import IndicatorTable from '@/components/library/indicators/IndicatorTable.vue'
import dialogService from '@/services/oldDialogService'
import workspacesService from '@/services/workspacesService'
import importService from '@/services/importService'

// Define the emit for 'add' event
const emit = defineEmits(['add', 'selected'])

// Reactive data variables
const indicators = ref<any[]>([])
const query = ref<string>('')
const selectedIndicator = ref<any>(null)
const dropdownTrigger = ref<HTMLElement | null>(null)

// Fetch indicators on component mount
async function getIndicators() {
  const minDate = +new Date('2021-06-07T00:00:00Z')

  await nextTick()

  indicators.value = (await workspacesService.getIndicators()).map(
    indicator => ({
      ...indicator,
      enabled:
        typeof indicator.enabled === 'undefined' ? false : indicator.enabled,
      updatedAt: indicator.updatedAt || minDate
    })
  )
}

onMounted(async () => {
  await getIndicators()
})

// Methods
async function removeIndicator(indicator = selectedIndicator.value) {
  if (
    await dialogService.confirm({
      message: `Delete indicator "${indicator.name}" ?<br><br><code class="-filled"><small>#${indicator.id}</small></code>`,
      html: true
    })
  ) {
    workspacesService.deleteIndicator(indicator.id)

    indicators.value.splice(indicators.value.indexOf(indicator), 1)
  }
}

function selectIndicator(indicator = selectedIndicator.value) {
  // Emit event to add indicator
  emit('add', indicator)
}

function duplicateIndicator(indicator = selectedIndicator.value) {
  importService.importIndicator(
    {
      type: 'indicator',
      name: indicator.name,
      data: indicator
    },
    {
      addToChart: true
    }
  )
}

async function downloadIndicator(indicator = selectedIndicator.value) {
  await downloadAnything(
    {
      type: 'indicator',
      name: indicator.name,
      data: indicator
    },
    'indicator_' + indicator.id
  )
}

function toggleDropdown([event, indicator]) {
  if (
    event &&
    (!dropdownTrigger.value || selectedIndicator.value !== indicator)
  ) {
    dropdownTrigger.value = event.currentTarget as HTMLElement
    selectedIndicator.value = indicator
  } else {
    dropdownTrigger.value = null
    selectedIndicator.value = null
  }
}

function toggleEnabled(indicator) {
  indicator.enabled = !indicator.enabled
  workspacesService.saveIndicator(indicator, true)
}

defineExpose({
  getIndicators
})
</script>

<style lang="scss" scoped>
.installed-indicators {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
