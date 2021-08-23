<template>
  <grid-layout
    ref="grid"
    :layout="layout"
    :responsive-layouts="layouts"
    :cols="cols"
    :breakpoints="breakpoints"
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
      @moved="updateItem"
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
import Website from '../website/Website.vue'
import { BREAKPOINTS_COLS, BREAKPOINTS_WIDTHS } from '@/utils/constants'

@Component({
  components: { GridLayout: VueGridLayout.GridLayout, GridItem: VueGridLayout.GridItem, Chart, Trades, Stats, Counters, Prices, Website }
})
export default class extends Vue {
  draggable = true
  resizable = true
  layoutReady = false
  rowHeight = 80
  layout = null
  cols = null
  breakpoint = null

  private _maximizedPaneId
  private _resizeTimeout: number

  $refs!: {
    panes: PaneMixin[]
    grid: VueGridLayout.GridLayout
  }

  protected get panes() {
    return this.$store.state.panes.panes
  }

  protected get sortedBreakpoints() {
    return Object.keys(this.breakpoints).sort((a, b) => {
      return BREAKPOINTS_COLS[b] - BREAKPOINTS_COLS[a]
    })
  }

  protected get breakpoints() {
    const breakpoints = Object.keys(this.$store.state.panes.layouts).reduce((cols, breakpoint) => {
      cols[breakpoint] = BREAKPOINTS_WIDTHS[breakpoint]
      return cols
    }, {})

    const keys = Object.keys(breakpoints).sort((a, b) => {
      return BREAKPOINTS_COLS[b] - BREAKPOINTS_COLS[a]
    })

    breakpoints[keys[keys.length - 1]] = 0

    return breakpoints
  }

  protected get layouts() {
    const layouts = this.$store.state.panes.layouts
    if (this.breakpoint) {
      this.layout = layouts[this.breakpoint]
    }
    return layouts
  }

  created() {
    this.cols = BREAKPOINTS_COLS

    this.getLayout()

    this.layout = this.layouts[this.breakpoint]
  }

  mounted() {
    window.addEventListener('resize', this.getLayout)
  }

  beforeDestroy() {
    window.addEventListener('resize', this.getLayout)
  }

  getLayout(event?: Event) {
    if (event && !event.isTrusted) {
      this.resizeMaximizedPane()
      return
    }

    if (this._resizeTimeout) {
      clearTimeout(this._resizeTimeout)
    }

    if (event) {
      this._resizeTimeout = window.setTimeout(this.getLayout.bind(this), 200)
    } else {
      this._resizeTimeout = null

      const width = window.innerWidth
      const height = window.innerHeight
      const breakpoints = this.breakpoints

      let breakpointId = null

      for (const id of this.sortedBreakpoints) {
        if (width > breakpoints[id]) {
          breakpointId = id
          break
        }
      }

      const rowNum = BREAKPOINTS_COLS[breakpointId]

      this.rowHeight = height / rowNum

      this.breakpoint = breakpointId
    }
  }

  resizeMaximizedPane() {
    let maximizedItem: HTMLElement

    if (!this._maximizedPaneId) {
      maximizedItem = document.getElementsByClassName('-maximized')[0] as HTMLElement
    } else {
      maximizedItem = document.getElementById(this._maximizedPaneId).parentElement
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
    this.updateItem(id)
  }

  updateItem(id) {
    this.$store.commit('panes/UPDATE_ITEM', {
      breakpoint: this.$refs.grid.lastBreakpoint,
      item: this.layout.find(item => item.i === id)
    })
  }

  onContainerResized(id, newHeightGrid, newWidthGrid, newHeightPx, newWidthPx) {
    this.resizePane(id, +newHeightPx, +newWidthPx)
  }
}
</script>
