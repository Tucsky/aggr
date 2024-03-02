<template>
  <div
    class="thresholds"
    :class="{ '-dragging': dragging, '-rendering': rendering }"
  >
    <table class="table thresholds-table" v-if="showThresholdsAsTable">
      <thead>
        <tr>
          <th colspan="2"></th>
          <th class="table-action">
            <button class="btn -text" @click="flipSwatches('buy')">flip</button>
          </th>
          <th class="table-action">
            <button class="btn -text" @click="flipSwatches('sell')">
              flip
            </button>
          </th>
        </tr>
      </thead>
      <transition-group name="flip-list" tag="tbody">
        <tr v-for="(threshold, index) in thresholds" :key="threshold.id">
          <td class="table-input table-min">
            <label
              class="checkbox-control -extra-small mb4"
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
            <div class="thresholds-table__threshold">
              <i class="icon icon-currency"></i>
              <editable
                placeholder="Amount*"
                class="w-100"
                :value="formatAmount(threshold.amount)"
                @input="
                  $store.commit(paneId + '/SET_THRESHOLD_AMOUNT', {
                    id: threshold.id,
                    value: $event
                  })
                "
              />
              <small
                class="text-danger"
                v-if="index === thresholds.length - 1 && threshold.max"
                title="Will only show trades below that amount"
              >
                <strong>MAX</strong>
              </small>
            </div>
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
    <div class="d-flex mt8">
      <presets
        class="mrauto"
        type="threshold"
        placeholder="Custom thresholds"
        :adapter="getPreset"
        @apply="applyPreset($event)"
        classes="btn -green -small -center"
      />
      <button
        type="button"
        class="btn -nowrap -text -start"
        v-tippy
        title="Add a threshold"
        @click="$store.commit(paneId + '/ADD_THRESHOLD', type)"
      >
        <i class="icon-plus"></i>
      </button>
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
import { sleep, randomString } from '@/utils/helpers'
import { formatAmount } from '@/services/productsService'

import dialogService from '@/services/dialogService'
import ThresholdAudioDialog from '../trades/audio/ThresholdAudioDialog.vue'
import ColorPickerControl from '../framework/picker/ColorPickerControl.vue'
import { Threshold } from '@/store/panesSettings/trades'
import ThresholdDropdown from './ThresholdDropdown.vue'
import ThresholdPresetDialog from '@/components/trades/ThresholdPresetDialog.vue'
import defaultTresholds from '@/store/defaultThresholds.json'

import merge from 'lodash.merge'
import { Preset } from '@/types/types'
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
    },
    type: {
      type: String,
      default: 'thresholds'
    }
  }
})
export default class Thresholds extends Vue {
  paneId: string
  thresholds: Threshold[]
  type: string

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
  private movedAmount: number

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
    return this.$store.state.settings.showThresholdsAsTable
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
        case this.paneId + '/DELETE_THRESHOLD':
        case this.paneId + '/ADD_THRESHOLD':
          this.reorderThresholds()
          this.refreshHandlers()
          break
        case this.paneId + '/SET_THRESHOLD_COLOR':
          this.refreshGradients()
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

    const left = Math.max(
      (this._width / 3) * -1,
      Math.min(this._width * 1.5, x - this._offsetLeft)
    )
    let amount =
      Math.exp(
        ((minLeft + (left / this._width) * (this._width - minLeft)) /
          this._width) *
          Math.log(this._maximum + 1)
      ) - 1

    if (amount < 0) {
      amount = 0
    }

