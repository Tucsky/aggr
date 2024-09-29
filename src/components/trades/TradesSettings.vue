<template>
  <div>
    <div class="form-group mb16">
      <div class="column">
        <div>←</div>
        <small>Small orders</small>
        <slider
          :min="0.01"
          :max="10"
          :step="0.01"
          :show-completion="false"
          class="mt8 -fill -start"
          :value="thresholdsMultipler"
          :gradient="gradient"
          @input="
            $store.commit(paneId + '/SET_THRESHOLDS_MULTIPLER', {
              value: $event,
              market: markets[0]
            })
          "
          @reset="
            $store.commit(paneId + '/SET_THRESHOLDS_MULTIPLER', {
              value: 1,
              market: markets[0]
            })
          "
          log
        >
        </slider>
        <small class="text-left mlauto">Large orders</small>
        <div>→</div>
      </div>
    </div>
    <br />
    <ToggableSection
      class="thresholds"
      title="Thresholds"
      id="trades-thresholds"
      :badge="thresholds.length"
      :disabled="!showTrades"
      inset
    >
      <template #title>
        <label class="checkbox-control -small mr0" @click.stop>
          <input
            type="checkbox"
            class="form-control"
            :checked="showTrades"
            @change="$store.commit(paneId + '/TOGGLE_PREFERENCE', 'showTrades')"
          />
          <div></div>
        </label>
        <div class="toggable-section__title ml16">Trades</div>
        <span class="badge -outline ml8 mrauto">{{ thresholds.length }}</span>
        <ThresholdColor :pane-id="paneId" type="thresholds" side="buy" />
        <ThresholdColor :pane-id="paneId" type="thresholds" side="sell" />
      </template>
      <div class="form-group">
        <thresholds
          :paneId="paneId"
          :thresholds="thresholds"
          label="Trades"
          type="thresholds"
        />
      </div>

      <div v-if="displayGifWarning" class="d-flex help-text">
        <p class="mt0 mb0 text-success">
          <i class="icon-info mr8"></i>
          <a
            href="javascript:void(0);"
            @click="$store.commit('settings/TOGGLE_ANIMATIONS')"
            >Enable animations to show gifs</a
          >
        </p>
      </div>
    </ToggableSection>
    <ToggableSection
      class="thresholds"
      id="trades-liquidations"
      :badge="liquidations.length"
      :disabled="!showLiquidations"
      inset
    >
      <template #title>
        <label class="checkbox-control -small mr0" @click.stop>
          <input
            type="checkbox"
            class="form-control"
            :checked="showLiquidations"
            @change="
              $store.commit(paneId + '/TOGGLE_PREFERENCE', 'showLiquidations')
            "
            @click.stop
          />
          <div></div>
        </label>
        <div class="toggable-section__title ml16">Liquidations</div>
        <span class="badge -outline ml8 mrauto">{{ liquidations.length }}</span>
        <ThresholdColor :pane-id="paneId" type="liquidations" side="buy" />
        <ThresholdColor :pane-id="paneId" type="liquidations" side="sell" />
      </template>
      <div class="form-group">
        <thresholds
          :paneId="paneId"
          :thresholds="liquidations"
          label="Liquidations"
          type="liquidations"
        />
      </div>

      <div v-if="displayGifWarning" class="d-flex help-text">
        <p class="mt0 mb0 text-success">
          <i class="icon-info mr8"></i>
          <a
            href="javascript:void(0);"
            @click="$store.commit('settings/TOGGLE_ANIMATIONS')"
            >Enable animations to show gifs</a
          >
        </p>
      </div>
    </ToggableSection>

    <ToggableSection title="Audio" id="trades-audio" inset>
      <div class="column mb16">
        <div class="form-group text-nowrap">
          <label class="checkbox-control">
            <input
              type="checkbox"
              class="form-control"
              :disabled="!useAudio"
              :checked="muted"
              @change="$store.commit(paneId + '/TOGGLE_MUTED')"
            />
            <div></div>
            <span>Mute pane</span>
          </label>
        </div>
        <div class="-fill ml16">
          <label class="mt8 d-block text-color-base">Pane volume</label>
          <div class="column">
            <slider
              class="mrauto -fill mt8 mb8"
              :min="0"
              :max="400"
              :step="1"
              :label="true"
              :disabled="muted"
              :value="audioVolume * 100"
              @input="
                $store.commit(
                  paneId + '/SET_AUDIO_VOLUME',
                  +($event / 100).toFixed(2)
                )
              "
              @reset="$store.commit(paneId + '/SET_AUDIO_VOLUME', null)"
              log
            >
              <template v-slot:tooltip>
                {{ audioVolume > 1 ? '+' : '' }}
                {{ +(audioVolume * 100).toFixed(2) }}%
              </template>
            </slider>
            <editable
              class="-center text-nowrap ml8"
              style="line-height: 1"
              :value="'× ' + audioVolume"
              @input="$store.commit(paneId + '/SET_AUDIO_VOLUME', $event)"
            ></editable>
          </div>
          <label class="mt16 d-block text-color-base">Transpose</label>
          <div class="column">
            <slider
              class="mrauto -fill mt8 mb8"
              :min="0.001"
              :max="5"
              :step="0.01"
              :showCompletion="false"
              :disabled="muted"
              :value="audioPitch"
              @input="$store.commit(paneId + '/SET_AUDIO_PITCH', $event)"
              @reset="$store.commit(paneId + '/SET_AUDIO_PITCH', null)"
              log
            >
              <template v-slot:tooltip>× {{ audioPitch }} </template>
            </slider>
            <editable
              class="-center text-nowrap ml8"
              style="line-height: 1"
              :value="'× ' + audioPitch"
              @input="$store.commit(paneId + '/SET_AUDIO_PITCH', $event)"
            ></editable>
          </div>
        </div>
      </div>
      <div class="form-group" v-if="useAudio && !muted">
        <label>
          Minimum for a trade to trigger a sound
          <i
            class="icon-info mr8"
            v-tippy
            title="Enter the absolute amount<br>or % of significant amount"
          ></i>
        </label>
        <editable
          class="form-control"
          :value="audioThreshold"
          placeholder="10%"
          @input="$store.commit(paneId + '/SET_AUDIO_THRESHOLD', $event)"
        />
      </div>

      <button
        v-if="!useAudio"
        type="button"
        class="btn -text -small -cases"
        @click="$store.commit('settings/TOGGLE_AUDIO', true)"
        title="Click to enable audio"
        v-tippy
      >
        <i class="icon-info mr8 -lower"></i>Audio is currently disabled
      </button>
    </ToggableSection>

    <ToggableSection title="Preferences" id="trades-preferences" inset>
      <div
        class="form-group column mb8"
        title="Number of trades rendered"
        v-tippy="{ boundary: 'window', placement: 'left' }"
      >
        <label class="-fill -center -inline">Lines count</label>
        <input
          id="trades-limit"
          type="number"
          min="0"
          max="1000"
          step="1"
          class="form-control"
          :value="maxRows"
          @change="$store.commit(paneId + '/SET_MAX_ROWS', $event.target.value)"
        />
      </div>

      <div
        v-if="isLegacy"
        class="form-group column"
        @click.stop="
          $store.commit(paneId + '/TOGGLE_PREFERENCE', 'showTimeAgo')
        "
      >
        <label class="-fill -center -inline">Time format</label>
        <div
          class="checkbox-control -auto checkbox-control-input -unshrinkable"
          title="Time format preference"
          v-tippy
        >
          <input type="checkbox" class="form-control" :checked="showTimeAgo" />
          <div :on="secondsAgoExample" :off="HHMM"></div>
        </div>
      </div>

      <div
        v-if="!isLegacy"
        class="form-group column mb8"
        @click.stop="
          $store.commit(paneId + '/TOGGLE_PREFERENCE', 'showHistograms')
        "
      >
        <label class="-fill -center -inline">Histogram</label>
        <div
          class="checkbox-control checkbox-control-input"
          title="Rolling delta histogram"
          v-tippy
          @click.stop
        >
          <input
            type="checkbox"
            class="form-control"
            :checked="showHistograms"
          />
          <div
            @click="
              $store.commit(paneId + '/TOGGLE_PREFERENCE', 'showHistograms')
            "
          ></div>
        </div>
      </div>
    </ToggableSection>

    <ToggableSection title="Formats" id="trades-columns" inset>
      <div class="form-group mb8">
        <label class="checkbox-control -small">
          <input
            type="checkbox"
            class="form-control"
            :checked="showPairs"
            @change="$store.commit(paneId + '/TOGGLE_PREFERENCE', 'showPairs')"
          />
          <div></div>
          <span>
            Show pairs
            <i
              class="icon-info"
              v-tippy
              title="Show symbol's names<br>(ex: BTC-USD)"
            ></i>
          </span>
        </label>
      </div>

      <toggable-group
        class="mb8 mt16"
        :value="showPrices"
        label="Show prices"
        @change="$store.commit(paneId + '/TOGGLE_PREFERENCE', 'showPrices')"
        small
      >
        <div class="form-group">
          <label class="checkbox-control -small">
            <input
              type="checkbox"
              class="form-control"
              :checked="showAvgPrice"
              @change="
                $store.commit(paneId + '/TOGGLE_PREFERENCE', 'showAvgPrice')
              "
            />
            <div></div>
            <span>
              Weighted average
              <i
                class="icon-info"
                v-tippy
                title="Show the weighted average price instead of the last price for aggregated trade results"
              ></i>
            </span>
          </label>
        </div>
      </toggable-group>
      <toggable-group
        v-if="isLegacy"
        class="mb8 mt16"
        :value="showLogos"
        label="Show logos"
        @change="$store.commit(paneId + '/TOGGLE_PREFERENCE', 'showLogos')"
        small
      >
        <div class="form-group">
          <label class="checkbox-control -small">
            <input
              type="checkbox"
              class="form-control"
              :checked="monochromeLogos"
              @change="
                $store.commit(paneId + '/TOGGLE_PREFERENCE', 'monochromeLogos')
              "
            />
            <div></div>
            <span> Monochrome logos </span>
          </label>
        </div>
      </toggable-group>
    </ToggableSection>
    <ToggableSection
      v-if="isLegacy"
      :title="`THRESHOLD MULTIPLIER (${mutipliersCount})`"
      inset
    >
      <div class="form-group" v-if="multipliers.length">
        <label>
          <div class="d-flex">
            <div>← Decrease threshold</div>
            <div class="text-right mlauto">Increase threshold →</div>
          </div>
        </label>
        <div class="multipliers">
          <MarketMultiplier
            v-for="market in multipliers"
            :key="market.identifier"
            :pane-id="paneId"
            :market="market"
          />
        </div>
      </div>
      <p v-else class="mb0">
        No active markets,
        <a
          href="javascript:void(0);"
          @click="$store.dispatch('app/showSearch', { paneId })"
        >
          add markets</a
        >.
      </p>
    </ToggableSection>
  </div>
