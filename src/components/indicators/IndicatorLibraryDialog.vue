<template>
  <Dialog
    @clickOutside="close"
    class="indicator-library-dialog"
    size="medium"
    contrasted
  >
    <template #header>
      <div class="d-flex">
        <div class="dialog__title indicator-dialog__title -center">
          <div>Indicators</div>
        </div>
      </div>
    </template>
    <template #subheader>
      <tabs v-model="tab">
        <tab name="installed"> Installed </tab>
        <tab v-if="communityTabEnabled" name="community"> Community </tab>
      </tabs>
    </template>

    <TransitionHeight
      stepper
      class="indicator-library-dialog__stepper"
      :name="`slide-fade-${isBack ? 'left' : 'right'}`"
      :duration="500"
    >
      <InstalledIndicators
        v-if="tab === 'installed'"
        key="installed"
        ref="installed"
        :pane-id="paneId"
        @close="close"
        @add="addToChart"
        @selected="selection = $event"
      />
      <CommunityIndicators
        v-else-if="tab === 'community'"
        key="community"
        :pane-id="paneId"
        @close="close"
        @selected="selection = $event"
      />
    </TransitionHeight>

    <IndicatorDetail
      v-if="selection"
      :indicator="selection"
      :pane-id="paneId"
      @close="selection = null"
      @add="addToChart($event, true)"
      @reload="reloadSelection"
    />

    <template v-slot:footer>
      <button class="btn -theme -large -cases -file">
        <input
          type="file"
          class="input-file"
          @change="handleFile"
          ref="importButton"
        />
        Import <i class="icon-upload ml8"></i>
      </button>
      <button
        class="mlauto btn -green -large -cases"
        @click="promptCreateIndicator"
      >
        Create
        <i class="icon-plus ml8"></i>
      </button>
    </template>
  </Dialog>
</template>

<script>
import { ago } from '@/utils/helpers'
import Dialog from '@/components/framework/Dialog.vue'
import InstalledIndicators from '@/components/indicators/InstalledIndicators.vue'
import CommunityIndicators from '@/components/indicators/CommunityIndicators.vue'
import IndicatorDetail from '@/components/indicators/IndicatorDetail.vue'
import DialogMixin from '@/mixins/dialogMixin'
import dialogService from '@/services/dialogService'
import importService from '@/services/importService'
import Tabs from '@/components/framework/Tabs.vue'
import Tab from '@/components/framework/Tab.vue'
import TransitionHeight from '@/components/framework/TransitionHeight.vue'
import workspacesService from '@/services/workspacesService'

export default {
  mixins: [DialogMixin],
  components: {
    InstalledIndicators,
    CommunityIndicators,
    IndicatorDetail,
    TransitionHeight,
    Dialog,
    Tabs,
    Tab
  },
  data: () => ({
    name: '',
    tab: 'installed',
    selection: null,
    communityTabEnabled: !!import.meta.env.VITE_APP_LIB_URL,
    ago
  }),
  computed: {
    isBack() {
      if (this.tab === 'installed') {
        return true
      }

      return false
    },
    paneId() {
      if (
        this.$store.state.app.focusedPaneId &&
        this.$store.state.panes.panes[this.$store.state.app.focusedPaneId]
          .type === 'chart'
      ) {
        return this.$store.state.app.focusedPaneId
      } else {
        for (const id in this.$store.state.panes.panes) {
          if (this.$store.state.panes.panes[id].type === 'chart') {
            return id
          }
        }
      }

      return null
    }
  },
  methods: {
    async handleFile(event) {
      try {
        const json = await importService.getJSON(event.target.files[0])

        await importService.importIndicator(json, {
          save: true,
          openLibrary: true
        })
      } catch (error) {
        this.$store.dispatch('app/showNotice', {
          title: error.message,
          type: 'error'
        })
      }
    },
    showNoPaneId() {
      dialogService.confirm({
        title: 'No chart',
        message: `Add a chart to continue`,
        cancel: null,
        ok: 'Ok'
      })
    },
    async addToChart(indicator, close = false) {
      this.$store.dispatch(
        this.paneId + '/addIndicator',
        await workspacesService.incrementIndicatorUsage(indicator.id)
      )

      if (close) {
        this.close()
      }
    },
    async createIndicator(indicator = {}) {
      if (!this.paneId) {
        return this.showNoPaneId()
      }

      if (!indicator.name) {
        indicator.name = 'Untitled'
      }

      if (!indicator.libraryId) {
        indicator.libraryId = null
      }

      dialogService.openIndicator(
        this.paneId,
        await this.$store.dispatch(this.paneId + '/addIndicator', indicator)
      )

      this.close()
    },
    async promptCreateIndicator() {
      if (!this.paneId) {
        return this.showNoPaneId()
      }

      const payload = await dialogService.openAsPromise(
        (await import('@/components/chart/CreateIndicatorDialog.vue')).default,
        {
          paneId: this.paneId
        }
      )

      if (payload) {
        this.createIndicator(payload)
      }
    },
    setSelection(indicator) {
      this.selection = indicator

      if (this.$refs.installed) {
        this.$refs.installed.getIndicators()
      }
    },
    async reloadSelection(id) {
      if (!this.selection) {
        return
      }

      this.setSelection(
        await workspacesService.getIndicator(id || this.selection.id)
      )
    }
  }
}
</script>
<style lang="scss" scoped>
.indicator-library-dialog {
  ::v-deep {
    .dialog__content {
      width: 500px;
    }
    .dialog__body {
      height: 75vh;
    }
  }

  &__loader {
    .loader {
      margin-top: 2rem;
    }
  }
}
</style>
