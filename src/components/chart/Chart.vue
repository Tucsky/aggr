<template>
  <div class="pane-chart">
    <pane-header
      ref="paneHeader"
      :paneId="paneId"
      :settings="() => import('@/components/chart/ChartDialog.vue')"
    >
      <template v-slot:menu>
        <button type="button" class="dropdown-item" @click="toggleLayout">
          <i class="icon-resize-height"></i>
          <span>Arrange</span>
        </button>
        <button type="button" class="dropdown-item" @click="restart">
          <i class="icon-refresh"></i>
          <span>Restart</span>
        </button>
        <button type="button" class="dropdown-item" @click="takeScreenshot">
          <i class="icon-add-photo"></i>
          <span>Snapshot</span>
        </button>
      </template>
      <button
        v-for="(timeframeLabel, timeframe) of favoriteTimeframes"
        :key="timeframe"
        @click="selectTimeframe($event, timeframe)"
        title="Maintain shift key to change timeframe on all panes"
        class="btn pane-chart__timeframe -text -cases"
        :class="[
          timeframeForHuman === timeframeLabel && 'pane-header__highlight'
        ]"
      >
        <span>{{ timeframeLabel }}</span>
      </button>
      <Btn
        ref="timeframeButton"
        @click="toggleTimeframeDropdown($event, $refs.timeframeButton)"
        class="-arrow -cases pane-header__highlight pane-chart__timeframe-selector"
      >
        {{ !isKnownTimeframe ? timeframeForHuman : '' }}
      </Btn>
      <hr />
    </pane-header>
    <div
      class="chart-overlay hide-scrollbar"
      :style="{ left: overlayLeft + 'px' }"
    >
      <indicators-overlay v-model="showIndicators" :pane-id="paneId" />
      <markets-overlay :pane-id="paneId" />
    </div>

    <chart-layout
      v-if="layouting"
      :pane-id="paneId"
      :layouting="layouting"
      :axis="axis"
    ></chart-layout>

    <div class="chart__container" ref="chartContainer"></div>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'

import Chart from './chart'

import { getTimeframeForHuman, sleep } from '@/utils/helpers'
import { ChartPaneState } from '@/store/panesSettings/chart'

import aggregatorService from '@/services/aggregatorService'
import { AlertEvent } from '@/services/alertService'

import PaneMixin from '@/mixins/paneMixin'
import PaneHeader from '@/components/panes/PaneHeader.vue'
import ChartLayout from '@/components/chart/Layout.vue'
import IndicatorsOverlay from '@/components/chart/IndicatorsOverlay.vue'
import MarketsOverlay from '@/components/chart/MarketsOverlay.vue'
import AlertsList from '@/components/alerts/AlertsList.vue'
import Btn from '@/components/framework/Btn.vue'

import { Trade } from '@/types/types'

@Component({
  name: 'Chart',
  components: {
    ChartLayout,
    PaneHeader,
    IndicatorsOverlay,
    MarketsOverlay,
    AlertsList,
    Btn
  }
})
export default class ChartComponent extends Mixins(PaneMixin) {
  axis = {
    top: 0,
    left: 0,
    right: 0,
    time: 0
  }

  private chart: Chart

  get layouting() {
    this.refreshAxisSize()
    return (this.$store.state[this.paneId] as ChartPaneState).layouting
  }

  get overlayLeft() {
    return this.axis.left
  }

  get overlayTop() {
    return this.axis.top
  }

  get favoriteTimeframes() {
    return this.$store.state.settings.favoriteTimeframes
  }

  get timeframe() {
    return this.$store.state[this.paneId].timeframe
  }

  get isKnownTimeframe() {
    return Object.keys(this.favoriteTimeframes).indexOf(this.timeframe) !== -1
  }

  get showIndicators() {
    return this.$store.state[this.paneId].showIndicators
  }

  set showIndicators(value) {
    this.$store.commit(`${this.paneId}/TOGGLE_INDICATORS`, value)
  }

  get timeframeForHuman() {
    if (!this.timeframe) {
      return 'ERR'
    }

    return getTimeframeForHuman(this.timeframe)
  }

  $refs!: {
    chartContainer: HTMLElement
    paneHeader: PaneHeader
    timeframeButton: HTMLElement
  }

  mounted() {
    this.chart = new Chart(this.paneId, this.$refs.chartContainer)

    this.bindAggregator()

    if (this.showIndicators && this.$parent.$el.clientHeight > 420) {
      this.showIndicators = true
    }
  }

  destroyChart() {
    this.unbindAggregator()

    this.chart.destroy()
  }

  beforeDestroy() {
    this.destroyChart()
  }

  onTrades(trades: Trade[]) {
    this.chart.queueTrades(trades)
  }

  onAlert(alertEvent: AlertEvent) {
    this.chart.onAlert(alertEvent)
  }

  bindAggregator() {
    aggregatorService.on('trades', this.onTrades)
    aggregatorService.on('alert', this.onAlert)
  }

  unbindAggregator() {
    aggregatorService.off('trades', this.onTrades)
    aggregatorService.off('alert', this.onAlert)
  }

  renderChart() {
    this.chart.renderAll()
  }

  onResize() {
    if (!this.chart) {
      return
    }

    this.chart.refreshChartDimensions()
    this.chart.updateFontSize()
    this.refreshAxisSize()
  }

  async refreshAxisSize() {
    if (!this.$refs.chartContainer) {
      return
    }

    await sleep(100)

    this.axis = this.chart.getAxisSize()
  }

  toggleLayout() {
    this.$store.commit(this.paneId + '/TOGGLE_LAYOUTING')
  }

  async toggleTimeframeDropdown(event, button) {
    button.isLoading = true
    await this.chart.toggleTimeframeDropdown(event)
    button.isLoading = false
  }

  restart() {
    this.chart.restart()
  }

  takeScreenshot(event) {
    this.chart.takeScreenshot(event)
  }

  selectTimeframe(event, timeframe) {
    if (timeframe === this.timeframe) {
      this.toggleTimeframeDropdown(event, this.$refs.timeframeButton)
      return
    }
    this.$store.dispatch(`${this.paneId}/setTimeframe`, timeframe)
  }
}
</script>

<style lang="scss" scoped>
.pane-chart {
  font-family: $font-condensed;

  &:hover .chart-overlay {
    display: flex;
  }

  &__timeframe {
    $timeframe: &;
    opacity: 0.5;
    padding-inline: 0.125em;

    &.pane-header__highlight {
      opacity: 1;

      ~ #{$timeframe}-selector {
        opacity: 0.5;

        .pane:not(:hover) & {
          padding-inline: 0.0625em;
        }

        &:after {
          margin-inline: -0.25em;
        }

        &:hover {
          opacity: 1;
        }
      }
    }

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
}

.chart__container {
  position: relative;
  width: 100%;
  flex-grow: 1;

  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}

body.-unselectable .chart-overlay {
  display: none !important;
}
</style>
