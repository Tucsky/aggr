<template>
  <div class="pane-alerts">
    <pane-header
      class="pane-alerts__header"
      :paneId="paneId"
      :settings="() => import('@/components/alerts/AlertsDialog.vue')"
      :show-search="false"
    >
      <template #title>&nbsp;</template>
      <Btn
        type="button"
        class="toolbar__label btn"
        @click="getAlerts"
        :loading="isLoading"
      >
        <i class="icon-refresh"></i>
      </Btn>
    </pane-header>
    <input
      ref="query"
      type="text"
      :placeholder="`Search... ${count} alert${count > 1 ? 's' : ''}`"
      class="form-control pane-alerts__query"
      v-model="query"
    />
    <ToggableSection
      v-for="index of filteredIndexes"
      :key="index.market"
      :model="sections"
      :id="`alerts-${index.market}`"
      :badge="index.alerts.length"
      class="pane-alerts__section"
      auto-close
      small
    >
      <template #title> {{ index.market }} </template>

      <table v-if="index.alerts.length" class="table">
        <tbody>
          <tr
            v-for="alert of index.alerts"
            :key="alert.id"
            class="pane-alerts-item"
            :class="[alert.triggered && 'pane-alerts-item--triggered']"
          >
            <td class="table-input">
              <i class="icon-currency -small -higher" />&nbsp;{{ alert.price }}
            </td>
            <td
              style="width: 100%"
              class="pane-alerts-item__status table-input text-nowrap text-right"
            >
              <span v-if="!alert.triggered" class="text-success">Active</span>
              <span v-else> <i class="icon-check" />&nbsp;Triggered </span>
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
import { Component, Mixins } from 'vue-property-decorator'
import ToggableSection from '@/components/framework/ToggableSection.vue'

import PaneMixin from '@/mixins/paneMixin'
import PaneHeader from '../panes/PaneHeader.vue'
import workspacesService from '@/services/workspacesService'
import { AlertUpdate, MarketAlert, MarketAlerts } from '@/types/types'
import Btn from '@/components/framework/Btn.vue'
import alertService from '@/services/alertService'
import dialogService from '@/services/dialogService'
import aggregatorService from '@/services/aggregatorService'
import { sleep } from '@/utils/helpers'

@Component({
  components: { PaneHeader, ToggableSection, Btn },
  name: 'Alerts'
})
export default class extends Mixins(PaneMixin) {
  dropdownAlert: MarketAlert = null
  alertDropdownTrigger: HTMLElement = null
  indexes: MarketAlerts[] = []
  sections = []
  count = 0
  isLoading = false
  query = ''

  get queryFilter() {
    return new RegExp(this.query, 'i')
  }

  get filteredIndexes() {
    if (!this.query) {
      return this.indexes
    }

    return this.indexes.filter(a => this.queryFilter.test(a.market))
  }

  created() {
    this.getAlerts()

    aggregatorService.on('alert', this.onAlert)
  }

  beforeDestroy() {
    aggregatorService.off('alert', this.onAlert)
  }

  async getAlerts() {
    this.isLoading = true
    this.indexes = await workspacesService.getAllAlerts()
    this.count = this.indexes.reduce((acc, index) => {
      return acc + index.alerts.length
    }, 0)
    await sleep(100)
    this.isLoading = false
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
    const alerts = this.indexes.find(
      index => index.market === alert.market
    ).alerts

    this.isLoading = true
    await alertService.removeAlert(alert, alerts)
    this.isLoading = false
  }

  async createAlert(alert: MarketAlert) {
    const alerts = this.indexes.find(
      index => index.market === alert.market
    ).alerts

    this.isLoading = true
    await alertService.createAlert(alert, alerts)
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
        message: `Server forgot that alert or it expired`,
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
      }
    }
  }

  onAlert({ price, market, add, newPrice, remove }: AlertUpdate) {
    let group = this.indexes.find(index => index.market === market)

    if (!group) {
      if (add) {
        this.$set(this.indexes, this.indexes.length, {
          market: market,
          alerts: []
        })
        group = this.indexes[this.indexes.length - 1]
      } else {
        return
      }
    }

    const index = group.alerts.findIndex(
      existingAlert => existingAlert.price === price
    )

    if (index !== -1) {
      if (remove) {
        group.alerts.splice(index, 1)
        if (!group.alerts.length) {
          this.indexes.splice(this.indexes.indexOf(group), 1)
        }

        this.count--
      } else if (newPrice) {
        this.$set(group.alerts[index], 'price', newPrice)
      } else {
        this.$set(group.alerts[index], 'triggered', true)
      }
    } else if (add) {
      group.alerts.push({
        price,
        market
      })

      this.count++
    }
  }
}
</script>

<style lang="scss" scoped>
.pane-alerts {
  $self: &;

  &__section:hover {
    background-color: var(--theme-background-100);
  }

  &__query {
    border: 0;
    width: 10rem;
  }

  &__header {
    background: 0;
    pointer-events: none;

    ::v-deep .toolbar__label {
      pointer-events: all;
    }
  }

  &__market {
    padding: 1rem;
  }

  &-item {
    $item: &;
    position: relative;

    &--triggered {
      opacity: 0.5;
    }

    &__status {
      font-weight: 600;

      #{$item}--triggered & {
        color: var(--theme-buy-100);
        letter-spacing: 0.025em;
        font-weight: 400;
      }
    }
  }
}
</style>
