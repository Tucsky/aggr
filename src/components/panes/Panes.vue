<template>
  <grid-layout
    ref="grid"
    :layout="layout"
    :row-height="rowHeight"
    :col-num="24"
    :margin="[0, 0]"
    :is-draggable="draggable"
    :is-resizable="resizable"
    :vertical-compact="true"
    :use-css-transforms="true"
    :responsive="false"
    @layout-updated="onLayoutUpdated"
    @layout-ready="layoutReady = true"
  >
    <grid-item
      v-for="gridItem in layout"
      :key="gridItem.i"
      :type="gridItem.type"
      drag-allow-from=".pane-header"
      :x="gridItem.x"
      :y="gridItem.y"
      :w="gridItem.w"
      :h="gridItem.h"
      :i="gridItem.i"
      @container-resized="onContainerResized"
      @resized="onPaneResized"
    >
      <component v-if="layoutReady && $store.state[gridItem.i]._booted" class="pane" ref="panes" :is="gridItem.type" :paneId="gridItem.i"></component>
    </grid-item>
  </grid-layout>
</template>

<script lang="ts">
import Vue from 'vue'
import Component from 'vue-class-component'

import VueGridLayout from 'vue-grid-layout'
import PaneMixin from '@/mixins/paneMixin'

import Chart from '../chart/Chart.vue'
import Trades from '../trades/Trades.vue'
import Stats from '../stats/Stats.vue'
import Counters from '../counters/Counters.vue'
import Prices from '../prices/Prices.vue'
import { GridItem } from '@/store/panes'

@Component({
  components: { GridLayout: VueGridLayout.GridLayout, GridItem: VueGridLayout.GridItem, Chart, Trades, Stats, Counters, Prices }
})
export default class extends Vue {
  draggable = true
  resizable = true
  layoutReady = false
  rowHeight = 80

  private _resizeTimeout: number

  $refs!: {
    panes: PaneMixin[]
    grid: VueGridLayout.GridLayout
  }

  protected get panes() {
    return this.$store.state.panes.panes
  }

  protected get layout() {
    return this.$store.state.panes.layout
  }

  created() {
    this.calculateRowHeight()
  }

  mounted() {
    window.addEventListener('resize', this.calculateRowHeight)
  }

  beforeDestroy() {
    window.addEventListener('resize', this.calculateRowHeight)
  }

  calculateRowHeight(event?: Event) {
    if (this._resizeTimeout) {
      clearTimeout(this._resizeTimeout)
    }

    if (event) {
      this._resizeTimeout = window.setTimeout(this.calculateRowHeight.bind(this), 200)
    } else {
      this._resizeTimeout = null

      const rowNum = 24

      this.rowHeight = window.innerHeight / rowNum
    }
  }

  onLayoutUpdated(gridItems: GridItem[]) {
    this.$store.commit('panes/UPDATE_LAYOUT', gridItems)
  }

  resizePane(id, height, width) {
    if (!this.$refs.panes) {
      return
    }

    const pane: PaneMixin = this.$refs.panes.find(pane => pane.paneId === id)

    if (!pane) {
      return
    }

    pane.refreshScale(width)

    if (typeof pane.onResize === 'function') {
      pane.$nextTick(() => {
        pane.onResize(width, height)
      })
    }
  }

  onPaneResized(id, newHeightGrid, newWidthGrid, newHeightPx, newWidthPx) {
    this.resizePane(id, +newHeightPx, +newWidthPx)

    this.$store.commit('panes/UPDATE_LAYOUT', this.layout)
  }

  onContainerResized(id, newHeightGrid, newWidthGrid, newHeightPx, newWidthPx) {
    this.resizePane(id, +newHeightPx, +newWidthPx)
  }
}
</script>
