<template>
  <div
    class="thresholds"
    :class="{ '-dragging': dragging, '-rendering': rendering }"
  >
    <table class="table thresholds-table" v-if="showThresholdsAsTable">
      <thead>
        <tr>
          <th colspan="2">{{ label }}</th>
          <th class="table-action">
            <button class="btn -text" @click="flipSwatches('buy')">
              <i class="icon-sort" v-tippy title="Flip"></i>
            </button>
          </th>
          <th class="table-action">
            <button class="btn -text" @click="flipSwatches('sell')">
              <i class="icon-sort" v-tippy title="Flip"></i>
            </button>
          </th>
        </tr>
      </thead>
      <transition-group name="flip-list" tag="tbody">
        <tr v-for="(threshold, index) in thresholds" :key="threshold.id">
          <td class="table-input table-min">
            <label
              class="checkbox-control -small mb4"
              v-if="index === thresholds.length - 1"
              title="Set as maximum amount"
              v-tippy
            >
              <input
                type="checkbox"
                class="form-control"
                :checked="capToLastThreshold"
                @change="toggleMaximumThreshold(threshold)"
              />
              <div></div>
            </label>
          </td>
          <td class="table-input">
            <i class="icon icon-currency"></i>
            <editable
              placeholder="Amount*"
              class="pl16 w-100"
              :value="threshold.amount"
              @input="
                $store.commit(paneId + '/SET_THRESHOLD_AMOUNT', {
                  id: threshold.id,
                  value: $event
                })
              "
            />
            <small
              class="pl8 text-danger"
              v-if="index === thresholds.length - 1 && threshold.max"
            >
              <strong>threshold is max</strong>
            </small>
          </td>
          <td class="table-action">
            <color-picker-control
              label="Buy color"
              :value="threshold.buyColor"
              @input="
                $store.commit(paneId + '/SET_THRESHOLD_COLOR', {
                  id: threshold.id,
                  side: 'buyColor',
                  value: $event
                })
              "
            ></color-picker-control>
          </td>
          <td class="table-action">
            <color-picker-control
              label="Sell color"
              :value="threshold.sellColor"
              @input="
                $store.commit(paneId + '/SET_THRESHOLD_COLOR', {
                  id: threshold.id,
                  side: 'sellColor',
                  value: $event
                })
              "
            ></color-picker-control>
          </td>
          <td
            v-if="useAudio"
            class="thresholds-table__audio table-action"
            @click="openThresholdAudio(threshold.id)"
            title="Configure threshold audio"
            v-tippy
          >
            <button class="btn -text"><i class="icon-music-note"></i></button>
          </td>
          <td
            class="table-action"
            @click="selectThreshold(threshold.id, $event)"
          >
            <button class="btn -text">
              <i class="icon-more"></i>
            </button>
          </td>
        </tr>
      </transition-group>
    </table>

    <div class="thresholds-slider" v-else>
      <div class="thresholds-gradients">
        <div class="thresholds-gradients__buys" ref="buysGradient"></div>
        <div class="thresholds-gradients__sells" ref="sellsGradient"></div>
      </div>

      <div class="thresholds-slider__bar" ref="thresholdContainer">
        <div
          v-for="threshold in thresholds"
          :key="threshold.id"
          class="thresholds-slider__handler"
          :class="{ '-selected': selectedThresholdId === threshold.id }"
          :data-id="threshold.id"
          :data-amount="formatAmount(threshold.amount, 2)"
        ></div>
      </div>
    </div>
    <dropdown v-model="thresholdPanelTrigger" interactive>
      <threshold-dropdown
        :threshold="selectedThreshold"
        :pane-id="paneId"
        :can-delete="thresholds.length > 2"
        @input="thresholdPanelTrigger = $event"
      />
    </dropdown>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import { sleep } from '@/utils/helpers'
import { formatAmount } from '@/services/productsService'

