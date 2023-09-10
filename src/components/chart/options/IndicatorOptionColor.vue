<template>
  <div class="indicator-option-color">
    <label>{{ label }}</label>
    <color-picker-control
      :label="label"
      model="rgb"
      allow-null
      :value="value"
      @input="$emit('input', $event)"
      @close="reloadIndicator"
    ></color-picker-control>
  </div>
</template>
<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import IndicatorOptionMixin from '@/mixins/indicatorOptionMixin'
import ColorPickerControl from '@/components/framework/picker/ColorPickerControl.vue'

@Component({
  name: 'IndicatorOptionColor',
  mixins: [IndicatorOptionMixin],
  components: {
    ColorPickerControl
  }
})
export default class IndicatorOptionColor extends Vue {
  private value
  private paneId
  private indicatorId
  private definition

  mounted() {
    console.log('color input', this.value, this.definition)
  }

  reloadIndicator() {
    this.$store.commit(this.paneId + '/SET_INDICATOR_SCRIPT', {
      id: this.indicatorId,
      value: this.$store.state[this.paneId].indicators[this.indicatorId].script
    })
  }
}
</script>
<style lang="scss" scoped>
.indicator-option-color {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
