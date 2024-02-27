<template>
  <div
    class="chart-layout"
    :style="{
      left: axis.left + 'px',
      right: axis.right + 'px',
      bottom: axis.time + 'px'
    }"
    @dblclick="close"
  >
    <div class="chart-layout__controls">
      <button
        class="btn -text"
        title="Revert back to original positions"
        v-tippy="{ placement: 'bottom', boundary: 'window' }"
        @click="cancel"
      >
        <i class="icon-eraser"></i>
      </button>
      <button
        class="btn -text"
        title="Save positions"
        v-tippy="{ placement: 'bottom', boundary: 'window' }"
        @click="close"
      >
        <i class="icon-check"></i>
      </button>
    </div>
    <chart-price-scale
      v-for="(priceScale, id) of activePriceScales"
      :key="id"
      :paneId="paneId"
      :priceScaleId="id"
      :priceScale="priceScale"
      @update="updatePriceScaleScaleMargins(id, $event)"
      class="chart-layout__item"
    ></chart-price-scale>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'

import { ChartPaneState, PriceScaleSettings } from '@/store/panesSettings/chart'
import ChartPriceScale from './PriceScale.vue'

@Component({
  components: { ChartPriceScale },
  name: 'ChartLayout',
  props: {
    paneId: {
      required: true
    },
    axis: {
      required: true
    },
    layouting: {
      required: true
    }
  }
})
export default class Layout extends Vue {
  paneId: string
  layouting: string
  unsyncableMoveId: string
  axis: {
    left: number
    right: number
    time: number
  }
  activePriceScales: { [id: string]: PriceScaleSettings }

  private _originalActivePriceScales: { [id: string]: PriceScaleSettings }
  private _handleEscKey: (event: KeyboardEvent) => void

  created() {
    this.getActivePriceScales()
  }

  mounted() {
    document.body.classList.add('-unselectable')

    this.bindEscKey()
  }

  beforeDestroy() {
    document.body.classList.remove('-unselectable')

    if (this._handleEscKey) {
      document.removeEventListener('keydown', this._handleEscKey)
    }
  }

  getActivePriceScales() {
    const indicators = (this.$store.state[this.paneId] as ChartPaneState)
      .indicators

    this.activePriceScales = Object.keys(indicators).reduce(
      (priceScales, indicatorId) => {
        if (
          typeof this.layouting === 'string' &&
          indicatorId !== this.layouting
        ) {
          return priceScales
        }
        const priceScaleId = indicators[indicatorId].options.priceScaleId

        if (!priceScales[priceScaleId]) {
          priceScales[priceScaleId] =
            this.$store.state[this.paneId].priceScales[priceScaleId]
          priceScales[priceScaleId].indicators = []
        }

        priceScales[priceScaleId].indicators.push(indicators[indicatorId].name)

        return priceScales
      },
      {}
    )

    this._originalActivePriceScales = JSON.parse(
      JSON.stringify(this.activePriceScales)
    )
  }

  updatePriceScaleScaleMargins(priceScaleId, event) {
    if (event.syncable && this.unsyncableMoveId !== event.id) {
      if (!this.syncMoveWithOthers(priceScaleId, event.side, event.value)) {
        this.unsyncableMoveId = event.id
      }
    }

    this.activePriceScales[priceScaleId].scaleMargins = event.value

    this.$store.commit(this.paneId + '/SET_PRICE_SCALE', {
      id: priceScaleId,
      priceScale: this.activePriceScales[priceScaleId]
    })
  }

  syncMoveWithOthers(priceScaleId, side, scaleMargins): boolean {
    const originalScaleMargins =
      this.activePriceScales[priceScaleId].scaleMargins

    let hasSynced = false

    for (const otherId in this.activePriceScales) {
      if (priceScaleId === otherId) {
        continue
      }

      const otherScaleMargins = this.activePriceScales[otherId].scaleMargins

      if (
        otherScaleMargins.top === originalScaleMargins.top &&
        otherScaleMargins.bottom === originalScaleMargins.bottom
      ) {
        // sync overlapping

        Vue.set(this.activePriceScales[otherId], 'scaleMargins', scaleMargins)

        this.$store.commit(this.paneId + '/SET_PRICE_SCALE', {
          id: otherId,
          priceScale: this.activePriceScales[otherId]
        })

        hasSynced = true
      }
    }

    return hasSynced
  }

  cancel() {
    for (const id in this._originalActivePriceScales) {
      this.$store.commit(this.paneId + '/SET_PRICE_SCALE', {
        id,
        priceScale: this._originalActivePriceScales[id]
      })
    }

    this.$store.commit(this.paneId + '/TOGGLE_LAYOUTING')
  }

  close() {
    this.$store.commit(this.paneId + '/TOGGLE_LAYOUTING')
  }

  bindEscKey() {
    if (this._handleEscKey) {
      return
    }

    this._handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        this.close()
      }
    }

    document.addEventListener('keydown', this._handleEscKey)
  }
}
</script>

<style lang="scss">
.chart-layout {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 3;

  + .chart__container .tv-lightweight-charts {
    pointer-events: none;
  }

  &__controls {
    position: absolute;
    top: 0;
    border-radius: 0 0 4px 4px;
    background-color: var(--theme-background-100);
    left: 50%;
    transform: translateX(-50%);
    z-index: 4;
    box-shadow: 0 0.2rem 1rem rgba(black, 0.2);

    .btn {
      font-size: 1.25em;
    }
  }
}
</style>
