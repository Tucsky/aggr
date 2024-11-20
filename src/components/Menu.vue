<template>
  <div id="menu" class="menu" :class="{ '-open': open }">
    <button
      class="menu__button btn"
      @click="menuDropdownRef.toggle($event.currentTarget)"
    >
      <i class="icon-menu"></i>
    </button>
    <dropdown ref="menuDropdownRef">
      <button
        type="button"
        class="dropdown-item dropdown-item--space-between"
        @click="store.dispatch('app/showSearch')"
      >
        <span class="mr4">Search</span>
        <i class="icon-search"></i>
      </button>
      <button
        type="button"
        class="dropdown-item"
        @click.stop="panesDropdownRef.toggle($event.currentTarget)"
      >
        <i class="icon-dashboard -center mr8"></i>
        <span class="mr4">Pane</span>
        <i class="icon-plus mlauto"></i>
      </button>
      <dropdown
        ref="panesDropdownRef"
        @mousedown.native.stop
        @touchstart.native.stop
        on-sides
      >
        <button
          class="dropdown-item dropdown-item--space-between"
          @click="addPane(PaneTypeEnum.CHART)"
        >
          <div>
            <div>Chart</div>
            <div class="dropdown-item__subtitle">Live Chart</div>
          </div>
          <i class="icon-plus" />
        </button>
        <button
          class="dropdown-item dropdown-item--space-between"
          @click="addPane(PaneTypeEnum.TRADES)"
        >
          <div>
            <div>Trades</div>
            <div class="dropdown-item__subtitle">Legacy trades feed</div>
          </div>
          <i class="icon-plus" />
        </button>
        <button
          class="dropdown-item dropdown-item--space-between"
          @click="addPane(PaneTypeEnum.TRADESLITE)"
        >
          <div>
            <div>Trades <span>LITE ⚡️</span></div>
            <div class="dropdown-item__subtitle">Minimal but faster</div>
          </div>
          <i class="icon-plus" />
        </button>
        <button
          class="dropdown-item dropdown-item--space-between"
          @click="addPane(PaneTypeEnum.PRICES)"
        >
          <div>
            <div>Watchlist</div>
            <div class="dropdown-item__subtitle">% change & volume</div>
          </div>
          <i class="icon-plus" />
        </button>
        <button
          class="dropdown-item dropdown-item--space-between"
          @click="addPane(PaneTypeEnum.WEBSITE)"
        >
          <div>
            <div>Website</div>
            <div class="dropdown-item__subtitle">Embed website</div>
          </div>
          <i class="icon-plus" />
        </button>
        <button
          class="dropdown-item dropdown-item--space-between"
          @click="addPane(PaneTypeEnum.STATS)"
        >
          <div>
            <div>Stats</div>
            <div class="dropdown-item__subtitle">Custom rolling metrics</div>
          </div>
          <i class="icon-plus" />
        </button>
        <button
          class="dropdown-item dropdown-item--space-between"
          @click="addPane(PaneTypeEnum.COUNTERS)"
        >
          <div>
            <div>Counters</div>
            <div class="dropdown-item__subtitle">Buys/sells by intervals</div>
          </div>
          <i class="icon-plus" />
        </button>
        <button
          class="dropdown-item dropdown-item--space-between"
          @click="addPane(PaneTypeEnum.ALERTS)"
        >
          <div>
            <div>Alerts</div>
            <div class="dropdown-item__subtitle">Manage alerts</div>
          </div>
          <i class="icon-plus" />
        </button>
      </dropdown>

      <dropdown
        v-model="volumeSliderOpened"
        v-on="volumeSliderEvents"
        @mousedown.native.stop
        @touchstart.native.stop
        @mouseleave.native="volumeSliderTriggerEvents.mouseleave"
        ref="volumeSlider"
        class="volume-slider"
        interactive
        no-scroll
        transparent
        on-sides
      >
        <Slider
          style="width: 100px"
          :min="0"
          :max="3"
          :step="0.01"
          :label="true"
          :model-value="audioVolume"
          @input="store.dispatch('settings/setAudioVolume', $event)"
          @reset="store.dispatch('settings/setAudioVolume', 1)"
          log
        >
          <template v-slot:tooltip="{ value }">
            {{
              ((Math.log10(value + 1) / Math.log10(3 + 1)) * 100).toFixed() +
              '%'
            }}
          </template>
        </Slider>
      </dropdown>

      <button
        type="button"
        class="dropdown-item dropdown-item--space-between"
        ref="volumeSliderTriggerRef"
        v-on="volumeSliderTriggerEvents"
        @click="toggleAudio"
      >
        <span class="mr4">Audio</span>
        <i v-if="!useAudio" class="icon-volume-off"></i>
        <i
          v-else
          class="icon-volume-medium"
          :class="{ 'icon-volume-high': audioVolume > 1 }"
        ></i>
      </button>
      <button
        type="button"
        class="dropdown-item dropdown-item--space-between"
        @click="toggleFullscreen"
      >
        <span class="mr4">{{
          isFullscreen ? 'Exit\xa0fullscreen' : 'Go\xa0fullscreen'
        }}</span>
        <i class="icon-enlarge"></i>
      </button>
      <button
        type="button"
        class="dropdown-item dropdown-item--space-between"
        @click="showSettings"
      >
        <span class="mr4">Settings</span>
        <i class="icon-cog"></i>
      </button>
    </dropdown>
  </div>
