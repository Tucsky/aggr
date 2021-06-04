<template>
  <div class="indicator-resize">
    <div class="indicator-resize__wrapper" :style="{ top: top + '%', bottom: bottom + '%' }">
      <div class="indicator-resize__pane -top" @mousedown="handleMove" @touchstart="handleMove"></div>
      <div class="indicator-resize__boundary -top" @mousedown="handleResize" @touchstart="handleResize"></div>
      <div class="indicator-resize__boundary -bottom" @mousedown="handleResize" @touchstart="handleResize"></div>
      <button class="indicator-resize__close -left btn -text" @click="$store.dispatch(paneId + '/resizeIndicator')">
        <i class="icon-check mr4"></i> <code v-text="top"></code>%
      </button>
      <button class="indicator-resize__close -right btn -text" @click="$store.dispatch(paneId + '/resizeIndicator')">
        <i class="icon-check mr4"></i> <code v-text="bottom"></code>%
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Watch } from 'vue-property-decorator'

import IndicatorControl from './IndicatorControl.vue'
import { defaultChartOptions } from './chartOptions'
import PaneHeader from '../panes/PaneHeader.vue'
import { getEventCords } from '@/utils/picker'
import { ChartPaneState } from '@/store/panesSettings/chart'

@Component({
  name: 'Chart',
  props: {
    paneId: {
      required: true
    },
    indicatorId: {
      required: true
    }
  },
  components: {
    IndicatorControl,
    PaneHeader
  }
})
export default class extends Vue {
  paneId: string
  indicatorId: string
  position: { top: number; bottom: number } = {
    top: 0,
    bottom: 0
  }
  private _reference: { referenceY: number; chartHeight: number; maxPercent: number; targetSide?: string }

  get top() {
    return +this.position.top.toFixed()
  }
  get bottom() {
    return +this.position.bottom.toFixed()
  }

  @Watch('indicatorId')
  private indicatorIdChange() {
    this.setup()
  }

  mounted() {
    this.setup()

    document.body.classList.add('-unselectable')
  }

  beforeDestroy() {
    document.body.classList.remove('-unselectable')

    this.release()
  }

  setup() {
    if (!this.indicatorId) {
      this.position = null
      return
    }

    const { options } = (this.$store.state[this.paneId] as ChartPaneState).indicators[this.indicatorId]

    let scaleMargins = options.scaleMargins

    if (!scaleMargins) {
      scaleMargins = defaultChartOptions.priceScale.scaleMargins
    }

    const indicatorTop = scaleMargins.top * 100
    const indicatorBottom = scaleMargins.bottom * 100

    this.position = {
      top: indicatorTop,
      bottom: indicatorBottom
    }
  }

  handleResize(event: MouseEvent | TouchEvent) {
    const startPosition = getEventCords(event)

    const side = (event.currentTarget as HTMLElement).classList.contains('-top') ? 'top' : 'bottom'

    this._reference = {
      chartHeight: this.getChartHeight(),
      referenceY: startPosition.y,
      targetSide: side,
      maxPercent: side === 'top' ? 100 - this.position.bottom : 100 - this.position.top
    }

    document.addEventListener('mousemove', this.resize)
    document.addEventListener('mouseup', this.release)
    document.addEventListener('touchmove', this.resize)
    document.addEventListener('touchup', this.release)
  }

  handleMove(event: MouseEvent | TouchEvent) {
    const startPosition = getEventCords(event)

    this._reference = {
      chartHeight: this.getChartHeight(),
      referenceY: startPosition.y,
      maxPercent: 100 - this.position.top - this.position.bottom
    }

    document.addEventListener('mousemove', this.move)
    document.addEventListener('mouseup', this.release)
    document.addEventListener('touchmove', this.move)
    document.addEventListener('touchup', this.release)
  }

  release() {
    if (!this._reference) {
      return
    }

    if (this._reference.targetSide) {
      document.removeEventListener('mousemove', this.resize)
      document.removeEventListener('touchmove', this.resize)
    } else {
      document.removeEventListener('mousemove', this.move)
      document.removeEventListener('touchmove', this.move)
    }

    document.removeEventListener('mouseup', this.release)
    document.removeEventListener('touchup', this.release)
    this._reference = null
  }

  resize(event: MouseEvent | TouchEvent) {
    const currentPosition = getEventCords(event)

    if (currentPosition.y === this._reference.referenceY) {
      return
    }

    let percentMove: number

    if (this._reference.targetSide === 'top') {
      percentMove = currentPosition.y - this._reference.referenceY
    } else {
      percentMove = this._reference.referenceY - currentPosition.y
    }

    percentMove /= this._reference.chartHeight

    this._reference.referenceY = currentPosition.y

    const percentSide = Math.min(this._reference.maxPercent, this.position[this._reference.targetSide] + percentMove * 100)

    if (percentSide < 0 || percentSide > 100) {
      return
    }

    this.position[this._reference.targetSide] = percentSide

    this.update()
  }

  move(event: MouseEvent | TouchEvent) {
    const currentPosition = getEventCords(event)

    const percentMove = (currentPosition.y - this._reference.referenceY) / this._reference.chartHeight

    this._reference.referenceY = currentPosition.y

    const top = this.position.top + percentMove * 100
    const offset = this.position.top - top
    const bottom = this.position.bottom + offset

    if (top < 0 || top > 100 || bottom < 0 || bottom > 100) {
      return
    }

    this.position.top = top
    this.position.bottom = bottom

    this.update()
  }

  update() {
    this.$store.dispatch(this.paneId + '/setIndicatorOption', {
      id: this.indicatorId,
      key: 'scaleMargins',
      value: {
        top: +(this.top / 100),
        bottom: +(this.bottom / 100)
      }
    })
  }

  getChartHeight() {
    const height = parseFloat(this.$el.parentElement.clientHeight as any)

    return height
  }
}
</script>

<style lang="scss">
.indicator-resize {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 26px;

  &__close {
    position: absolute;
    z-index: 2;

    &.-left {
      top: 1em;
      left: 1em;
    }

    &.-right {
      bottom: 1em;
      right: 4em;
    }
  }

  &__boundary {
    position: absolute;
    cursor: ns-resize;
    width: 100%;
    height: 2em;
    z-index: 2;

    &.-top {
      top: -1em;
    }

    &.-bottom {
      bottom: -1em;
    }
  }

  &__pane {
    position: absolute;
    z-index: 2;
    top: 1em;
    left: 0;
    right: 0;
    bottom: 1em;
    cursor: move;
  }
}

.indicator-resize__wrapper {
  pointer-events: all;
  position: absolute;
  width: 100%;
  border-top: 2px dashed white;
  border-bottom: 2px dashed white;
  background-color: rgba(black, 0.1);
}

#app.-light .indicator-resize__wrapper {
  background-color: rgba(black, 0.1);
  border-color: black;
}
</style>
