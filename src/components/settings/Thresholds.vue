<template>
  <div class="thresholds" :class="{ '-dragging': dragging, '-rendering': rendering }">
    <table class="table thresholds-table" v-if="showThresholdsAsTable">
      <transition-group name="flip-list" tag="tbody">
        <tr v-for="(threshold, index) in thresholdsRows" :key="threshold.id" :class="{ '-divider': !!threshold.divider }">
          <template v-if="threshold.divider">
            <td colspan="100%" v-text="threshold.divider"></td>
          </template>
          <template v-else>
            <td class="table-input">
              <input
                type="text"
                placeholder="Amount*"
                :value="threshold.amount"
                @change="
                  $store.commit(paneId + '/SET_THRESHOLD_AMOUNT', {
                    id: threshold.id,
                    value: $event.target.value
                  })
                "
              />
              <i class="icon icon-currency"></i>
            </td>
            <td class="table-input">
              <input
                type="text"
                placeholder="Giphy"
                :value="threshold.gif"
                @change="
                  $store.commit(paneId + '/SET_THRESHOLD_GIF', {
                    id: threshold.id,
                    value: $event.target.value
                  })
                "
              />
            </td>
            <td class="thresholds-table__color" :style="{ backgroundColor: threshold.buyColor }" @click="openPicker('buyColor', threshold)"></td>
            <td class="thresholds-table__color" :style="{ backgroundColor: threshold.sellColor }" @click="openPicker('sellColor', threshold)"></td>
            <td class="thresholds-table__audio btn -green -small" @click="openThresholdAudio(threshold.id)" title="Configure threshold audio" v-tippy>
              <i class="icon-volume-high"></i>
            </td>
            <td
              v-if="thresholds.length > 2 && threshold.id !== 'liquidations' && index > 1"
              class="btn -red -small"
              @click="deleteThreshold(threshold.id)"
              title="Remove"
              v-tippy
            >
              <i class="icon-cross"></i>
            </td>
          </template>
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
      <div
        class="threshold-panel"
        v-if="selectedThreshold"
        @click="editing = true"
        ref="thresholdPanel"
        :class="{ '-minimum': thresholds.indexOf(selectedThreshold) === 0 }"
        :style="{
          transform: 'translateX(' + this.panelOffsetPosition + 'px)'
        }"
      >
        <div
          class="threshold-panel__caret"
          :style="{
            transform: 'translateX(' + this.panelCaretPosition + 'px)'
          }"
        ></div>
        <small class="help-text mb16 d-block">
          {{ thresholds.indexOf(selectedThreshold) > 0 ? 'for trades >' : 'show trades above' }}
          <editable
            :content="selectedThreshold.amount"
            @output="
              $store.commit(paneId + '/SET_THRESHOLD_AMOUNT', {
                id: selectedThreshold.id,
                value: $event
              })
            "
          ></editable>
        </small>
        <a href="#" class="threshold-panel__close icon-cross" @click=";(selectedThresholdId = null), (editing = false)"></a>

        <div class="form-group mb8 threshold-panel__gif">
          <label>Show gif</label>
          <small class="help-text">
            Le
            <a href="https://giphy.com" target="_blank">Giphy</a>
            keyword
          </small>
          <input
            type="text"
            class="form-control"
            :value="selectedThreshold.gif"
            @change="
              $store.commit('settings/SET_THRESHOLD_GIF', {
                id: selectedThreshold.id,
                value: $event.target.value
              })
            "
          />
        </div>
        <div class="form-group mb8 threshold-panel__colors">
          <label>Custom colors</label>
          <div class="column">
            <div class="form-group column flex-center" title="When buy" v-tippy="{ placement: 'bottom' }">
              <small class="help-text -center mr16">
                Buy
              </small>
              <verte
                picker="square"
                menuPosition="left"
                model="rgb"
                :value="selectedThreshold.buyColor"
                @input="
                  $store.commit(paneId + '/SET_THRESHOLD_COLOR', {
                    id: selectedThreshold.id,
                    side: 'buyColor',
                    value: $event
                  })
                "
              ></verte>
            </div>
            <div class="form-group column flex-center" title="When sell" v-tippy="{ placement: 'bottom' }">
              <small class="help-text -center mr16">
                Sell
              </small>
              <verte
                picker="square"
                menuPosition="left"
                model="rgb"
                :value="selectedThreshold.sellColor"
                @input="
                  $store.commit(paneId + '/SET_THRESHOLD_COLOR', {
                    id: selectedThreshold.id,
                    side: 'sellColor',
                    value: $event
                  })
                "
              ></verte>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import { formatAmount, formatPrice, sleep } from '../../utils/helpers'

import dialogService from '@/services/dialogService'
import { Threshold } from '@/store/panesSettings/trades'
import ThresholdAudioDialog from '../trades/ThresholdAudioDialog.vue'

