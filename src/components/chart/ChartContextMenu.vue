<template>
  <Dropdown
    :model-value="modelValue"
    @update:modelValue="emit('update:modelValue', $event)"
  >
    <button
      @click="dispatch('toggleTimeframeDropdown', $event)"
      class="dropdown-item -arrow"
    >
      {{ timeframeForHuman }}
    </button>
    <button @click="showSearch" class="dropdown-item">
      <i class="icon-search"></i>
      <span>Search</span>
    </button>
    <button @click="dispatch('takeScreenshot', $event)" class="dropdown-item">
      <i class="icon-add-photo"></i>
      <span>Snapshot</span>
    </button>
    <button @click="dispatch('flipChart')" class="dropdown-item">
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
      <Dropdown v-model="alertsDropdownTrigger" on-sides @click.stop>
        <alerts-list :query="market" with-options />
      </Dropdown>
      <Dropdown v-model="alertsDropdownSettingsTrigger" on-sides @click.stop>
        <button type="button" class="dropdown-item" @click.stop>
          <label class="checkbox-control -small">
            <input
              type="checkbox"
              class="form-control"
              :checked="showAlerts"
              @change="toggleShowAlerts"
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
              @change="toggleShowAlertsLabel"
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
      </Dropdown>
    </template>
  </Dropdown>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue'
import AlertsList from '@/components/alerts/AlertsList.vue'
import { getTimeframeForHuman } from '@/utils/helpers'
import { formatMarketPrice } from '@/services/productsService'
import dialogService from '@/services/oldDialogService'
import alertService, { MarketAlert } from '@/services/alertService'
import { ChartPaneState } from '@/store/panesSettings/chart'
import store from '@/store' // Rule #11
import Dropdown from '../framework/Dropdown.vue'

// Props
const props = defineProps({
  modelValue: {
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
  },
  onCmd: {
    type: Function,
    default: null
  }
})

// Emits
const emit = defineEmits(['update:modelValue'])

// Refs
const alertsDropdownTrigger = ref(null)
const alertsDropdownSettingsTrigger = ref(null)

// Computed properties
const timeframeForHuman = computed(() =>
  props.modelValue ? getTimeframeForHuman(props.timeframe) : null
)

const showAlerts = computed(
  () => (store.state[props.paneId] as ChartPaneState).showAlerts
)
const showAlertsLabel = computed(
  () => (store.state[props.paneId] as ChartPaneState).showAlertsLabel
)

const priceFormatted = computed(
  () => +formatMarketPrice(props.price, props.market)
)

// Methods
const toggleAlertsDropdown = (event: Event) => {
  alertsDropdownTrigger.value = alertsDropdownTrigger.value
    ? null
    : event.target
}

const toggleAlertsSettingsDropdown = async (event: Event) => {
  if (!(await ensureAlerts())) return

  alertsDropdownSettingsTrigger.value = alertsDropdownSettingsTrigger.value
    ? null
    : (event.target as HTMLElement)
}

const ensureAlerts = async () => {
  if (!store.state.settings.alerts) {
    const confirmed = await dialogService.confirm({
      title: 'Alerts are disabled',
      message: 'Enable alerts?',
      ok: 'Yes please'
    })

    if (!confirmed) return false

    store.commit('settings/TOGGLE_ALERTS', true)
  }

  return true
}

const createAlert = async () => {
  if (!(await ensureAlerts())) return

  const alert: MarketAlert = {
    price: props.price,
    market: props.market,
    timestamp: props.timestamp,
    active: false
  }

  alertService.createAlert(alert, props.getPrice?.(), true)
}

const removeAlert = () => {
  alertService.removeAlert(props.alert as MarketAlert)
}

const editAlert = async () => {
  const message = await dialogService.openAsPromise(
    (await import('@/components/alerts/CreateAlertDialog.vue')).default,
    {
      price: +formatMarketPrice(props.alert.price, props.alert.market),
      input: props.alert.message,
      edit: true
    }
  )

  if (typeof message === 'string' && message !== props.alert.message) {
    const newAlert = {
      ...(props.alert as MarketAlert),
      price: props.alert.price,
      message
    }
    await alertService.moveAlert(
      props.alert.market,
      props.alert.price,
      newAlert,
      props.getPrice()
    )
  }
}

const showSearch = () => {
  store.dispatch('app/showSearch')
}

const toggleShowAlerts = () => {
  store.commit(`${props.paneId}/TOGGLE_ALERTS`)
}

const toggleShowAlertsLabel = () => {
  store.commit(`${props.paneId}/TOGGLE_ALERTS_LABEL`)
}

const dispatch = (...args) => {
  if (props.onCmd && typeof props.onCmd === 'function') {
    props.onCmd(args)
  }
}
</script>
