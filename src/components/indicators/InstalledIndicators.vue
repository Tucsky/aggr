<template>
  <div class="installed-indicators">
    <SearchBar v-model="query" />
    <IndicatorTable
      class="table--inset"
      :indicators="indicators"
      :query="query"
      show-enabled
      show-dropdown
      @selected="$emit('selected', $event)"
      @enabled="toggleEnabled"
      @dropdown="toggleDropdown"
    />
    <dropdown v-model="dropdownTrigger">
      <button type="button" class="dropdown-item" @click="selectIndicator()">
        <i class="icon-plus"></i>
        <span>Add to chart</span>
      </button>
      <button type="button" class="dropdown-item" @click="duplicateIndicator()">
        <i class="icon-copy-paste"></i>
        <span>Duplicate</span>
      </button>
      <button type="button" class="dropdown-item" @click="downloadIndicator()">
        <i class="icon-download"></i>
        <span>Download</span>
      </button>
      <div class="dropdown-divider"></div>
      <button type="button" class="dropdown-item" @click="removeIndicator()">
        <i class="icon-trash"></i>
        <span>Remove</span>
      </button>
    </dropdown>
  </div>
</template>

<script>
import { downloadAnything } from '@/utils/helpers'
import SearchBar from '@/components/framework/SearchBar.vue'
import IndicatorTable from '@/components/indicators/IndicatorTable.vue'
import dialogService from '@/services/dialogService'
import workspacesService from '@/services/workspacesService'
import importService from '@/services/importService'

export default {
  name: 'InstalledIndicators',
  components: {
    IndicatorTable,
    SearchBar
  },
  data: () => ({
    indicators: [],
    query: '',
    selectedIndicator: null,
    dropdownTrigger: null
  }),
  async created() {
    await this.getIndicators()
  },
  methods: {
    async getIndicators() {
      const minDate = +new Date('2021-06-07T00:00:00Z')

      await this.$nextTick()

      this.indicators = (await workspacesService.getIndicators()).map(
        indicator => ({
          ...indicator,
          updatedAt: indicator.updatedAt || minDate
        })
      )
    },
    async removeIndicator(indicator = this.selectedIndicator) {
      if (
        await dialogService.confirm({
          message: `Delete indicator "${indicator.name}" ?<br><br><code class="-filled"><small>#${indicator.id}</small></code>`,
          html: true
        })
      ) {
        workspacesService.deleteIndicator(indicator.id)

        this.indicators.splice(this.indicators.indexOf(indicator), 1)
      }
    },
    async selectIndicator(indicator = this.selectedIndicator) {
      this.$emit('add', indicator)
    },
    async duplicateIndicator(indicator = this.selectedIndicator) {
      importService.importIndicator({
        type: 'indicator',
        name: 'indicator:' + indicator.name,
        data: indicator
      })
    },
    async downloadIndicator(indicator = this.selectedIndicator) {
      await downloadAnything(
        {
          type: 'indicator',
          name: 'indicator:' + indicator.name,
          data: indicator
        },
        'indicator_' + indicator.id
      )
    },
    toggleDropdown([event, indicator]) {
      if (
        event &&
        (!this.dropdownTrigger || this.selectedIndicator !== indicator)
      ) {
        this.dropdownTrigger = event.currentTarget
        this.selectedIndicator = indicator
      } else {
        this.dropdownTrigger = null
        this.selectedIndicator = null
      }
    },
    toggleEnabled(indicator) {
      indicator.enabled = !indicator.enabled

      workspacesService.saveIndicator(indicator, true)
    }
  }
}
</script>
<style lang="scss" scoped>
.installed-indicators {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
