<template>
  <transition name="dialog" :duration="300" @after-leave="close">
    <Dialog
      v-if="opened"
      class="indicator-dialog"
      :class="[navigation.resizing && 'indicator-dialog--resizing-column']"
      size="wide"
      :mask="false"
      :close-on-escape="false"
      :cover="savedPreview"
      @close="hide"
      @resize="onResize"
      contrasted
    >
      <template #cover>
        <BlobImage
          :modelValue="savedPreview"
          class="indicator-dialog__preview"
        />
      </template>

      <template #header>
        <div class="dialog__title indicator-dialog__title -center mrauto">
          <div @dblclick="renameIndicator">{{ name }}</div>
          <code
            class="indicator-dialog__id -filled"
            @click="copyIndicatorId"
            :title="libraryId"
            v-tippy
          >
            <small>{{ displayId }}</small>
          </code>
        </div>

        <button
          v-if="unsavedChanges"
          title="Rollback changes"
          v-tippy
          class="btn ml8 -text -no-grab indicator-dialog__action"
          @click="undoIndicator"
        >
          <i class="icon-eraser"></i><span class="ml8">Discard</span>
        </button>

        <button
          title="Save changes"
          v-tippy
          class="btn ml8 -no-grab indicator-dialog__action"
          :class="[!unsavedChanges && '-text', unsavedChanges && '-green']"
          @click="saveIndicator"
        >
          <i class="icon-save"></i><span class="ml8">Save</span>
        </button>
      </template>
      <template #subheader>
        <tabs :modelValue="navigation.tab" @update:modelValue="setTab">
          <tab name="script">
            Script
            <template #control>
              <Btn class="-text -small">
                <i class="icon-menu"></i>
              </Btn>
            </template>
          </tab>
          <tab name="options">Options</tab>
        </tabs>

        <IndicatorDropdown
          v-model="dropdownIndicatorTrigger"
          :indicator-id="indicatorId"
          :pane-id="paneId"
        >
          <DropdownButton
            @click.stop
            button-class="dropdown-item"
            :options="{
              revert: 'Revert changes',
              reset: 'Reset to default'
            }"
            class="-cases"
            @update:modelValue="revertChanges"
          >
            <template #selection>
              <i class="icon-eraser"></i> <span>Reset</span>
            </template>
          </DropdownButton>
        </IndicatorDropdown>

        <button
          class="btn -text -arrow indicator-dialog__settings"
          ref="dropdownToggleRef"
          @click="toggleIndicatorDropdown"
        >
          Indicator
        </button>
      </template>
      <div
        v-if="loadedEditor"
        v-show="navigation.tab === 'script'"
        class="indicator-editor"
      >
        <p v-if="error" class="form-feedback ml16">
          <i class="icon-warning mr4"></i> {{ error }}
        </p>
        <editor
          ref="editorRef"
          :modelValue="code"
          :editor-options="navigation.editorOptions"
          @blur="updateScript"
          @options="updateIndicatorOptions"
        />
      </div>
      <IndicatorOptions
        v-show="navigation.tab === 'options'"
        :pane-id="paneId"
        :indicator-id="indicatorId"
        :style="{ width: navigation.columnWidth + 'px' }"
        tab
      />
      <IndicatorDialogDivider @resize="resizeEditor" />
      <div>
        <IndicatorOptions
          :pane-id="paneId"
          :indicator-id="indicatorId"
          :plot-types="plotTypes"
          :style="{ width: navigation.columnWidth + 'px' }"
          column
          show-search
        />
        <Dismissable id="scale-options-moved-to-dropdown" class="mx16">
          <template #title>Looking for scale options?</template>
          It moved in the
          <code class="d-flex d-inline-flex -gap4 -filled">
            Indicator <i class="icon-down"> </i>
          </code>
          menu above
          <template #footer>
            <Btn
              class="-text"
              @click="dropdownToggleRef.focus(), dropdownToggleRef.click()"
              >Show me</Btn
            >
          </template>
        </Dismissable>
      </div>

      <template v-slot:footer>
        <presets
          :type="'indicator:' + libraryId"
          class="mr8 -left"
          :adapter="getIndicatorPreset"
          :placeholder="presetPlaceholder"
          :label="lastPreset"
          :show-reset="false"
          @apply="applyIndicatorPreset($event)"
        />
      </template>
    </Dialog>
  </transition>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  onMounted,
  onBeforeMount,
  onBeforeUnmount,
  watch,
  nextTick,
  defineAsyncComponent
} from 'vue'
import Dialog from '@/components/framework/Dialog.vue'
import Tabs from '@/components/framework/Tabs.vue'
import Tab from '@/components/framework/Tab.vue'
import IndicatorDropdown from '@/components/indicators/IndicatorDropdown.vue'
import Dismissable from '@/components/framework/Dismissable.vue'
import Btn from '@/components/framework/Btn.vue'
import IndicatorOptions from '@/components/indicators/IndicatorOptions.vue'
import IndicatorDialogDivider from '@/components/indicators/IndicatorDialogDivider.vue'
import DropdownButton from '@/components/framework/DropdownButton.vue'
import BlobImage from '../framework/BlobImage.vue'
import { Preset } from '@/types/types'
import workspacesService from '@/services/workspacesService'
import dialogService from '../../services/oldDialogService'
import { copyTextToClipboard } from '@/utils/helpers'
import store from '@/store'
import { ChartPaneState } from '@/store/panesSettings/chart'
import { useDialog } from '@/composables/useDialog'
import { useIndicatorNavigation } from './useIndicatorNavigation'
import { useIndicatorOptions } from './useIndicatorOptions'

