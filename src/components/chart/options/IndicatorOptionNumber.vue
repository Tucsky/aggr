<template>
  <div class="indicator-option-number form-group">
    <label>{{ label }}</label>
    <editable
      class="form-control"
      :value="value"
      :min="min"
      :max="max"
      :step="step"
      @input="$emit('input', $event)"
    ></editable>
  </div>
</template>
<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import IndicatorOptionMixin from '@/mixins/indicatorOptionMixin'

@Component({
  name: 'IndicatorOptionNumber',
  mixins: [IndicatorOptionMixin]
})
export default class IndicatorOptionNumber extends Vue {
  private definition

  get min() {
    return this.definition.min === 'number' ? this.definition.min : null
  }

  get max() {
    return this.definition.max === 'number' ? this.definition.max : null
  }

  get step() {
    return this.definition.step === 'number' ? this.definition.step : null
  }
}
</script>
