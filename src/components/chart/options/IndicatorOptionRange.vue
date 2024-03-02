<template>
  <div class="indicator-option-range form-group">
    <label>
      {{ label }}
      <editable
        tag="code"
        class="indicator-option-range__value -filled"
        :value="stepRoundedValue"
        :min="min"
        :max="max"
        :step="step"
        @input="$emit('input', +$event || 0)"
      ></editable>
      <slot name="description" />
    </label>
    <slider
      class="mt8"
      :min="min"
      :max="max"
      :step="step"
      :log="log"
      :label="true"
      :value="value"
      :gradient="gradient"
      @input="$emit('input', $event)"
      @reset="$emit('input', definition.default ?? definition.value)"
    />
  </div>
</template>
<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import IndicatorOptionMixin from '@/mixins/indicatorOptionMixin'

import Slider from '@/components/framework/picker/Slider.vue'
import { countDecimals } from '@/services/productsService'

@Component({
  name: 'IndicatorOptionRange',
  components: {
    Slider
  }
})
export default class IndicatorOptionRange extends Mixins(IndicatorOptionMixin) {
  private value
  private definition

  get min() {
    return typeof this.definition.min === 'number' ? this.definition.min : 0
  }

  get max() {
    return typeof this.definition.max === 'number' ? this.definition.max : 1
  }

  get log() {
    return !!this.definition.log
  }

  get step() {
    return typeof this.definition.step === 'number' ? this.definition.step : 0.1
  }

  get decimals() {
    return countDecimals(this.step)
  }

  get stepRoundedValue() {
    if (typeof this.value !== 'number') {
      return this.value
    }

    return +this.value.toFixed(this.decimals)
  }

  get gradient() {
    if (!this.definition.gradient || !Array.isArray(this.definition.gradient)) {
      return null
    }

    return this.definition.gradient
  }
}
</script>
<style lang="scss" scoped>
.indicator-option-range {
  &__value {
    font-size: 0.875rem;
  }
}
</style>
