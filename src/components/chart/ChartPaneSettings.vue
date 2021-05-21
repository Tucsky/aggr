<template>
  <div class="settings-chart">
    <div class="form-group">
      <label> Refresh chart every <strong v-text="refreshRateHms"></strong> </label>

      <slider
        :min="0"
        :max="10000"
        :step="100"
        :editable="false"
        class="mt8"
        :value="refreshRate"
        @input="$store.commit(paneId + '/SET_REFRESH_RATE', $event)"
        @reset="$store.commit(paneId + '/SET_REFRESH_RATE', 500)"
      ></slider>
    </div>
    <p v-if="refreshRate < 500" class="form-feedback"><i class="icon-warning"></i> Low refresh rate can be very CPU intensive</p>
  </div>
</template>

<script lang="ts">
import { getHms } from '@/worker/helpers/utils'
import { Component, Vue } from 'vue-property-decorator'
import Slider from '../framework/picker/Slider.vue'

@Component({
  components: { Slider },
  name: 'ChartSettings',
  props: {
    paneId: {
      type: String,
      required: true
    }
  }
})
export default class extends Vue {
  paneId: string

  get showChart() {
    return this.$store.state.settings.showChart
  }

  get refreshRate() {
    return this.$store.state[this.paneId].refreshRate
  }

  get refreshRateHms() {
    return getHms(this.refreshRate)
  }
}
</script>
