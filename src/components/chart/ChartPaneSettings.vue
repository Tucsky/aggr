<template>
  <div class="settings-chart">
    <div class="form-group">
      <label>
        Refresh chart every
        <editable :content="refreshRate" @output="$store.commit(paneId + '/SET_REFRESH_RATE', $event)"></editable>&nbsp;ms
      </label>
    </div>
    <p v-if="refreshRate < 500" class="form-feedback"><i class="icon-warning"></i> Low refresh rate can be very CPU intensive</p>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'

@Component({
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
}
</script>
