<template>
  <div class="settings-stats settings-section">
    <div class="column mb16">
      <div class="form-group -fill">
        <label
          >Window
          <i
            class="icon-info"
            v-tippy
            title="Interval in which data is summed (ex: 1m)"
          ></i
        ></label>
        <input
          type="text"
          class="form-control"
          :value="statsWindowStringified"
          placeholder="Window (minutes)"
          @change="$store.commit(paneId + '/SET_WINDOW', $event.target.value)"
        />
      </div>
      <div class="form-group -tight">
        <label for="">Graph</label>
        <label
          class="checkbox-control checkbox-control-input flex-right"
          v-tippy="{ placement: 'bottom' }"
          title="Enable graph"
        >
          <input
            type="checkbox"
            class="form-control"
            :checked="enableChart"
            @change="
              $store.commit(paneId + '/TOGGLE_CHART', $event.target.checked)
            "
          />
          <div></div>
        </label>
      </div>
    </div>

    <div class="column">
      <i class="icon-bucket -center mr4"></i>
      <span class="-fill">BUCKETS ({{ buckets.length }})</span>
      <a
        href="javascript:void(0);"
        class="-nowrap -text"
        v-tippy
        title="Add a stat"
        @click="$store.dispatch(paneId + '/createBucket')"
      >
        Add
        <i class="icon-plus ml4 -lower"></i>
      </a>
    </div>

    <div v-for="bucket in buckets" :key="bucket.id" class="column mt8">
      <div class="form-group -tight">
        <label
          class="checkbox-control checkbox-control-input flex-right"
          v-tippy="{ placement: 'bottom' }"
          title="Enable bucket"
        >
          <input
            type="checkbox"
            class="form-control"
            :checked="bucket.enabled"
            @change="
              $store.dispatch(paneId + '/updateBucket', {
                id: bucket.id,
                prop: 'enabled',
                value: $event.target.checked
              })
            "
          />
          <div></div>
        </label>
      </div>
      <div class="form-group -fill -center">
        {{ bucket.name }}
      </div>
      <div class="form-group -tight">
        <button class="btn -green" @click="openStat(bucket.id)">
          <i class="icon-edit"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import dialogService from '@/services/dialogService'
import StatDialog from '@/components/stats/StatDialog.vue'
import { Component, Vue } from 'vue-property-decorator'
import { getHms } from '@/utils/helpers'

@Component({
  name: 'StatsSettings',
  props: {
    paneId: {
      type: String,
      required: true
    }
  }
})
export default class StatsSettings extends Vue {
  paneId: string

  get enableChart() {
    return this.$store.state[this.paneId].enableChart
  }

  get buckets() {
    return Object.keys(this.$store.state[this.paneId].buckets).map(
      id => this.$store.state[this.paneId].buckets[id]
    )
  }

  get window() {
    return this.$store.state[this.paneId].window
  }

  get statsWindowStringified() {
    return getHms(this.window || 0)
  }

  openStat(id) {
    dialogService.open(StatDialog, { bucketId: id, paneId: this.paneId })
  }
}
</script>