const Editor = defineAsyncComponent(
  () => import('@/components/framework/editor/Editor.vue')
)

defineEmits(['close'])
const { close, hide, opened } = useDialog()
defineExpose({ close })

// Define props
const props = defineProps({
  paneId: String,
  indicatorId: String
})

// Data
const dialogOpened = ref()
const editorRef = ref()
const originalIndicator = ref()
const code = ref('')
const loadedEditor = ref(false)
const savedPreview = ref(null)
const plotTypes = ref<string[]>([])
const defaultOptionsKeys = ref<string[]>([])
const scriptOptionsKeys = ref<string[]>([])
const colorOptionsKeys = ref<string[]>([])
const dropdownIndicatorTrigger = ref(null)
const dropdownToggleRef = ref<HTMLElement>(null)

// Computed properties
const indicator = computed(
  () =>
    (store.state[props.paneId] as ChartPaneState).indicators[props.indicatorId]
)
const libraryId = computed<string>(
  () => indicator.value.libraryId || props.indicatorId
)
const displayId = computed(() => {
  const id = libraryId.value
  return id
    ? id.length <= 16
      ? id
      : `${id.slice(0, 6)}..${id.substr(-6)}`
    : 'n/a'
})
const presetPlaceholder = computed(
  () => `${indicator.value.name.replace(/\{.*\}/, '').trim()} preset`
)
const unsavedChanges = computed(() => indicator.value.unsavedChanges)
const error = computed(
  () => store.state[props.paneId].indicatorsErrors[props.indicatorId]
)
const name = computed(() => indicator.value.displayName || indicator.value.name)
const script = computed(() => indicator.value.script)

const lastPreset = computed<any>({
  get(): string {
    return indicator.value.lastPreset || 'Presets'
  },
  set(preset: Preset): void {
    indicator.value.lastPreset = preset ? preset.name : null
  }
})

// injects

const {
  applyIndicatorPreset,
  getIndicatorPreset,
  getOptionsKeys,
  getPlotsTypes
} = useIndicatorOptions(props.paneId, props.indicatorId, script)

const { navigation, saveNavigation } = useIndicatorNavigation()

// Watchers
watch(
  () => script.value,
  value => (code.value = value),
  { immediate: true }
)

// Lifecycle Hooks
onBeforeMount(() => {
  originalIndicator.value = JSON.parse(JSON.stringify(indicator.value))
})

