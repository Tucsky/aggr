<template>
  <div
    ref="paneHeader"
    class="pane-header hide-scrollbar d-flex"
    :class="{ 'pane-header--split': split }"
    @dblclick="maximizePane"
  >
    <div
      v-if="showName && name"
      class="btn -cases pane-header__highlight"
      @dblclick="maximizePane"
    >
      <slot name="title">
        {{ name }}
        <Btn
          type="button"
          @click.stop="renamePane"
          class="pane-header__edit btn -text -small"
        >
          <i class="icon-edit"></i>
        </Btn>
      </slot>
    </div>
    <slot>
      <hr />
    </slot>
    <button
      v-if="showSearch"
      type="button"
      @click="openSearch"
      class="btn -text"
    >
      <i class="icon-search"></i>
    </button>
    <Btn
      v-if="settings"
      type="button"
      @click="openSettings"
      class="pane-overlay -text"
      :loading="isLoading"
    >
      <i class="icon-cog"></i>
    </Btn>
    <button
      type="button"
      @click="toggleDropdown"
      class="pane-overlay btn -text"
    >
      <i class="icon-more"></i>
    </button>

    <Dropdown v-model="paneDropdownTrigger">
      <div class="d-flex btn-group">
        <button
          type="button"
          class="btn -green"
          @click.stop="changeZoom(-1, $event)"
        >
          <i class="icon-minus"></i>
        </button>
        <button
          type="button"
          class="btn -green text-monospace flex-grow-1 text-center"
          @click.stop="resetZoom"
        >
          × {{ zoom.toFixed(2) }}
        </button>
        <button
          type="button"
          class="btn -green"
          @click.stop="changeZoom(1, $event)"
        >
          <i class="icon-plus"></i>
        </button>
      </div>
      <button
        v-if="settings !== null"
        type="button"
        class="dropdown-item"
        @click="openSettings"
      >
        <i class="icon-cog"></i>
        <span>Settings</span>
      </button>
      <button
        v-if="showSearch"
        type="button"
        class="dropdown-item"
        @click="openSearch"
      >
        <i class="icon-search"></i>
        <span>Sources</span>
      </button>
      <div v-if="isInFrame" class="dropdown-item" @click.stop>
        <label class="checkbox-control -small">
          <input
            type="checkbox"
            class="form-control"
            :checked="syncedWithParent"
            @change="toggleSyncWithParent"
          />
          <div></div>
          <span>Sync</span>
        </label>
      </div>
      <div
        v-if="$slots.menu"
        class="dropdown-divider"
        :data-label="`${paneId} options`"
      ></div>
      <slot name="menu"></slot>
      <div class="dropdown-divider" data-label="utilities"></div>
      <button type="button" class="dropdown-item" @click="maximizePane">
        <i class="icon-enlarge"></i>
        <span>Maximize</span>
      </button>
      <button type="button" class="dropdown-item" @click="duplicatePane">
        <i class="icon-copy-paste"></i>
        <span>Duplicate</span>
      </button>
      <button type="button" class="dropdown-item" @click="downloadPane">
        <i class="icon-download"></i>
        <span>Download</span>
      </button>
      <button type="button" class="dropdown-item" @click="renamePane">
        <i class="icon-edit"></i>
        <span>Rename</span>
      </button>
      <button type="button" class="dropdown-item" @click="removePane">
        <i class="icon-trash"></i>
        <span>Remove</span>
      </button>
    </Dropdown>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import store from '@/store'
import Btn from '@/components/framework/Btn.vue'
import Dropdown from '@/components/framework/Dropdown.vue'
import { downloadAnything, getSiblings, slugify } from '@/utils/helpers'
import { INFRAME } from '@/utils/constants'
import { dialogService } from '@/services/dialogService'

// Define props with types and defaults
const props = withDefaults(
  defineProps<{
    paneId: string
    settings?: () => Promise<any> | null
    showSearch?: boolean
    showName?: boolean
    split?: boolean
  }>(),
  {
    showSearch: true,
    showName: true,
    split: true
  }
)

// Define emits
const emit = defineEmits<{
  (e: 'zoom', zoom: number): void
}>()

