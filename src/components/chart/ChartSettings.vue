<template>
  <div class="settings-chart">
    <div class="form-group mb16">
      <label>
        Refresh chart every <strong v-text="refreshRateHms"></strong>
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
        <span>Show legend</span>
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
            :id="paneId + 'showVerticalGridlines'"
          />
          <div class="mr8"></div>
        </label>
        <label :for="paneId + 'showVerticalGridlines'" class="-fill -center"
          >Show vertical grid lines</label
        >
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
          <div class="mr8"></div>
        </label>
        <label :for="paneId + 'showHorizontalGridlines'" class="-fill -center"
          >Show horizontal grid lines</label
        >
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
    <div class="form-group mb8">
      <div class="form-group column">
        <label
          class="checkbox-control"
          @change="
            $store.commit(paneId + '/SET_WATERMARK', {
              value: $event.target.checked
            })
          "
        >
          <input
            type="checkbox"
            class="form-control"
            :checked="showWatermark"
          />
          <div class="mr8"></div>
        </label>
        <label for="" class="-fill -center">Watermark</label>
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
    </div>
    <hr />
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
          <div class="mr8"></div>
        </label>
        <label for="" class="-fill -center">Fill gaps with empty bars</label>
      </div>
    </div>
    <div class="form-group mb8">
      <div class="form-group column">
        <label
          class="checkbox-control"
          @change="$store.commit(paneId + '/TOGGLE_FORCE_NORMALIZE_PRICE')"
        >
          <input
            type="checkbox"
            class="form-control"
            :checked="forceNormalizePrice"
          />
          <div class="mr8"></div>
        </label>
        <label for="" class="-fill -center"
          >Always normalize mean
          <i
            class="icon-info"
            v-tippy
            title="When enabled, the chart will always copy intial realtime price of a market to the start of the chart to garantee global average consistency (warning: leads to incorrect past price)."
          ></i>
        </label>
      </div>
    </div>
    <hr />

    <toggable-group
      :value="alerts"
      label="Alerts"
      @change="toggleAlerts($event)"
    >
      <div class="column">
        <div class="form-group">
          <label>Line style</label>
          <dropdown-button
            class="-outline form-control -arrow flex-grow-1 w-100"
            v-model="alertsLineStyle"
            :options="{
              0: 'Solid',
              1: 'Dotted',
              2: 'Dashed',
              3: 'LargeDashed',
              4: 'SparseDotted'
            }"
            placeholder="lineStyle"
            @input="$store.commit('settings/SET_ALERTS_LINESTYLE', $event)"
            title="Line style (ex: dashed)"
            v-tippy
          ></dropdown-button>
        </div>
        <div class="form-group">
          <label>Line width</label>
          <editable
            :value="alertsLineWidth"
            @input="$store.commit('settings/SET_ALERTS_LINEWIDTH', $event)"
            class="form-control -center w-100"
            title="Line width (ex: 2)"
            v-tippy
          ></editable>
        </div>
        <div class="form-group">
          <label>Color</label>
          <color-picker-control
            :value="alertsColor"
            label="Alert color"
            @input="$store.commit('settings/SET_ALERTS_COLOR', $event)"
          ></color-picker-control>
        </div>
      </div>

      <div class="form-group mb16 mt16">
        <label><i class="icon-click mr8"></i> Control</label>
        <label
          class="checkbox-control -click -small d-flex -wrap"
          @change="$store.commit('settings/TOGGLE_ALERTS_CLICK')"
          title="1 click only (instead of shift + click)"
          v-tippy="{ placement: 'left', distance: 24, boundary: 'window' }"
        >
          <input type="checkbox" class="form-control" :checked="alertsClick" />
          <div class="mr0"></div>
          <span v-if="alertsClick" class="mr4"><code>CLICK</code></span>
          <span v-else class="mr4"
            ><code>SHIFT</code> + <code>CLICK</code></span
          >
          on the chart to
          <span
            class="ml4 mr4"
            title="- sent within 0-15s<br />- active 24h for alts<br />- active 7d for btc/eth<br>- use at own risk"
            v-tippy="{ theme: 'left' }"
          >
            create an alert
          </span>
          at that price.
        </label>
      </div>

      <div class="form-group mb16">
        <label for="audio-assistant-source"
          ><i class="icon-music-note mr8"></i> Alert sound</label
        >
        <button
          class="btn -file -blue -large -cases"
          @change="handleAlertSoundFile"
        >
          <i class="icon-upload mr8"></i> {{ alertSound || 'Browse' }}
          <i
            v-if="alertSound"
            class="icon-cross mr8 btn__suffix"
            @click.stop.prevent="removeAlertSound"
          ></i>
          <input type="file" accept="audio/*" />
        </button>
      </div>

      <template #off>
        <label
          v-if="notificationsPermissionState === 'denied'"
          class="text-danger help-text mt0 mb0"
          v-tippy
          :title="
            `${helps['notifications-disabled']} ${helps['notifications-grant']}`
          "
        >
          <i class="icon-warning mr4"></i> Notifications are blocked.
        </label>
        <p
          v-else-if="notificationsPermissionState !== 'granted'"
          class="text-info help-text mt0 mb0"
          v-tippy
          :title="
            `${helps['notifications-disabled']} ${helps['notifications-grant']}`
          "
        >
          <i class="icon-info mr4"></i> Awaiting browser persmission.
        </p>
      </template>
    </toggable-group>
  </div>