// Lifecycle Hooks
onMounted(async () => {
  await getSavedPreview()
  dialogOpened.value = true
})

onBeforeUnmount(() => {
  saveNavigation()
})

// Methods
const getSavedPreview = async () => {
  const indicatorData = await workspacesService.getIndicator(libraryId.value)
  savedPreview.value = indicatorData?.preview
}

const updateScript = script => {
  store.commit(props.paneId + '/SET_INDICATOR_SCRIPT', {
    id: props.indicatorId,
    value: script ? script.trim() : undefined
  })

  getPlotsTypes()
  getOptionsKeys()
}
const updateIndicatorOptions = options => {
  navigation.editorOptions = options
}
const renameIndicator = async () => {
  const name = await dialogService.prompt({
    action: 'Rename',
    input: store.state[props.paneId].indicators[props.indicatorId].name
  })

  if (typeof name === 'string') {
    store.dispatch(props.paneId + '/renameIndicator', {
      id: props.indicatorId,
      name
    })
  }
}

const saveIndicator = async () => {
  await store.dispatch(props.paneId + '/saveIndicator', props.indicatorId)
  setTimeout(() => {
    getSavedPreview()
  }, 500)
}

const undoIndicator = async () => {
  if (!(await dialogService.confirm('Undo changes ?'))) {
    return
  }

  store.dispatch(props.paneId + '/undoIndicator', {
    libraryId: libraryId.value,
    indicatorId: props.indicatorId
  })
}

const copyIndicatorId = () => {
  copyTextToClipboard(props.indicatorId)
  store.dispatch('app/showNotice', {
    title: `Copied indicator id to clipboard`
  })
}

const toggleIndicatorDropdown = event => {
  dropdownIndicatorTrigger.value = dropdownIndicatorTrigger.value
    ? null
    : event.currentTarget
}

const resizeEditor = () => {
  if (editorRef.value) {
    editorRef.value.resize()
  }
}

const onResize = () => {
  resizeEditor()
}

const revertChanges = async (op: 'reset' | 'revert') => {
  if (op === 'reset') {
    indicator.value.options = {} as any
    store.commit(`${props.paneId}/SET_INDICATOR_SCRIPT`, {
      id: props.indicatorId
    })
  } else if (op === 'revert') {
    applyIndicatorPreset({ data: originalIndicator.value })
  }

  scriptOptionsKeys.value = []
  defaultOptionsKeys.value = []
  colorOptionsKeys.value = []
  await nextTick()
  getOptionsKeys()
}

const setTab = async value => {
  navigation.tab = value

  if (navigation.tab === 'script') {
    loadedEditor.value = true
  }

  await nextTick()
  resizeEditor()
  saveNavigation()
}
</script>

<style lang="scss" scoped>
.indicator-dialog {
  &--resizing-column {
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;

    .indicator-editor {
      overflow: hidden;
    }
  }

  &__settings {
    position: absolute;
    right: 0.25rem;
    top: 0.25rem;
    bottom: 0.5rem;
    padding: 0.5rem;
  }

  &__preview {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    overflow: hidden;
    border-radius: 1rem 1rem 0 0;
    filter: blur(0.25rem);
    object-fit: cover;
  }

  :deep(.dialog__content) {
    width: 755px;
    overflow: visible;

    .dialog__body {
      padding: 0;
      flex-direction: row;
      align-items: stretch;
      overflow: visible;
    }
  }

  &__title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    text-overflow: ellipsis;
    overflow: hidden;
  }

  &__action {
    .dialog--small & span,
    .dialog--medium & span {
      display: none;
    }
  }

  &__id {
    display: none;
    max-width: 5rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin: 0;

    @media screen and (min-width: 768px) {
      display: block;
    }

    .dialog--small & {
      display: none;
    }
  }
}

.indicator-editor {
  display: flex;
  flex-direction: column;
  position: relative;
  flex-grow: 1;
  min-height: 50px;
}
</style>
