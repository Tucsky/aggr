<template>
  <div class="pane-header toolbar" :class="{ '-loading': loading }">
    <div class="pane-header__loader"></div>
    <span class="ml4 mrauto" data-hide-header @dblclick="renamePane">{{ name }}</span>

    <slot />

    <button type="button" v-if="showSearch" @click="openSearch">
      <i class="icon-search"></i>
    </button>

    <dropdown
      v-if="showTimeframe"
      :options="timeframes"
      :selected="timeframe"
      placeholder="tf."
      @output="$store.commit(paneId + '/SET_TIMEFRAME', $event)"
    >
      <template v-slot:selection="{ item }">
        <span>{{ item }}</span>
      </template>
    </dropdown>

    <button type="button" @click="openSettings">
      <i class="icon-cog"></i>
    </button>

    <dropdown :options="menu" class="-text-left" @open="highlightPane(true)" @close="highlightPane(false)">
      <template v-slot:option-0>
        <div class="column" @mousedown.prevent>
          <div class="btn -green" @click="zoomOut">
            <i class="icon-minus"></i>
          </div>
          <div class="btn -text text-monospace" @click="$store.dispatch('panes/setZoom', { id: paneId, zoom: 0 })" style="display: block">
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
import { parseMarket } from '@/utils/helpers'

@Component({
  name: 'PaneHeader',
  props: {
    paneId: {
      type: String
    },
    showSearch: {
      type: Boolean,
      default: true
    },
    showTimeframe: {
      type: Boolean,
      default: false
    },
    loading: {
      type: Boolean,
      default: false
    }
  }
})
export default class extends Vue {
  paneId: string
  timeframes = {
    '21t': '21 ticks',
    '50t': '50 ticks',
    '89t': '89 ticks',
    '100t': '100 ticks',
    '144t': '144 ticks',
    '200t': '200 ticks',
    '233t': '233 ticks',
    '377t': '377 ticks',
    '610t': '610 ticks',
    '1000t': '1000 ticks',
    '1597t': '1597 ticks',
    1: '1s',
    3: '3s',
    5: '5s',
    10: '10s',
    30: '30s',
    60: '1m',
    [60 * 3]: '3m',
    [60 * 5]: '5m',
    [60 * 15]: '15m',
    [60 * 21]: '21m',
    [60 * 60]: '1h',
    [60 * 60 * 2]: '2h',
    [60 * 60 * 4]: '4h',
    [60 * 60 * 8]: '8h',
    [60 * 60 * 24]: '1d'
  }
  menu = [
    {
      label: 'Zoom'
    },
    {
      icon: 'copy-paste',
      label: 'Duplicate pane',
      click: this.duplicatePane
    },
    {
      icon: 'trash',
      label: 'Remove pane',
      click: this.removePane
    }
  ]

  get name() {
    let name = this.$store.state.panes.panes[this.paneId].name
    const markets = this.$store.state.panes.panes[this.paneId].markets

    if (!name) {
      if (markets.length) {
        const [, pair] = parseMarket(markets[0])
        return pair
      } else {
        name = this.paneId
      }
    }

    return name
  }

  get zoom() {
    return this.$store.state.panes.panes[this.paneId].zoom || 1
  }

  get type() {
    return this.$store.state.panes.panes[this.paneId].type
  }

  get timeframe() {
    return this.$store.state[this.paneId].timeframe
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
    }
  }

  openSearch() {
    this.$store.dispatch('app/showSearch', { paneId: this.paneId })
  }

  zoomIn() {
    this.$store.dispatch('panes/changeZoom', { id: this.paneId, zoom: 0.1 })
  }

  zoomOut() {
    this.$store.dispatch('panes/changeZoom', { id: this.paneId, zoom: -0.1 })
  }

  removePane() {
    this.$store.dispatch('panes/removePane', this.paneId)
  }

  duplicatePane() {
    this.$store.dispatch('panes/duplicatePane', this.paneId)
  }

  copySettings() {
    this.$store.dispatch('panes/copySettings', this.paneId)
  }

  highlightPane(value: boolean) {
    this.$el.parentElement.parentElement.classList[value ? 'add' : 'remove']('-highlight')
  }

  pasteSettings() {
    let settings: any

    try {
      settings = JSON.parse(this.$store.state.app.paneClipboard)
    } catch (error) {
      this.$store.dispatch('app/showNotice', {
        title: 'No pane settings to paste',
        type: 'error'
      })
      return
    }

    this.$store.dispatch('panes/applySettings', {
      id: this.paneId,
      settings: settings
    })
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
