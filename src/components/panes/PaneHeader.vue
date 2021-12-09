<template>
  <div class="pane-header pane-overlay d-flex" :class="{ '-loading': loading }">
    <div class="pane-header__loader"></div>
    <span class="pane-header__name ml4 mrauto" data-hide-header @dblclick="renamePane">{{ name }}</span>
    <div class="toolbar flex-grow-1" @dblclick="maximizePane">
      <slot />
      <button type="button" @click="openSearch">
        <i class="icon-search"></i>
      </button>
      <button type="button" @click="openSettings">
        <i class="icon-cog"></i>
      </button>

      <dropdown :options="menu" class="-text-left" @open="highlightPane(true)" @close="highlightPane(false)" selectionClass="-text">
        <template v-slot:option-zoom>
          <div class="column" @mousedown.prevent>
            <div class="btn -green" @click="zoomOut">
              <i class="icon-minus"></i>
            </div>
            <div class="btn -text text-monospace" @click="$store.dispatch('panes/setZoom', { id: paneId, zoom: 1 })" style="display: block">
              × {{ zoom.toFixed(1) }}
            </div>
            <div class="btn -green" @click="zoomIn">
              <i class="icon-plus"></i>
            </div>
          </div>
        </template>
        <template v-slot:option="{ value }">
          <div>
            <i class="-lower" :class="'icon-' + value.icon"></i>

            <span>{{ value.label }}</span>
          </div>
        </template>
        <template v-slot:selection>
          <i class="icon-more"></i>
        </template>
      </dropdown>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import Component from 'vue-class-component'

import dialogService from '@/services/dialogService'

import CountersPaneDialog from '@/components/counters/CountersPaneDialog.vue'
import TradesPaneDialog from '../trades/TradesPaneDialog.vue'
import ChartPaneDialog from '../chart/ChartPaneDialog.vue'
import StatsPaneDialog from '../stats/StatsPaneDialog.vue'
import PricesPaneDialog from '../prices/PricesPaneDialog.vue'
import { getSiblings } from '@/utils/helpers'
import WebsitePaneDialog from '../website/WebsitePaneDialog.vue'

@Component({
  name: 'PaneHeader',
  props: {
    paneId: {
      type: String
    },
    loading: {
      type: Boolean,
      default: false
    },
    controls: {
      required: false
    }
  }
})
export default class extends Vue {
  controls: any[]
  paneId: string
  menu = [
    {
      label: 'Zoom',
      id: 'zoom'
    },
    {
      icon: 'enlarge',
      label: 'Maximize',
      click: this.maximizePane
    },
    /*{
      icon: 'search',
      label: 'Add markets',
      click: this.openSearch
    },*/
    {
      icon: 'copy-paste',
      label: 'Duplicate',
      click: this.duplicatePane
    },
    {
      icon: 'trash',
      label: 'Remove',
      click: this.removePane
    }
  ]

  get zoom() {
    return this.$store.state.panes.panes[this.paneId].zoom || 1
  }

  get type() {
    return this.$store.state.panes.panes[this.paneId].type
  }

  get name() {
    const name = this.$store.state.panes.panes[this.paneId].name
    const market = this.$store.state.panes.marketsListeners[this.$store.state.panes.panes[this.paneId].markets[0]]

    if (name) {
      return name
    } else if (market) {
      return market.local
    } else {
      return this.type
    }
  }

  created() {
    if (this.controls && this.controls.length) {
      this.menu = this.menu.slice(0, 1).concat(this.controls, this.menu.slice(1))
    }
  }

  openSettings() {
    switch (this.type) {
      case 'counters':
        dialogService.open(CountersPaneDialog, { paneId: this.paneId })
        break
      case 'stats':
        dialogService.open(StatsPaneDialog, { paneId: this.paneId })
        break
      case 'chart':
        dialogService.open(ChartPaneDialog, { paneId: this.paneId })
        break
      case 'trades':
        dialogService.open(TradesPaneDialog, { paneId: this.paneId })
        break
      case 'prices':
        dialogService.open(PricesPaneDialog, { paneId: this.paneId })
        break
      case 'website':
        dialogService.open(WebsitePaneDialog, { paneId: this.paneId })
        break
    }
  }

  openSearch() {
    this.$store.dispatch('app/showSearch', this.paneId)
  }

  zoomIn() {
    this.$store.dispatch('panes/changeZoom', { id: this.paneId, zoom: 0.1 })
  }

  zoomOut() {
    this.$store.dispatch('panes/changeZoom', { id: this.paneId, zoom: -0.1 })
  }

  async removePane() {
    if (await dialogService.confirm(`Delete pane "${this.paneId}" ?`)) {
      this.$store.dispatch('panes/removePane', this.paneId)
    }
  }

  duplicatePane() {
    this.$store.dispatch('panes/duplicatePane', this.paneId)
  }

  highlightPane(value: boolean) {
    this.$el.parentElement.parentElement.classList[value ? 'add' : 'remove']('-highlight')
  }

  maximizePane(event) {
    if (event.type === 'dblclick' && event.currentTarget !== event.target && event.target.className !== 'toolbar__spacer') {
      return
    }

    const el = this.$el.parentElement.parentElement
    const isMaximized = el.classList.toggle('-maximized')

    const siblings = getSiblings(el)

    for (const sibling of siblings) {
      if (!sibling.getAttribute('type')) {
        continue
      }
      sibling.classList.remove('-maximized')
      sibling.style.display = isMaximized ? 'none' : 'block'
    }

    const cls = Event as any

    window.dispatchEvent(new cls('resize'))
  }

  async renamePane() {
    const name = await dialogService.prompt({
      action: 'Rename',
      input: this.name
    })

    if (name !== this.name) {
      this.$store.commit('panes/SET_PANE_NAME', { id: this.paneId, name: name })
    }
  }
}
</script>
