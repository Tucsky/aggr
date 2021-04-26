<template>
  <div class="pane-counters">
    <pane-header :paneId="paneId" />
    <ul class="counters">
      <li v-for="(step, index) in activeSteps" :key="index" v-bind:duration="step.duration" class="counter">
        <div class="counter__side -buy" v-bind:style="{ width: (step.buy / (step.buy + step.sell)) * 100 + '%' }">
          <span v-if="!countersCount">{{ formatAmount(step.buy) }}</span>
          <span v-else>{{ step.buy }}</span>
        </div>
        <div class="counter__side -sell" v-bind:style="{ width: (step.sell / (step.buy + step.sell)) * 100 + '%' }">
          <span v-if="!countersCount">{{ formatAmount(step.sell) }}</span>
          <span v-else>{{ step.sell }}</span>
        </div>
      </li>
    </ul>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'

import { formatAmount, formatPrice, getBucketId, getHms } from '../../utils/helpers'

import aggregatorService from '@/services/aggregatorService'
import PaneMixin from '@/mixins/paneMixin'
import PaneHeader from '../panes/PaneHeader.vue'

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
export default class extends Mixins(PaneMixin) {
  steps: CounterStep[] = []

  private _onStoreMutation: () => void
  private _populateCountersInterval: number
  private _activeChunk: CounterChunk
  private _counters: Counter[]
  private _feed: string = null

  get preferQuoteCurrencySize() {
    return this.$store.state.settings.preferQuoteCurrencySize
  }

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
    aggregatorService.on('sums', this.onVolume)

    this._onStoreMutation = this.$store.subscribe(mutation => {
      switch (mutation.type) {
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

    this.createCounters()

    this._populateCountersInterval = setInterval(this.populateCounters.bind(this), this.countersGranularity)
  }

  beforeDestroy() {
    if (this._feed) {
      aggregatorService.off(this._feed, this.onVolume)
    }

    this._onStoreMutation()

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
      console.log(`[counters/${this.paneId}] unsubscribe from feed`, this._feed)
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
  createCounters() {
    this.clearCounters()

    for (const step of this.countersSteps) {
      this._counters.push({
        duration: step,
        chunks: []
      })
    }

    for (const counter of this._counters) {
      const first = this._counters.indexOf(counter) === 0

      this.steps.push({
        duration: getHms(counter.duration),
        buy: 0,
        sell: 0,
        hasData: first
      })
    }

    this._feed = 'bucket-' + getBucketId(this.pane.markets)
    console.log(`[counters/${this.paneId}] subscribe to feed`, this._feed)

    if (this._feed.length) {
      aggregatorService.on(this._feed, this.onVolume)
    } else {
      console.log(`[counters/${this.paneId}] error feed empty...`)
    }
  }
  populateCounters() {
    const now = +new Date()

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
        Array.prototype.push.apply(this._counters[i].chunks, chunksToDecrease.splice(0, chunksToDecrease.length))

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
        if (this._counters[i].chunks[j].timestamp >= now - this._counters[i].duration) {
          to = j
          break
        }
      }

      if (to) {
        chunksToDecrease = this._counters[i].chunks.splice(0, to + 1)
        if (isNaN(this.steps[i].buy - decreaseBuy) || isNaN(this.steps[i].sell - decreaseSell)) debugger
        this.steps[i].buy -= decreaseBuy
        this.steps[i].sell -= decreaseSell
      }
    }
  }

  formatAmount(amount) {
    return formatAmount(amount)
  }

  formatPrice(price) {
    return formatPrice(price)
  }
}
</script>

<style lang="scss">
.counters {
  display: flex;
  flex-direction: column;
  list-style: none;
  margin: 0;
  padding: 0;
  pointer-events: none;
}

.counter {
  display: flex;
  position: relative;

  &:before {
    content: attr(duration);
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    margin-top: 0.55em;
    background-color: rgba(black, 0.1);
    border-radius: 3px;
    padding: 0.34em 0.4em;
    font-size: 0.85em;
    text-align: center;
    pointer-events: none;
    line-height: 1;
    color: rgba(white, 0.75);
    font-family: monospace;
  }

  .highlight {
    position: absolute;
    top: -0.2em;
    animation: fly-high 2s $ease-in-expo;
    opacity: 0;
    padding: 0.3em 0.4em;
    box-shadow: 0 1px 1px rgba(black, 0.5);
    box-shadow: 0 1px 16px rgba(black, 0.1);
    z-index: 10;
    font-size: 0.5em;
    font-weight: 600;
    font-family: 'Barlow Semi Condensed';

    @keyframes fly-high {
      0% {
        opacity: 1;
        transform: translateY(-10%);
      }
      75% {
        opacity: 0.75;
      }
      100% {
        transform: translateY(-2em);
        opacity: 0;
      }
    }
  }

  &__side {
    display: flex;
    align-items: center;
    flex-grow: 1;

    span {
      position: relative;
      padding: 0.5em;
      font-size: 0.9em;
      display: block;
    }

    &.-buy {
      background-color: $green;

      .highlight {
        background-color: lighten($green, 10%);

        left: 0.5em;
      }
    }

    &.-sell {
      background-color: $red;
      justify-content: flex-end;

      .highlight {
        background-color: lighten($red, 10%);

        right: 0.5em;
      }
    }
  }
}

$num: 0;

@while $num < 10 {
  .counter:nth-child(#{$num}) .counter__side.-buy {
    background-color: desaturate(darken($green, if($num % 2 == 0, 1 * $num, 0.5 * $num)), $num);
  }

  .counter:nth-child(#{$num}) .counter__side.-sell {
    background-color: desaturate(darken($red, if($num % 2 == 0, 1 * $num, 0.5 * $num)), $num);
  }

  $num: $num + 1;
}
</style>
