<template>
  <label class="indicator-option-line-type form-group">
    <label>{{ label }}<slot name="description" /></label>
    <dropdown-button
      v-model="value"
      :options="{ 0: 'Simple', 1: 'with steps' }"
      class="-outline form-control -arrow"
      :placeholder="definition.placeholder || 'lineType'"
      @input="$emit('input', $event)"
    ></dropdown-button>
  </label>
</template>
<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import IndicatorOptionMixin from '@/mixins/indicatorOptionMixin'
import DropdownButton from '@/components/framework/DropdownButton.vue'

@Component({
  name: 'IndicatorOptionLineType',
  mixins: [IndicatorOptionMixin],
  components: {
    DropdownButton
  }
})
export default class IndicatorOptionLineType extends Vue {}
</script>
