<template>
  <label class="indicator-option-checkbox checkbox-control">
    <input
      type="checkbox"
      class="form-control"
      :checked="value"
      @change="$emit('input', $event.target.checked)"
    />
    <span>{{ label }}<slot name="description" /></span>
    <div></div>
  </label>
</template>
<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import IndicatorOptionMixin from '@/mixins/indicatorOptionMixin'

@Component({
  name: 'IndicatorOptionCheckbox',
  mixins: [IndicatorOptionMixin]
})
export default class IndicatorOptionCheckbox extends Vue {}
</script>
<style lang="scss" scoped>
.indicator-option-checkbox {
  > span {
    flex-grow: 1;
    word-break: break-word;

    > i {
      line-height: 0.875;
      vertical-align: bottom;
    }
  }
}
</style>