    this.movedAmount = amount
    this.selectedSliderHandle.style.transform = 'translateX(' + left + 'px)'
  }

  endDrag() {
    if (this.selectedSliderHandle) {
      this.selectedSliderHandle = null

      this.reorderThresholds()
      this.refreshHandlers()
      this.refreshGradients()

      if (typeof this.movedAmount === 'number') {
        this.$store.commit(this.paneId + '/SET_THRESHOLD_AMOUNT', {
          id: this.selectedThresholdId,
          value: this.movedAmount
        })
      }
    }

    this.dragging = false
    this.movedAmount = null
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

  formatAmount(amount, precision?) {
    return formatAmount(amount, precision)
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
  }

  async getPreset() {
    const payload = await dialogService.openAsPromise(ThresholdPresetDialog)

    if (payload) {
      if (!payload.amounts && !payload.audios && !payload.colors) {
        return
      }

      const audioPreset: Threshold[] = []

      for (const threshold of this.thresholds) {
        const partialThreshold: any = {}

        if (payload.amounts) {
          partialThreshold.amount = threshold.amount
        }

        if (payload.colors) {
          partialThreshold.buyColor = threshold.buyColor
          partialThreshold.sellColor = threshold.sellColor
        }

        if (payload.audios) {
          partialThreshold.buyAudio = threshold.buyAudio
          partialThreshold.sellAudio = threshold.sellAudio
        }

        audioPreset.push(partialThreshold)
      }

      return audioPreset
    }
  }

  applyPreset(preset?: Preset) {
    let presetData = preset ? preset.data : null

    const defaultSettings = JSON.parse(
      JSON.stringify(defaultTresholds[this.type])
    ) as Threshold[]

    let updateThresholdsColors = null
    let updateThresholdsAudios = null
    let updateThresholdsAmounts = null

    if (presetData) {
      if (!Array.isArray(presetData)) {
        if (presetData[this.type] && Array.isArray(presetData[this.type])) {
          presetData = presetData[this.type]
        } else if (
          presetData.thresholds &&
          Array.isArray(presetData.thresholds)
        ) {
          presetData = presetData.thresholds
        } else {
          presetData = Object.keys(presetData).reduce((acc, key) => {
            if (isNaN(+key)) {
              return acc
            }

            acc.push(presetData[key])

            return acc
          }, [])
        }
      }

      if (!presetData.length) {
        this.$store.dispatch('app/showNotice', {
          title: 'Preset looks empty',
          type: 'error'
        })
        return
      }

      updateThresholdsAmounts = typeof presetData[0].amount !== 'undefined'
      updateThresholdsColors = typeof presetData[0].buyColor !== 'undefined'
      updateThresholdsAudios = typeof presetData[0].buyAudio !== 'undefined'

      const replaceAll =
        updateThresholdsAmounts &&
        updateThresholdsColors &&
        updateThresholdsAudios
      const defaultMaxIndex = defaultSettings.length

      if (replaceAll) {
        merge(this.$store.state[this.paneId][this.type], presetData)
      } else {
        let previousAmount = this.$store.state[this.paneId][this.type][0].amount

        this.$store.state[this.paneId][this.type] = merge(
          this.$store.state[this.paneId][this.type],
          presetData
        ).map((threshold, index) => {
          if (!threshold.id) {
            threshold.id = randomString()
          }
          if (typeof threshold.amount === 'undefined') {
            threshold.amount = previousAmount
          }
          if (typeof threshold.buyColor === 'undefined') {
            threshold.buyColor =
              defaultSettings[Math.min(index, defaultMaxIndex)].buyColor
            threshold.sellColor =
              defaultSettings[Math.min(index, defaultMaxIndex)].sellColor
          }
          if (typeof threshold.buyAudio === 'undefined') {
            threshold.buyAudio =
              defaultSettings[Math.min(index, defaultMaxIndex)].buyAudio
            threshold.sellAudio =
              defaultSettings[Math.min(index, defaultMaxIndex)].sellAudio
          }

          previousAmount = threshold.amount

          return threshold
        })
      }
    } else {
      updateThresholdsAmounts =
        updateThresholdsColors =
        updateThresholdsAudios =
          true

      if (this.$store.state[this.paneId][this.type]) {
        this.$store.state[this.paneId][this.type].splice(
          0,
          this.$store.state[this.paneId][this.type].length
        )
      }

      merge(this.$store.state[this.paneId][this.type], defaultSettings)
    }

    const referenceThreshold = this.$store.state[this.paneId].thresholds[0]

    if (updateThresholdsAmounts) {
      this.$store.commit(this.paneId + '/SET_THRESHOLD_AMOUNT', {
        id: referenceThreshold.id,
        value: referenceThreshold.amount
      })
    }

    if (updateThresholdsColors) {
      this.$store.commit(this.paneId + '/SET_THRESHOLD_COLOR', {
        id: referenceThreshold.id,
        side: 'buy',
        value: referenceThreshold.buyColor
      })
    }

    if (updateThresholdsAudios) {
      this.$store.commit(this.paneId + '/SET_THRESHOLD_AUDIO', {
        id: referenceThreshold.id,
        buyAudio: referenceThreshold.buyAudio,
        sellAudio: referenceThreshold.sellAudio
      })
    }
  }
}
</script>

<style lang="scss">
.thresholds {
  position: relative;
  z-index: 1;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
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
      box-shadow: 0 0 0 0.5rem rgba(white, 0.2);
      position: relative;
      z-index: 1;
    }
  }

  &__threshold {
    display: flex;
    align-items: center;
    gap: 0.25rem;

    i {
      color: var(--theme-buy-100);
      top: 0;
    }
  }
}

.thresholds-slider {
  padding: 2rem 0 1rem;
  transition: opacity 0.2s $ease-out-expo;
  position: relative;

  &__bar {
    position: absolute;
    z-index: 1;

    padding: 2.75rem 0 0;
    top: 0;
    left: 1rem;
    right: 1rem;
  }

  &__handler {
    position: absolute;
    width: 1rem;
    height: 1rem;
    background-color: white;
    margin-top: -0.5rem;
    margin-left: -0.75rem;
    padding: 0.25rem;
    border-radius: 50%;
    transition:
      box-shadow 0.2s $ease-elastic,
      transform 0.2s $ease-out-expo;
    box-shadow: 0 1px 0 1px rgba(black, 0.2);
    cursor: grab;

    &:before {
      position: absolute;
      content: attr(data-amount);
      top: -2rem;
      left: 50%;
      transform: translateX(-50%);
      font-size: 0.875rem;
      white-space: nowrap;
    }
  }
}

.thresholds-gradients {
  width: 100%;

  > div {
    height: 1rem;
    width: 100%;
    border-radius: 0.75rem 0.75rem 0 0;

    + div {
      border-radius: 0 0 0.75rem 0.75rem;
    }
  }
}
</style>
