<template>
  <transition name="dialog" :duration="300" @after-leave="close">
    <Dialog
      v-if="opened"
      class="indicator-library-dialog"
      size="medium"
      contrasted
      @close="hide"
    >
      <template #header>
        <div class="d-flex">
          <div class="dialog__title indicator-dialog__title -center">
            <div>Indicators</div>
          </div>
        </div>
      </template>
      <template #subheader>
        <Tabs v-model="tab">
          <Tab name="installed"> Installed </Tab>
          <Tab v-if="communityTabEnabled" name="community"> Community </Tab>
        </Tabs>
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
  </transition>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDialog } from '@/composables/useDialog'
import Dialog from '@/components/framework/Dialog.vue'
import InstalledIndicators from '@/components/library/indicators/InstalledIndicators.vue'
import CommunityIndicators from '@/components/library/indicators/CommunityIndicators.vue'
import IndicatorDetail from '@/components/library/indicators/IndicatorDetail.vue'
import TransitionHeight from '@/components/framework/TransitionHeight.vue'
import Tabs from '@/components/framework/Tabs.vue'
import Tab from '@/components/framework/Tab.vue'
import dialogService from '@/services/oldDialogService'
import importService from '@/services/importService'
import workspacesService from '@/services/workspacesService'
import store from '@/store'
import { AppState } from '@/store/app'

// Initialize dialog logic
const { opened, close, hide } = useDialog()
defineExpose({ close })

// Reactive state
const tab = ref('installed')
const selection = ref(null)
const installedRef = ref<InstanceType<typeof InstalledIndicators> | null>(null)
const communityTabEnabled = ref(!!import.meta.env.VITE_APP_LIB_URL)

// Computed properties
const isBack = computed(() => tab.value === 'installed')

const paneId = computed(() => {
  const focusedPaneId = (store.state.app as AppState).focusedPaneId
  if (
    focusedPaneId &&
    store.state.panes.panes[focusedPaneId].type === 'chart'
  ) {
    return focusedPaneId
  } else {
    for (const id in store.state.panes.panes) {
      if (store.state.panes.panes[id].type === 'chart') {
        return id
      }
    }
  }
  return null;
})

// Methods
const handleFile = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files ? target.files[0] : null
  if (!file) return

  try {
    const json = await importService.getJSON(file)
    await importService.importIndicator(json, {
      save: true,
      openLibrary: true
    })
  } catch (error: any) {
    store.dispatch('app/showNotice', {
      title: error.message,
      type: 'error'
    })
  }
}

const showNoPaneId = () => {
  dialogService.confirm({
    title: 'No chart',
    message: `Add a chart to continue`,
    cancel: null,
    ok: 'Ok'
  })
}

const addToChart = async (indicator: any, closeDialog = false) => {
  await store.dispatch(
    `${paneId.value}/addIndicator`,
    await workspacesService.incrementIndicatorUsage(indicator.id)
  )

  if (closeDialog) {
    close()
  }
}

const createIndicator = async (indicator: any = {}) => {
  if (!paneId.value) {
    return showNoPaneId()
  }

  indicator.name = indicator.name || 'Untitled'
  indicator.libraryId = indicator.libraryId || null

  dialogService.openIndicator(
    paneId.value,
    await store.dispatch(`${paneId.value}/addIndicator`, indicator)
  )

  close()
}

const promptCreateIndicator = async () => {
  if (!paneId.value) {
    return showNoPaneId()
  }

  const payload = await dialogService.openAsPromise(
    (await import('@/components/chart/CreateIndicatorDialog.vue')).default,
    {
      paneId: paneId.value
    }
  )

  if (payload) {
    createIndicator(payload)
  }
}

const setSelection = (indicator: any) => {
  selection.value = indicator

  if (installedRef.value) {
    installedRef.value.getIndicators()
  }
}

const reloadSelection = async (id?: string) => {
  if (!selection.value) {
    return
  }

  setSelection(await workspacesService.getIndicator(id || selection.value.id))
}
</script>

<style lang="scss" scoped>
.indicator-library-dialog {
  :deep() {
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
