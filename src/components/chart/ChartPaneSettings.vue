<template>
  <div class="settings-chart">
    <div class="form-group mb8">
      <label> Refresh chart every <strong v-text="refreshRateHms"></strong> </label>

      <slider
        :min="0"
        :max="10000"
        :step="100"
        :editable="false"
        class="mt8"
        :value="refreshRate"
        @input="$store.commit(paneId + '/SET_REFRESH_RATE', $event)"
        @reset="$store.commit(paneId + '/SET_REFRESH_RATE', 500)"
      ></slider>
    </div>
    <p v-if="refreshRate < 500" class="form-feedback"><i class="icon-warning"></i> Low refresh rate can be very CPU intensive</p>
    <div class="form-group mt16 mb8">
      <label class="checkbox-control">
        <input type="checkbox" class="form-control" :checked="showLegend" @change="$store.commit(paneId + '/TOGGLE_LEGEND')" />
        <div></div>
        <span>Show legend</span>
      </label>
    </div>
    <div class="form-group mb8">
      <label for="">Vertical grid lines</label>
      <div class="form-group column">
        <label class="checkbox-control" @change="$store.commit(paneId + '/SET_GRIDLINES', { type: 'vertical', value: $event.target.checked })">
          <input type="checkbox" class="form-control" :checked="showVerticalGridlines" />
          <div class="mr8"></div>
        </label>
        <verte
          v-if="showVerticalGridlines"
          picker="square"
          menuPosition="left"
          model="rgb"
          :value="verticalGridlinesColor"
          @input="$event !== verticalGridlinesColor && $store.commit(paneId + '/SET_GRIDLINES', { type: 'vertical', value: $event })"
        ></verte>
        <label for="" class="-fill -center ml8">Color</label>
      </div>
    </div>
    <div class="form-group">
      <label for="">Horizontal grid lines</label>
      <div class="form-group column">
        <label class="checkbox-control" @change="$store.commit(paneId + '/SET_GRIDLINES', { type: 'horizontal', value: $event.target.checked })">
          <input type="checkbox" class="form-control" :checked="showHorizontalGridlines" />
          <div class="mr8"></div>
        </label>
        <verte
          v-if="showHorizontalGridlines"
          picker="square"
          menuPosition="left"
          model="rgb"
          :value="horizontalGridlinesColor"
          @input="$event !== horizontalGridlinesColor && $store.commit(paneId + '/SET_GRIDLINES', { type: 'horizontal', value: $event })"
        ></verte>
        <label for="" class="-fill -center ml8">Color</label>
      </div>
    </div>
    <div class="form-group">
      <label for="">Watermark</label>
      <div class="form-group column">
        <label class="checkbox-control" @change="$store.commit(paneId + '/SET_WATERMARK', { value: $event.target.checked })">
          <input type="checkbox" class="form-control" :checked="showWatermark" />
          <div class="mr8"></div>
        </label>
        <verte
          v-if="showWatermark"
          picker="square"
          menuPosition="left"
          model="rgb"
          :value="watermarkColor"
          @input="$event !== watermarkColor && $store.commit(paneId + '/SET_WATERMARK', { value: $event })"
        ></verte>
        <label for="" class="-fill -center ml8">Color</label>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { getHms } from '@/worker/helpers/utils'
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