// References
const paneHeader = ref<HTMLElement | null>(null)

// Reactive variables
const paneDropdownTrigger = ref<HTMLElement>()
const isLoading = ref(false)
const isInFrame = INFRAME

// Computed properties
const zoom = computed(() => store.state.panes.panes[props.paneId].zoom || 1)
const type = computed(() => store.state.panes.panes[props.paneId].type)
const syncedWithParent = computed(
  () => store.state.panes.syncedWithParentFrame.indexOf(props.paneId) !== -1
)
const name = computed(() => {
  const pane = store.state.panes.panes[props.paneId]
  const paneName = pane.name
  const marketKey = pane.markets[0]
  const market = store.state.panes.marketsListeners[marketKey]

  if (paneName) {
    return paneName.trim()
  } else if (market) {
    return market.local
  } else {
    return type.value
  }
})

// Methods
const openSearch = () => {
  store.dispatch('app/showSearch', { paneId: props.paneId })
}

const changeZoom = (direction: number, event: MouseEvent) => {
  const increment = event.shiftKey ? 0.0625 * direction : 0.125 * direction
  const newZoom = zoom.value + increment
  store.dispatch('panes/setZoom', { id: props.paneId, zoom: newZoom })

  emit('zoom', newZoom)
}

const resetZoom = () => {
  store.dispatch('panes/setZoom', { id: props.paneId, zoom: 1 })

  emit('zoom', 1)
}

const removePane = async () => {
  const confirmed = await dialogService.confirm(
    `Delete pane ${type.value} "${name.value}" ?`
  )
  if (confirmed) {
    store.dispatch('panes/removePane', props.paneId)
  }
}

const duplicatePane = () => {
  store.dispatch('panes/duplicatePane', props.paneId)
}

const maximizePane = (event: MouseEvent) => {
  if (event.type === 'dblclick' && event.currentTarget !== event.target) {
    return
  }

  if (!paneHeader.value) return

  const el = paneHeader.value.parentElement?.parentElement
  if (!el) return

  const isMaximized = el.classList.toggle('-maximized')

  const siblings = getSiblings(el)

  for (const sibling of siblings) {
    if (!sibling.getAttribute('type')) {
      continue
    }
    sibling.classList.remove('-maximized')
    sibling.style.display = isMaximized ? 'none' : 'block'
  }

  window.dispatchEvent(new Event('resize'))

  const updatedZoom = isMaximized ? zoom.value * 1.5 : zoom.value * (2 / 3)
  store.dispatch('panes/setZoom', { id: props.paneId, zoom: updatedZoom })

  emit('zoom', updatedZoom)
}

const renamePane = async (event?: MouseEvent) => {
  if (event) {
    event.stopPropagation()
  }

  const newName = await dialogService.prompt({
    placeholder: `Main pane's market`,
    action: 'Rename',
    input: name.value
  })

  if (typeof newName === 'string' && newName !== name.value) {
    store.commit('panes/SET_PANE_NAME', { id: props.paneId, name: newName })
  }
}

const downloadPane = () => {
  const id = `${type.value}:${props.paneId}`
  const paneState = store.state.panes.panes[props.paneId]
  downloadAnything(
    {
      name: id,
      type: type.value,
      data: paneState,
      markets: paneState.markets,
      createdAt: Date.now(),
      updatedAt: null
    },
    slugify(`${type.value} ${name.value}`)
  )
}

const toggleDropdown = (event: MouseEvent) => {
  if (paneDropdownTrigger.value) {
    paneDropdownTrigger.value = undefined
  } else {
    paneDropdownTrigger.value = event.currentTarget as HTMLElement
  }
}

const openSettings = async () => {
  if (!props.settings) {
    return
  }

  isLoading.value = true
  const settingsComponent = (await props.settings()).default
  dialogService.open(settingsComponent, {
    paneId: props.paneId
  })
  isLoading.value = false
}

const toggleSyncWithParent = () => {
  store.commit('panes/TOGGLE_SYNC_WITH_PARENT_FRAME', props.paneId)
}
</script>
