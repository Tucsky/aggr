<template>
  <div>
    <section class="section">
      <div v-if="sections.indexOf('display') > -1">
        <div
          class="form-group column mb8"
          title="Number of trades rendered"
          v-tippy="{ boundary: 'window', placement: 'left' }"
        >
          <label class="-fill -center">{{
            isLegacy ? 'Max trades to render' : 'Memory length'
          }}</label>
          <input
            id="trades-limit"
            type="number"
            min="0"
            max="1000"
            step="1"
            class="form-control"
            :value="maxRows"
            @change="
              $store.commit(paneId + '/SET_MAX_ROWS', $event.target.value)
            "
          />
        </div>

        <div
          class="form-group column mb8"
          @click.stop="$store.commit(paneId + '/TOGGLE_TRADE_TYPE')"
        >
          <label class="-fill -center">Filter by type</label>
          <div
            class="checkbox-control -auto checkbox-control-input -unshrinkable"
            title="Filter trade / liquidation"
            v-tippy
          >
            <input
              type="checkbox"
              class="form-control"
              :checked="tradeType !== 'both'"
            />
            <div
              :on="
                tradeType === 'liquidations'
                  ? 'Liquidations only'
                  : 'Trades only'
              "
              off="Both trades & liquidations"
            ></div>
          </div>
        </div>

        <div
          v-if="isLegacy"
          class="form-group column mb8"
          @click.stop="$store.commit(paneId + '/TOGGLE_LOGOS')"
        >
          <label class="-fill -center">Show exchange's logos</label>
          <div
            class="checkbox-control -auto checkbox-control-input -unshrinkable"
            title="Exchange's logos + style"
            v-tippy
          >
            <input type="checkbox" class="form-control" :checked="showLogos" />
            <div
              :on="
                monochromeLogos ? 'Logo visible (B&W)' : 'Logo visible (Color)'
              "
              off="No logo"
            ></div>
          </div>
        </div>

        <div
          v-if="isLegacy"
          class="form-group column mb8"
          @click.stop="$store.commit(paneId + '/TOGGLE_PRICE')"
        >
          <label class="-fill -center">Columns</label>
          <div
            class="checkbox-control -auto checkbox-control-input -unshrinkable"
            title="Show symbol's names (ex: BTC-USD)"
            v-tippy
            @click.stop
          >
            <input
              type="checkbox"
              class="form-control"
              :checked="showTradesPairs"
            />
            <div
              on="Symbol visible"
              off="Symbol hidden"
              @click="$store.commit(paneId + '/TOGGLE_TRADES_PAIRS')"
            ></div>
          </div>
          <div
            class="checkbox-control -auto checkbox-control-input -unshrinkable"
          >
            <input type="checkbox" class="form-control" :checked="showPrice" />
            <div on="Price visible" off="Price hidden" />
          </div>
        </div>

        <div
          v-if="isLegacy"
          class="form-group column"
          @click.stop="$store.commit(paneId + '/TOGGLE_TIME_AGO')"
        >
          <label class="-fill -center">Time format</label>
          <div
            class="checkbox-control -auto checkbox-control-input -unshrinkable"
            title="Time format preference"
            v-tippy
          >
            <input
              type="checkbox"
              class="form-control"
              :checked="showTimeAgo"
            />
            <div :on="secondsAgoExample" off="use HH:MM"></div>
          </div>
        </div>
      </div>
      <div class="section__title" @click="toggleSection('display')">
        DISPLAY <i class="icon-up-thin"></i>
      </div>
    </section>

    <section class="section">
      <div v-if="sections.indexOf('thresholds') > -1">
        <div class="column section__controls">
          <button
            type="button"
            v-tippy
            title="Switch thresholds display"
            class="btn -text -nowrap mr4 -cases"
            @click="
              $store.commit(
                paneId + '/TOGGLE_THRESHOLDS_TABLE',
                !showThresholdsAsTable
              )
            "
          >
            <i class="icon-switch mr4 -lower"></i>
            {{ showThresholdsAsTable ? 'slider view' : 'table view' }}
          </button>
          <presets
            type="threshold"
            :adapter="getAudioPreset"
            @apply="applyAudioPreset($event)"
            label="Presets"
          />
        </div>
        <div class="form-group mb16">
          <div class="column">
            <div class="text-nowrap">← Many</div>
            <slider
              :min="0.01"
              :max="10"
              :step="0.01"
              label
              :show-completion="false"
              class="mt4 -fill"
              :value="thresholdsMultipler"
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
              <template v-slot:tooltip>
                {{ formatAmount(thresholds[0].amount) }} ➜
                {{ formatAmount(thresholds[1].amount) }} ({{
                  +(thresholdsMultipler * 100).toFixed(2)
                }}%)
              </template>
            </slider>
            <div class="text-right text-nowrap mlauto">Few →</div>
          </div>
        </div>

        <div
          class="form-group"
          v-if="tradeType !== 'liquidations'"
          key="liquidations"
        >
          <thresholds
            :paneId="paneId"
            :thresholds="thresholds"
            label="Trades"
          />

          <div class="text-right mt8 mb8">
            <a
              href="javascript:void(0);"
              class="btn ml4 -nowrap -text"
              v-tippy
              title="Add a threshold"
              @click="$store.commit(paneId + '/ADD_THRESHOLD', 'thresholds')"
            >
              Add
              <i class="icon-plus ml4 text-bottom"></i>
            </a>
          </div>
        </div>
        <div class="form-group mt16" v-if="tradeType !== 'trades'" key="trades">
          <thresholds
            :paneId="paneId"
            :thresholds="liquidations"
            label="Liquidations"
          />

          <div class="text-right mt8 mb8">
            <a
              href="javascript:void(0);"
              class="btn ml4 -nowrap -text"
              v-tippy
              title="Add a threshold"
              @click="$store.commit(paneId + '/ADD_THRESHOLD', 'liquidations')"
            >
              Add
              <i class="icon-plus ml4 text-bottom"></i>
            </a>
          </div>
        </div>

        <div v-if="displayGifWarning" class="d-flex help-text">
          <p class="mt0 mb0 text-danger">
            <i class="icon-info mr8"></i>
            <a
              href="javascript:void(0);"
              @click="$store.commit('settings/TOGGLE_ANIMATIONS')"
              >Enable animations to show gifs</a
            >
          </p>
        </div>
      </div>
      <div class="section__title" @click="toggleSection('thresholds')">
        THRESHOLDS ({{ thresholds.length }}) <i class="icon-up-thin"></i>
      </div>
    </section>

    <section class="section">
      <div class="form-group" v-if="sections.indexOf('audio') > -1">
        <div class="column section__controls"></div>
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
              <span>Mute this pane</span>
            </label>
          </div>
          <div class="-fill ml16">
            <label class="mt8 d-block">Pane volume</label>
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
            <label class="mt16 d-block">Pitch</label>
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
            :placeholder="audioThresholdPlaceholder"
            @input="$store.commit(paneId + '/SET_AUDIO_THRESHOLD', $event)"
          />
        </div>

        <div v-if="!useAudio" class="d-flex help-text">
          <p class="mt0 mb0 text-danger">
            <i class="icon-info mr8"></i>
            <a
              href="javascript:void(0);"
              @click="$store.commit('settings/TOGGLE_AUDIO', true)"
              >Enable audio to use this feature</a
            >
          </p>
        </div>
      </div>
      <div class="section__title" @click="toggleSection('audio')">
        Audio <i class="icon-up-thin"></i>
      </div>
    </section>

    <section v-if="isLegacy" class="section">
      <div class="form-group" v-if="sections.indexOf('multipliers') > -1">
        <label>
          <div class="d-flex">
            <div>
              ← Decrease threshold<br /><small>← Increase visibility</small>
            </div>
            <div class="text-right mlauto">
              Increase threshold →<br /><small>Decrease visibility →</small>
            </div>
          </div>
        </label>
        <div class="multipliers" v-if="multipliers.length">
          <div
            v-for="market in multipliers"
            :key="market.identifier"
            class="d-flex multipliers-market"
            :class="{ '-disabled': market.multiplier === 1 }"
          >
            <div
              class="multipliers-market__id"
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
                :max="2"
                :label="market.multiplier !== 1"
                :step="0.01"
                :showCompletion="false"
                :value="market.multiplier"
                :editable="false"
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
                  {{ thresholds[0].amount * value }}
                </template>
              </slider>
            </div>
          </div>
        </div>
        <a
          v-else
          href="javascript:void(0);"
          @click="$store.dispatch('app/showSearch', paneId)"
        >
          Add markets to pane
        </a>
      </div>

      <div class="section__title" @click="toggleSection('multipliers')">
        THRESHOLD MULTIPLIER ({{ mutipliersCount }})
        <i class="icon-up-thin"></i>
      </div>
    </section>
  </div>