import dialogService from '@/services/dialogService'
import ThresholdAudioDialog from '../trades/audio/ThresholdAudioDialog.vue'
import ColorPickerControl from '../framework/picker/ColorPickerControl.vue'
import { Threshold } from '@/store/panesSettings/trades'
import ThresholdDropdown from './ThresholdDropdown.vue'

@Component({
  name: 'Thresholds',
  components: {
    ColorPickerControl,
    ThresholdDropdown
  },
  props: {
    paneId: {
      type: String,
      required: true
    },
    label: {
      type: String,
      default: null
    },
    thresholds: {
      required: true
    }
  }
})
export default class extends Vue {
  paneId: string
  thresholds: Threshold[]

  rendering = true
  dragging = null
  editing = null
  selectedThresholdId = null
  selectedSliderHandle = null
  thresholdPanelTrigger = null

  private _dragReference: {
    timestamp: number
    position: number
  } = null

  private _minimum = null
  private _maximum = null
  private _offsetLeft = null

  private _onStoreMutation: () => void
  private _startDrag: () => void
  private _endDrag: () => void
  private _doDrag: () => void
  private _doResize: () => void
  private _width: number

  get selectedThreshold() {
    const threshold = this.$store.getters[this.paneId + '/getThreshold'](
      this.selectedThresholdId
    )
    return threshold
  }

  get showThresholdsAsTable() {
    return this.$store.state[this.paneId].showThresholdsAsTable
  }

  get useAudio() {
    return this.$store.state.settings.useAudio
  }

  get capToLastThreshold() {
    return this.thresholds[this.thresholds.length - 1].max
  }

  $refs!: {
    thresholdContainer: HTMLElement
    buysGradient: HTMLElement
    sellsGradient: HTMLElement
  }

  created() {
    this._onStoreMutation = this.$store.subscribe(mutation => {
      switch (mutation.type) {
        case this.paneId + '/TOGGLE_SETTINGS_PANEL':
        case this.paneId + '/TOGGLE_THRESHOLDS_TABLE':
          if (
            (mutation.type === this.paneId + '/TOGGLE_SETTINGS_PANEL' &&
              mutation.payload === 'thresholds') ||
            (mutation.type === this.paneId + '/TOGGLE_THRESHOLDS_TABLE' &&
              mutation.payload === false)
          ) {
            this.rendering = true

            this.refreshHandlers()
            this.refreshGradients()
          }
          break
        case this.paneId + '/SET_THRESHOLD_AMOUNT':
          this.reorderThresholds()
          this.refreshHandlers()
          break
        case this.paneId + '/SET_THRESHOLD_COLOR':
          this.refreshGradients()
          break
        case this.paneId + '/ADD_THRESHOLD':
          this.refreshHandlers()
          break
      }
    })
  }

  mounted() {
    if (!this.showThresholdsAsTable) {
      this.refreshHandlers()
      this.refreshGradients()
    }

    this._startDrag = this.startDrag.bind(this)

    this.$el.addEventListener('touchstart', this._startDrag, false)
    this.$el.addEventListener('mousedown', this._startDrag, false)

    this._doDrag = this.doDrag.bind(this)

    window.addEventListener('touchmove', this._doDrag, false)
    window.addEventListener('mousemove', this._doDrag, false)

    this._endDrag = this.endDrag.bind(this)

    window.addEventListener('touchend', this._endDrag, false)
    window.addEventListener('mouseup', this._endDrag, false)

    this._doResize = this.refreshHandlers.bind(this)

    window.addEventListener('resize', this._doResize, false)
  }

  beforeDestroy() {
    window.removeEventListener('touchmove', this._doDrag)
    window.removeEventListener('mousemove', this._doDrag)
    window.removeEventListener('touchend', this._endDrag)
    window.removeEventListener('mouseup', this._endDrag)
    window.removeEventListener('resize', this._doResize)

    this._onStoreMutation()
  }

