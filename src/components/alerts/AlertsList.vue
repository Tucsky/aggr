<template>
  <div
    class="alerts-list hide-scrollbar"
    :class="[withOptions && 'alerts-list--with-options']"
  >
    <div v-if="withOptions" class="alert-list__header dropdown-item">
      <label
        class="checkbox-control -small w-100"
        @click.stop
        @mousedown.prevent
      >
        <input
          type="checkbox"
          class="form-control"
          :checked="alertsClick"
          @change="$store.commit('settings/TOGGLE_ALERTS_CLICK')"
        />
        <span>1 click</span>
        <i
          class="icon-info text-muted ml8"
          title="Place alerts faster ⚡️"
          v-tippy
        />
        <div class="mlauto"></div>
      </label>
    </div>
    <div
      class="alerts-list__empty px8 text-danger"
      v-if="!filteredIndexes.length && !isLoading"
    >
      <i class="icon-cross -small"></i> no alerts
      <template v-if="query"> matching "{{ query }}" </template>
    </div>
    <ToggableSection
      v-for="(index, cursor) of filteredIndexes"
      :key="index.market"
      :model="sections"
      :id="persistSections && `alerts-${index.market}`"
      class="alerts-list__section"
      auto-close
      small
    >
      <template v-slot:title>
        <div
          class="toggable-section__title"
          :data-market="index.market"
          v-draggable-market
        >
          {{ index.market }}
          <span v-if="index.alerts.length > 1" class="badge -invert ml8">{{
            index.alerts.length
          }}</span>
        </div>
      </template>
      <template v-slot:control>
        <Btn
          ref="clearBtns"
          class="-text mr16"
          @click="clearAlerts(index, $refs.clearBtns[cursor])"
          ><i class="icon-trash"></i
        ></Btn>
      </template>
      <table v-if="index.alerts.length" class="table alerts-list__table">
        <tbody>
          <tr
            v-for="alert of index.alerts"
            :key="alert.id"
            class="alerts-list-item"
            :class="[alert.triggered && 'alerts-list-item--triggered']"
          >
            <td class="table-input alerts-list-item__price">
              <span
                v-if="alert.message"
                v-tippy="{ followCursor: true, distance: 24 }"
                :title="alert.message"
              >
                {{ formatPrice(alert.price, alert.market) }}
              </span>
              <span v-else>
                {{ formatPrice(alert.price, alert.market) }}
              </span>
            </td>
            <td
              class="alerts-list-item__status table-input text-nowrap text-right"
              :class="[alert.triggered && 'text-success']"
            >
              <template v-if="alert.triggered">
                <i class="icon-check" />&nbsp;Triggered
              </template>
              <template v-else-if="alert.active">Active</template>
              <template v-else>Inactive</template>
            </td>
            <td
              class="table-action -hover"
              @click.stop="removeAlert(alert)"
              v-if="alert.triggered"
            >
              <button class="btn -text -small">
                <i class="icon-cross"></i>
              </button>
            </td>
            <td
              class="table-action -hover"
              @click.stop="togglePresetDropdown($event, alert)"
              v-else
            >
              <button class="btn -text -small">
                <i class="icon-more"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="text-danger pl8">No alerts</p>
    </ToggableSection>
    <dropdown v-model="alertDropdownTrigger">
      <template v-if="dropdownAlert && !dropdownAlert.triggered">
        <Btn
          type="button"
          class="dropdown-item -cases"
          @click.stop="
            checkStatus(dropdownAlert).then(() => (alertDropdownTrigger = null))
          "
          :loading="isLoading"
        >
          <i class="icon-search"></i>
          <span>Check status</span>
        </Btn>
        <div class="dropdown-divider"></div>
      </template>
      <button
        type="button"
        class="dropdown-item"
        @click="removeAlert(dropdownAlert)"
      >
        <i class="icon-cross"></i>
        <span>Remove</span>
      </button>
    </dropdown>
  </div>
</template>
<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import ToggableSection from '@/components/framework/ToggableSection.vue'

import workspacesService from '@/services/workspacesService'
import Btn from '@/components/framework/Btn.vue'
import alertService, {
  AlertEvent,
  AlertEventType,
  MarketAlert,
  MarketAlerts
} from '@/services/alertService'
import dialogService from '@/services/dialogService'
import aggregatorService from '@/services/aggregatorService'
import { sleep } from '@/utils/helpers'
import { formatMarketPrice } from '@/services/productsService'

@Component({
  components: { ToggableSection, Btn },
  name: 'Alerts',
  props: {
    query: {
      type: String,
      default: ''
    },
    persistSections: {
      type: Boolean,
      default: false
    },
    withOptions: {
      type: Boolean,
      default: false
    }
  }
})
export default class AlertsList extends Vue {
  dropdownAlert: MarketAlert = null
  alertDropdownTrigger: HTMLElement = null
  indexes: MarketAlerts[] = []
  sections = []
  isLoading = false
  market: string
  query: string

  get queryFilter() {
    return new RegExp(this.query, 'i')
  }

  get alertsClick() {
    return this.$store.state.settings.alertsClick
  }

  get filteredIndexes() {
    if (!this.query) {
      return this.indexes
    }

    return this.indexes.filter(a => this.queryFilter.test(a.market))
  }

