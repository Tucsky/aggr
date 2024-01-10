<template>
  <div class="pane-counters">
    <pane-header
      :paneId="paneId"
      :settings="() => import('@/components/counters/CountersDialog.vue')"
    />
    <div class="counters hide-scrollbar">
      <div
        v-for="(step, index) in activeSteps"
        :key="index"
        v-bind:duration="step.duration"
        class="counter"
      >
        <div
          class="counter__side -buy"
          v-bind:style="{
            width: (step.buy / (step.buy + step.sell)) * 100 + '%'
          }"
        >
          <span v-if="!countersCount">{{ formatAmount(step.buy) }}</span>
          <span v-else>{{ step.buy }}</span>
        </div>
        <div
          class="counter__side -sell"
          v-bind:style="{
            width: (step.sell / (step.buy + step.sell)) * 100 + '%'
          }"
        >
          <span v-if="!countersCount">{{ formatAmount(step.sell) }}</span>
          <span v-else>{{ step.sell }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'

import { getBucketId, getHms } from '@/utils/helpers'
import { formatAmount } from '@/services/productsService'

import aggregatorService from '@/services/aggregatorService'
import PaneMixin from '@/mixins/paneMixin'
import PaneHeader from '../panes/PaneHeader.vue'
import {
  getAppBackgroundColor,
  getLinearShade,
  joinRgba,
  splitColorCode
} from '@/utils/colors'

interface Counter {
  duration: number
  chunks: CounterChunk[]
}

interface CounterChunk {
  timestamp: number
  buy: number
  sell: number
}

interface CounterStep {
  duration: string
  buy: number
  sell: number
  hasData: boolean
}

@Component({
  components: { PaneHeader },
  name: 'Counters'
})
export default class Counters extends Mixins(PaneMixin) {
  steps: CounterStep[] = []

  private _populateCountersInterval: number
  private _activeChunk: CounterChunk
  private _counters: Counter[]
  private _feed: string = null

  get liquidationsOnly() {
    return this.$store.state[this.paneId].liquidationsOnly
  }

  get countersSteps() {
    return this.$store.state[this.paneId].steps
  }

  get countersCount() {
    return this.$store.state[this.paneId].count
  }

  get countersGranularity() {
    return this.$store.state[this.paneId].granularity
  }

  get activeSteps() {
    return this.steps.filter(a => a.hasData)
  }

  created() {
    this._onStoreMutation = this.$store.subscribe(mutation => {
      switch (mutation.type) {
        case 'settings/SET_BUY_COLOR':
        case 'settings/SET_SELL_COLOR':
          this.generateColors()
          break
        case 'panes/SET_PANE_MARKETS':
          if (mutation.payload.id === this.paneId) {
            this.createCounters()
          }
          break

        case this.paneId + '/REPLACE_COUNTERS':
        case this.paneId + '/TOGGLE_LIQUIDATIONS_ONLY':
        case this.paneId + '/TOGGLE_COUNT':
          this.createCounters()
          break
      }
    })

    this._populateCountersInterval = setInterval(
      this.populateCounters.bind(this),
      this.countersGranularity
    ) as unknown as number
  }

  mounted() {
    this.createCounters()
    this.generateColors()
  }

  beforeDestroy() {
    if (this._feed) {
      aggregatorService.off(this._feed, this.onVolume)
    }

    clearInterval(this._populateCountersInterval)
  }

  onVolume(sums) {
    const volume = {
      buy: sums.vbuy,
      sell: sums.vsell
    }

    if (this.liquidationsOnly) {
      volume.buy = sums.lbuy
      volume.sell = sums.lsell
    } else if (this.countersCount) {
      volume.buy = sums.cbuy
      volume.sell = sums.csell
    }

    if (volume.buy || volume.sell) {
      if (!this._activeChunk.timestamp) {
        this._activeChunk.timestamp = sums.timestamp
      }

      this._activeChunk.buy += volume.buy
      this._activeChunk.sell += volume.sell

      for (let i = 0; i < this.steps.length; i++) {
        this.steps[i].buy += volume.buy
        this.steps[i].sell += volume.sell
      }
    }
  }
  clearCounters() {
    if (this._feed) {
      console.debug(
        `[counters/${this.paneId}] unsubscribe from feed`,
        this._feed
      )
      aggregatorService.off(this._feed, this.onVolume)
    }

    if (this._counters) {
      this._counters.splice(0, this._counters.length)
      this._activeChunk.timestamp = null
      this._activeChunk.buy = this._activeChunk.sell = 0
      this.steps.splice(0, this.steps.length)
    } else {
      this._counters = []
      this._activeChunk = {
        timestamp: null,
        buy: 0,
        sell: 0
      }
      this.steps = []
    }
  }
  generateColors() {
    const style = getComputedStyle(document.documentElement)
    const buyColor = splitColorCode(
      style.getPropertyValue('--theme-buy-base'),
      getAppBackgroundColor()
    )
    const sellColor = splitColorCode(
      style.getPropertyValue('--theme-sell-base'),
      getAppBackgroundColor()
    )

    const el = this.$el as HTMLElement
    for (let i = 0; i < this.steps.length; i++) {
      const lightenFactor = i * (0.25 / this.steps.length)
      el.style.setProperty(
        `--buy-color-${i + 1}`,
        joinRgba(getLinearShade(buyColor, -lightenFactor, lightenFactor))
      )
      el.style.setProperty(
        `--sell-color-${i + 1}`,
        joinRgba(getLinearShade(sellColor, -lightenFactor, lightenFactor))
      )
    }
  }
  createCounters() {
    this.clearCounters()

    for (const step of this.countersSteps) {
      const counter = {
        duration: step,
        chunks: []
      }

      this._counters.push(counter)

      const first = this._counters.indexOf(counter) === 0

      this.steps.push({
        duration: getHms(counter.duration),
        buy: 0,
        sell: 0,
        hasData: first
      })
    }

    this._feed = 'bucket-' + getBucketId(this.pane.markets)
    console.debug(`[counters/${this.paneId}] subscribe to feed`, this._feed)

    if (this._feed.length) {
      aggregatorService.on(this._feed, this.onVolume)
    } else {
      console.debug(`[counters/${this.paneId}] error feed empty...`)
    }
  }
  populateCounters() {
    const now = Date.now()

    if (this._activeChunk.timestamp) {
      this._counters[0].chunks.push({
        timestamp: this._activeChunk.timestamp,
        buy: this._activeChunk.buy,
        sell: this._activeChunk.sell
      })

      this._activeChunk.timestamp = null
      this._activeChunk.buy = 0
      this._activeChunk.sell = 0
    }

    let chunksToDecrease = []
    let decreaseBuy
    let decreaseSell

    for (let i = 0; i < this._counters.length; i++) {
      if (chunksToDecrease.length) {
        Array.prototype.push.apply(
          this._counters[i].chunks,
          chunksToDecrease.splice(0, chunksToDecrease.length)
        )

        if (!this.steps[i].hasData) {
          this.steps[i].hasData = true
        }
      }

      decreaseBuy = 0
      decreaseSell = 0

      let to = 0

      for (let j = 0; j < this._counters[i].chunks.length; j++) {
        decreaseBuy += this._counters[i].chunks[j].buy
        decreaseSell += this._counters[i].chunks[j].sell
        if (
          this._counters[i].chunks[j].timestamp >=
          now - this._counters[i].duration
        ) {
          to = j
          break
        }
      }

      if (to) {
        chunksToDecrease = this._counters[i].chunks.splice(0, to + 1)
        this.steps[i].buy -= decreaseBuy
        this.steps[i].sell -= decreaseSell
      }
    }
  }

  formatAmount(amount) {
    return formatAmount(amount)
  }
}
</script>

<style lang="scss">
.pane-counters.-large {
  font-weight: 500;
}

.counters {
  display: flex;
  flex-direction: column;
  list-style: none;
  margin: 0;
  padding: 0;
  height: 100%;
  overflow: auto;
  color: white;

  font-family: $font-monospace;
}

.counter {
  display: flex;
  position: relative;
  flex-grow: 1;
  min-height: 2em;

  &:before {
    content: attr(duration);
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    border-radius: $border-radius-small;
    padding: 0.25em;
    font-size: 0.875em;
    text-align: center;
    pointer-events: none;
    line-height: 1;
    padding-top: 0.33em;
    text-shadow: 1px 1px 0 black;
  }

  &:hover:before {
    background-color: black;
    color: var(--theme-color-base);
    opacity: 1;
  }

  &:nth-child(1) .counter__side {
    &.-buy {
      background-color: var(--buy-color-1);
    }
    &.-sell {
      background-color: var(--sell-color-1);
    }
  }

  &:nth-child(2) .counter__side {
    &.-buy {
      background-color: var(--buy-color-2);
    }
    &.-sell {
      background-color: var(--sell-color-2);
    }
  }

  &:nth-child(3) .counter__side {
    &.-buy {
      background-color: var(--buy-color-3);
    }
    &.-sell {
      background-color: var(--sell-color-3);
    }
  }

  &:nth-child(4) .counter__side {
    &.-buy {
      background-color: var(--buy-color-4);
    }
    &.-sell {
      background-color: var(--sell-color-4);
    }
  }

  &:nth-child(5) .counter__side {
    &.-buy {
      background-color: var(--buy-color-5);
    }
    &.-sell {
      background-color: var(--sell-color-5);
    }
  }

  &:nth-child(6) .counter__side {
    &.-buy {
      background-color: var(--buy-color-6);
    }
    &.-sell {
      background-color: var(--sell-color-6);
    }
  }

  &:nth-child(7) .counter__side {
    &.-buy {
      background-color: var(--buy-color-7);
    }
    &.-sell {
      background-color: var(--sell-color-7);
    }
  }

  &:nth-child(8) .counter__side {
    &.-buy {
      background-color: var(--buy-color-8);
    }
    &.-sell {
      background-color: var(--sell-color-8);
    }
  }

  &__side {
    display: flex;
    align-items: center;
    flex-grow: 1;
    white-space: nowrap;

    span {
      position: relative;
      padding: 0 0.5em;
      display: block;
    }

    &.-buy {
      color: var(--theme-buy-color);
    }

    &.-sell {
      color: var(--theme-sell-color);
      justify-content: flex-end;
    }
  }
}
</style>