  startDrag(event) {
    if (!event.target.classList.contains('thresholds-slider__handler')) {
      return
    }

    let x = event.pageX

    if (event.touches && event.touches.length) {
      x = event.touches[0].pageX
    }

    this.selectThreshold(event.target.getAttribute('data-id'), event)
    this.selectedSliderHandle = event.target

    this.$nextTick(() => {
      this._dragReference = {
        timestamp: Date.now(),
        position: x
      }
    })
  }

  selectThreshold(id, event) {
    if (this.thresholdPanelTrigger && this.selectedThresholdId === id) {
      this.thresholdPanelTrigger = null
      this.selectedThresholdId = null

      if (this.selectedSliderHandle) {
        this.endDrag()
      }

      return
    }
    this.selectedThresholdId = id

    if (this.selectedThresholdId) {
      this.thresholdPanelTrigger = event.target
    }
  }

  doDrag(event) {
    let x = event.pageX

    if (event.touches && event.touches.length) {
      x = event.touches[0].pageX
    }

    if (
      this.selectedSliderHandle === null ||
      !this._dragReference ||
      (Date.now() - this._dragReference.timestamp < 1000 &&
        Math.abs(this._dragReference.position - x) < 3)
    ) {
      return
    }

    this.dragging = true

    const minLog = Math.max(0, Math.log(this._minimum + 1) || 0)
    const minLeft = (minLog / Math.log(this._maximum + 1)) * this._width

    let left = Math.max(
      (this._width / 3) * -1,
      Math.min(this._width * 1.5, x - this._offsetLeft)
    )
    let amount =
      Math.exp(
        ((minLeft + (left / this._width) * (this._width - minLeft)) /
          this._width) *
          Math.log(this._maximum + 1)
      ) - 1

    if (x < this._offsetLeft) {
      amount =
        this.selectedThreshold.amount -
        (this.selectedThreshold.amount - amount) * 0.1
      left = 0
    } else if (x > this._offsetLeft + this._width) {
      amount =
        this.selectedThreshold.amount -
        (this.selectedThreshold.amount - amount) * 0.1
      left = this._width
    }

    if (amount < 0) {
      amount = 0
    }

    this.selectedSliderHandle.style.transform = 'translateX(' + left + 'px)'

    this.$store.commit(this.paneId + '/SET_THRESHOLD_AMOUNT', {
      id: this.selectedThresholdId,
      value: amount
    })
  }

  endDrag() {
    if (this.selectedSliderHandle) {
      this.selectedSliderHandle = null

      this.reorderThresholds()
      this.refreshHandlers()
      this.refreshGradients()
    }

    this.dragging = false
  }

  async refreshHandlers() {
    await sleep(100)
    const amounts = this.thresholds.map(threshold => threshold.amount)

    this._minimum = this.thresholds[0].amount
    this._maximum = Math.max.apply(null, amounts)

    if (this.showThresholdsAsTable) {
      return
    }

    const bounds = this.$refs.thresholdContainer.getBoundingClientRect()

    this._offsetLeft = bounds.left
    this._width = this.$refs.thresholdContainer.clientWidth

    const handlers = this.$refs.thresholdContainer.children

    const minLog = Math.max(0, Math.log(this._minimum + 1) || 0)
    const maxLog = Math.log(this._maximum + 1) - minLog

    for (let i = 0; i < this.thresholds.length; i++) {
      const handler = handlers[i] as HTMLElement
      const threshold = this.thresholds[i]
      const posLog = Math.log(threshold.amount + 1) - minLog
      const posPx = this._width * (posLog / maxLog)

      handler.style.transform = 'translateX(' + posPx + 'px)'
    }

    this.rendering = false
  }