</template>

<script lang="ts">
import { TradesPaneState } from '@/store/panesSettings/trades'
import { ago } from '@/utils/helpers'
import { Component, Vue } from 'vue-property-decorator'
import Slider from '@/components/framework/picker/Slider.vue'
import Thresholds from '@/components/settings/Thresholds.vue'
import { formatAmount, parseMarket } from '@/services/productsService'
import ToggableSection from '@/components/framework/ToggableSection.vue'
import ColorPickerControl from '@/components/framework/picker/ColorPickerControl.vue'
import ThresholdColor from '@/components/trades/ThresholdColor.vue'
import MarketMultiplier from '@/components/trades/MarketMultiplier.vue'
import ToggableGroup from '@/components/framework/ToggableGroup.vue'

@Component({
  components: {
    Thresholds,
    Slider,
    ThresholdColor,
    ToggableSection,
    MarketMultiplier,
    ColorPickerControl,
    ToggableGroup
  },
  name: 'TradesSettings',
  props: {
    paneId: {
      type: String,
      required: true
    }
  }
})
export default class TradesSettings extends Vue {
  paneId: string
  secondsAgoExample = '0s ago'

  private _secondsAgoExampleTimeout: number

  get HHMM() {
    return new Date()
      .toISOString()
      .split('T')[1]
      .split(':')
      .slice(0, 2)
      .join(':')
  }

