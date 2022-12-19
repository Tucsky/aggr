<template>
  <div class="pane-chart">
    <pane-header
      :paneId="paneId"
      :settings="() => import('@/components/chart/ChartDialog.vue')"
    >
      <template v-slot:menu>
        <button type="button" class="dropdown-item" @click="toggleLayout">
          <i class="icon-resize-height"></i>
          <span>Arrange</span>
        </button>
        <button type="button" class="dropdown-item" @click="resetChart">
          <i class="icon-refresh"></i>
          <span>Restart</span>
        </button>
        <button type="button" class="dropdown-item" @click="takeScreenshot">
          <i class="icon-add-photo"></i>
          <span>Snapshot</span>
        </button>
        <div class="dropdown-divider"></div>
      </template>
      <button
        v-for="(timeframeLabel, timeframe) of favoriteTimeframes"
        :key="timeframe"
        @click="changeTimeframe(timeframe)"
        title="Maintain shift key to change timeframe on all panes"
        class="toolbar__label timeframe"
      >
        <span>{{ timeframeLabel }}</span>
      </button>
      <button @click="toggleTimeframeDropdown" class="-arrow toolbar__label">
        {{ timeframeForHuman }}
      </button>

      <dropdown v-model="timeframeDropdownTrigger">
        <timeframe-dropdown
          class="timeframe-dropdown"
          :pane-id="paneId"
          @timeframe="changeTimeframe($event)"
        />
      </dropdown>
    </pane-header>
    <div class="chart-overlay hide-scrollbar">
      <indicators-overlay
        v-model="showIndicatorsOverlay"
        :pane-id="paneId"
        @input="$event ? bindLegend() : unbindLegend()"
      />
      <markets-overlay :pane-id="paneId" />
    </div>

    <div class="chart__container" ref="chartContainer">
      <chart-layout
        v-if="layouting"
        :pane-id="paneId"
        :layouting="layouting"
        :axis="axis"
      ></chart-layout>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'

import ChartController from './controller'
import PaneMixin from '@/mixins/paneMixin'
import PaneHeader from '@/components/panes/PaneHeader.vue'
import ChartLayout from '@/components/chart/Layout.vue'
import TimeframeDropdown from '@/components/chart/TimeframeDropdown.vue'
import IndicatorsOverlay from '@/components/chart/IndicatorsOverlay.vue'
import MarketsOverlay from '@/components/chart/MarketsOverlay.vue'
import { ChartPaneState } from '../../store/panesSettings/chart'
import { getTimeframeForHuman } from '../../utils/helpers'

@Component({
  name: 'Chart',
  components: {
    ChartLayout,
    PaneHeader,
    TimeframeDropdown,
    IndicatorsOverlay,
    MarketsOverlay
  }
})
export default class extends Mixins(PaneMixin) {
  axis = [null, null]

  showIndicatorsOverlay = false
  timeframeDropdownTrigger = null

  private _chartController: ChartController

  get layouting() {
    return (this.$store.state[this.paneId] as ChartPaneState).layouting
  }

  get showLegend() {
    return (this.$store.state[this.paneId] as ChartPaneState).showLegend
  }

  get favoriteTimeframes() {
    return this.$store.state.settings.favoriteTimeframes
  }

  get timeframe() {
    return this.$store.state[this.paneId].timeframe
  }

  get timeframeForHuman() {
    return getTimeframeForHuman(this.timeframe)
  }

  $refs!: {
    chartContainer: HTMLElement
  }

  created() {
    this._chartController = new ChartController(this.paneId)
  }

  mounted() {
    this.showIndicatorsOverlay = this.$parent.$el.clientHeight > 420

    this.createChart()
  }

  beforeDestroy() {
    this.destroyChart()
  }

  createChart() {
    this._chartController.createChart(this.$refs.chartContainer)
  }

  destroyChart() {
    this._chartController.destroyChart()
  }
}
</script>

<style lang="scss" scoped>
.pane-chart {
  font-family: $font-condensed;

  &:hover .chart-overlay {
    display: flex;
  }

  &.-loading {
    cursor: wait;
  }
}

.chart__container {
  position: relative;
  width: 100%;
  flex-grow: 1;

  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -khtml-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}

.timeframe {
  opacity: 0.5;

  &:hover {
    opacity: 1;
  }

  &__title {
    flex-grow: 1;
    letter-spacing: 1px;
    text-transform: uppercase;
    opacity: 0.5;
    font-size: 0.875em;
    align-self: flex-end;
    margin-top: 1rem;

    ~ * {
      margin-top: 3rem;
    }
  }

  &__favorite {
    &:hover {
      background-color: var(--theme-color-o20);
    }

    &.icon-star-filled {
      background-color: $red;
      color: white;
      font-weight: 600;
    }
  }
}

body.-unselectable .chart-overlay {
  display: none !important;
}
</style>
