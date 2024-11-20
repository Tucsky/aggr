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

<script setup lang="ts">
import { ref, computed } from 'vue'
import store from '@/store'
import { formatAmount, stripStablePair } from '@/services/productsService'
import type { Threshold } from '@/store/panesSettings/trades'

// Define props with types
const props = defineProps<{
  paneId: string
}>()

// Reactive state for showing more or less
const showMore = ref(false)

// Computed property to check if exchanges are ready
const exchangesReady = computed(() => {
  return store.state.app.isExchangesReady
})

// Computed property to get paneMarkets from the store
const paneMarkets = computed(() => {
  return store.state.panes.panes[props.paneId].markets
})

// Computed property to stringify paneMarkets
const paneMarketStringified = computed(() => {
  return paneMarkets.value.join('\n')
})

// Computed property to derive unique pairs
const pairs = computed(() => {
  const mergeUsdt = store.state.settings.searchTypes.mergeUsdt
  const uniquePairs: string[] = []

  paneMarkets.value.forEach((marketKey: string) => {
    const market = store.state.panes.marketsListeners[marketKey]
    let localPair = market ? market.local : marketKey

    if (mergeUsdt) {
      localPair = stripStablePair(localPair)
    }

    if (!uniquePairs.includes(localPair)) {
      uniquePairs.push(localPair)
    }
  })

  return uniquePairs
})

// Computed properties to get thresholds and display settings
const tradesThresholds = computed<Threshold[]>(() => {
  return store.state[props.paneId].thresholds
})

const liquidationsThresholds = computed<Threshold[]>(() => {
  return store.state[props.paneId].liquidations
})

const showTrades = computed(() => {
  return store.state[props.paneId].showTrades
})

const showLiquidations = computed(() => {
  return store.state[props.paneId].showLiquidations
})

// Computed property to generate the filter recap message
const filterRecap = computed(() => {
  const minimumTradeAmount = tradesThresholds.value[0]?.amount || 0
  const minimumLiquidationAmount = liquidationsThresholds.value[0]?.amount || 0

  if (showTrades.value && showLiquidations.value) {
    return `Waiting for trades > ${formatAmount(minimumTradeAmount)} or liquidations > ${formatAmount(minimumLiquidationAmount)}`
  } else if (showTrades.value) {
    return `Waiting for trades > ${formatAmount(minimumTradeAmount)}`
  } else if (showLiquidations.value) {
    return `Waiting for liquidations > ${formatAmount(minimumLiquidationAmount)}`
  } else {
    return 'Nothing to show, see settings'
  }
})

// Method to toggle the showMore state
const toggleShowMore = () => {
  showMore.value = !showMore.value

  const focusedElement = document.activeElement as HTMLElement

  if (focusedElement) {
    focusedElement.blur()
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
