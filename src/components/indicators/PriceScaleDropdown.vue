<template>
  <dropdown :value="value" @input="$emit('input', $event)">
    <div class="dropdown-divider" data-label="Scales"></div>

    <button
      v-for="(label, id) in priceScales"
      :key="id"
      type="button"
      class="dropdown-item"
      :class="[priceScaleId === id && 'dropdown-item--active']"
      @click="setPriceScale(id)"
    >
      <span v-if="id === indicatorId">
        <i class="icon-star-filled -lower"></i>
        {{ indicatorName }}
      </span>
      <span v-else>{{ label }}</span>
    </button>
  </dropdown>
</template>

<script lang="ts">
import { ChartPaneState } from '@/store/panesSettings/chart'
import { getChartScales } from '../chart/options'

export default {
  name: 'PriceScaleDropdown',
  props: {
    value: {
      type: HTMLButtonElement,
      default: null
    },
    paneId: {
      type: String,
      required: true
    },
    indicatorId: {
      type: String,
      required: true
    }
  },
  computed: {
    priceScales() {
      return getChartScales(
        (this.$store.state[this.paneId] as ChartPaneState).indicators,
        this.indicatorId
      )
    },
    priceScaleId() {
      return (this.$store.state[this.paneId] as ChartPaneState).indicators[
        this.indicatorId
      ].options.priceScaleId
    },
    indicatorName() {
      return (this.$store.state[this.paneId] as ChartPaneState).indicators[
        this.indicatorId
      ].name
    }
  },
  methods: {
    setPriceScale(id) {
      this.$store.dispatch(this.paneId + '/setIndicatorOption', {
        id: this.indicatorId,
        key: 'priceScaleId',
        value: id
      })
    }
  }
}
</script>
<style lang="scss" scoped></style>