  get useAudio() {
    return this.$store.state.settings.useAudio
  }

  get markets() {
    return this.$store.state.panes.panes[this.paneId].markets
  }

  get maxRows() {
    return (this.$store.state[this.paneId] as TradesPaneState).maxRows
  }

  get thresholds() {
    return (this.$store.state[this.paneId] as TradesPaneState).thresholds
  }

  get liquidations() {
    return (this.$store.state[this.paneId] as TradesPaneState).liquidations
  }

  get showLogos() {
    return (this.$store.state[this.paneId] as TradesPaneState).showLogos
  }

  get monochromeLogos() {
    return (this.$store.state[this.paneId] as TradesPaneState).monochromeLogos
  }

  get showTimeAgo() {
    return (this.$store.state[this.paneId] as TradesPaneState).showTimeAgo
  }

  get showAvgPrice() {
    return (this.$store.state[this.paneId] as TradesPaneState).showAvgPrice
  }

  get showPrices() {
    return (this.$store.state[this.paneId] as TradesPaneState).showPrices
  }

  get showTrades() {
    return (this.$store.state[this.paneId] as TradesPaneState).showTrades
  }

  get showLiquidations() {
    return (this.$store.state[this.paneId] as TradesPaneState).showLiquidations
  }

  get showPairs() {
    return (this.$store.state[this.paneId] as TradesPaneState).showPairs
  }

