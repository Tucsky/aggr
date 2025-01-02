<template>
  <GridLayout
    ref="grid"
    :layout="layout"
    :col-num="cols"
    :row-height="rowHeight"
    :margin="[0, 0]"
    :is-resizable="unlocked"
    :is-draggable="unlocked"
    :use-css-transforms="true"
    :use-style-cursor="false"
    @layout-ready="layoutReady = true"
    @layout-updated="onLayoutUpdated"
  >
    <GridItem
      v-for="gridItem in layout"
      :key="gridItem.i"
      :type="gridItem.type"
      drag-allow-from=".pane-header"
      drag-ignore-from=".-no-grab"
      :x="gridItem.x"
      :y="gridItem.y"
      :w="gridItem.w"
      :h="gridItem.h"
      :i="gridItem.i"
      @container-resized="onContainerResized"
      @resized="onItemResized"
    >
      <component
        v-if="layoutReady"
        class="pane"
        ref="panesRef"
        :is="components[gridItem.type]"
        :paneId="gridItem.i"
      ></component>
    </GridItem>
  </GridLayout>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  nextTick,
  defineAsyncComponent
} from 'vue'

// Import vue3-grid-layout-next components
import { GridLayout, GridItem } from 'vue3-grid-layout-next'

// Import constants and types
import { GRID_COLS } from '@/utils/constants'
import type { GridItem as GridItemType } from '@/utils/grid'
import store from '@/store'
import { Layout } from 'vue3-grid-layout-next/dist/helpers/utils'
import { PaneTypeEnum } from '@/store/panes'

// Define Async Components
const Chart = defineAsyncComponent(() => import('@/components/chart/Chart.vue'))
const Trades = defineAsyncComponent(
  () => import('@/components/trades/Trades.vue')
)
const Stats = defineAsyncComponent(() => import('@/components/stats/Stats.vue'))
const Counters = defineAsyncComponent(
  () => import('@/components/counters/Counters.vue')
)
const Prices = defineAsyncComponent(
  () => import('@/components/prices/Prices.vue')
)
const Website = defineAsyncComponent(
  () => import('@/components/website/Website.vue')
)
const TradesLite = defineAsyncComponent(
  () => import('@/components/trades/TradesLite.vue')
)
const Alerts = defineAsyncComponent(
  () => import('@/components/alerts/Alerts.vue')
)

// Register Components for Template Usage
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const components = {
  [PaneTypeEnum.CHART]: Chart,
  [PaneTypeEnum.TRADES]: Trades,
  [PaneTypeEnum.STATS]: Stats,
  [PaneTypeEnum.COUNTERS]: Counters,
  [PaneTypeEnum.PRICES]: Prices,
  [PaneTypeEnum.WEBSITE]: Website,
  [PaneTypeEnum.TRADESLITE]: TradesLite,
  [PaneTypeEnum.ALERTS]: Alerts
}

// Template Refs
const grid = ref<InstanceType<typeof GridLayout> | null>(null)

// Reactive Data
const rowHeight = ref<number>(80)
const cols = ref<number>()
const layoutReady = ref<boolean>(false)
const panesRef = ref<any[]>()

// Internal Variables
let resizeTimeout: number | null = null
let maximizedPaneId: string | null = null

// Computed Properties
const unlocked = computed(() => !store.state.panes.locked)
const layout = computed<GridItemType[]>(() => store.state.panes.layout)

// Lifecycle Hooks
onMounted(() => {
  cols.value = GRID_COLS
  updateRowHeight()
  window.addEventListener('resize', updateRowHeight)

  console.log(layout.value)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateRowHeight)
})

// Methods

/**
 * Resizes the maximized pane by toggling its size.
 */
const resizeMaximizedPane = async () => {
  let maximizedItem: HTMLElement | undefined

  if (!maximizedPaneId) {
    maximizedItem = document.getElementsByClassName(
      '-maximized'
    )[0] as HTMLElement
  } else {
    const elem = document.getElementById(maximizedPaneId)
    maximizedItem = elem ? (elem.parentElement as HTMLElement) : undefined
  }

  await nextTick()

  if (maximizedItem) {
    const maximizedPaneIdLocal = maximizedItem.children[0].id
    let width: number
    let height: number

    if (!maximizedPaneId) {
      width = maximizedItem.clientWidth
      height = maximizedItem.clientHeight
      maximizedPaneId = maximizedPaneIdLocal
    } else {
      width = parseFloat(maximizedItem.style.width)
      height = parseFloat(maximizedItem.style.height)
      maximizedPaneId = null
    }

    resizePane(maximizedPaneIdLocal, height, width)
  }
}

/**
 * Resizes a specific pane by its ID.
 * @param id - The ID of the pane.
 * @param height - The new height.
 * @param width - The new width.
 */
const resizePane = (id: string | number, height: number, width: number) => {
  if (!panesRef.value) {
    return
  }

  const pane = panesRef.value.find((pane: any) => pane.paneId === id) // Adjust type based on PaneMixin

  if (!pane) {
    return
  }

  if (typeof pane.onResize === 'function') {
    nextTick(() => {
      pane.onResize(width, height)
    })
  }
}

/**
 * Handler for item resize event.
 * @param id - The ID of the item.
 * @param hPx - The new height in pixels.
 * @param wPx - The new width in pixels.
 */
const onItemResized = (
  i: string | number,
  h: number,
  w: number,
  height: number,
  width: number
) => {
  resizePane(i, height, width)
}

/**
 * Handler for layout updated event.
 * @param gridItems - The updated grid items.
 */
const onLayoutUpdated = (layout: Layout) => {
  store.commit('panes/UPDATE_LAYOUT', layout)
}

/**
 * Handler for container resize event.
 * @param id - The ID of the container.
 * @param hPx - The new height in pixels.
 * @param wPx - The new width in pixels.
 */
const onContainerResized = (
  i: string | number,
  h: number,
  w: number,
  height: number,
  width: number
) => {
  resizePane(i, height, width)
}

/**
 * Updates the row height based on the window size.
 * @param event - Optional resize event.
 */
const updateRowHeight = (event?: Event) => {
  if (event && !(event as Event).isTrusted) {
    resizeMaximizedPane()
    return
  }

  if (resizeTimeout) {
    clearTimeout(resizeTimeout)
  }

  if (event) {
    resizeTimeout = window.setTimeout(updateRowHeight, 200)
  } else {
    resizeTimeout = null
    rowHeight.value = window.innerHeight / (cols.value || GRID_COLS)
  }
}
</script>