</template>

<script lang="ts">
import { getHms } from '@/utils/helpers'
import { Component, Vue } from 'vue-property-decorator'
import audioService from '@/services/audioService'
import importService from '@/services/importService'
import Slider from '@/components/framework/picker/Slider.vue'
import ToggableGroup from '@/components/framework/ToggableGroup.vue'
import DropdownButton from '@/components/framework/DropdownButton.vue'
import ColorPickerControl from '../framework/picker/ColorPickerControl.vue'

let notificationsPermission

@Component({
  components: { Slider, ToggableGroup, DropdownButton, ColorPickerControl },
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
  helps = {
    'notifications-disabled': 'Push notification are disabled.',
    'notifications-grant': 'Enable notifications for this site in your browser.'
  }
  notificationsPermissionState = 'granted'

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

  get alertSound() {
    return this.$store.state.settings.alertSound
  }

  get alerts() {
    return this.$store.state.settings.alerts
  }

  get alertsColor() {
    return this.$store.state.settings.alertsColor
  }

  get alertsLineStyle() {
    return this.$store.state.settings.alertsLineStyle
  }

  get alertsLineWidth() {
    return this.$store.state.settings.alertsLineWidth
  }

  get alertsClick() {
    return this.$store.state.settings.alertsClick
  }

  get refreshRateHms() {
    return getHms(this.refreshRate)
  }

  created() {
    this.checkNotificationsPermission()
  }

  checkNotificationsPermission() {
    navigator.permissions
      .query({ name: 'notifications' })
      .then(result => {
        if (!notificationsPermission) {
          result.onchange = (event: any) => {
            this.setNotificationsPermission(event.target.state)
          }

          notificationsPermission = result
        }

        this.setNotificationsPermission(result.state)
      })
      .catch(err => {
        console.error(err.message)
      })
  }

  setNotificationsPermission(state) {
    this.notificationsPermissionState = state

    if (this.notificationsPermissionState !== 'granted' && this.alerts) {
      this.$store.commit('settings/TOGGLE_ALERTS', false)
    }
  }

  async toggleAlerts(event) {
    let checked = event.target.checked

    if (checked) {
      this.notificationsPermissionState = await Notification.requestPermission()
    }

    if (this.notificationsPermissionState === 'denied' && checked) {
      checked = false

      this.$store.dispatch('app/showNotice', {
        id: 'alert-notifications',
        type: 'error',
        icon: 'icon-warning -large pt0',
        timeout: 100000,
        html: true,
        title: `<div class="ml8"><strong>This might not work as expected.</strong><br>${this.helps['notifications-grant']}</div>`
      })
    } else {
      this.$store.dispatch('app/showNotice', {
        id: 'alert-notifications',
        type: 'info',
        title: checked ? `Alerts are enabled` : 'Alerts are disabled'
      })
    }

    event.target.checked = checked
    this.$store.commit('settings/TOGGLE_ALERTS', checked)
  }

  async handleAlertSoundFile(event) {
    const file = event.target.files[0]

    if (!file) {
      return
    }

    try {
      await importService.importSound(file)

      this.$store.commit('settings/SET_ALERT_SOUND', file.name)

      audioService.playOnce(file.name)
    } catch (error) {
      this.$store.dispatch('app/showNotice', {
        title: error.message,
        type: 'error'
      })
      return
    }
  }

  removeAlertSound() {
    if (!this.alertSound) {
      return
    }

    this.$store.commit('settings/SET_ALERT_SOUND', null)
  }
}
</script>
