<template>
  <dropdown v-model="value">
    <button
      @click="$emit('cmd', ['toggleTimeframeDropdown', $event])"
      class="dropdown-item -arrow"
    >
      {{ timeframeForHuman }}
    </button>
    <button @click="$store.dispatch('app/showSearch')" class="dropdown-item">
      <i class="icon-search"></i>
      <span>Search</span>
    </button>
    <button
      @click="$emit('cmd', ['takeScreenshot', $event])"
      class="dropdown-item"
    >
      <i class="icon-add-photo"></i>
      <span>Snapshot</span>
    </button>
    <button @click="$emit('cmd', ['flipChart'])" class="dropdown-item">
      <i class="icon-flip"></i>
      <span>Flip</span>
    </button>
    <template v-if="price">
      <template v-if="alert">
        <div class="dropdown-divider" :data-label="`@${priceFormatted}`"></div>
        <button @click="removeAlert" class="dropdown-item">
          <i class="icon-cross"></i>
          <span>Remove</span>
        </button>
        <button @click="editAlert" class="dropdown-item">
          <i class="icon-edit"></i>
          <span>Edit</span>
        </button>
      </template>
      <template v-else>
        <div class="dropdown-divider" data-label="alerts"></div>
        <button @click="createAlert" class="dropdown-item">
          <i class="icon-plus"></i>
          <span>{{ priceFormatted }}</span>
          <i class="icon-cog" @click.stop="toggleAlertsSettingsDropdown"></i>
        </button>
      </template>
      <dropdown v-model="alertsDropdownTrigger" @click.stop>
        <alerts-list :query="market" with-options />
      </dropdown>
      <dropdown v-model="alertsDropdownSettingsTrigger" @click.stop>
        <button type="button" class="dropdown-item" @click.stop>
          <label class="checkbox-control -small">
            <input
              type="checkbox"
              class="form-control"
              :checked="showAlerts"
              @change="$store.commit(`${paneId}/TOGGLE_ALERTS`)"
            />
            <div></div>
            <span>Visible</span>
          </label>
        </button>
        <button type="button" class="dropdown-item" @click.stop>
          <label class="checkbox-control -small">
            <input
              type="checkbox"
              class="form-control"
              :checked="showAlertsLabel"
              @change="$store.commit(`${paneId}/TOGGLE_ALERTS_LABEL`)"
              :disabled="!showAlerts"
            />
            <div></div>
            <span>Label</span>
          </label>
        </button>
        <button
          type="button"
          class="dropdown-item"
          @click.stop="toggleAlertsDropdown"
        >
          Manage
          <i class="icon-more mr0"></i>
        </button>
      </dropdown>
    </template>
  </dropdown>
</template>

<script lang="ts">
import AlertsList from '@/components/alerts/AlertsList.vue'
import { getTimeframeForHuman } from '@/utils/helpers'
import { formatMarketPrice } from '@/services/productsService'
import dialogService from '@/services/dialogService'
import alertService, { MarketAlert } from '@/services/alertService'
import { ChartPaneState } from '@/store/panesSettings/chart'

export default {
  name: 'ChartContextMenu',
  components: {
    AlertsList
  },
  props: {
    value: {
      type: Object,
      default: null
    },
    paneId: {
      type: String,
      required: true
    },
    timeframe: {
      type: String,
      required: true
    },
    market: {
      type: String,
      required: true
    },
    getPrice: {
      type: Function,
      default: null
    },
    price: {
      type: Number,
      default: null
    },
    timestamp: {
      type: Number,
      default: null
    },
    alert: {
      type: Object,
      default: null
    }
  },
  data: () => ({
    alertsDropdownTrigger: null,
    alertsDropdownSettingsTrigger: null
  }),
  computed: {
    timeframeForHuman() {
      if (!this.value) {
        return null
      }

      return getTimeframeForHuman(this.timeframe)
    },
    alertsEnabled() {
      return this.$store.state.settings.alerts
    },
    showAlerts() {
      return (this.$store.state[this.paneId] as ChartPaneState).showAlerts
    },
    showAlertsLabel() {
      return (this.$store.state[this.paneId] as ChartPaneState).showAlertsLabel
    },
    priceFormatted() {
      return +formatMarketPrice(this.price, this.market)
    },
    alertLabel() {
      if (!this.alert) {
        return null
      }

      if (this.alert.message) {
        return `${this.alert.message} @${formatMarketPrice(
          this.alert.price,
          this.alert.market
        )}`
      }

      return `${this.alert.market} @${formatMarketPrice(
        this.alert.price,
        this.alert.market
      )}`
    }
  },
  methods: {
    toggleAlertsDropdown(event) {
      if (this.alertsDropdownTrigger) {
        this.alertsDropdownTrigger = null
      } else {
        this.alertsDropdownTrigger = event.currentTarget.parentElement
      }
    },
    async toggleAlertsSettingsDropdown(event) {
      if (!(await this.ensureAlerts())) {
        return
      }

      if (this.alertsDropdownSettingsTrigger) {
        this.alertsDropdownSettingsTrigger = null
      } else {
        this.alertsDropdownSettingsTrigger = event.currentTarget.parentElement
      }
    },
    async ensureAlerts() {
      if (!this.$store.state.settings.alerts) {
        if (
          !(await dialogService.confirm({
            title: 'Alerts are disabled',
            message: 'Enable alerts ?',
            ok: 'Yes please'
          }))
        ) {
          return false
        }

        this.$store.commit('settings/TOGGLE_ALERTS', true)
      }

      return true
    },
    async createAlert() {
      if (!(await this.ensureAlerts())) {
        return
      }

      const alert: MarketAlert = {
        price: this.price,
        market: this.market,
        timestamp: this.timestamp,
        active: false
      }

      alertService.createAlert(alert, this.getPrice(), true)
    },
    removeAlert() {
      alertService.removeAlert(this.alert)
    },
    async editAlert() {
      const message = await dialogService.openAsPromise(
        (await import('@/components/alerts/CreateAlertDialog.vue')).default,
        {
          price: +formatMarketPrice(this.alert.price, this.alert.market),
          input: this.alert.message,
          edit: true
        }
      )

      if (typeof message === 'string' && message !== this.alert.message) {
        const newAlert = {
          ...this.alert,
          price: this.alert.price,
          message: message
        }
        await alertService.moveAlert(
          this.alert.market,
          this.alert.price,
          newAlert,
          this.getPrice()
        )
      }
    }
  }
}
</script>
