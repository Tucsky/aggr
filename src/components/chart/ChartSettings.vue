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
        <label :for="paneId + 'showVerticalGridlines'" class="-fill -center ">Show vertical grid lines</label>
        <verte
          v-if="showVerticalGridlines"
          picker="square"
          menuPosition="left"
          class="mr8"
          model="rgb"
          :value="verticalGridlinesColor"
          @input="$event !== verticalGridlinesColor && $store.commit(paneId + '/SET_GRIDLINES', { type: 'vertical', value: $event })"
        ></verte>
      </div>
    </div>
    <div class="form-group mb8">
      <div class="form-group column">
        <label class="checkbox-control" @change="$store.commit(paneId + '/SET_GRIDLINES', { type: 'horizontal', value: $event.target.checked })">
          <input type="checkbox" class="form-control" :checked="showHorizontalGridlines" :id="paneId + 'showHorizontalGridlines'" />
          <div class="mr8"></div>
        </label>
        <label :for="paneId + 'showHorizontalGridlines'" class="-fill -center ">Show horizontal grid lines</label>
        <verte
          v-if="showHorizontalGridlines"
          picker="square"
          menuPosition="left"
          class="mr8"
          model="rgb"
          :value="horizontalGridlinesColor"
          @input="$event !== horizontalGridlinesColor && $store.commit(paneId + '/SET_GRIDLINES', { type: 'horizontal', value: $event })"
        ></verte>
      </div>
    </div>
    <div class="form-group mb8">
      <div class="form-group column">
        <label class="checkbox-control" @change="$store.commit(paneId + '/SET_WATERMARK', { value: $event.target.checked })">
          <input type="checkbox" class="form-control" :checked="showWatermark" />
          <div class="mr8"></div>
        </label>
        <label for="" class="-fill -center">Watermark</label>
        <verte
          v-if="showWatermark"
          picker="square"
          menuPosition="left"
          class="mr8"
          model="rgb"
          :value="watermarkColor"
          @input="$event !== watermarkColor && $store.commit(paneId + '/SET_WATERMARK', { value: $event })"
        ></verte>
      </div>
    </div>
    <hr />
    <div class="form-group mb8">
      <div class="form-group column">
        <label class="checkbox-control" @change="$store.commit(paneId + '/TOGGLE_FILL_GAPS_WITH_EMPTY')">
          <input type="checkbox" class="form-control" :checked="fillGapsWithEmpty" />
          <div class="mr8"></div>
        </label>
        <label for="" class="-fill -center">Fill gaps with empty bars</label>
      </div>
    </div>
    <div class="form-group mb8">
      <div class="form-group column">
        <label class="checkbox-control" @change="$store.commit(paneId + '/TOGGLE_FORCE_NORMALIZE_PRICE')">
          <input type="checkbox" class="form-control" :checked="forceNormalizePrice" />
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

    <toggable-group :value="alerts" label="Alerts" @change="toggleAlerts($event)">
      <div class="column">
        <div class="form-group">
          <label>Line style</label>
          <dropdown
            class="-left -center w-100"
            :selected="alertsLineStyle"
            :options="{ 0: 'Solid', 1: 'Dotted', 2: 'Dashed', 3: 'LargeDashed', 4: 'SparseDotted' }"
            selectionClass="-outline form-control -arrow flex-grow-1"
            placeholder="lineStyle"
            @output="$store.commit('settings/SET_ALERTS_LINESTYLE', $event)"
            title="Line style (ex: dashed)"
            v-tippy
          ></dropdown>
        </div>
        <div class="form-group">
          <label>Line width</label>
          <editable
            :content="alertsLineWidth"
            @output="$store.commit('settings/SET_ALERTS_LINEWIDTH', $event)"
            class="form-control -center w-100"
            title="Line width (ex: 2)"
            v-tippy
          ></editable>
        </div>
        <div class="form-group">
          <label>Color</label>
          <verte
            picker="square"
            menuPosition="left"
            model="rgb"
            :value="alertsColor"
            @input="$store.commit('settings/SET_ALERTS_COLOR', $event)"
          ></verte>
        </div>
      </div>

      <label
        class="checkbox-control -click -small mt16"
        @change="$store.commit('settings/TOGGLE_ALERTS_CLICK')"
        title="1 click only (instead of shift + click)"
        v-tippy="{ placement: 'left', distance: 24, boundary: 'window' }"
      >
        <input type="checkbox" class="form-control" :checked="alertsClick" />
        <div class="mr8"></div>
        <span>{{ alertsClick ? '1 click' : 'shift + click' }}</span>
      </label>

      <p class="help-text mb0">
        <span v-if="alertsClick"><code>CLICK</code></span>
        <span v-else><code>SHIFT</code> + <code>CLICK</code></span> on the chart<br />to
        <u title="sent within 0-15s<br />active 24h to 7d (may, may not)<br>use at own risk" v-tippy>create an alert</u> at that price
      </p>

      <template #off>
        <label
          v-if="notificationsPermissions === 'denied'"
          class="text-danger help-text mt0 mb0"
          v-tippy
          :title="`${helps['notifications-disabled']} ${helps['notifications-grant']}`"
        >
          <i class="icon-warning mr4"></i> Notifications are blocked.
        </label>
        <p
          v-else-if="notificationsPermissions !== 'granted'"
          class="text-info help-text mt0 mb0"
          v-tippy
          :title="`${helps['notifications-disabled']} ${helps['notifications-grant']}`"
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
import Slider from '../framework/picker/Slider.vue'
import ToggableGroup from '../framework/ToggableGroup.vue'

@Component({
  components: { Slider, ToggableGroup },
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
  notificationsPermissions: string = null
  helps = {
    'notifications-disabled': 'Push notification are disabled.',
    'notifications-grant': 'Enable notifications for this site in your browser.'
  }

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
    this.checkPermissions()
  }

  checkPermissions() {
    navigator.permissions
      .query({ name: 'notifications' })
      .then(result => {
        this.notificationsPermissions = result.state
      })
      .catch(err => {
        console.error(err.message)
      })
  }

  async toggleAlerts(event) {
    let checked = event.target.checked

    if (this.notificationsPermissions !== 'granted') {
      this.notificationsPermissions = await Notification.requestPermission()
    }

    if (this.notificationsPermissions === 'denied' && checked) {
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
}
</script>
