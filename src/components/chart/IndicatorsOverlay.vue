<template>
  <div class="chart-overlay__panel indicators-overlay">
    <div class="chart-overlay__content" v-if="value">
      <IndicatorDropdown
        v-if="indicatorId"
        v-model="dropdownTrigger"
        :indicator-id="indicatorId"
        :pane-id="paneId"
      />
      <IndicatorControl
        v-for="id in indicatorOrder"
        :key="id"
        :indicator-id="id"
        :pane-id="paneId"
        @action="onClickIndicator"
        @mousedown.native="bindSort(id, $event)"
      />
    </div>
    <div class="chart-overlay__head pane-overlay" @click="toggleOverlay">
      <span class="chart-overlay__title">
        {{ label }}
      </span>
      <button type="button" class="btn badge -text" @click.stop="addIndicator">
        <i class="icon-plus"></i>
      </button>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { ref, computed, nextTick } from 'vue'
import store from '@/store' // Rule #11
import dialogService from '../../services/dialogService'

import IndicatorControl from '@/components/chart/IndicatorControl.vue'
import IndicatorDropdown from '@/components/indicators/IndicatorDropdown.vue'

// Props
const props = defineProps({
  paneId: {
    type: String,
    required: true
  },
  value: {
    type: Boolean,
    required: true
  }
})

// Emits
const emit = defineEmits(['input'])

// Refs (data properties)
const dropdownTrigger = ref<HTMLElement | null>(null)
const indicatorId = ref<string | null>(null)
const sorting = ref<{
  id: string
  height: number
  startY: number
  maxPosition: number
  oldPosition: number
  newPosition: number
  moved?: boolean
} | null>(null)

// Computed properties
const indicators = computed(() => (store.state[props.paneId] as any).indicators)

const indicatorOrder = computed(
  () => (store.state[props.paneId] as any).indicatorOrder
)

const label = computed(() => {
  const count = Object.values(indicators.value).length
  return `${count} indicator${count > 1 ? 's' : ''}`
})

// Methods
const toggleOverlay = () => {
  emit('input', !props.value)
}

const toggleDropdown = (event?: Event, id?: string) => {
  if (event && (!dropdownTrigger.value || indicatorId.value !== id)) {
    dropdownTrigger.value = event.currentTarget as HTMLElement
    indicatorId.value = id
  } else {
    dropdownTrigger.value = null
    indicatorId.value = null
  }
}

const editIndicator = async (id: string) => {
  dialogService.open(
    (await import('@/components/indicators/IndicatorDialog.vue')).default,
    { paneId: props.paneId, indicatorId: id },
    'indicator'
  )
  dropdownTrigger.value = null
}

const addIndicator = async () => {
  dialogService.open(
    (await import('@/components/library/indicators/IndicatorLibraryDialog.vue'))
      .default,
    {},
    'indicator-library'
  )
}

const onClickIndicator = ({
  indicatorId: id,
  actionName,
  event
}: {
  indicatorId: string
  actionName?: string
  event?: Event
}) => {
  if (sorting.value?.moved) return

  switch (actionName) {
    case 'menu':
      return toggleDropdown(event, id)
    case 'remove':
      return store.dispatch(`${props.paneId}/removeIndicator`, { id })
    case 'resize':
      return store.commit(`${props.paneId}/TOGGLE_LAYOUTING`, id)
    default:
      return editIndicator(id)
  }
}

const bindSort = (id: string, event: MouseEvent) => {
  if (sorting.value) return

  const keys = Object.keys(indicators.value)
  let position = indicatorOrder.value.indexOf(id)
  if (position === -1) {
    position = keys.indexOf(id)
  }

  const element = event.currentTarget as HTMLElement
  const startY = event.clientY

  sorting.value = {
    id,
    height: element.clientHeight,
    startY,
    maxPosition: keys.length - 1,
    oldPosition: position,
    newPosition: position
  }

  document.addEventListener('mousemove', handleSort)
  document.addEventListener('mouseup', unbindSort)
}

const handleSort = (event: MouseEvent) => {
  if (!sorting.value) return

  const offset = event.clientY - sorting.value.startY

  if (!sorting.value.moved) {
    sorting.value.moved = Math.abs(offset) > 3
  }

  const newPosition = Math.max(
    0,
    Math.min(
      sorting.value.maxPosition,
      sorting.value.oldPosition + Math.round(offset / sorting.value.height)
    )
  )

  if (newPosition !== sorting.value.newPosition) {
    sorting.value.newPosition = newPosition
    setIndicatorOrder(sorting.value.id, newPosition)
  }
}

const setIndicatorOrder = (id: string, position: number) => {
  store.commit(`${props.paneId}/UPDATE_INDICATOR_ORDER`, { id, position })
}

const unbindSort = async () => {
  if (!sorting.value) return

  document.removeEventListener('mousemove', handleSort)
  document.removeEventListener('mouseup', unbindSort)

  await nextTick()
  setTimeout(() => {
    sorting.value = null
  })
}
</script>