</template>
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import dialogService from '@/services/dialogService'
import { PaneTypeEnum } from '@/store/panes'
import { isTouchSupported } from '../utils/touchevent'
import Dropdown from './framework/Dropdown.vue'
import Slider from './framework/picker/Slider.vue'
import SettingsDialog from './settings/SettingsDialog.vue'
import store from '@/store'

// Reactive state
const volumeSliderOpened = ref<HTMLElement | null>(null)
const isFullscreen = ref(false)
const open = ref(false)

// Refs
const volumeSlider = ref<any>(null)
const volumeSliderTriggerRef = ref<HTMLElement | null>(null)
const menuDropdownRef = ref<InstanceType<typeof Dropdown> | null>(null)
const panesDropdownRef = ref<InstanceType<typeof Dropdown> | null>(null)

// Fullscreen event handlers
function handleFullScreenChange() {
  isFullscreen.value =
    !!document.fullscreenElement || !!(document as any).webkitFullscreenElement
}

onMounted(() => {
  document.addEventListener('webkitfullscreenchange', handleFullScreenChange)
  document.addEventListener('fullscreenchange', handleFullScreenChange)
})

onUnmounted(() => {
  document.removeEventListener('webkitfullscreenchange', handleFullScreenChange)
  document.removeEventListener('fullscreenchange', handleFullScreenChange)
})

// Computed properties
const useAudio = computed(() => store.state.settings.useAudio)
const audioVolume = computed(() => store.state.settings.audioVolume)

// Event handling for volume slider
const volumeSliderEvents = computed(() => {
  if (!volumeSliderOpened.value) return null
  return {
    [isTouchSupported() ? 'touchstart' : 'mousedown']: (event: Event) => {
      event.stopPropagation()
    },
    mouseleave: (event: MouseEvent) => {
      if (
        event.relatedTarget === volumeSliderTriggerRef.value ||
        volumeSliderTriggerRef.value?.contains(event.relatedTarget as Node)
      ) {
        return
      }
      volumeSliderOpened.value = null
    }
  }
})

const volumeSliderTriggerEvents = computed(() => {
  if (volumeSliderOpened.value) {
    return {
      mouseleave: (event: MouseEvent) => {
        if (
          event.relatedTarget === volumeSlider.value?.$el ||
          volumeSlider.value?.$el.contains(event.relatedTarget as Node)
        ) {
          return
        }
        volumeSliderOpened.value = null
      }
    }
  } else {
    return {
      mouseenter: (event: MouseEvent) => {
        volumeSliderOpened.value = event.currentTarget as HTMLElement
      }
    }
  }
})

// Methods
function showSettings() {
  dialogService.open(SettingsDialog, undefined, 'settings')
}

async function toggleFullscreen() {
  const doc = document as any
  const body = doc.body

  body.requestFullscreen =
    body.requestFullscreen || body.webkitRequestFullscreen || (() => false)
  doc.cancelFullscreen =
    doc.exitFullscreen ||
    doc.webkitExitFullscreen ||
    doc.cancelFullScreen ||
    doc.webkitCancelFullScreen ||
    doc.mozCancelFullScreen ||
    (() => false)

  if (isFullscreen.value) {
    doc.cancelFullscreen()
    isFullscreen.value = false
  } else {
    body.requestFullscreen()
    isFullscreen.value = true
  }
}

function addPane(type: PaneTypeEnum) {
  store.dispatch('panes/addPane', { type })
}

function toggleAudio() {
  store.commit('settings/TOGGLE_AUDIO', !useAudio.value)
}
</script>

<style lang="scss">
.menu {
  $self: &;
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  z-index: 10;

  .menu__button {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 50%;
    justify-content: center;
    background-color: var(--theme-background-100);
    color: var(--theme-buy-color);
    z-index: 1;
    position: relative;

    background-color: var(--theme-buy-50);
    border: 1px solid var(--theme-buy-base);

    &:hover {
      background-color: var(--theme-buy-base);
      border-color: var(--theme-buy-100);
    }
  }

  &.-open {
    #{$self}__button {
      background-color: var(--theme-buy-base);
      color: var(--theme-buy-color);
    }
  }
}

.volume-slider {
  padding: 1rem;
}
</style>
