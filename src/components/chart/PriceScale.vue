<template>
  <div
    class="chart-pricescale"
    :style="{ top: roundedTop + '%', bottom: roundedBottom + '%' }"
    :class="{ '-active': !!currentSide }"
    v-tippy="{ followCursor: true }"
    :title="`<code>${priceScale.scaleMargins.top}</code><br><code>${priceScale.scaleMargins.bottom}</code>`"
  >
    <div class="chart-pricescale__content">
      <div
        class="chart-pricescale__title pane-overlay"
        @mousedown="handleMove"
        @touchstart="handleMove"
      >
        <i class="icon-move mr8"></i>
        <code>{{ priceScale.indicators.join(', ') }}</code>
        <code
          v-if="priceScaleId === 'left' || priceScaleId === 'right'"
          :title="`using ${priceScaleId} scale`"
          v-tippy
          class="ml4"
        >
          {{ priceScaleId === 'left' ? '← LEFT' : '→ RIGHT' }}
        </code>
        <dropdown-button
          :options="modes"
          v-model="priceScale.mode"
          placeholder="linear"
          @input="updateMode($event)"
          button-class="badge -outline"
          class="chart-pricescale__mode -small ml8 text-bold"
        >
        </dropdown-button>
      </div>
      <div
        class="chart-pricescale__size pane-overlay"
        v-text="100 - roundedTop - roundedBottom + '%'"
      ></div>
    </div>
    <div
      class="chart-pricescale__boundary -top"
      :class="{ '-active': currentSide === 'top' }"
      @mousedown="handleResize($event, 'top')"
      @touchstart="handleResize($event, 'top')"
    ></div>
    <div
      class="chart-pricescale__boundary -bottom"
      :class="{ '-active': currentSide === 'bottom' }"
      @mousedown="handleResize($event, 'bottom')"
      @touchstart="handleResize($event, 'bottom')"
    ></div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'

import { PriceScaleSettings } from '@/store/panesSettings/chart'
import { getEventCords, randomString } from '@/utils/helpers'
import DropdownButton from '@/components/framework/DropdownButton.vue'

@Component({
  name: 'ChartPriceScale',
  components: {
    DropdownButton
  },
  props: {
    paneId: {
      required: true
    },
    priceScaleId: {
      required: true
    },
    priceScale: {
      required: true
    }
  },
  watch: {
    'priceScale.scaleMargins.top': function () {
      if (!this.currentMoveId) {
        this.getSize()
      }
    },
    'priceScale.scaleMargins.bottom': function () {
      if (!this.currentMoveId) {
        this.getSize()
      }
    }
  }
})
export default class PriceScale extends Vue {
  paneId: string
  priceScaleId: string
  priceScale: PriceScaleSettings

  top: number = null
  bottom: number = null
  roundedTop: number = null
  roundedBottom: number = null

  currentMoveId: string = null
  currentSide: 'top' | 'bottom' | 'both' = null
  currentOrigin: number = null
  currentContainerHeight: number = null

  modes = {
    0: 'Linear',
    1: 'Logarithimic',
    2: 'Percent',
    3: 'Indexed to 100'
  }

  created() {
    this.getSize()
  }

  beforeDestroy() {
    this.release()
  }

  getSize() {
    this.roundedTop = this.top = this.priceScale.scaleMargins.top * 100
    this.roundedBottom = this.bottom = this.priceScale.scaleMargins.bottom * 100
  }

  handleResize(event: MouseEvent | TouchEvent, side: 'top' | 'bottom') {
    if (this.currentMoveId) {
      this.release()

      return
    }

    this.start(side, getEventCords(event).y)

    document.addEventListener('mousemove', this.resize)
    document.addEventListener('mouseup', this.release)
    document.addEventListener('touchmove', this.resize)
    document.addEventListener('touchend', this.release)
  }

  resize(event: MouseEvent | TouchEvent) {
    const percentMove = this.getPercentMove(event)

    if (!percentMove) {
      return
    }

    this[this.currentSide] +=
      percentMove * (this.currentSide === 'top' ? 1 : -1)

    this.updateScaleMargins(event)
  }

  handleMove(event: MouseEvent | TouchEvent) {
    if (this.currentMoveId) {
      this.release()

      return
    }

    this.start('both', getEventCords(event).y)

    document.addEventListener('mousemove', this.move)
    document.addEventListener('mouseup', this.release)
    document.addEventListener('touchmove', this.move)
    document.addEventListener('touchend', this.release)
  }