</template>

<script lang="ts">
import dialogService from '@/services/dialogService'
import panesSettings from '@/store/panesSettings'
import { TradesPaneState } from '@/store/panesSettings/trades'
import { ago, randomString } from '@/utils/helpers'
import { Component, Vue } from 'vue-property-decorator'
import Slider from '../framework/picker/Slider.vue'
import Thresholds from '../settings/Thresholds.vue'
import ThresholdPresetDialog from './ThresholdPresetDialog.vue'
import merge from 'lodash.merge'
import { formatAmount, parseMarket } from '@/services/productsService'

@Component({
  components: { Thresholds, Slider },
  name: 'TradesSettings',
  props: {
    paneId: {
      type: String,
      required: true
    }
  }
})
export default class extends Vue {
  paneId: string
  sections = ['thresholds']
  secondsAgoExample = '0s ago'

  private _secondsAgoExampleTimeout: number

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

  get showPrice() {
    return (this.$store.state[this.paneId] as TradesPaneState).showPrice
  }

  get tradeType() {
    return (this.$store.state[this.paneId] as TradesPaneState).tradeType
  }

  get showTradesPairs() {
    return (this.$store.state[this.paneId] as TradesPaneState).showTradesPairs
  }

  get showThresholdsAsTable() {
    return (this.$store.state[this.paneId] as TradesPaneState)
      .showThresholdsAsTable
  }