  async refreshGradients() {
    if (this.showThresholdsAsTable) {
      return
    }

    await sleep(100)

    const minLog = Math.max(0, Math.log(this._minimum + 1) || 0)
    const maxLog = Math.log(this._maximum + 1)

    const buysStops = []
    const sellsStops = []

    for (let i = 0; i < this.thresholds.length; i++) {
      const percent =
        i === 0
          ? 0
          : i === this.thresholds.length - 1
          ? 100
          : (
              ((Math.log(this.thresholds[i].amount + 1) - minLog) /
                (maxLog - minLog)) *
              100
            ).toFixed(2)

      buysStops.push(`${this.thresholds[i].buyColor} ${percent}%`)
      sellsStops.push(`${this.thresholds[i].sellColor} ${percent}%`)
    }

    this.$refs.buysGradient.style.backgroundImage = `linear-gradient(to right, ${buysStops.join(
      ', '
    )})`
    this.$refs.sellsGradient.style.backgroundImage = `linear-gradient(to right, ${sellsStops.join(
      ', '
    )})`
  }

  reorderThresholds() {
    this.thresholds.sort((a, b) => a.amount - b.amount)
  }

  deleteThreshold(id: string) {
    if (this.thresholds.length <= 2) {
      return
    }

    this.$store.commit(this.paneId + '/DELETE_THRESHOLD', id)
  }

  openThresholdAudio(thresholdId) {
    dialogService.open(ThresholdAudioDialog, {
      paneId: this.paneId,
      thresholds: this.thresholds,
      thresholdId
    })
  }

  formatAmount(amount) {
    return formatAmount(amount)
  }

  flipSwatches(side) {
    const prop = `${side}Color`

    const colors = this.thresholds.map(threshold => threshold[prop]).reverse()

    for (let i = 0; i < this.thresholds.length; i++) {
      this.$store.commit(this.paneId + '/SET_THRESHOLD_COLOR', {
        id: this.thresholds[i].id,
        side: prop,
        value: colors[i]
      })
    }
  }

  toggleMaximumThreshold(threshold) {
    this.$store.commit(this.paneId + '/TOGGLE_THRESHOLD_MAX', threshold.id)

    // this.capToLastThreshold = threshold.max
  }
}
</script>

<style lang="scss">
.thresholds {
  position: relative;
  z-index: 1;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -khtml-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;

  &.-rendering .thresholds-slider {
    opacity: 0;

    &__handler {
      transform: scale(0.5) !important;
    }
  }

  &.-dragging {
    .thresholds-gradients,
    .thresholds-slider__handler {
      opacity: 0.5;

      &.-selected {
        opacity: 1;
      }
    }

    .thresholds-slider__handler {
      transition: box-shadow 0.2s $ease-elastic;
    }
  }
}

.thresholds-table {
  &__color {
    border: 0 !important;
    width: 2.25rem;
    transition: box-shadow 0.2s $ease-out-expo;
    cursor: pointer;

    &.-active {
      box-shadow: 0 0 0 0.5em rgba(white, 0.2);
      position: relative;
      z-index: 1;
    }
  }
}

.thresholds-slider {
  padding: 2em 0 1em;
  transition: opacity 0.2s $ease-out-expo;
  position: relative;

  &__bar {
    position: absolute;
    z-index: 1;

    padding: 2.75em 0 0;
    top: 0;
    left: 1em;
    right: 1em;
  }

  &__handler {
    position: absolute;
    width: 1em;
    height: 1em;
    background-color: white;
    margin-top: -0.5em;
    margin-left: -0.75em;
    padding: 0.25em;
    border-radius: 50%;
    transition: box-shadow 0.2s $ease-elastic, transform 0.2s $ease-out-expo;
    box-shadow: 0 1px 0 1px rgba(black, 0.2);
    cursor: grab;

    &:before {
      position: absolute;
      content: attr(data-amount);
      top: -2em;
      left: 50%;
      transform: translateX(-50%);
      font-size: 0.89em;
    }
  }
}

.thresholds-gradients {
  width: 100%;

  > div {
    height: 1em;
    width: 100%;
    border-radius: 0.75em 0.75em 0 0;

    + div {
      border-radius: 0 0 0.75em 0.75em;
    }
  }
}
</style>