  move(event: MouseEvent | TouchEvent) {
    const percentMove = this.getPercentMove(event)

    if (!percentMove) {
      return
    }

    this.top += percentMove
    this.bottom -= percentMove

    this.updateScaleMargins(event)
  }

  release() {
    if (!this.currentSide) {
      return
    }

    if (this.currentSide !== 'both') {
      document.removeEventListener('mousemove', this.resize)
      document.removeEventListener('touchmove', this.resize)
    } else {
      document.removeEventListener('mousemove', this.move)
      document.removeEventListener('touchmove', this.move)
    }

    document.removeEventListener('mouseup', this.release)
    document.removeEventListener('touchend', this.release)

    this.currentMoveId = null
    this.currentSide = null

    this.top = this.roundedTop
    this.bottom = this.roundedBottom
  }

  updateScaleMargins(event) {
    const top = Math.round(this.top)
    const bottom = Math.round(this.bottom)

    this.roundedTop = Math.max(0, Math.min(100 - bottom, top))
    this.roundedBottom = Math.max(0, Math.min(bottom, 100 - top))

    const scaleMargins = {
      top: this.roundedTop / 100,
      bottom: this.roundedBottom / 100
    }

    if (
      this.priceScale.scaleMargins.top === scaleMargins.top &&
      this.priceScale.scaleMargins.bottom === scaleMargins.bottom
    ) {
      return
    }

    this.$emit('update', {
      id: this.currentMoveId,
      side: this.currentSide,
      value: scaleMargins,
      syncable: event.type !== 'touchmove' && !event.shiftKey
    })
  }

  updateMode(mode) {
    this.priceScale.mode = +mode

    this.$store.commit(this.paneId + '/SET_PRICE_SCALE', {
      id: this.priceScaleId,
      priceScale: this.priceScale
    })
  }

  getContainerHeight() {
    const height = parseFloat(this.$el.parentElement.clientHeight as any)

    return height
  }

  getPercentMove(event) {
    const currentPosition = getEventCords(event)

    const percent =
      ((currentPosition.y - this.currentOrigin) / this.currentContainerHeight) *
      100

    if (!percent) {
      return null
    }

    this.currentOrigin = currentPosition.y

    return percent
  }

  start(side: 'top' | 'bottom' | 'both', origin: number) {
    this.currentMoveId = randomString(8)
    this.currentSide = side
    this.currentOrigin = origin
    this.currentContainerHeight = this.getContainerHeight()
  }
}
</script>

<style lang="scss">
.chart-pricescale {
  position: absolute;
  width: 100%;
  font-family: $font-condensed;
  pointer-events: none;

  .pane-overlay {
    border-radius: 4px;
    background-color: var(--theme-background-150);
    box-shadow: 0 0.2rem 1rem rgb(0 0 0 / 20%);
  }

  &.-active,
  &:hover {
    .chart-pricescale__size {
      display: block;
    }

    .chart-pricescale__content:before {
      background-color: var(--theme-base-o25);
    }
  }

  &__boundary {
    position: absolute;
    width: 100%;
    height: 1em;
    cursor: ns-resize;
    pointer-events: all;

    &:before {
      content: '';
      position: absolute;
      border-top: 1px solid var(--theme-background-200);
      width: 100%;
      margin: 0.5em 0;
    }

    &.-top {
      top: -0.5em;

      &:before {
        top: 0;
      }
    }

    &.-bottom {
      bottom: -0.5em;

      &:before {
        bottom: 0;
      }
    }

    &.-active,
    &:hover {
      &:before {
        display: block;
        border-color: var(--theme-color-base);
      }
    }
  }

  &__content {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    cursor: move;

    &:before {
      content: '';
      position: absolute;
      width: 100%;
      height: 100%;
      background-color: var(--theme-background-o10);
    }
  }

  &__title {
    line-height: 1;
    display: inline-flex;
    position: absolute;
    top: 0.5em;
    left: 0.5em;
    padding: 0.25em 0.375em 0.25em 0.25em;
    pointer-events: all;
    text-transform: uppercase;
    align-items: center;
    z-index: 2;

    .icon-move {
      color: var(--theme-color-200);
    }
  }

  &__mode .dropdown__options {
    color: var(--theme-color-base);
  }

  &__size {
    display: none;
    position: absolute;
    bottom: 0.5em;
    right: 0.5em;
    padding: 0.25em;
  }
}
</style>
