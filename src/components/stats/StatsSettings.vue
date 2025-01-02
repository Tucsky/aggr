<template>
  <div class="settings-stats settings-section">
    <div class="column mb16">
      <div class="form-group -fill">
        <label>
          Window
          <i
            class="icon-info"
            v-tippy
            title="Interval in which data is summed (ex: 1m)"
          ></i>
        </label>
        <input
          type="text"
          class="form-control"
          :value="statsWindowStringified"
          placeholder="Window (minutes)"
          v-commit="paneId + '/SET_WINDOW'"
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
            v-commit="paneId + '/TOGGLE_CHART'"
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
        @click="createBucket"
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
            v-commit="[
              paneId + '/updateBucket',
              value => ({
                id: bucket.id,
                prop: 'enabled',
                value
              })
            ]"
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

<script setup lang="ts">
import { computed } from 'vue'
import store from '@/store'
import dialogService from '@/services/oldDialogService'
import StatDialog from '@/components/stats/StatDialog.vue'
import { getHms } from '@/utils/helpers'

// Define props with types
const props = defineProps<{
  paneId: string
}>()

// Computed property to get enableChart from the store
const enableChart = computed(() => {
  return store.state[props.paneId].enableChart
})

// Computed property to get buckets as an array from the store
const buckets = computed(() => {
  const bucketsObj = store.state[props.paneId].buckets
  return Object.keys(bucketsObj).map(id => bucketsObj[id])
})

// Computed property to get window from the store
const windowValue = computed(() => {
  return store.state[props.paneId].window
})

// Computed property to get the stringified window using getHms
const statsWindowStringified = computed(() => {
  return getHms(windowValue.value || 0)
})

// Method to open the StatDialog
const openStat = (id: string) => {
  dialogService.open(StatDialog, { bucketId: id, paneId: props.paneId })
}

// Method to dispatch createBucket action
const createBucket = () => {
  store.dispatch(`${props.paneId}/createBucket`)
}
</script>