  async created() {
    await this.getAlerts()

    if (this.filteredIndexes.length === 1) {
      const singleSectionId = `alerts-${this.filteredIndexes[0].market}`

      if (this.$store.state.settings.sections.indexOf(singleSectionId) === -1) {
        this.$store.commit('settings/TOGGLE_SECTION', singleSectionId)
      }
    }

    aggregatorService.on('alert', this.onAlert)
  }

  beforeDestroy() {
    aggregatorService.off('alert', this.onAlert)
  }

  async getAlerts() {
    this.isLoading = true
    const groups = await workspacesService.getAllAlerts()

    for (let i = 0; i < groups.length; i++) {
      this.$set(this.indexes, i, groups[i])
    }

    await sleep(100)
    this.isLoading = false
  }

  formatPrice(price, market) {
    return formatMarketPrice(price, market)
  }

  togglePresetDropdown(event, alert) {
    if (this.alertDropdownTrigger) {
      this.alertDropdownTrigger = null
    } else {
      this.alertDropdownTrigger = event.currentTarget
      this.dropdownAlert = alert
    }
  }

  async removeAlert(alert: MarketAlert) {
    this.isLoading = true
    await alertService.removeAlert(alert)
    this.isLoading = false
  }

  async createAlert(alert: MarketAlert) {
    this.isLoading = true
    await alertService.createAlert(alert)
    this.isLoading = false
  }

  async checkStatus(alert: MarketAlert) {
    this.isLoading = true
    const status = await alertService.toggleAlert(
      alert.market,
      alert.price,
      undefined,
      undefined,
      true
    )
    this.isLoading = false

    if (status.alert) {
      dialogService.confirm({
        message: `Alert ${alert.market} @<code>${alert.price}</code> is still pending`,
        html: true,
        ok: 'Ok',
        cancel: null
      })
    } else {
      const action = await dialogService.confirm({
        title: 'Not found',
        message: `Alert already triggered or expired`,
        html: true,
        ok: 'Recreate',
        actions: [
          {
            label: 'Remove',
            callback: () => 2
          }
        ]
      })

      if (action) {
        if (action === 2) {
          this.removeAlert(alert)
        } else {
          this.createAlert(alert)
        }
      } else {
        await alertService.deactivateAlert(alert)
      }
    }
  }

  onAlert({ price, market, type, newPrice, message }: AlertEvent) {
    let group = this.indexes.find(index => index.market === market)

    if (!group) {
      if (type === AlertEventType.CREATED) {
        this.$set(this.indexes, this.indexes.length, {
          market: market,
          alerts: []
        })
        group = this.indexes[this.indexes.length - 1]
        if (this.sections.indexOf(`alerts-${this.sections}`) === -1) {
          this.sections.push(`alerts-${this.sections}`)
        }
      } else {
        return
      }
    }

    const index = group.alerts.findIndex(
      existingAlert => existingAlert.price === price
    )

    if (index !== -1) {
      if (type === AlertEventType.DELETED) {
        group.alerts.splice(index, 1)
        if (!group.alerts.length) {
          this.indexes.splice(this.indexes.indexOf(group), 1)
        }
      } else if (type === AlertEventType.UPDATED) {
        this.$set(group.alerts[index], 'price', newPrice)
      } else if (type === AlertEventType.TRIGGERED) {
        this.$set(group.alerts[index], 'triggered', true)
      } else if (type === AlertEventType.ACTIVATED) {
        this.$set(group.alerts[index], 'active', true)

        if (typeof message !== 'undefined') {
          this.$set(group.alerts[index], 'message', message)
        }
      } else if (type === AlertEventType.DEACTIVATED) {
        this.$set(group.alerts[index], 'active', false)
      }
    } else if (type === AlertEventType.CREATED) {
      this.$set(group.alerts, group.alerts.length, {
        price,
        market
      })
    }
  }

  async clearAlerts(group, button) {
    if (
      !(await dialogService.confirm({
        message: `Remove all ${group.market} alerts`,
        ok: `Yes (${group.alerts.length})`
      }))
    ) {
      return
    }

    if (button) {
      button.loading = true
    }

    const alerts = [...group.alerts]
    for (const alert of alerts) {
      await alertService.removeAlert(alert)
    }

    await workspacesService.saveAlerts({
      market: group.market,
      alerts: []
    })

    if (button) {
      button.loading = false
    }
  }
}
</script>

<style lang="scss" scoped>
.alerts-list {
  min-width: 150px;
  overflow: auto;
  flex-grow: 1;
  padding-top: 1.25rem;

  &--with-options {
    padding: 0;
  }

  &__section:hover {
    background-color: var(--theme-background-100);
  }

  &__market {
    padding: 1rem;
  }

  &__table {
    table-layout: fixed;
    width: auto;
  }

  &-item {
    $item: &;
    position: relative;

    &--triggered {
      opacity: 0.5;
    }

    &__price {
      display: block;
      font-family: $font-monospace;
      white-space: nowrap;

      &:before {
        content: $icon-dollar;
        font-family: 'icon';
        opacity: 0.5;
        font-size: 0.75em;
        margin-right: 0.25rem;
      }

      > span {
        display: inline-block;
      }
    }

    &__status {
      font-weight: 600;
      line-height: 1;
      vertical-align: top;

      #{$item}--triggered & {
        color: var(--theme-buy-100);
        letter-spacing: 0.025em;
        font-weight: 400;
      }
    }
  }
}
</style>
