<template>
  <div class="settings-counters">
    <div class="column">
      <div class="form-group -tight">
        <label
          class="checkbox-control checkbox-control-input -auto flex-right"
          v-tippy="{ placement: 'bottom' }"
          title="Sum amount of trades instead of volume"
        >
          <input
            type="checkbox"
            class="form-control"
            :checked="countersCount"
            @change="toggleCount"
          />
          <div on="count" off="volume"></div>
        </label>
      </div>
      <div class="form-group -fill">
        <input
          v-tippy
          title="Comma separated list of steps (ex: 1m, 5m, 10m, 15m)"
          type="string"
          placeholder="Enter a set of timeframes (ie 1m, 15m)"
          class="form-control"
          :value="countersStepsStringified"
          @change="updateCounters"
        />
      </div>
    </div>

    <div class="form-group mt8">
      <label
        class="checkbox-control -rip checkbox-control-input"
        @change="toggleLiquidationsOnly"
      >
        <input
          type="checkbox"
          class="form-control"
          :checked="liquidationsOnly"
        />
        <div></div>
        <span>Only count liquidations</span>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineProps } from 'vue'
import store from '@/store'
import { ago } from '@/utils/helpers'

// Define props
const props = defineProps<{
  paneId: string
}>()

// Computed properties
const countersCount = computed(() => store.state[props.paneId].count)
const countersSteps = computed(() => store.state[props.paneId].steps)
const liquidationsOnly = computed(
  () => store.state[props.paneId].liquidationsOnly
)
const countersStepsStringified = computed(() => {
  const now = Date.now()
  return countersSteps.value.map((step: number) => ago(now - step)).join(', ')
})

// Event handlers
function toggleCount(event: Event) {
  const checked = (event.target as HTMLInputElement).checked
  store.commit(`${props.paneId}/TOGGLE_COUNT`, checked)
}

function updateCounters(event: Event) {
  const value = (event.target as HTMLInputElement).value
  replaceCounters(value)
}

function toggleLiquidationsOnly(event: Event) {
  const checked = (event.target as HTMLInputElement).checked
  store.commit(`${props.paneId}/TOGGLE_LIQUIDATIONS_ONLY`, checked)
}

// Method to replace counters
function replaceCounters(value: string) {
  const counters = value
    .split(',')
    .map(a => {
      a = a.trim()
      if (/[\d.]+s/.test(a)) return parseFloat(a) * 1000
      if (/[\d.]+h/.test(a)) return parseFloat(a) * 1000 * 60 * 60
      return parseFloat(a) * 1000 * 60
    })
    .filter((item, pos, self) => self.indexOf(item) === pos)

  if (counters.some(a => isNaN(a))) {
    store.dispatch('app/showNotice', {
      type: 'error',
      title: `Counters (${value}) contains invalid steps.`
    })
    return
  }

  store.commit(`${props.paneId}/REPLACE_COUNTERS`, counters)
}
</script>
