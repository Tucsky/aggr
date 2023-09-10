<template>
  <div class="indicator-option-range form-group">
    <label>
      {{ label }}
      <editable
        tag="code"
        class="indicator-option-range__value -filled"
        :value="value"
        @input="$emit('input', +$event || 0)"
      ></editable>
    </label>
    <slider
      class="mt8"
      :min="range.min"
      :max="range.max"
      :step="range.step"
      :log="range.log"
      :label="true"
      :value="value"
      @input="$emit('input', $event)"
      @reset="$emit('input', range.value)"
    />
  </div>
</template>
<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import IndicatorOptionMixin from '@/mixins/indicatorOptionMixin'

import Slider from '@/components/framework/picker/Slider.vue'

@Component({
  name: 'IndicatorOptionRange',
  mixins: [IndicatorOptionMixin],
  components: {
    Slider
  }
})
export default class IndicatorOptionRange extends Vue {
  private definition

  get range() {
    const min =
      typeof this.definition.min === 'number' ? this.definition.min : 0
    const max =
      typeof this.definition.max === 'number' ? this.definition.max : 1

    return {
      log: !!this.definition.log,
      value: this.definition.value || min + (max - min) / 2,
      min,
      max,
      step:
        this.definition.max === 'number'
          ? this.definition.max
          : (max - min) / 100
    }
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
