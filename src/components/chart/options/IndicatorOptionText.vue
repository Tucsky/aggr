<template>
  <div class="indicator-option-text form-group">
    <label>{{ label }}</label>
    <editable
      class="form-control"
      :value="value"
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
