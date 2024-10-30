<template>
  <button
    type="button"
    class="dropdown-item dropdown-item--narrow"
    @click.stop="togglePriceScaleDropdown(indicatorId, $event.currentTarget)"
  >
    <span class="dropdown-item__emoji"> 📊 </span>
    <span class="d-flex -column">
      <small class="block text-muted">Scale with:</small>
      {{ priceScaleLabel }}
    </span>
  </button>
</template>

<script lang="ts">
import Vue from 'vue'
import Component from 'vue-class-component'

import { ChartPaneState } from '../../store/panesSettings/chart'
import { createComponent, mountComponent } from '@/utils/helpers'

@Component({
  name: 'IndicatorsOverlay',
  props: {
    paneId: {
      type: String
    },
    indicatorId: {
      type: String
    }
  }
})
export default class IndicatorsOverlay extends Vue {
  private paneId: string
  private indicatorId: string

  priceScaleLabel = null
  priceScaleDropdown: any

  mounted() {
    this.updateLabel()
  }

  updateLabel() {
    const { options, name } = (this.$store.state[this.paneId] as ChartPaneState)
      .indicators[this.indicatorId]

    const { priceScaleId } = options

    this.priceScaleLabel =
      priceScaleId === this.indicatorId ? name : priceScaleId
  }

  async togglePriceScaleDropdown(indicatorId, anchor) {
    this.updateLabel()
    if (!this.priceScaleDropdown) {
      const module = await import(
        `@/components/indicators/PriceScaleDropdown.vue`
      )
      this.priceScaleDropdown = createComponent(module.default, {
        paneId: this.paneId,
        indicatorId: indicatorId,
        value: anchor
      })
      this.priceScaleDropdown.$on('input', async v => {
        this.priceScaleDropdown.value = v
        await this.$nextTick()
        this.updateLabel()
      })
      mountComponent(this.priceScaleDropdown)
    } else if (this.priceScaleDropdown.value) {
      this.priceScaleDropdown.value = null
    } else {
      this.priceScaleDropdown.indicatorId = indicatorId
      this.priceScaleDropdown.value = anchor
    }
  }
}
</script>
