<template>
  <grid-layout
    ref="grid"
    :layout="layout"
    :responsive-layouts="layouts"
    :cols="{ lg: 24, md: 16, sm: 12, xs: 8 }"
    :breakpoints="{ lg: 1024, md: 768, sm: 480, xs: 0 }"
    :row-height="rowHeight"
    :margin="[0, 0]"
    :vertical-compact="true"
    :use-css-transforms="true"
    :responsive="true"
    @breakpoint-changed="onBreakpointChanged"
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
      @resized="onItemResized"
      @moved="onItemMoved"
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

@Component({
  components: { GridLayout: VueGridLayout.GridLayout, GridItem: VueGridLayout.GridItem, Chart, Trades, Stats, Counters, Prices }
})
export default class extends Vue {
  draggable = true
  resizable = true
  layoutReady = false
  rowHeight = 80
  layout = null

  private _resizeTimeout: number

  $refs!: {
    panes: PaneMixin[]
    grid: VueGridLayout.GridLayout
  }

  protected get panes() {
    return this.$store.state.panes.panes
  }

  protected get layouts() {
    return this.$store.state.panes.layouts
  }

  created() {
    this.layout = this.layouts[this.updateCellSize()]
  }

  mounted() {
    window.addEventListener('resize', this.updateCellSize)
  }

  beforeDestroy() {
    window.addEventListener('resize', this.updateCellSize)
  }

  updateCellSize(event?: Event) {
    if (this._resizeTimeout) {
      clearTimeout(this._resizeTimeout)
    }

    if (event) {
      this._resizeTimeout = window.setTimeout(this.updateCellSize.bind(this), 200)
    } else {
      this._resizeTimeout = null

      const width = window.innerWidth
      const height = window.innerHeight
      const breakpoint = width >= 1024 ? 'lg' : width > 768 ? 'md' : width > 480 ? 'sm' : 'xs'
      const rowNum = width >= 1024 ? 24 : width > 768 ? 16 : width > 480 ? 12 : 8

      this.rowHeight = height / rowNum

      return breakpoint
    }
  }

  onBreakpointChanged(newBreakpoint) {
    console.log('on breakpoint changed', newBreakpoint)

    this.layout = this.layouts[newBreakpoint]
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

    this.$store.commit('panes/UPDATE_LAYOUT', {
      breakpoint: this.$refs.grid.lastBreakpoint,
      items: this.layout
    })
  }

  onItemMoved() {
    this.$store.commit('panes/UPDATE_LAYOUT', {
      breakpoint: this.$refs.grid.lastBreakpoint,
      items: this.layout
    })
  }

  onContainerResized(id, newHeightGrid, newWidthGrid, newHeightPx, newWidthPx) {
    this.resizePane(id, +newHeightPx, +newWidthPx)
  }
}
</script>
