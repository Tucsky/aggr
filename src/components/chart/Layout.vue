<template>
  <div
    class="chart-layout"
    :style="{
      left: axis.left + 'px',
      right: axis.right + 'px',
      bottom: axis.time + 'px'
    }"
    @dblclick="close"
  >
    <div class="chart-layout__controls">
      <button
        class="btn -text"
        title="Revert back to original positions"
        v-tippy="{ placement: 'bottom', boundary: 'window' }"
        @click="cancel"
      >
        <i class="icon-eraser"></i>
      </button>
      <button
        class="btn -text"
        title="Save positions"
        v-tippy="{ placement: 'bottom', boundary: 'window' }"
        @click="close"
      >
        <i class="icon-check"></i>
      </button>
    </div>
    <chart-price-scale
      v-for="(priceScale, id) of activePriceScales"
      :key="id"
      :paneId="paneId"
      :priceScaleId="id.toString()"
      :priceScale="priceScale"
      @update="updatePriceScaleScaleMargins(id.toString(), $event)"
      class="chart-layout__item"
    ></chart-price-scale>
  </div>
</template>
<script lang="ts" setup>
import { ref, reactive, onMounted, onBeforeUnmount, computed } from 'vue'
import store from '@/store' // Rule #11
import ChartPriceScale from './PriceScale.vue'

import { ChartPaneState, PriceScaleSettings } from '@/store/panesSettings/chart'

// Props
const props = defineProps({
  paneId: {
    type: String,
    required: true
  },
  axis: {
    type: Object as () => { left: number; right: number; time: number },
    required: true
  },
  layouting: {
    type: [String, Boolean],
    required: true
  }
})

// Refs (data properties)
const unsyncableMoveId = ref<string | null>(null)
const activePriceScales = reactive<{ [id: string]: PriceScaleSettings }>({})
let _originalActivePriceScales: { [id: string]: PriceScaleSettings } = {}
let _handleEscKey: ((event: KeyboardEvent) => void) | null = null

// Computed properties
const indicators = computed(
  () => (store.state[props.paneId] as ChartPaneState).indicators
)

const getActivePriceScales = () => {
  const priceScales = Object.keys(indicators.value).reduce(
    (scales, indicatorId) => {
      if (
        typeof props.layouting === 'string' &&
        indicatorId !== props.layouting
      ) {
        return scales
      }
      const priceScaleId = indicators.value[indicatorId].options.priceScaleId

      if (!scales[priceScaleId]) {
        scales[priceScaleId] = {
          ...store.state[props.paneId].priceScales[priceScaleId],
          indicators: []
        }
      }

      scales[priceScaleId].indicators.push(indicators.value[indicatorId].name)

      return scales
    },
    {} as { [id: string]: PriceScaleSettings }
  )

  Object.assign(activePriceScales, priceScales)
  _originalActivePriceScales = JSON.parse(JSON.stringify(priceScales))
}

// Methods
const updatePriceScaleScaleMargins = (priceScaleId: string, event: any) => {
  if (event.syncable && unsyncableMoveId.value !== event.id) {
    if (!syncMoveWithOthers(priceScaleId, event.side, event.value)) {
      unsyncableMoveId.value = event.id
    }
  }

  activePriceScales[priceScaleId].scaleMargins = event.value

  store.commit(`${props.paneId}/SET_PRICE_SCALE`, {
    id: priceScaleId,
    priceScale: activePriceScales[priceScaleId]
  })
}

const syncMoveWithOthers = (
  priceScaleId: string,
  side: string,
  scaleMargins: any
): boolean => {
  const originalScaleMargins = activePriceScales[priceScaleId].scaleMargins
  let hasSynced = false

  for (const otherId in activePriceScales) {
    if (priceScaleId === otherId) continue

    const otherScaleMargins = activePriceScales[otherId].scaleMargins

    if (
      otherScaleMargins.top === originalScaleMargins.top &&
      otherScaleMargins.bottom === originalScaleMargins.bottom
    ) {
      activePriceScales[otherId].scaleMargins = scaleMargins

      store.commit(`${props.paneId}/SET_PRICE_SCALE`, {
        id: otherId,
        priceScale: activePriceScales[otherId]
      })

      hasSynced = true
    }
  }

  return hasSynced
}

const cancel = () => {
  for (const id in _originalActivePriceScales) {
    store.commit(`${props.paneId}/SET_PRICE_SCALE`, {
      id,
      priceScale: _originalActivePriceScales[id]
    })
  }

  store.commit(`${props.paneId}/TOGGLE_LAYOUTING`)
}

const close = () => {
  store.commit(`${props.paneId}/TOGGLE_LAYOUTING`)
}

const bindEscKey = () => {
  if (_handleEscKey) return

  _handleEscKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      close()
    }
  }

  document.addEventListener('keydown', _handleEscKey)
}

// Lifecycle hooks
onMounted(() => {
  document.body.classList.add('-unselectable')
  bindEscKey()
  getActivePriceScales()
})

onBeforeUnmount(() => {
  document.body.classList.remove('-unselectable')
  if (_handleEscKey) {
    document.removeEventListener('keydown', _handleEscKey)
  }
})
</script>

<style lang="scss">
.chart-layout {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;

  + .chart__container {
    pointer-events: none;
  }

  &__controls {
    position: absolute;
    top: 0;
    border-radius: 0 0 4px 4px;
    background-color: var(--theme-background-100);
    left: 50%;
    transform: translateX(-50%);
    z-index: 4;
    box-shadow: 0 0.2rem 1rem rgba(black, 0.2);

    .btn {
      font-size: 1.25em;
    }
  }
}
</style>
