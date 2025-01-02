<template>
  <Dropdown
    :modelValue="modelValue"
    @update:modelValue="$emit('update:modelValue', $event)"
  >
    <div class="dropdown-divider" :data-label="indicatorName"></div>
    <IndicatorScaleButton :indicator-id="indicatorId" :pane-id="paneId" />
    <button type="button" class="dropdown-item" @click="resizeIndicator">
      <i class="icon-resize-height"></i> <span>Resize</span>
    </button>
    <button
      type="button"
      class="dropdown-item"
      @click="setIndicatorOrder(0)"
      v-if="isInFront"
    >
      <i class="icon-up"></i>
      <span>Send behind</span>
    </button>
    <button
      v-else
      type="button"
      class="dropdown-item"
      @click="setIndicatorOrder()"
    >
      <i class="icon-down -lower"></i>
      <span>Bring ahead</span>
    </button>
    <div class="dropdown-divider"></div>
    <button type="button" class="dropdown-item" @click="editIndicator">
      <i class="icon-edit"></i>
      <span>Edit</span>
    </button>
    <button type="button" class="dropdown-item" @click="renameIndicator">
      <i class="icon-stamp"></i> <span>Rename</span>
    </button>
    <button type="button" class="dropdown-item" @click="downloadIndicator">
      <i class="icon-download"></i> <span>Download</span>
    </button>
    <button type="button" class="dropdown-item" @click="duplicateIndicator">
      <i class="icon-copy-paste"></i> <span>Duplicate</span>
    </button>
    <div class="dropdown-divider"></div>
    <slot />
    <button type="button" class="dropdown-item" @click="removeIndicator">
      <i class="icon-cross"></i> <span>Remove</span>
    </button>
  </Dropdown>
</template>
<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { ChartPaneState } from '@/store/panesSettings/chart'
import dialogService from '@/services/oldDialogService'
import IndicatorScaleButton from '@/components/indicators/IndicatorScaleButton.vue'
import store from '@/store'

// Define props
const props = defineProps<{
  modelValue: HTMLElement | null
  paneId: string
  indicatorId: string | null
}>()

// Reactive state
const isInFront = ref<boolean | null>(null)

// Computed properties
const indicatorName = computed(() => {
  return (store.state[props.paneId] as ChartPaneState).indicators[
    props.indicatorId
  ]?.name
})

const indicatorOrder = computed(() => {
  return (store.state[props.paneId] as ChartPaneState).indicatorOrder
})

// Watcher to call updateLabels whenever `value` prop changes
watch(
  () => props.modelValue,
  newValue => {
    if (newValue) {
      updateLabels()
    }
  }
)

// Lifecycle hook to initialize label states on mount
onMounted(() => {
  updateLabels()
})

// Methods
function updateLabels() {
  isInFront.value =
    indicatorOrder.value.indexOf(props.indicatorId) ===
    indicatorOrder.value.length - 1
}

function setIndicatorOrder(position?: number) {
  store.commit(`${props.paneId}/UPDATE_INDICATOR_ORDER`, {
    id: props.indicatorId,
    position:
      typeof position === 'undefined'
        ? indicatorOrder.value.length - 1
        : position
  })
}

function removeIndicator() {
  store.dispatch(`${props.paneId}/removeIndicator`, {
    id: props.indicatorId
  })
}

function resizeIndicator() {
  store.commit(`${props.paneId}/TOGGLE_LAYOUTING`, props.indicatorId)
}

function duplicateIndicator() {
  store.dispatch(`${props.paneId}/duplicateIndicator`, props.indicatorId)
}

function downloadIndicator() {
  store.dispatch(`${props.paneId}/downloadIndicator`, props.indicatorId)
}

async function editIndicator() {
  const module = await import('@/components/indicators/IndicatorDialog.vue')
  dialogService.open(
    module.default,
    { paneId: props.paneId, indicatorId: props.indicatorId },
    'indicator'
  )
}

async function renameIndicator() {
  const currentName =
    store.state[props.paneId].indicators[props.indicatorId].name
  const newName = await dialogService.prompt({
    action: 'Rename',
    input: currentName
  })

  if (typeof newName === 'string' && newName !== currentName) {
    store.dispatch(`${props.paneId}/renameIndicator`, {
      id: props.indicatorId,
      name: newName
    })
  }
}
</script>

<style lang="scss" scoped></style>
