<template>
  <div class="trades-placeholder hide-scrollbar">
    <p class="trades-placeholder__dimmed">{{ filterRecap }}</p>
    <p v-if="!exchangesReady">...</p>
    <template v-else>
      <pre v-if="showMore" v-text="paneMarketStringified"></pre>
      <div v-else class="pl16 pr16">
        <button
          class="btn mx4 -small"
          v-for="(pair, index) of pairs"
          :key="index"
          disabled
        >
          {{ pair }}
        </button>
      </div>
      <button
        v-if="paneMarkets.length"
        class="mt8 btn -text trades-placeholder__dimmed -cases"
        @click="toggleShowMore"
      >
        {{ showMore ? 'Show less' : 'Show more' }}
      </button>
    </template>
  </div>
</template>

<script lang="ts">
import { Threshold } from '@/store/panesSettings/trades'
import { formatAmount, stripStablePair } from '@/services/productsService'
import { Component, Vue } from 'vue-property-decorator'

@Component({
  name: 'TradesPlaceholder',
  props: {
    paneId: {
      type: String,
      required: true
    }
  }
})
export default class TradesPlaceholder extends Vue {
  paneId: string
  showMore = false

  get exchangesReady() {
    return this.$store.state.app.isExchangesReady
  }

  get paneMarkets() {
    return this.$store.state.panes.panes[this.paneId].markets
  }

  get paneMarketStringified() {
    return this.paneMarkets.join('\n')
  }

  get pairs() {
    const mergeUsdt = this.$store.state.settings.searchTypes.mergeUsdt

    return this.paneMarkets.reduce((pairs, marketKey) => {
      const market = this.$store.state.panes.marketsListeners[marketKey]

      let localPair = market ? market.local : marketKey

      if (mergeUsdt) {
        localPair = stripStablePair(localPair)
      }

      if (pairs.indexOf(localPair) === -1) {
        pairs.push(localPair)
      }

      return pairs
    }, [])
  }

  get tradesThresholds(): Threshold[] {
    return this.$store.state[this.paneId].thresholds
  }

  get liquidationsThresholds(): Threshold[] {
    return this.$store.state[this.paneId].liquidations
  }

  get showTrades() {
    return this.$store.state[this.paneId].showTrades
  }

  get showLiquidations() {
    return this.$store.state[this.paneId].showLiquidations
  }

  get filterRecap() {
    const minimumTradeAmount = this.tradesThresholds[0].amount
    const minimumLiquidationAmount = this.liquidationsThresholds[0].amount

    if (this.showTrades && this.showLiquidations) {
      return `Waiting for trades > ${formatAmount(
        minimumTradeAmount
      )} or liquidations > ${formatAmount(minimumLiquidationAmount)}`
    } else if (this.showTrades) {
      return `Waiting for trades > ${formatAmount(minimumTradeAmount)}`
    } else if (this.showLiquidations) {
      return `Waiting for liquidations > ${formatAmount(
        minimumLiquidationAmount
      )}`
    } else {
      return 'Nothing to show, see settings'
    }
  }

  toggleShowMore() {
    this.showMore = !this.showMore

    const focusedElement = document.activeElement as HTMLElement

    if (focusedElement) {
      focusedElement.blur()
    }
  }
}
</script>

<style lang="scss">
.trades-placeholder {
  padding: 2em;
  margin: auto;

  p {
    margin-top: 0;
  }

  .trades-placeholder__dimmed {
    opacity: 0.5;
  }

  pre {
    font-size: 0.75em;
    pointer-events: all;
    user-select: text;
    font-family: $font-monospace;
  }
}
</style>
