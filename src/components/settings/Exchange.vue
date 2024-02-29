<template>
  <div
    class="settings-exchange"
    :class="{
      '-active': active,
      '-enabled': !settings.disabled,
      '-expanded': expanded
    }"
  >
    <div class="settings-exchange__header" @click="toggleExchange">
      <div class="settings-exchange__name">
        <i :class="'icon-' + name"></i>
        <span class="ml4">{{ name }}</span>
      </div>
      <div v-if="markets.length" class="settings-exchange__controls">
        <button
          class="settings-exchange__more btn"
          @click.stop.prevent="expanded = !expanded"
        >
          <i class="icon-down -small"></i>
        </button>
      </div>
    </div>
    <div class="settings-exchange__detail" v-if="expanded">
      <div class="form-group" v-if="markets.length">
        <div>
          <div v-for="market in markets" :key="market.id" class="d-flex">
            <div class="-fill -center">{{ market.pair }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import Slider from '@/components/framework/picker/Slider.vue'
import { formatAmount } from '@/services/productsService'

@Component({
  name: 'Exchange',
  components: {
    Slider
  },
  props: ['id']
})
export default class Exchange extends Vue {
  id: string
  expanded = false

  get name() {
    return this.id.replace(/[\W_]+/g, ' ')
  }

  get settings() {
    return this.$store.state.exchanges[this.id]
  }

  get markets() {
    return (Object as any)
      .values(this.$store.state.panes.marketsListeners)
      .filter(a => a.listeners > 0 && a.exchange === this.id)
  }

  get active() {
    return this.markets.length
  }

  async toggleExchange() {
    await this.$store.dispatch('exchanges/toggleExchange', this.id)
    await this.$store.dispatch('panes/refreshMarketsListeners')
  }

  formatAmount(amount) {
    return formatAmount(amount)
  }
}
</script>

<style lang="scss">
.settings-exchange {
  background-color: var(--theme-background-o75);
  transition: all 0.2s $ease-out-expo;
  border-radius: 3px;
  margin-bottom: 8px;
  flex-basis: calc(50% - 4px);
  max-width: calc(50% - 4px);

  &:nth-child(odd) {
    margin-right: 8px;
  }

  &.-enabled {
    color: var(--theme-color-base);

    .settings-exchange__threshold {
      display: block;
    }

    .settings-exchange__name span:before {
      width: 0%;
    }
  }

  &.-active {
    background-color: var(--theme-buy-base);
    color: var(--theme-buy-color);

    .settings-exchange__visibility {
      display: flex;
    }
  }

  &.-error {
    background-color: $red;

    .icon-warning {
      display: block;
      margin-left: 5px;
    }
  }

  &.-unmatched {
    background-color: #555;

    color: rgba(white, 0.75);
  }

  &.-expanded {
    .settings-exchange__more i:before {
      content: $icon-up;
    }
  }
}

.settings-exchange__name {
  position: relative;
  display: flex;
  height: 40px;
  align-items: center;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  font-size: 0.875rem;
  padding-left: 0.75rem;
  flex-grow: 1;
  line-height: 1;

  > span {
    position: relative;
    margin-right: auto;
    text-transform: uppercase;
    white-space: normal;
    font-weight: 600;

    &:before {
      content: '';
      position: absolute;
      top: calc(50% - 1px);
      height: 2px;
      background-color: currentColor;
      transition: width 0.2s $ease-out-expo 0.2s;
      left: -3px;
      width: calc(100% + 8px);
    }
  }
}

.settings-exchange__price {
  opacity: 0.8;
}

.settings-exchange__threshold {
  display: none;
  position: absolute;
  top: -0.5rem;
  right: -0.5rem;
  pointer-events: none;
  font-size: 90%;
  background-color: $blue;
  border-radius: 3px;
  color: white;
  padding: 0.1rem 0.2rem;
  box-shadow: 0 0 0 1px rgba(black, 0.2);
}

.settings-exchange__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  cursor: pointer;

  .icon-warning {
    display: none;
  }
}

.settings-exchange__controls {
  display: flex;
  margin-left: auto;
  align-self: stretch;

  .settings-exchange__visibility {
    display: none;
  }

  button {
    border: 0;
    background: none;
    cursor: pointer;
    font-size: 1rem;
    display: flex;
    align-items: center;

    &:hover {
      background-color: rgba(white, 0.1);
    }
  }
}

.settings-exchange__detail {
  padding: 10px;
}
</style>
