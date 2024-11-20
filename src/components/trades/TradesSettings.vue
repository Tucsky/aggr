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
        <Thresholds
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
          v-commit="paneId + '/SET_MAX_ROWS'"
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
<script lang="ts" setup>
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { ago } from '@/utils/helpers'
import Slider from '@/components/framework/picker/Slider.vue'
import Thresholds from '@/components/settings/Thresholds.vue'
import { parseMarket } from '@/services/productsService'
import ToggableSection from '@/components/framework/ToggableSection.vue'
import ThresholdColor from '@/components/trades/ThresholdColor.vue'
import MarketMultiplier from '@/components/trades/MarketMultiplier.vue'
import ToggableGroup from '@/components/framework/ToggableGroup.vue'
import { TradesPaneState } from '@/store/panesSettings/trades'
import store from '@/store'

const props = defineProps<{
  paneId: string
}>()

const secondsAgoExample = ref('0s ago')
let secondsAgoExampleTimeout: number | null = null

const HHMM = computed(() =>
  new Date().toISOString().split('T')[1].split(':').slice(0, 2).join(':')
)

const useAudio = computed(() => store.state.settings.useAudio)
const markets = computed(() => store.state.panes.panes[props.paneId].markets)

const maxRows = computed(
  () => (store.state[props.paneId] as TradesPaneState).maxRows
)
const thresholds = computed(
  () => (store.state[props.paneId] as TradesPaneState).thresholds
)
const liquidations = computed(
  () => (store.state[props.paneId] as TradesPaneState).liquidations
)
const showLogos = computed(
  () => (store.state[props.paneId] as TradesPaneState).showLogos
)
const monochromeLogos = computed(
  () => (store.state[props.paneId] as TradesPaneState).monochromeLogos
)
const showTimeAgo = computed(
  () => (store.state[props.paneId] as TradesPaneState).showTimeAgo
)
const showAvgPrice = computed(
  () => (store.state[props.paneId] as TradesPaneState).showAvgPrice
)
const showPrices = computed(
  () => (store.state[props.paneId] as TradesPaneState).showPrices
)
const showTrades = computed(
  () => (store.state[props.paneId] as TradesPaneState).showTrades
)
const showLiquidations = computed(
  () => (store.state[props.paneId] as TradesPaneState).showLiquidations
)
const showPairs = computed(
  () => (store.state[props.paneId] as TradesPaneState).showPairs
)
const showHistograms = computed(
  () => (store.state[props.paneId] as TradesPaneState).showHistograms
)
const audioThreshold = computed(
  () => (store.state[props.paneId] as TradesPaneState).audioThreshold
)
const muted = computed(
  () => (store.state[props.paneId] as TradesPaneState).muted
)
const audioPitch = computed(
  () => (store.state[props.paneId] as TradesPaneState).audioPitch || 1
)
const audioVolume = computed(() => {
  const volume = (store.state[props.paneId] as TradesPaneState).audioVolume
  return volume === null ? store.state.settings.audioVolume : volume
})
const thresholdsMultipler = computed(
  () => (store.state[props.paneId] as TradesPaneState).thresholdsMultipler
)
const disableAnimations = computed(() => store.state.settings.disableAnimations)
const isLegacy = computed(
  () => store.state.panes.panes[props.paneId].type === 'trades'
)

const displayGifWarning = computed(
  () =>
    isLegacy.value &&
    disableAnimations.value &&
    (thresholds.value.filter(t => !!t.buyGif && !!t.sellGif).length ||
      liquidations.value.filter(t => !!t.buyGif && !!t.sellGif).length)
)

const multipliers = computed(() =>
  markets.value.map(marketKey => {
    const [exchange, pair] = parseMarket(marketKey)
    const multiplier = (store.state[props.paneId] as TradesPaneState)
      .multipliers[marketKey]
    return {
      exchange,
      pair,
      multiplier: !isNaN(multiplier) ? multiplier : 1,
      identifier: marketKey
    }
  })
)

const mutipliersCount = computed(
  () => multipliers.value.filter(market => market.multiplier !== 1).length
)

const gradient = computed(() => [
  (store.state[props.paneId] as TradesPaneState).thresholds[0].buyColor,
  (store.state[props.paneId] as TradesPaneState).thresholds[
    (store.state[props.paneId] as TradesPaneState).thresholds.length - 1
  ].buyColor
])

onMounted(() => {
  const time = Date.now()
  secondsAgoExampleTimeout = setInterval(() => {
    secondsAgoExample.value = `${ago(time)} ago`
  }, 1000) as unknown as number
})

onBeforeUnmount(() => {
  if (secondsAgoExampleTimeout) {
    clearTimeout(secondsAgoExampleTimeout)
  }
})
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
