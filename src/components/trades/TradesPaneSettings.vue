<template>
  <div>
    <div class="column mb16">
      <div class="form-group -fill">
        <label>
          Max rows
          <span class="icon-info" title="Numbers of trades to keep rendered" v-tippy></span>
        </label>
        <input
          type="number"
          min="0"
          max="1000"
          step="1"
          class="form-control"
          :value="maxRows"
          @change="$store.commit(paneId + '/SET_MAX_ROWS', $event.target.value)"
        />
      </div>

      <div class="form-group -tight" title="Show exchange's logo when available" v-tippy>
        <label>Logo</label>
        <label class="checkbox-control checkbox-control-input flex-right">
          <input type="checkbox" class="form-control" :checked="showLogos" @change="$store.commit(paneId + '/TOGGLE_LOGOS', $event.target.checked)" />
          <div></div>
        </label>
      </div>

      <div v-if="showLogos" class="form-group -tight" title="Show exchange's logo when available" v-tippy>
        <label>Couleur</label>
        <label class="checkbox-control -auto checkbox-control-input flex-right">
          <input
            type="checkbox"
            class="form-control"
            :checked="monochromeLogos"
            @change="$store.commit(paneId + '/TOGGLE_MONOCHROME_LOGOS', $event.target.checked)"
          />
          <div on="monochrome" off="original"></div>
        </label>
      </div>
    </div>

    <div class="form-group mb8">
      <label class="checkbox-control" v-tippy="{ placement: 'left' }" title="ex: BTC-USD">
        <input type="checkbox" class="form-control" :checked="showTradesPairs" @change="$store.commit(paneId + '/TOGGLE_TRADES_PAIRS')" />
        <div></div>
        <span>Trades symbols are {{ showTradesPairs ? 'visible' : 'hidden' }}</span>
      </label>
    </div>

    <div class="form-group mb8">
      <label class="checkbox-control" :class="{ '-rip': tradeType === 'liquidations' }">
        <input type="checkbox" class="form-control" :checked="tradeType" @change="$store.commit(paneId + '/TOGGLE_TRADE_TYPE')" />
        <div></div>
        <span v-if="tradeType === 'both'"> Show both trades and liquidations </span>
        <span v-if="tradeType === 'liquidations'"> Only show liquidations </span>
        <span v-if="tradeType === 'trades'">Only show trades</span>
      </label>
    </div>

    <section class="section">
      <div v-if="sections.indexOf('thresholds') > -1">
        <div class="column section__controls">
          <button
            type="button"
            v-tippy
            title="Switch thresholds display"
            class="btn -text -nowrap mr4"
            @click="$store.commit(paneId + '/TOGGLE_THRESHOLDS_TABLE', !showThresholdsAsTable)"
          >
            {{ showThresholdsAsTable ? 'table' : 'slider' }}
          </button>
          <presets type="threshold" :adapter="getAudioPreset" @apply="applyAudioPreset($event)" label="Presets" />
        </div>

        <thresholds :paneId="paneId" :show-liquidations-threshold="tradeType === 'both'" />

        <div class="text-right mt8 mb8">
          <a
            href="javascript:void(0);"
            class="btn ml4 -nowrap -text"
            v-tippy
            title="Add a threshold"
            @click="$store.commit(paneId + '/ADD_THRESHOLD')"
          >
            Add
            <i class="icon-plus ml4 text-bottom"></i>
          </a>
        </div>

        <div v-if="displayGifWarning" class="d-flex help-text">
          <p class="mt0 mb0 text-danger">
            <i class="icon-info mr8"></i>
            <a href="javascript:void(0);" @click="$store.commit('settings/TOGGLE_ANIMATIONS')">Enable animations to show gifs</a>
          </p>
        </div>
      </div>
      <div class="section__title" @click="toggleSection('thresholds')">THRESHOLDS ({{ thresholds.length }}) <i class="icon-up"></i></div>
    </section>

    <section class="section">
      <div class="form-group" v-if="sections.indexOf('audio') > -1">
        <div class="column section__controls"></div>
        <div class="column mb16">
          <div class="form-group text-nowrap">
            <label class="checkbox-control">
              <input type="checkbox" class="form-control" :disabled="!useAudio" :checked="muted" @change="$store.commit(paneId + '/TOGGLE_MUTED')" />
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
                :max="10"
                :step="0.1"
                :label="true"
                :disabled="muted"
                :value="audioVolume"
                @input="$store.commit(paneId + '/SET_AUDIO_VOLUME', $event)"
                @reset="$store.commit(paneId + '/SET_AUDIO_VOLUME', null)"
              >
                <template v-slot:tooltip>× {{ audioVolume }}</template>
              </slider>
              <editable
                class="-center text-nowrap ml8"
                style="line-height:1"
                :content="'× ' + audioVolume"
                @output="$store.commit(paneId + '/SET_AUDIO_VOLUME', $event)"
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
                style="line-height:1"
                :content="'× ' + audioPitch"
                @output="$store.commit(paneId + '/SET_AUDIO_PITCH', $event)"
              ></editable>
            </div>
          </div>
        </div>
        <div class="form-group" v-if="useAudio && !muted">
          <label>
            Minimum for a trade to trigger a sound
          </label>
          <input
            class="form-control"
            :value="audioThreshold"
            :placeholder="audioThresholdPlaceholder"
            @change="$store.commit(paneId + '/SET_AUDIO_THRESHOLD', $event.target.value)"
          />
        </div>

        <div v-if="!useAudio" class="d-flex help-text">
          <p class="mt0 mb0 text-danger">
            <i class="icon-info mr8"></i>
            <a href="javascript:void(0);" @click="$store.commit('settings/TOGGLE_AUDIO', true)">Enable audio to use this feature</a>
          </p>
        </div>
      </div>
      <div class="section__title" @click="toggleSection('audio')">Audio <i class="icon-up"></i></div>
    </section>

    <section class="section">
      <div class="form-group" v-if="sections.indexOf('multipliers') > -1">
        <label>
          Ajust threshold of specific markets
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
              @dblclick="$store.commit(paneId + '/SET_THRESHOLD_MULTIPLIER', { identifier: market.identifier, multiplier: 1 })"
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
                style="width: 100%;min-width:150px;"
                :min="0"
                :max="10"
                :label="market.multiplier !== 1"
                :step="0.01"
                :showCompletion="false"
                :value="market.multiplier"
                :editable="false"
                @input="$store.commit(paneId + '/SET_THRESHOLD_MULTIPLIER', { identifier: market.identifier, multiplier: $event })"
                @reset="$store.commit(paneId + '/SET_THRESHOLD_MULTIPLIER', { identifier: market.identifier, multiplier: 1 })"
              >
                <template v-slot:tooltip="{ value }">
                  {{ thresholds[0].amount * value }}
                </template>
              </slider>
            </div>
            <!--<a href="javascript:void(0);" class="text-center -center pl16 multipliers-market__action" title="Detach" v-tippy>
          <i class="icon-cross"></i>
        </a>-->
          </div>
        </div>
        <a v-else href="javascript:void(0);" @click="$store.dispatch('app/showSearch', paneId)">
          Add markets to pane
        </a>
      </div>

      <div class="section__title" @click="toggleSection('multipliers')">
        THRESHOLD MULTIPLIER ({{ mutipliersCount }})
        <i class="icon-up"></i>
      </div>
    </section>
  </div>
