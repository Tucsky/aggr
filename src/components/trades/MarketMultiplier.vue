<template>
  <div
    class="d-flex market-multiplier"
    :class="[!hasMultiplier && '-disabled']"
  >
    <div
      class="market-multiplier__id"
      @dblclick="
        $store.commit(paneId + '/SET_THRESHOLD_MULTIPLIER', {
          identifier: market.identifier,
          multiplier: null
        })
      "
    >
      <div class="text-nowrap market-exchange">
        <small>{{ market.exchange }}</small>
      </div>
      <div class="text-nowrap market-pair">
        {{ market.pair }}
      </div>
    </div>
    <div class="-fill -center ml16">
      <slider
        style="width: 100%; min-width: 150px"
        :min="0"
        :max="3"
        :label="market.multiplier !== 1"
        :step="0.01"
        :showCompletion="false"
        :value="market.multiplier"
        :editable="false"
        log
        @input="
          $store.commit(paneId + '/SET_THRESHOLD_MULTIPLIER', {
            identifier: market.identifier,
            multiplier: $event
          })
        "
        @reset="
          $store.commit(paneId + '/SET_THRESHOLD_MULTIPLIER', {
            identifier: market.identifier,
            multiplier: 1
          })
        "
      >
        <template v-slot:tooltip="{ value }">
          × {{ +value.toFixed(2) }}
        </template>
      </slider>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import Slider from '@/components/framework/picker/Slider.vue'
@Component({
  components: {
    Slider
  },
  name: 'TradesMarketMultiplier',
  props: {
    paneId: {
      type: String,
      required: true
    },
    market: {
      type: Object,
      required: true
    }
  }
})
export default class TradesSettings extends Vue {
  paneId: string
  market: { identifier: string; multiplier: number }

  get hasMultiplier() {
    return this.market.multiplier !== 1
  }
}
</script>
<style scoped lang="scss">
.market-multiplier {
  padding: 0.4rem 1rem;

  &:hover {
    background-color: var(--theme-background-100);
  }

  &__id {
    min-width: 125px;
    flex-basis: 30%;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    font-family: $font-condensed;
  }

  &__action {
    cursor: pointer;
  }

  &:not(.-disabled) {
    background-color: var(--theme-buy-base);
    color: var(--theme-buy-200);
  }

  .market-exchange {
    line-height: 1;
    font-size: 0.75rem;
    letter-spacing: 1px;
  }

  &.-disabled {
    .market-threshold {
      display: none;
    }
  }
}
</style>
