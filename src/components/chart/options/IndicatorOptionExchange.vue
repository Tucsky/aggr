<template>
  <div class="indicator-option-exchange form-group">
    <label>{{ label }}<slot name="description" /></label>
    <dropdown-button
      v-model="value"
      :options="exchanges"
      :placeholder="definition.placeholder"
      class="-outline form-control -arrow"
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
export default class IndicatorOptionLineStyle extends Vue {
  get exchanges() {
    return this.$store.getters['exchanges/getExchanges'].reduce(
      (acc, exchange) => {
        acc[exchange] = exchange
        return acc
      },
      {
        null: 'Choose'
      }
    )
  }
}
</script>