  get showHistograms() {
    return (this.$store.state[this.paneId] as TradesPaneState).showHistograms
  }

  get audioThreshold() {
    return (this.$store.state[this.paneId] as TradesPaneState).audioThreshold
  }

  get muted() {
    return (this.$store.state[this.paneId] as TradesPaneState).muted
  }

  get audioPitch() {
    return (this.$store.state[this.paneId] as TradesPaneState).audioPitch || 1
  }

  get audioVolume() {
    const volume = (this.$store.state[this.paneId] as TradesPaneState)
      .audioVolume

    if (volume === null) {
      return this.$store.state.settings.audioVolume
    }
    return volume
  }

  get thresholdsMultipler() {
    return (this.$store.state[this.paneId] as TradesPaneState)
      .thresholdsMultipler
  }

  get disableAnimations() {
    return this.$store.state.settings.disableAnimations
  }

  get isLegacy() {
    return this.$store.state.panes.panes[this.paneId].type === 'trades'
  }

  get displayGifWarning() {
    return (
      this.isLegacy &&
      this.disableAnimations &&
      (this.thresholds.filter(t => !!t.buyGif && !!t.sellGif).length ||
        this.liquidations.filter(t => !!t.buyGif && !!t.sellGif).length)
    )
  }

  get multipliers() {
    return this.markets.map(marketKey => {
      const [exchange, pair] = parseMarket(marketKey)

      const multiplier = (this.$store.state[this.paneId] as TradesPaneState)
        .multipliers[marketKey]

      return {
        exchange,
        pair,
        multiplier: !isNaN(multiplier) ? multiplier : 1,
        identifier: marketKey
      }
    })
  }

  get mutipliersCount() {
    return this.multipliers.filter(market => market.multiplier !== 1).length
  }

  get gradient() {
    return [
      this.$store.state[this.paneId].thresholds[0].buyColor,
      this.$store.state[this.paneId].thresholds[
        this.$store.state[this.paneId].thresholds.length - 1
      ].buyColor
    ]
  }

  get thresholdsBuyColor() {
    return this.thresholds[1].buyColor
  }

  get thresholdsSellColor() {
    return this.thresholds[1].sellColor
  }

  get liquidationsBuyColor() {
    return this.liquidations[1].buyColor
  }

  get liquidationsSellColor() {
    return this.liquidations[1].sellColor
  }

  mounted() {
    const time = Date.now()

    this._secondsAgoExampleTimeout = setInterval(() => {
      this.secondsAgoExample = `${ago(time)} ago`
    }, 1000) as unknown as number
  }

  beforeDestroy() {
    if (this._secondsAgoExampleTimeout) {
      clearTimeout(this._secondsAgoExampleTimeout)
    }
  }

  formatAmount(amount) {
    return formatAmount(amount)
  }
}
</script>
<style scoped lang="scss">
.thresholds {
  pointer-events: all;
}

.multipliers {
  margin: 0 -1rem;
  padding: 0.5rem 0;
}

.multipliers-market {
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
    background-color: $green;
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
