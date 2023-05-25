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
            @change="
              $store.commit(paneId + '/TOGGLE_COUNT', $event.target.checked)
            "
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
          @change="replaceCounters($event.target.value)"
        />
      </div>
    </div>

    <div class="form-group mt8">
      <label
        class="checkbox-control -rip checkbox-control-input"
        @change="
          $store.commit(
            paneId + '/TOGGLE_LIQUIDATIONS_ONLY',
            $event.target.checked
          )
        "
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

<script lang="ts">
import { ago } from '@/utils/helpers'
import { Component, Vue } from 'vue-property-decorator'

@Component({
  name: 'CountersSettings',
  props: {
    paneId: {
      type: String,
      required: true
    }
  }
})
export default class CountersSettings extends Vue {
  paneId: string

  get countersCount() {
    return this.$store.state[this.paneId].count
  }

  get countersSteps() {
    return this.$store.state[this.paneId].steps
  }

  get liquidationsOnly() {
    return this.$store.state[this.paneId].liquidationsOnly
  }

  get countersStepsStringified() {
    const now = Date.now()

    return this.countersSteps.map(a => ago(now - a)).join(', ')
  }

  replaceCounters(value) {
    const counters = value
      .split(',')
      .map(a => {
        a = a.trim()

        if (/[\d.]+s/.test(a)) {
          return parseFloat(a) * 1000
        } else if (/[\d.]+h/.test(a)) {
          return parseFloat(a) * 1000 * 60 * 60
        } else {
          return parseFloat(a) * 1000 * 60
        }
      })
      .filter(function (item, pos, self) {
        return self.indexOf(item) == pos
      })

    if (counters.filter(a => isNaN(a)).length) {
      this.$store.dispatch('app/showNotice', {
        type: 'error',
        title: `Counters (${value}) contains invalid steps.`
      })
      return
    }

    this.$store.commit(this.paneId + '/REPLACE_COUNTERS', counters)
  }
}
</script>
