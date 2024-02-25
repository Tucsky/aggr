<template>
  <div class="settings-chart">
    <div class="form-group mb16">
      <label>
        Refresh chart every
        <code v-text="refreshRateHms" class="text-color-base"></code>
      </label>

      <slider
        :min="0"
        :max="10000"
        :step="100"
        :show-completion="true"
        class="mt8"
        :value="refreshRate"
        @input="$store.commit(paneId + '/SET_REFRESH_RATE', $event)"
        @reset="$store.commit(paneId + '/SET_REFRESH_RATE', 500)"
      ></slider>
    </div>
    <p v-if="refreshRate < 500" class="form-feedback">
      <i class="icon-warning"></i> Low refresh rate can be <u>very</u> CPU
      intensive
    </p>
    <div class="form-group mb8">
      <label class="checkbox-control">
        <input
          type="checkbox"
          class="form-control"
          :checked="showLegend"
          @change="$store.commit(paneId + '/TOGGLE_LEGEND')"
        />
        <div></div>
        <span class="-inline">Show legend</span>
      </label>
    </div>
    <div class="form-group mb8">
      <div class="form-group column">
        <label
          class="checkbox-control"
          @change="
            $store.commit(paneId + '/SET_GRIDLINES', {
              type: 'vertical',
              value: $event.target.checked
            })
          "
        >
          <input
            type="checkbox"
            class="form-control"
            :checked="showVerticalGridlines"
          />
          <div></div>
          <span>Show vertical grid lines</span>
        </label>
        <color-picker-control
          v-if="showVerticalGridlines"
          class="ml8"
          :value="verticalGridlinesColor"
          label="Vertical line color"
          @input="
            $event !== verticalGridlinesColor &&
              $store.commit(paneId + '/SET_GRIDLINES', {
                type: 'vertical',
                value: $event
              })
          "
        ></color-picker-control>
      </div>
    </div>
    <div class="form-group mb8">
      <div class="form-group column">
        <label
          class="checkbox-control"
          @change="
            $store.commit(paneId + '/SET_GRIDLINES', {
              type: 'horizontal',
              value: $event.target.checked
            })
          "
        >
          <input
            type="checkbox"
            class="form-control"
            :checked="showHorizontalGridlines"
            :id="paneId + 'showHorizontalGridlines'"
          />
          <div></div>
          <span>Show horizontal grid lines</span>
        </label>
        <color-picker-control
          v-if="showHorizontalGridlines"
          class="ml8"
          model="rgb"
          :value="horizontalGridlinesColor"
          label="Horizontal line color"
          @input="
            $event !== horizontalGridlinesColor &&
              $store.commit(paneId + '/SET_GRIDLINES', {
                type: 'horizontal',
                value: $event
              })
          "
        ></color-picker-control>
      </div>
    </div>
    <div class="form-group mb8 column">
      <label
        class="checkbox-control"
        @change="
          $store.commit(paneId + '/SET_WATERMARK', {
            value: $event.target.checked
          })
        "
      >
        <input type="checkbox" class="form-control" :checked="showWatermark" />
        <div></div>
        <span>Watermark</span>
      </label>
      <color-picker-control
        v-if="showWatermark"
        class="ml8"
        :value="watermarkColor"
        label="Watermark color"
        @input="
          $event !== watermarkColor &&
            $store.commit(paneId + '/SET_WATERMARK', { value: $event })
        "
      ></color-picker-control>
    </div>
    <div class="form-group mb8 column">
      <label
        class="checkbox-control"
        @change="
          $store.commit(paneId + '/SET_BORDER', {
            value: $event.target.checked
          })
        "
      >
        <input type="checkbox" class="form-control" :checked="showBorder" />
        <div></div>
        <span>Borders</span>
      </label>
      <color-picker-control
        v-if="showBorder"
        class="ml8"
        :value="borderColor"
        label="Border color"
        @input="
          $event !== borderColor &&
            $store.commit(paneId + '/SET_BORDER', { value: $event })
        "
      ></color-picker-control>
      <color-picker-control
        class="ml8"
        :value="textColor"
        label="Text color"
        @input="
          $event !== textColor &&
            $store.commit(paneId + '/SET_TEXT_COLOR', { value: $event })
        "
      ></color-picker-control>
    </div>
    <div class="form-group">
      <label>Scales</label>
      <div class="form-group mb8 column">
        <label
          class="checkbox-control"
          @change="$store.commit(paneId + '/TOGGLE_AXIS', 'left')"
        >
          <input
            type="checkbox"
            class="form-control"
            :checked="showLeftScale"
          />
          <div></div>
          <span>Left</span>
        </label>
        <label
          class="checkbox-control"
          @change="$store.commit(paneId + '/TOGGLE_AXIS', 'right')"
        >
          <input
            type="checkbox"
            class="form-control"
            :checked="showRightScale"
          />
          <div></div>
          <span>Right</span>
        </label>
        <label
          class="checkbox-control"
          @change="$store.commit(paneId + '/TOGGLE_AXIS', 'time')"
        >
          <input
            type="checkbox"
            class="form-control"
            :checked="showTimeScale"
          />
          <div></div>
          <span>Time</span>
        </label>
      </div>
    </div>
    <div class="divider" />
    <div class="form-group mb8">
      <div class="form-group column">
        <label
          class="checkbox-control"
          @change="$store.commit(paneId + '/TOGGLE_FILL_GAPS_WITH_EMPTY')"
        >
          <input
            type="checkbox"
            class="form-control"
            :checked="fillGapsWithEmpty"
          />
          <div></div>
          <span>Fill gaps with empty bars</span>
        </label>
      </div>
    </div>
    <div class="divider" />
    <AlertsSettings />
  </div>
</template>

<script lang="ts">
import { getHms } from '@/utils/helpers'
import { Component, Vue } from 'vue-property-decorator'
import Slider from '@/components/framework/picker/Slider.vue'
import ToggableGroup from '@/components/framework/ToggableGroup.vue'
import DropdownButton from '@/components/framework/DropdownButton.vue'
import ColorPickerControl from '@/components/framework/picker/ColorPickerControl.vue'
import AlertsSettings from '@/components/alerts/AlertsSettings.vue'

@Component({
  components: {
    AlertsSettings,
    Slider,
    ToggableGroup,
    DropdownButton,
    ColorPickerControl
  },
  name: 'ChartSettings',
  props: {
    paneId: {
      type: String,
      required: true
    }
  }
})
export default class ChartSettings extends Vue {
  paneId: string

  get showLegend() {
    return this.$store.state[this.paneId].showLegend
  }

  get fillGapsWithEmpty() {
    return this.$store.state[this.paneId].fillGapsWithEmpty
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

  get showBorder() {
    return this.$store.state[this.paneId].showBorder
  }

  get borderColor() {
    return this.$store.state[this.paneId].borderColor
  }

  get textColor() {
    return this.$store.state[this.paneId].textColor
  }

  get showRightScale() {
    return this.$store.state[this.paneId].showRightScale
  }

  get showLeftScale() {
    return this.$store.state[this.paneId].showLeftScale
  }

  get showTimeScale() {
    return this.$store.state[this.paneId].showTimeScale
  }

  get refreshRateHms() {
    return getHms(this.refreshRate)
  }
}
</script>
