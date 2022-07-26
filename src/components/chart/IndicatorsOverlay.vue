<template>
  <div class="chart-overlay__panel indicators-overlay">
    <div class="chart-overlay__content" v-if="value">
      <dropdown v-model="dropdownTrigger">
        <button
          type="button"
          class="dropdown-item"
          @click="editIndicator(selectedIndicator)"
        >
          <i class="icon-edit"></i>
          <span>Edit</span>
        </button>
        <button
          type="button"
          class="dropdown-item"
          @click="resizeIndicator(selectedIndicator)"
        >
          <i class="icon-resize-height"></i>
          <span>Resize</span>
        </button>
        <button
          type="button"
          class="dropdown-item"
          @click="duplicateIndicator(selectedIndicator)"
        >
          <i class="icon-copy-paste"></i>
          <span>Duplicate</span>
        </button>
        <button
          type="button"
          class="dropdown-item"
          @click="downloadIndicator(selectedIndicator)"
        >
          <i class="icon-download"></i>
          <span>Download</span>
        </button>
        <div class="dropdown-divider"></div>
        <button
          type="button"
          class="dropdown-item"
          @click="removeIndicator(selectedIndicator)"
        >
          <i class="icon-trash"></i>
          <span>Remove</span>
        </button>
      </dropdown>
      <IndicatorControl
        v-for="(indicator, id) in indicators"
        :key="id"
        :indicator-id="id"
        :pane-id="paneId"
        @action="onClickIndicator"
      />
    </div>
    <div class="chart-overlay__title pane-overlay" @click="toggleOverlay">
      <span>Indicators</span>
      <button
        type="button"
        class="btn badge -outline"
        @click.stop="addIndicator"
      >
        Add
        <i class="icon-plus -small ml4"></i>
      </button>
      <i class="icon-up-thin"></i>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import Component from 'vue-class-component'

import { ChartPaneState } from '../../store/panesSettings/chart'

import dialogService from '../../services/dialogService'

import IndicatorControl from '@/components/chart/IndicatorControl.vue'
import CreateIndicatorDialog from '@/components/chart/CreateIndicatorDialog.vue'

@Component({
  name: 'IndicatorsOverlay',
  components: {
    IndicatorControl
  },
  props: {
    paneId: {
      type: String
    },
    value: {
      type: Boolean,
      required: true
    }
  }
})
export default class extends Vue {
  private paneId: string
  private value: boolean

  dropdownTrigger = null
  selectedIndicator = null

  get indicators() {
    return (this.$store.state[this.paneId] as ChartPaneState).indicators
  }

  get ids() {
    return Object.values(this.indicators).map(a => a.id)
  }

  $refs!: {
    indicatorDropdown: any
  }

  toggleOverlay() {
    this.$emit('input', !this.value)
  }

  toggleDropdown(event?: Event, id?: string) {
    if (event && (!this.dropdownTrigger || this.selectedIndicator !== id)) {
      this.dropdownTrigger = event.currentTarget
      this.selectedIndicator = id
    } else {
      this.dropdownTrigger = null
      this.selectedIndicator = null
    }
  }

  async editIndicator(indicatorId: string) {
    dialogService.open(
      (await import('@/components/chart/IndicatorDialog.vue')).default,
      { paneId: this.paneId, indicatorId: indicatorId },
      'indicator'
    )
    this.dropdownTrigger = null
  }

  removeIndicator(indicatorId: string) {
    this.$store.dispatch(this.paneId + '/removeIndicator', { id: indicatorId })
  }

  resizeIndicator(indicatorId: string) {
    this.$store.commit(this.paneId + '/TOGGLE_LAYOUTING', indicatorId)
  }

  duplicateIndicator(indicatorId: string) {
    this.$store.dispatch(this.paneId + '/duplicateIndicator', indicatorId)
  }

  downloadIndicator(indicatorId: string) {
    this.$store.dispatch(this.paneId + '/downloadIndicator', indicatorId)
  }

  addIndicator() {
    dialogService.open(CreateIndicatorDialog, { paneId: this.paneId })
  }

  onClickIndicator({
    indicatorId,
    actionName,
    event
  }: {
    indicatorId: string
    actionName?: string
    event?: Event
  }) {
    switch (actionName) {
      case 'menu':
        return this.toggleDropdown(event, indicatorId)
      case 'remove':
        return this.removeIndicator(indicatorId)
      case 'resize':
        return this.resizeIndicator(indicatorId)
    }

    return this.editIndicator(indicatorId)
  }
}
</script>
<style lang="scss" scoped>
.chart-overlay__content {
  padding-bottom: 1rem;
}
</style>
