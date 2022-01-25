<template>
  <div class="settings-chart">
    <div class="form-group mb16">
      <label> Refresh chart every <strong v-text="refreshRateHms"></strong> </label>

      <slider
        :min="0"
        :max="10000"
        :step="100"
        :editable="false"
        :show-completion="true"
        class="mt8"
        :value="refreshRate"
        @input="$store.commit(paneId + '/SET_REFRESH_RATE', $event)"
        @reset="$store.commit(paneId + '/SET_REFRESH_RATE', 500)"
      ></slider>
    </div>
    <p v-if="refreshRate < 500" class="form-feedback"><i class="icon-warning"></i> Low refresh rate can be <u>very</u> CPU intensive</p>
    <div class="form-group mb8">
      <label class="checkbox-control">
        <input type="checkbox" class="form-control" :checked="showLegend" @change="$store.commit(paneId + '/TOGGLE_LEGEND')" />
        <div></div>
        <span>Show legend</span>
      </label>
    </div>
    <div class="form-group mb8">
      <div class="form-group column">
        <label class="checkbox-control" @change="$store.commit(paneId + '/SET_GRIDLINES', { type: 'vertical', value: $event.target.checked })">
          <input type="checkbox" class="form-control" :checked="showVerticalGridlines" :id="paneId + 'showVerticalGridlines'" />
          <div class="mr8"></div>
        </label>
        <verte
          v-if="showVerticalGridlines"
          picker="square"
          menuPosition="left"
          class="mr8"
          model="rgb"
          :value="verticalGridlinesColor"
          @input="$event !== verticalGridlinesColor && $store.commit(paneId + '/SET_GRIDLINES', { type: 'vertical', value: $event })"
        ></verte>
        <label :for="paneId + 'showVerticalGridlines'" class="-fill -center ">Vertical grid lines</label>
      </div>
    </div>
    <div class="form-group mb8">
      <div class="form-group column">
        <label class="checkbox-control" @change="$store.commit(paneId + '/SET_GRIDLINES', { type: 'horizontal', value: $event.target.checked })">
          <input type="checkbox" class="form-control" :checked="showHorizontalGridlines" :id="paneId + 'showHorizontalGridlines'" />
          <div class="mr8"></div>
        </label>
        <verte
          v-if="showHorizontalGridlines"
          picker="square"
          menuPosition="left"
          class="mr8"
          model="rgb"
          :value="horizontalGridlinesColor"
          @input="$event !== horizontalGridlinesColor && $store.commit(paneId + '/SET_GRIDLINES', { type: 'horizontal', value: $event })"
        ></verte>
        <label :for="paneId + 'showHorizontalGridlines'" class="-fill -center ">Horizontal grid lines</label>
      </div>
    </div>
    <div class="form-group mb8">
      <div class="form-group column">
        <label class="checkbox-control" @change="$store.commit(paneId + '/SET_WATERMARK', { value: $event.target.checked })">
          <input type="checkbox" class="form-control" :checked="showWatermark" />
          <div class="mr8"></div>
        </label>
        <verte
          v-if="showWatermark"
          picker="square"
          menuPosition="left"
          class="mr8"
          model="rgb"
          :value="watermarkColor"
          @input="$event !== watermarkColor && $store.commit(paneId + '/SET_WATERMARK', { value: $event })"
        ></verte>
        <label for="" class="-fill -center">Watermark</label>
      </div>
    </div>
    <div class="form-group mb8">
      <div class="form-group column">
        <label class="checkbox-control" @change="$store.commit(paneId + '/TOGGLE_FILL_GAPS_WITH_EMPTY')">
          <input type="checkbox" class="form-control" :checked="fillGapsWithEmpty" />
          <div class="mr8"></div>
        </label>
        <label for="" class="-fill -center">Fill gaps with empty bars</label>
      </div>
    </div>
    <div class="form-group">
      <div class="form-group column">
        <label class="checkbox-control" @change="$store.commit(paneId + '/TOGGLE_FORCE_NORMALIZE_PRICE')">
          <input type="checkbox" class="form-control" :checked="forceNormalizePrice" />
          <div class="mr8"></div>
        </label>
        <label for="" class="-fill -center"
          >Force normalize price
          <i
            class="icon-info"
            v-tippy
            title="Useful when aggregating multiple assets, mixing historical data and realtime only symbols. Recalculates the whole chart when the first price of a symbol is obtained and avoiding huge change of price."
          ></i>
        </label>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { getHms } from '@/utils/helpers'
import { Component, Vue } from 'vue-property-decorator'
import Slider from '../framework/picker/Slider.vue'

@Component({
  components: { Slider },
  name: 'ChartSettings',
  props: {
    paneId: {
      type: String,
      required: true
    }
  }
})
export default class extends Vue {
  paneId: string

  get showLegend() {
    return this.$store.state[this.paneId].showLegend
  }

  get fillGapsWithEmpty() {
    return this.$store.state[this.paneId].fillGapsWithEmpty
  }

  get forceNormalizePrice() {
    return this.$store.state[this.paneId].forceNormalizePrice
  }

  get refreshRate() {
    return this.$store.state[this.paneId].refreshRate
  }

  get showVerticalGridlines() {
    return this.$store.state[this.paneId].showVerticalGridlines
  }

  get verticalGridlinesColor() {
    return this.$store.state[this.paneId].verticalGridlinesColor
  }

  get showHorizontalGridlines() {
    return this.$store.state[this.paneId].showHorizontalGridlines
  }

  get horizontalGridlinesColor() {
    return this.$store.state[this.paneId].horizontalGridlinesColor
  }

  get showWatermark() {
    return this.$store.state[this.paneId].showWatermark
  }

  get watermarkColor() {
    return this.$store.state[this.paneId].watermarkColor
  }

  get refreshRateHms() {
    return getHms(this.refreshRate)
  }
}
</script>
