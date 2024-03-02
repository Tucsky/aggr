<template>
  <ColorPickerControl
    v-if="color"
    class="ml8"
    :value="color"
    label="Buy color"
    @input="regenerateSwatch"
    @click.native.stop
  />
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import ColorPickerControl from '../framework/picker/ColorPickerControl.vue'
import { TradesPaneState } from '@/store/panesSettings/trades'
import { joinRgba, splitColorCode } from '@/utils/colors'

@Component({
  components: {
    ColorPickerControl
  },
  name: 'ThresholdColor',
  props: {
    paneId: {
      type: String,
      required: true
    },
    side: {
      type: String,
      required: true
    },
    type: {
      type: String,
      required: true
    }
  }
})
export default class ThresholdColor extends Vue {
  paneId: string
  type: 'thresholds' | 'liquidations'
  side: 'buy' | 'sell'

  get thresholds() {
    return (this.$store.state[this.paneId] as TradesPaneState)[this.type]
  }

  get name() {
    return `${this.side}Color`
  }

  get color() {
    const value = this.thresholds[1][this.name]
    if (!value) {
      return null
    }
    const colorRgb = splitColorCode(value)
    colorRgb[3] = 1
    return joinRgba(colorRgb)
  }

  async regenerateSwatch(color) {
    this.$store.dispatch(`${this.paneId}/generateSwatch`, {
      type: this.type,
      side: this.side,
      baseVariance: 0.33,
      color
    })

    // force refresh
    this.$store.state[this.paneId][this.type] = JSON.parse(
      JSON.stringify(this.$store.state[this.paneId][this.type])
    )
    this.$store.commit(this.paneId + '/SET_THRESHOLD_COLOR', {})
  }
}
</script>
