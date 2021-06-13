<template>
  <div>
    <div class="column mb8">
      <div class="form-group -fill">
        <label>
          Max rows
          <span class="icon-info" title="Numbers of trades to keep visible" v-tippy></span>
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
      <label class="checkbox-control" v-tippy="{ placement: 'left' }" title="eg: BTC-USD">
        <input type="checkbox" class="form-control" :checked="showTradesPairs" @change="$store.commit(paneId + '/TOGGLE_TRADES_PAIRS')" />
        <div></div>
        <span>Trades symbols are {{ showTradesPairs ? 'visible' : 'hidden' }}</span>
      </label>
    </div>

    <div class="form-group mb8">
      <label class="checkbox-control -rip" @change="$store.commit(paneId + '/TOGGLE_LIQUIDATIONS_ONLY', $event.target.checked)">
        <input type="checkbox" class="form-control" :checked="liquidationsOnly" />
        <div></div>
        <span v-html="'List will ' + (liquidationsOnly ? '<strong>ONLY</strong> show liquidation' : 'show trades and liquidations')"></span>
      </label>
    </div>

    <section class="section">
      <div v-if="sections.indexOf('thresholds') > -1">
        <div class="column section__controls">
          <span class="-fill"></span>
          <a
            href="javascript:void(0);"
            v-tippy
            title="Switch thresholds display"
            class="-nowrap mr4"
            @click="$store.commit(paneId + '/TOGGLE_THRESHOLDS_TABLE', !showThresholdsAsTable)"
          >
            Show as {{ showThresholdsAsTable ? 'slider' : 'table' }}
          </a>
        </div>

        <thresholds :paneId="paneId" :show-liquidations-threshold="!this.liquidationsOnly" />

        <div class="text-right mt8 mb8">
          <a href="javascript:void(0);" class="ml4 -nowrap -text" v-tippy title="Add a threshold" @click="$store.commit(paneId + '/ADD_THRESHOLD')">
            Add
            <i class="icon-plus ml4 text-bottom"></i>
          </a>
        </div>

        <div v-if="displayGifWarning" class="d-flex help-text">
          <p class="mt0 mb0">
            <i class="icon-info mr8"></i>
            <a href="javascript:void(0);" @click="$store.commit('settings/TOGGLE_ANIMATIONS')">Enable animations to show gifs</a>
          </p>
        </div>
      </div>
      <div class="section__title" @click="toggleSection('thresholds')">THRESHOLDS ({{ thresholds.length }}) <i class="icon-up"></i></div>
    </section>

    <section class="section">
      <div class="form-group" v-if="sections.indexOf('audio') > -1">
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
      <div class="section__title" @click="toggleSection('audio')">Audio Threshold <i class="icon-up"></i></div>
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
                <strong>{{ market.pair }}</strong>
              </div>
            </div>
            <div class="-fill -center ml16">
              <slider
                style="width: 100%;min-width:150px;"
                :min="0"
                :max="2"
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
        <a v-else href="javascript:void(0);" @click="$store.dispatch('app/showSearch', { paneId })">
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
import { formatAmount, parseMarket } from '@/utils/helpers'
import { Component, Vue } from 'vue-property-decorator'
import Slider from '../framework/picker/Slider.vue'
import Thresholds from '../settings/Thresholds.vue'

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

  get markets() {
    return this.$store.state.panes.panes[this.paneId].markets
  }

  get maxRows() {
    return this.$store.state[this.paneId].maxRows
  }

  get showLogos() {
    return this.$store.state[this.paneId].showLogos
  }

  get monochromeLogos() {
    return this.$store.state[this.paneId].monochromeLogos
  }

  get liquidationsOnly() {
    return this.$store.state[this.paneId].liquidationsOnly
  }

  get showTradesPairs() {
    return this.$store.state[this.paneId].showTradesPairs
  }

  get thresholds() {
    return this.$store.state[this.paneId].thresholds
  }

  get showThresholdsAsTable() {
    return this.$store.state[this.paneId].showThresholdsAsTable
  }

  get audioThresholdPlaceholder() {
    return +(this.thresholds[0].amount * 0.45).toFixed(2)
  }

  get audioThreshold() {
    return this.$store.state[this.paneId].audioThreshold
  }

  get multipliers() {
    return this.markets.map(market => {
      const [exchange, pair] = parseMarket(market)

      const multiplier = this.$store.state[this.paneId].multipliers[exchange + pair]

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
  }

  &__action {
    cursor: pointer;
  }

  &:not(.-disabled) {
    background-color: $green;
  }

  .market-exchange {
    font-family: 'Barlow Semi Condensed';
    line-height: 1;
    font-weight: 600;
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
