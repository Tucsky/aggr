<template>
  <div class="indicator-option-line-style form-group">
    <label>{{ label }}<slot name="description" /></label>
    <dropdown-button
      v-model="value"
      :options="{
        0: 'Solid',
        1: 'Dotted',
        2: 'Dashed',
        3: 'LargeDashed',
        4: 'SparseDotted'
      }"
      class="-outline form-control -arrow"
      :placeholder="definition.placeholder || 'lineStyle'"
      @input="$emit('input', $event)"
    ></dropdown-button>
  </div>
</template>
<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import IndicatorOptionMixin from '@/mixins/indicatorOptionMixin'
import DropdownButton from '@/components/framework/DropdownButton.vue'

@Component({
  name: 'IndicatorOptionLineStyle',
  mixins: [IndicatorOptionMixin],
  components: {
    DropdownButton
  }
})
export default class IndicatorOptionLineStyle extends Vue {}
</script>
