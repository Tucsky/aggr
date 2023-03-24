<template>
  <dropdown v-model="value">
    <button
      @click="$emit('cmd', ['toggleTimeframeDropdown', $event])"
      class="dropdown-item -arrow"
    >
      {{ timeframeForHuman }}
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
    <button @click="$emit('cmd', ['restart'])" class="dropdown-item">
      <i class="icon-refresh"></i>
      <span>Restart</span>
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
        </button>
      </template>
      <button
        v-if="showAlerts"
        type="button"
        class="dropdown-item"
        @click.stop="toggleAlertsDropdown"
      >
        <i class="icon-more"></i>
        <span>Alerts</span>
      </button>
      <dropdown v-model="alertsDropdownTrigger" @click.stop>
        <alerts-list :query="market" with-options />
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
    alertsDropdownTrigger: null
  }),
  computed: {
    timeframeForHuman() {
      if (!this.value) {
        return null
      }

      return getTimeframeForHuman(this.timeframe)
    },
    showAlerts() {
      return this.$store.state.settings.alerts
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
        this.alertsDropdownTrigger = event.currentTarget
      }
    },
    async createAlert() {
      if (!this.$store.state.settings.alerts) {
        if (
          !(await dialogService.confirm({
            title: 'Alerts are disabled',
            message: 'Enable alerts ?',
            ok: 'Yes please'
          }))
        ) {
          return
        }

        this.$store.commit('settings/TOGGLE_ALERTS', true)
      }

      const alert: MarketAlert = {
        price: this.price,
        market: this.market,
        timestamp: this.timestamp,
        active: false
      }

      alertService.createAlert(alert, this.getPrice())
    },
    removeAlert() {
      alertService.removeAlert(this.alert)
    },
    async editAlert() {
      const message = await dialogService.openAsPromise(
        (
          await import('@/components/alerts/CreateAlertDialog.vue')
        ).default,
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
