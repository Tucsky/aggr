<template>
  <grid-layout
    ref="grid"
    :layout="layout"
    :col-num="cols"
    :row-height="rowHeight"
    :margin="[0, 0]"
    :is-resizable="unlocked"
    :is-draggable="unlocked"
    :vertical-compact="true"
    :use-css-transforms="true"
    :use-style-cursor="false"
    @layout-ready="layoutReady = true"
    @layout-updated="onLayoutUpdated"
  >
    <grid-item
      v-for="gridItem in layout"
      :key="gridItem.i"
      :type="gridItem.type"
      drag-allow-from=".pane-header"
      drag-ignore-from="a, button, .-no-grab"
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
        ref="panes"
        :is="gridItem.type"
        :paneId="gridItem.i"
      ></component>
    </grid-item>
  </grid-layout>
</template>

<script lang="ts">
import Vue from 'vue'
import Component from 'vue-class-component'

import VueGridLayout from 'vue-grid-layout'
import PaneMixin from '@/mixins/paneMixin'

import { GRID_COLS } from '@/utils/constants'
import { GridItem } from '@/store/panes'

@Component({
  components: {
    GridLayout: VueGridLayout.GridLayout,
    GridItem: VueGridLayout.GridItem,
    Chart: () => import('@/components/chart/Chart.vue'),
    Trades: () => import('@/components/trades/Trades.vue'),
    Stats: () => import('@/components/stats/Stats.vue'),
    Counters: () => import('@/components/counters/Counters.vue'),
    Prices: () => import('@/components/prices/Prices.vue'),
    Website: () => import('@/components/website/Website.vue'),
    TradesLite: () => import('@/components/trades/TradesLite.vue')
  }
})
export default class extends Vue {
  draggable = true
  resizable = true
  rowHeight = 80
  cols = null
  breakpoint = null
  layoutReady = false

  private _resizeTimeout: number
  private _maximizedPaneId

  $refs!: {
    panes: PaneMixin[]
    grid: VueGridLayout.GridLayout
  }

  protected get panes() {
    return this.$store.state.panes.panes
  }

  protected get unlocked() {
    return !this.$store.state.panes.locked
  }

  protected get layout() {
    return this.$store.state.panes.layout
  }

  created() {
    this.cols = GRID_COLS

    this.updateRowHeight()
  }

  mounted() {
    window.addEventListener('resize', this.updateRowHeight)
  }

  beforeDestroy() {
    window.addEventListener('resize', this.updateRowHeight)
  }

  resizeMaximizedPane() {
    let maximizedItem: HTMLElement

    if (!this._maximizedPaneId) {
      maximizedItem = document.getElementsByClassName(
        '-maximized'
      )[0] as HTMLElement
    } else {
      maximizedItem = document.getElementById(this._maximizedPaneId)
        .parentElement
    }

    this.$nextTick(() => {
      if (maximizedItem) {
        const maximizedPaneId = maximizedItem.children[0].id
        let width
        let height

        if (!this._maximizedPaneId) {
          width = maximizedItem.clientWidth
          height = maximizedItem.clientHeight
          this._maximizedPaneId = maximizedPaneId
        } else {
          width = parseFloat(maximizedItem.style.width)
          height = parseFloat(maximizedItem.style.height)
          this._maximizedPaneId = null
        }
        this.resizePane(maximizedPaneId, height, width)
      }
    })
  }

  resizePane(id, height, width) {
    if (!this.$refs.panes) {
      return
    }

    const pane: PaneMixin = this.$refs.panes.find(pane => pane.paneId === id)

    if (!pane) {
      return
    }

    if (typeof pane.onResize === 'function') {
      pane.$nextTick(() => {
        pane.onResize(width, height)
      })
    }
  }

  onItemResized(id, h, w, hPx, wPx) {
    this.resizePane(id, +hPx, +wPx)
    this.$store.commit('panes/UPDATE_LAYOUT', this.layout)
  }

  updateItem(id) {
    const item = this.layout.find(item => item.i === id)
    this.$store.commit('panes/UPDATE_ITEM', item)
  }
  onLayoutUpdated(gridItems: GridItem[]) {
    this.$store.commit('panes/UPDATE_LAYOUT', gridItems)
  }

  onContainerResized(id, h, w, hPx, wPx) {
    this.resizePane(id, +hPx, +wPx)
  }

  updateRowHeight(event?: Event) {
    if (event && !event.isTrusted) {
      this.resizeMaximizedPane()
      return
    }

    if (this._resizeTimeout) {
      clearTimeout(this._resizeTimeout)
    }

    if (event) {
      this._resizeTimeout = window.setTimeout(
        this.updateRowHeight.bind(this),
        200
      )
    } else {
      this._resizeTimeout = null

      this.rowHeight = window.innerHeight / this.cols
    }
  }
}
</script>