@Component({
  name: 'Thresholds',
  props: {
    paneId: {
      type: String,
      required: true
    },
    showLiquidationsThreshold: {
      type: Boolean,
      default: true
    }
  }
})
export default class extends Vue {
  paneId: string
  showLiquidationsThreshold: boolean

  rendering = true
  dragging = null
  editing = null
  selectedThresholdId = null
  selectedElement = null
  panelCaretPosition = 0
  panelOffsetPosition = 0

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

  get thresholds() {
    return this.$store.state[this.paneId].thresholds
  }

  get liquidationsThreshold() {
    return this.$store.state[this.paneId].liquidations
  }

  get selectedThreshold() {
    const threshold = this.$store.getters[this.paneId + '/getThreshold'](this.selectedThresholdId)

    console.log('GET selected threshold', threshold)
    return threshold
  }

  get showThresholdsAsTable() {
    return this.$store.state[this.paneId].showThresholdsAsTable
  }

  get preferQuoteCurrencySize() {
    return this.$store.state.settings.preferQuoteCurrencySize
  }

  get thresholdsRows() {
    let rows: any[] = []

    if (this.showLiquidationsThreshold) {
      rows = [
        {
          id: 'divider-1',
          divider: 'For liquidations'
        },
        this.liquidationsThreshold,
        {
          id: 'divider-2',
          divider: 'For trades by amount'
        }
      ]
    }

    rows = [...rows, ...this.thresholds]

    return rows
  }

  $refs!: {
    thresholdContainer: HTMLElement
    buysGradient: HTMLElement
    sellsGradient: HTMLElement
    thresholdPanel: HTMLElement
  }

