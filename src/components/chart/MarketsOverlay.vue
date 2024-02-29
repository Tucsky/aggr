<template>
  <div class="chart-overlay__panel markets-overlay">
    <div class="chart-overlay__content pane-overlay" v-if="showOverlay">
      <div class="column">
        <a
          href="javascript:void(0)"
          class="btn -text"
          @click="toggleMarkets('perp')"
          >perp</a
        >
        <a
          href="javascript:void(0)"
          class="btn -text"
          @click="toggleMarkets('spot')"
          >spot</a
        >
        <a
          href="javascript:void(0)"
          class="btn -text"
          @click="toggleMarkets('all')"
          >all</a
        >
      </div>
      <div class="mx4 mt0">
        <div
          v-for="market of markets"
          :key="market"
          @click="toggleMarket($event, market)"
        >
          <label class="checkbox-control -extra-small mb4">
            <input
              type="checkbox"
              class="form-control"
              :checked="!hiddenMarkets[market]"
              @click.stop.prevent
            />
            <div></div>
            <span>{{ market }}</span>
          </label>
        </div>
      </div>
    </div>
    <div
      class="chart-overlay__head pane-overlay"
      @click="showOverlay = !showOverlay"
    >
      <div class="chart-overlay__title">
        {{ label }}
      </div>
      <button type="button" class="btn badge -text" @click="searchMarkets">
        <i class="icon-plus"></i>
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import Component from 'vue-class-component'

@Component({
  name: 'MarketsOverlay',
  props: {
    paneId: {
      type: String
    }
  }
})
export default class MarketsOverlay extends Vue {
  private paneId: string
  showOverlay = false

  get markets() {
    return this.$store.state.panes.panes[this.paneId].markets
  }

  get hiddenMarkets() {
    return this.$store.state[this.paneId].hiddenMarkets
  }

  get visibleMarkets() {
    return this.markets.filter(a => !this.hiddenMarkets[a]).length
  }

  get label() {
    const count = this.visibleMarkets

    return `${count} market${count > 1 ? 's' : ''}`
  }

  searchMarkets(event) {
    this.$store.dispatch('app/showSearch', { paneId: this.paneId })
    event.stopPropagation()
  }

  toggleMarket(event, id) {
    this.$store.dispatch(this.paneId + '/toggleMarkets', {
      id,
      inverse: event.shiftKey
    })
  }

  toggleMarkets(type) {
    this.$store.dispatch(this.paneId + '/toggleMarkets', { type })
  }
}
</script>

<style lang="scss">
.markets-overlay {
  flex-grow: 1;
  overflow: hidden;

  .chart-overlay__content {
    overflow: auto;
  }

  .checkbox-control {
    span {
      text-decoration: line-through;
      opacity: 0.5;
    }

    input:checked ~ span {
      text-decoration: none;
      opacity: 1;
    }
  }

  li {
    cursor: pointer;
    &.-hidden {
      opacity: 0.5;
      text-decoration: line-through;
    }
  }
}
</style>