  get audioThresholdPlaceholder() {
    return (
      +(this.thresholds[0].amount * 0.1).toFixed(2) +
      ' (10% of minimum threshold)'
    )
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

  mounted() {
    const time = Date.now()

    this._secondsAgoExampleTimeout = setInterval(() => {
      this.secondsAgoExample = `${ago(time)} ago`
    }, 1000)
  }

  beforeDestroy() {
    if (this._secondsAgoExampleTimeout) {
      clearTimeout(this._secondsAgoExampleTimeout)
    }
  }

  formatAmount(amount) {
    return formatAmount(amount)
  }

  toggleSection(id) {
    const index = this.sections.indexOf(id)

    if (index === -1) {
      this.sections.push(id)
    } else {
      this.sections.splice(index, 1)
    }
  }

  async getAudioPreset() {
    const payload = await dialogService.openAsPromise(ThresholdPresetDialog)

    if (payload) {
      if (
        !payload.thresholds &&
        !payload.liquidations &&
        !payload.amounts &&
        !payload.audios &&
        !payload.colors
      ) {
        this.$store.dispatch('app/showNotice', {
          title: 'You did not select anything to save in the preset !',
          type: 'error'
        })
        return
      }

      const audioPreset: any = {}

      for (const type of ['thresholds', 'liquidations']) {
        if (!payload[type]) {
          continue
        }

        audioPreset[type] = []

        for (const threshold of this.$store.state[this.paneId][type]) {
          const partialThreshold: any = {}

          if (payload.amounts) {
            partialThreshold.amount = threshold.amount
          }

          if (payload.colors) {
            partialThreshold.buyColor = threshold.buyColor
            partialThreshold.sellColor = threshold.sellColor
          }

          if (payload.audios) {
            partialThreshold.buyAudio = threshold.buyAudio
            partialThreshold.sellAudio = threshold.sellAudio
          }

          audioPreset[type].push(partialThreshold)
        }
      }

      return audioPreset
    }
  }

  applyAudioPreset(presetData?) {
    const defaultSettings = JSON.parse(
      JSON.stringify(
        panesSettings[
          this.$store.state.panes.panes[this.paneId].type as 'trades'
        ].state
      )
    ) as TradesPaneState

    let updateThresholdsColors = null
    let updateThresholdsAudios = null
    let updateThresholdsAmounts = null

    if (presetData) {
      if (presetData[0]) {
        // retro compatibility
        let liquidationsThreshold
        if (presetData.liquidations) {
          liquidationsThreshold = presetData.liquidations
          delete presetData.liquidations
        }
        presetData = {
          thresholds: Object.values(presetData),
          liquidations: liquidationsThreshold ? [liquidationsThreshold] : null
        }
      }

      for (const type of ['thresholds', 'liquidations']) {
        if (!presetData[type]) {
          continue
        }

        updateThresholdsAmounts =
          typeof presetData[type][0].amount !== 'undefined'
        updateThresholdsColors =
          typeof presetData[type][0].buyColor !== 'undefined'
        updateThresholdsAudios =
          typeof presetData[type][0].buyAudio !== 'undefined'

        const replaceAll =
          updateThresholdsAmounts &&
          updateThresholdsColors &&
          updateThresholdsAudios
        const defaultMaxIndex = defaultSettings[type].length

        if (replaceAll) {
          merge(this.$store.state[this.paneId][type], presetData[type])
          continue
        }

        let previousAmount = this.$store.state[this.paneId][type][0].amount

        this.$store.state[this.paneId][type] = merge(
          this.$store.state[this.paneId][type],
          presetData[type]
        ).map((threshold, index) => {
          if (!threshold.id) {
            threshold.id = randomString()
          }
          if (typeof threshold.amount === 'undefined') {
            threshold.amount = previousAmount
          }
          if (typeof threshold.buyColor === 'undefined') {
            threshold.buyColor =
              defaultSettings[type][Math.min(index, defaultMaxIndex)].buyColor
            threshold.sellColor =
              defaultSettings[type][Math.min(index, defaultMaxIndex)].sellColor
          }
          if (typeof threshold.buyAudio === 'undefined') {
            threshold.buyAudio =
              defaultSettings[type][Math.min(index, defaultMaxIndex)].buyAudio
            threshold.sellAudio =
              defaultSettings[type][Math.min(index, defaultMaxIndex)].sellAudio
          }

          previousAmount = threshold.amount

          return threshold
        })
      }
    } else {
      updateThresholdsAmounts = updateThresholdsColors = updateThresholdsAudios = true

      if (this.$store.state[this.paneId].thresholds) {
        this.$store.state[this.paneId].thresholds.splice(
          0,
          this.$store.state[this.paneId].thresholds.length
        )
      }

      if (this.$store.state[this.paneId].liquidations) {
        this.$store.state[this.paneId].liquidations.splice(
          0,
          this.$store.state[this.paneId].liquidations.length
        )
      }

      merge(this.$store.state[this.paneId], {
        thresholds: defaultSettings.thresholds,
        liquidations: defaultSettings.liquidations,
        thresholdsMultipler: 1
      })
    }

    const referenceThreshold = this.$store.state[this.paneId].thresholds[0]

    if (updateThresholdsAmounts) {
      this.$store.commit(this.paneId + '/SET_THRESHOLD_AMOUNT', {
        id: referenceThreshold.id,
        value: referenceThreshold.amount
      })
    }

    if (updateThresholdsColors) {
      this.$store.commit(this.paneId + '/SET_THRESHOLD_COLOR', {
        id: referenceThreshold.id,
        side: 'buy',
        value: referenceThreshold.buyColor
      })
    }

    if (updateThresholdsAudios) {
      this.$store.commit(this.paneId + '/SET_THRESHOLD_AUDIO', {
        id: referenceThreshold.id,
        buyAudio: referenceThreshold.buyAudio,
        sellAudio: referenceThreshold.sellAudio
      })
    }
  }
}
</script>
<style scoped lang="scss">
.multipliers {
  margin: 0 -1rem;
  padding: 0.5rem 0;
}

.multipliers-market {
  padding: 0.4rem 1rem;

  &:hover {
    background-color: rgba(white, 0.1);
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
    .market-pair {
      opacity: 0.5;
    }

    .market-threshold {
      display: none;
    }
  }
}
</style>