</template>

<script lang="ts">
import dialogService from '@/services/dialogService'
import panesSettings from '@/store/panesSettings'
import { TradesPaneState } from '@/store/panesSettings/trades'
import { formatAmount, parseMarket, randomString } from '@/utils/helpers'
import { Component, Vue } from 'vue-property-decorator'
import Slider from '../framework/picker/Slider.vue'
import Thresholds from '../settings/Thresholds.vue'
import ThresholdPresetDialog from './ThresholdPresetDialog.vue'
import merge from 'lodash.merge'

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

  get useAudio() {
    return this.$store.state.settings.useAudio
  }

  get markets() {
    return this.$store.state.panes.panes[this.paneId].markets
  }

  get maxRows() {
    return (this.$store.state[this.paneId] as TradesPaneState).maxRows
  }

  get showLogos() {
    return (this.$store.state[this.paneId] as TradesPaneState).showLogos
  }

  get monochromeLogos() {
    return (this.$store.state[this.paneId] as TradesPaneState).monochromeLogos
  }

  get tradeType() {
    return (this.$store.state[this.paneId] as TradesPaneState).tradeType
  }

  get showTradesPairs() {
    return (this.$store.state[this.paneId] as TradesPaneState).showTradesPairs
  }

  get thresholds() {
    return (this.$store.state[this.paneId] as TradesPaneState).thresholds
  }

  get showThresholdsAsTable() {
    return (this.$store.state[this.paneId] as TradesPaneState).showThresholdsAsTable
  }

  get audioThresholdPlaceholder() {
    return '10% of minimum threshold (' + +(this.thresholds[0].amount * 0.1).toFixed(2) + ')'
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
    const volume = (this.$store.state[this.paneId] as TradesPaneState).audioVolume

    if (volume === null) {
      return this.$store.state.settings.audioVolume
    }
    return volume
  }

  get multipliers() {
    return this.markets.map(market => {
      const [exchange, pair] = parseMarket(market)

      const multiplier = (this.$store.state[this.paneId] as TradesPaneState).multipliers[exchange + pair]

      return {
        exchange,
        pair,
        multiplier: !isNaN(multiplier) ? multiplier : 1,
        identifier: exchange + pair
      }
    })
  }

  get mutipliersCount() {
    return this.multipliers.filter(market => market.multiplier !== 1).length
  }

  get disableAnimations() {
    return this.$store.state.settings.disableAnimations
  }

  get displayGifWarning() {
    return this.disableAnimations && this.thresholds.filter(t => !!t.gif).length
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
      if (!payload.amounts && !payload.audios && !payload.colors) {
        this.$store.dispatch('app/showNotice', {
          title: 'You did not select anything to save in the preset !',
          type: 'error'
        })
        return
      }

      const audioPreset: any = {}

      for (const key of [...Object.keys(this.$store.state[this.paneId].thresholds), 'liquidations']) {
        let threshold

        if (key === 'liquidations') {
          threshold = this.$store.state[this.paneId].liquidations
        } else {
          threshold = this.$store.state[this.paneId].thresholds[key]
        }

        audioPreset[key] = {}

        if (payload.amounts) {
          audioPreset[key].amount = threshold.amount
        }

        if (payload.colors) {
          audioPreset[key].buyColor = threshold.buyColor
          audioPreset[key].sellColor = threshold.sellColor
        }

        if (payload.audios) {
          audioPreset[key].buyAudio = threshold.buyAudio
          audioPreset[key].sellAudio = threshold.sellAudio
        }
      }

      return audioPreset
    }
  }

  applyAudioPreset(presetData?) {
    const defaultSettings = JSON.parse(JSON.stringify(panesSettings[this.$store.state.panes.panes[this.paneId].type as 'trades'].state))

    let state

    if (presetData) {
      let previousAmount = this.$store.state[this.paneId].thresholds[0].amount

      state = {
        thresholds: Object.keys(presetData).reduce((arr, key) => {
          if (key === 'liquidations') {
            return arr
          }

          if (!this.$store.state[this.paneId].thresholds[key]) {
            presetData[key].id = randomString()
            if (typeof presetData[key].amount === 'undefined') {
              presetData[key].amount = previousAmount
            }
            if (typeof presetData[key].buyColor === 'undefined') {
              presetData[key].buyColor = 'rgb(0, 255, 0)'
              presetData[key].sellColor = 'rgb(255, 0, 0)'
            }
            if (typeof presetData[key].buyAudio === 'undefined') {
              presetData[key].buyAudio = ''
              presetData[key].sellAudio = ''
            }
          } else {
            previousAmount = this.$store.state[this.paneId].thresholds[key].amount
          }

          arr.push(presetData[key])

          return arr
        }, []),

        liquidations: presetData.liquidations
      }
    } else {
      state = {
        thresholds: defaultSettings.thresholds,
        liquidations: defaultSettings.liquidations
      }
    }

    merge(this.$store.state[this.paneId], state)

    if (state.thresholds.length) {
      this.$store.commit(this.paneId + '/SET_THRESHOLD_AMOUNT', {
        id: null,
        amount: null
      })
    }

    if (state.liquidations) {
      if (typeof state.liquidations.buyAudio !== 'undefined') {
        this.$store.commit(this.paneId + '/SET_THRESHOLD_AUDIO', {
          id: 'liquidations',
          buyAudio: state.liquidations.buyAudio,
          sellAudio: state.liquidations.sellAudio
        })
      }

      if (typeof state.liquidations.buyColor !== 'undefined') {
        this.$store.commit(this.paneId + '/SET_THRESHOLD_COLOR', {
          id: 'liquidations',
          side: 'buyColor',
          value: state.liquidations.buyColor
        })
      }

      if (typeof state.liquidations.amount !== 'undefined') {
        this.$store.commit(this.paneId + '/SET_THRESHOLD_AMOUNT', {
          id: 'liquidations',
          value: state.liquidations.amount
        })
      }
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
    font-family: 'Barlow Semi Condensed';
  }

  &__action {
    cursor: pointer;
  }

  &:not(.-disabled) {
    background-color: $green;
  }

  .market-exchange {
    line-height: 1;
  }

  &.-disabled {
    .multipliers-market__id {
      opacity: 0.5;
    }

    .market-threshold {
      display: none;
    }
  }
}
</style>
