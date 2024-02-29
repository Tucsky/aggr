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
        <button
          type="button"
          class="dropdown-item"
          @click="setIndicatorOrder(selectedIndicator, 0)"
          v-if="selectedIndicatorIsFront"
        >
          <i class="icon-up"></i>
          <span>Send to back</span>
        </button>
        <button
          v-else
          type="button"
          class="dropdown-item"
          @click="
            setIndicatorOrder(selectedIndicator, indicatorOrder.length - 1)
          "
        >
          <i class="icon-down -lower"></i>
          <span>Bring to front</span>
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
        v-for="id in indicatorOrder"
        :key="id"
        :indicator-id="id"
        :pane-id="paneId"
        @action="onClickIndicator"
        @mousedown.native="bindSort(id, $event)"
      />
    </div>
    <div class="chart-overlay__head pane-overlay" @click="toggleOverlay">
      <span class="chart-overlay__title">
        {{ label }}
      </span>
      <button type="button" class="btn badge -text" @click.stop="addIndicator">
        <i class="icon-plus"></i>
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import Component from 'vue-class-component'

import { ChartPaneState } from '../../store/panesSettings/chart'

import dialogService from '../../services/dialogService'

import IndicatorControl from '@/components/chart/IndicatorControl.vue'

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
export default class IndicatorsOverlay extends Vue {
  private paneId: string
  private value: boolean

  dropdownTrigger: HTMLElement = null
  selectedIndicator: string = null
  selectedIndicatorIsFront: boolean = null
  sorting: {
    id: string
    height: number
    startY: number
    maxPosition: number
    oldPosition: number
    newPosition: number
    moved?: boolean
  }

  get indicators() {
    return (this.$store.state[this.paneId] as ChartPaneState).indicators
  }

  get indicatorOrder() {
    return (this.$store.state[this.paneId] as ChartPaneState).indicatorOrder
  }

  get label() {
    const count = Object.values(this.indicators).length

    return `${count} indicator${count > 1 ? 's' : ''}`
  }

  $refs!: {
    indicatorDropdown: any
  }

  toggleOverlay() {
    this.$emit('input', !this.value)
  }

  toggleDropdown(event?: Event, id?: string) {
    if (
      event &&
      (!this.dropdownTrigger ||
        !this.selectedIndicator ||
        this.selectedIndicator !== id)
    ) {
      const triggerElement = event.currentTarget as HTMLElement
      this.dropdownTrigger = triggerElement
      this.selectedIndicator = id
      this.selectedIndicatorIsFront =
        this.indicatorOrder.indexOf(id) === this.indicatorOrder.length - 1
    } else {
      this.dropdownTrigger = null
      this.selectedIndicator = null
    }
  }

  async editIndicator(indicatorId: string) {
    dialogService.open(
      (await import('@/components/indicators/IndicatorDialog.vue')).default,
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

  async addIndicator() {
    dialogService.open(
      (await import('@/components/indicators/IndicatorLibraryDialog.vue'))
        .default,
      {},
      'indicator-library'
    )
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
    if (this.sorting && this.sorting.moved) {
      return
    }

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

  bindSort(indicatorId: string, event: MouseEvent) {
    if (this.sorting) {
      return
    }

    const keys = Object.keys(this.indicators)
    let position = this.indicatorOrder.indexOf(indicatorId)
    if (position === -1) {
      position = keys.indexOf(indicatorId)
    }

    const element = event.currentTarget as HTMLElement
    const startY = event.clientY

    this.sorting = {
      id: indicatorId,
      height: element.clientHeight,
      startY,
      maxPosition: keys.length - 1,
      oldPosition: position,
      newPosition: position
    }

    document.addEventListener('mousemove', this.handleSort)
    document.addEventListener('mouseup', this.unbindSort)
  }

  handleSort(event) {
    if (!this.sorting) {
      return
    }

    const offset = event.clientY - this.sorting.startY

    if (!this.sorting.moved) {
      this.sorting.moved = Math.abs(offset) > 3
    }

    const newPosition = Math.max(
      0,
      Math.min(
        this.sorting.maxPosition,
        this.sorting.oldPosition + Math.round(offset / this.sorting.height)
      )
    )

    if (newPosition !== this.sorting.newPosition) {
      this.sorting.newPosition = newPosition
      this.setIndicatorOrder(this.sorting.id, this.sorting.newPosition)
    }
  }

  setIndicatorOrder(id, position) {
    this.$store.commit(`${this.paneId}/UPDATE_INDICATOR_ORDER`, {
      id,
      position
    })
  }

  async unbindSort() {
    if (!this.sorting) {
      return
    }

    document.removeEventListener('mousemove', this.handleSort)
    document.removeEventListener('mouseup', this.unbindSort)

    await this.$nextTick()

    setTimeout(() => {
      this.sorting = null
    })
  }
}
</script>