  created() {
    this._onStoreMutation = this.$store.subscribe(mutation => {
      switch (mutation.type) {
        case this.paneId + '/TOGGLE_SETTINGS_PANEL':
        case this.paneId + '/TOGGLE_THRESHOLDS_TABLE':
          if (
            (mutation.type === this.paneId + '/TOGGLE_SETTINGS_PANEL' && mutation.payload === 'thresholds') ||
            (mutation.type === this.paneId + '/TOGGLE_THRESHOLDS_TABLE' && mutation.payload === false)
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

    this.selectedThresholdId = event.target.getAttribute('data-id')

    if (this.selectedThresholdId) {
      this.selectedElement = event.target
    }

    this.$nextTick(() => {
      this.refreshCaretPosition(event.target)

      this._dragReference = {
        timestamp: +new Date(),
        position: x
      }
    })
  }

  doDrag(event) {
    let x = event.pageX

    if (event.touches && event.touches.length) {
      x = event.touches[0].pageX
    }

    if (
      this.selectedElement === null ||
      !this._dragReference ||
      (+new Date() - this._dragReference.timestamp < 1000 && Math.abs(this._dragReference.position - x) < 3)
    ) {
      return
    }

    this.dragging = true

    const minLog = Math.max(0, Math.log(this._minimum + 1) || 0)
    const minLeft = (minLog / Math.log(this._maximum + 1)) * this._width

    let left = Math.max((this._width / 3) * -1, Math.min(this._width * 1.5, x - this._offsetLeft))
    let amount = Math.exp(((minLeft + (left / this._width) * (this._width - minLeft)) / this._width) * Math.log(this._maximum + 1)) - 1

    if (x < this._offsetLeft) {
      amount = this.selectedThreshold.amount - (this.selectedThreshold.amount - amount) * 0.1
      left = 0
    } else if (x > this._offsetLeft + this._width) {
      amount = this.selectedThreshold.amount - (this.selectedThreshold.amount - amount) * 0.1
      left = this._width
    }

    if (amount < 0) {
      amount = 0
    }

    this.selectedElement.style.transform = 'translateX(' + left + 'px)'

    this.refreshCaretPosition()

    this.$store.commit(this.paneId + '/SET_THRESHOLD_AMOUNT', {
      id: this.selectedThresholdId,
      value: +formatPrice(amount)
    })
  }

  endDrag() {
    if (this.selectedElement) {
      this.selectedElement = null

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

  refreshCaretPosition(selectedElement = this.selectedElement) {
    const left = parseFloat(selectedElement.style.transform.replace(/[^\d.]/g, '')) || 0
    const panelWidth = this.$refs.thresholdPanel.clientWidth
    const caretMargin = 12
    const panelRange = (this._width - panelWidth) / 2 + caretMargin

    this.panelOffsetPosition = -panelRange + panelRange * 2 * (left / this._width)
    this.panelCaretPosition = caretMargin + (panelWidth - caretMargin * 2) * (left / this._width)
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
          : (((Math.log(this.thresholds[i].amount + 1) - minLog) / (maxLog - minLog)) * 100).toFixed(2)

      buysStops.push(`${this.thresholds[i].buyColor} ${percent}%`)
      sellsStops.push(`${this.thresholds[i].sellColor} ${percent}%`)
    }

    this.$refs.buysGradient.style.backgroundImage = `linear-gradient(to right, ${buysStops.join(', ')})`
    this.$refs.sellsGradient.style.backgroundImage = `linear-gradient(to right, ${sellsStops.join(', ')})`
  }

  reorderThresholds() {
    this.$store.state[this.paneId].thresholds = this.thresholds.sort((a, b) => a.amount - b.amount)
  }

  deleteThreshold(id: string) {
    if (this.thresholds.length <= 2) {
      return
    }

    this.$store.commit(this.paneId + '/DELETE_THRESHOLD', id)
  }

  openPicker(side: string, threshold: Threshold) {
    if (!threshold[side]) {
      this.$store.commit(this.paneId + '/SET_THRESHOLD_COLOR', {
        id: threshold.id,
        side: side,
        value: '#ffffff'
      })
    }

    dialogService.openPicker(threshold[side], color => {
      this.$store.commit(this.paneId + '/SET_THRESHOLD_COLOR', {
        id: threshold.id,
        side: side,
        value: color
      })
    })
  }

  openThresholdAudio(thresholdId) {
    dialogService.open(ThresholdAudioDialog, {
      paneId: this.paneId,
      thresholdId
    })
  }

  formatAmount(amount) {
    return formatAmount(amount)
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

    .threshold-panel {
      transition: none;

      &__caret {
        transition: none;
      }
    }
  }
}

.thresholds-table {
  tr {
    &:first-child {
      .table-input:nth-child(2) {
        pointer-events: none;
        background-color: rgba(white, 0.05);
        cursor: not-allowed;
        border-left: 1px solid transparent;
      }
    }
  }

  &__color {
    border: 0 !important;
    width: 2em;
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
    cursor: move;

    &:before {
      position: absolute;
      content: attr(data-amount);
      top: -2em;
      left: 50%;
      transform: translateX(-50%);
      font-size: 0.89em;
    }

    &.-selected {
      box-shadow: 0 1px 0 1px rgba(black, 0.2), 0 0 0 12px rgba(white, 0.2);
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

.threshold-panel {
  position: relative;
  background-color: lighten($dark, 18%);
  border-radius: 4px;
  padding: 1em;
  margin: 1.5em auto 0;
  transition: transform 0.2s $ease-out-expo;
  max-width: 220px;

  .form-group {
    min-width: 1px;

    .form-control {
      background: none;
      border: 2px solid white;
      color: white;

      &::-webkit-input-placeholder {
        color: rgba(white, 0.55);
      }

      &:-moz-placeholder {
        /* Mozilla Firefox 4 to 18 */
        color: rgba(white, 0.55);
        opacity: 1;
      }

      &::-moz-placeholder {
        /* Mozilla Firefox 19+ */
        color: rgba(white, 0.55);
        opacity: 1;
      }

      &:-ms-input-placeholder {
        /* Internet Explorer 10-11 */
        color: rgba(white, 0.55);
      }

      &::-ms-input-placeholder {
        /* Microsoft Edge */
        color: rgba(white, 0.55);
      }

      &::placeholder {
        /* Most modern browsers support this now. */
        color: rgba(white, 0.55);
      }
    }
  }

  code {
    color: white;
    font-weight: 600;
  }

  h3 {
    font-weight: 400;
    margin: 0 0 1em;
    color: rgba(white, 0.6);

    [contenteditable] {
      color: black;
      background-color: white;
      padding: 0.25em;
      border-radius: 1px;
      font-size: 0.75em;
      vertical-align: top;
      font-family: inherit;
    }
  }

  &__close {
    position: absolute;
    opacity: 0.5;
    right: 0;
    top: 0;
    padding: 1em;
    font-size: 1.125em;

    &:hover {
      opacity: 1;
    }
  }

  &__caret {
    position: absolute;
    top: -0.75em;
    border-left: 0.75em solid transparent;
    border-right: 0.75em solid transparent;
    border-bottom: 0.75em solid lighten($dark, 18%);
    margin-left: -1.75em;
    transition: transform 0.2s $ease-out-expo;
  }

  &__colors {
    .form-group .form-control {
      height: auto;
      width: auto;
      min-width: 1px;
      border: 0;
      font-family: monospace;
      letter-spacing: -0.1em;
      font-size: 0.9em;
      font-weight: 400;
      padding: 1.25em 1em;
    }
  }

  &.-minimum {
    &:before {
      content: 'Minimum for a trade to show up';
      display: block;
      margin-bottom: 0.25rem;
      text-decoration: underline;
    }

    .threshold-panel__gif {
      display: none;
    }
  }
}

@keyframes picker-in {
  from {
    opacity: 0;
    transform: translateY(-10%);
  }
  to {
    opacity: 1;
    transform: translateY(0%);
  }
}
</style>
