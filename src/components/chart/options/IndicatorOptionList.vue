<template>
  <label class="indicator-option-dropdown form-group">
    <label>{{ label }}<slot name="description" /></label>
    <dropdown-button
      :value="value"
      :options="options"
      class="-outline form-control -arrow"
      :placeholder="definition.placeholder"
      @input="$emit('input', $event)"
    ></dropdown-button>
  </label>
</template>
<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import IndicatorOptionMixin from '@/mixins/indicatorOptionMixin'
import DropdownButton from '@/components/framework/DropdownButton.vue'

@Component({
  name: 'IndicatorOptionDropdown',
  mixins: [IndicatorOptionMixin],
  components: {
    DropdownButton
  }
})
export default class IndicatorOptionDropdown extends Vue {
  private definition

  get options() {
    if (!this.definition.options) {
      return []
    }

    if (Array.isArray(this.definition.options)) {
      return this.definition.options.reduce((acc, option) => {
        if (!option) {
          acc[option] = 'Choose'
        } else {
          acc[option] = option
        }
        return acc
      }, {})
    }

    return this.definition.options
  }
}
</script>
