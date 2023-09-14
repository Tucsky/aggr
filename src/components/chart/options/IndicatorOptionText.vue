<template>
  <div class="indicator-option-text form-group">
    <label>{{ label }}<slot name="description" /></label>
    <editable
      class="form-control"
      :value="value"
      :placeholder="definition.placeholder"
      @input="$emit('input', $event)"
    ></editable>
  </div>
</template>
<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import IndicatorOptionMixin from '@/mixins/indicatorOptionMixin'

@Component({
  name: 'IndicatorOptionText',
  mixins: [IndicatorOptionMixin]
})
export default class IndicatorOptionText extends Vue {}
</script>
