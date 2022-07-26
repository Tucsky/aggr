<template>
  <div
    class="chart-layout"
    :style="{
      right: axis[0] + 'px',
      bottom: axis[1] + 'px'
    }"
    @dblclick="$store.commit(paneId + '/TOGGLE_LAYOUTING')"
  >
    <div class="chart-layout__controls">
      <button
        class="btn -red -small"
        title="Close menu while reverting chart layout to it's original state"
        @click="cancel"
      >
        Cancel <i class="icon-eraser ml4"></i>
      </button>
      <button
        class="btn -green -small ml8"
        title="Click if you finished rearranging the chart layout"
        @click="$store.commit(paneId + '/TOGGLE_LAYOUTING')"
      >
        Ok <i class="icon-check ml4"></i>
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
export default class extends Vue {
  paneId: string
  layouting: string
  unsyncableMoveId: string
  axis: [number, number]
  activePriceScales: { [id: string]: PriceScaleSettings }

  private _originalActivePriceScales: { [id: string]: PriceScaleSettings }

  created() {
    this.getActivePriceScales()
  }

  mounted() {
    document.body.classList.add('-unselectable')
  }

  beforeDestroy() {
    document.body.classList.remove('-unselectable')
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
          priceScales[priceScaleId] = this.$store.state[
            this.paneId
          ].priceScales[priceScaleId]
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
    const originalScaleMargins = this.activePriceScales[priceScaleId]
      .scaleMargins

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
}
</script>

<style lang="scss">
.chart-layout {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;

  + .tv-lightweight-charts {
    pointer-events: none;
  }

  &__controls {
    position: absolute;
    top: 0;
    padding: 1rem;
    border-radius: 0 0 4px 4px;
    background-color: var(--theme-background-base);
    left: 50%;
    transform: translateX(-50%);
    z-index: 4;
    box-shadow: 0 0.2rem 1rem rgba(black, 0.2);
  }
}
</style>
