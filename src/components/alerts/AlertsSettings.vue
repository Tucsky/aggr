<template>
  <toggable-group
    class="alerts-settings"
    :value="alerts"
    label="Price alerts"
    @change="toggleAlerts($event)"
  >
    <p class="mt0 text-color-50">
      <i class="icon-info"></i> Triggers using the
      <span
        v-tippy
        title="for example BTCUSD alerts will use avg. price of 26 markets across 13 exchanges and not the one you have on screen"
      >
        average price
      </span>
      of a coin.
    </p>
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

    <div class="column">
      <div class="form-group mb16 mt16">
        <label><i class="icon-click mr4"></i> Control</label>
        <label
          class="checkbox-control -click d-flex -wrap -auto"
          @change="$store.commit('settings/TOGGLE_ALERTS_CLICK')"
          title="Place alerts faster ⚡️"
          v-tippy
        >
          <input type="checkbox" class="form-control" :checked="alertsClick" />
          <div v-if="alertsClick" class="mr4">
            <code>1 CLICK</code>&nbsp;⚡️
          </div>
          <div v-else class="mr4">
            <code>ALT</code> + <code>CLICK</code><br />
          </div>
        </label>
      </div>
      <div class="form-group mt16 mb16">
        <label for="audio-assistant-source"
          ><i class="icon-music-note mr4"></i> Alert sound</label
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
          <input type="file" class="input-file" accept="audio/*" />
        </button>
      </div>
    </div>

    <template #off>
      <label
        v-if="notificationsPermissionState === 'denied'"
        class="text-danger help-text mt0 mb0"
        v-tippy
        :title="`${helps['notifications-disabled']} ${helps['notifications-grant']}`"
      >
        <i class="icon-warning mr4"></i> Notifications are blocked.
      </label>
      <p
        v-else-if="notificationsPermissionState !== 'granted'"
        class="text-info help-text mt0 mb0"
        v-tippy
        :title="`${helps['notifications-disabled']} ${helps['notifications-grant']}`"
      >
        <i class="icon-info mr4"></i> Awaiting browser persmission.
      </p>
    </template>
  </toggable-group>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import DropdownButton from '@/components/framework/DropdownButton.vue'
import ToggableGroup from '@/components/framework/ToggableGroup.vue'
import ColorPickerControl from '@/components/framework/picker/ColorPickerControl.vue'

import audioService from '@/services/audioService'
import importService from '@/services/importService'

let notificationsPermission

@Component({
  components: {
    DropdownButton,
    ToggableGroup,
    ColorPickerControl
  },
  name: 'AlertsSettings'
})
export default class AlertsSettings extends Vue {
  helps = {
    'notifications-disabled': 'Push notification are disabled.',
    'notifications-grant': 'Enable notifications for this site in your browser.'
  }
  notificationsPermissionState = 'granted'

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
