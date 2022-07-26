<template>
  <div id="menu" class="menu" :class="{ '-open': open }">
    <button
      class="menu__button btn"
      @click="$refs.menuDropdown.toggle($event.currentTarget)"
    >
      <i class="icon-menu"></i>
    </button>
    <dropdown ref="menuDropdown">
      <button
        type="button"
        class="dropdown-item dropdown-item--space-between"
        @click="$store.dispatch('app/showSearch', null)"
      >
        <span class="mr4">Search</span>
        <i class="icon-search"></i>
      </button>
      <button
        type="button"
        class="dropdown-item"
        @click.stop="$refs.panesDropdown.toggle($event.currentTarget)"
      >
        <i class="icon-dashboard -center mr8"></i>
        <span class="mr4">Pane</span>
        <i class="icon-plus mlauto"></i>
      </button>
      <dropdown
        ref="panesDropdown"
        @mousedown.native.stop
        @touchstart.native.stop
      >
        <button
          class="dropdown-item dropdown-item--space-between"
          @click="addPane('chart')"
        >
          <div>
            <div>Chart</div>
            <div class="dropdown-item__subtitle">Live Chart</div>
          </div>
          <i class="icon-plus" />
        </button>
        <button
          class="dropdown-item dropdown-item--space-between"
          @click="addPane('trades')"
        >
          <div>
            <div>Trades</div>
            <div class="dropdown-item__subtitle">Legacy trades feed</div>
          </div>
          <i class="icon-plus" />
        </button>
        <button
          class="dropdown-item dropdown-item--space-between"
          @click="addPane('trades-lite')"
        >
          <div>
            <div>Trades <span>LITE ⚡️</span></div>
            <div class="dropdown-item__subtitle">
              Minimal but faster
            </div>
          </div>
          <i class="icon-plus" />
        </button>
        <button
          class="dropdown-item dropdown-item--space-between"
          @click="addPane('prices')"
        >
          <div>
            <div>Markets</div>
            <div class="dropdown-item__subtitle">Price change & volume</div>
          </div>
          <i class="icon-plus" />
        </button>
        <button
          class="dropdown-item dropdown-item--space-between"
          @click="addPane('website')"
        >
          <div>
            <div>Website</div>
            <div class="dropdown-item__subtitle">Embed website</div>
          </div>
          <i class="icon-plus" />
        </button>
        <button
          class="dropdown-item dropdown-item--space-between"
          @click="addPane('stats')"
        >
          <div>
            <div>Stats</div>
            <div class="dropdown-item__subtitle">Custom rolling metrics</div>
          </div>
          <i class="icon-plus" />
        </button>
        <button
          class="dropdown-item dropdown-item--space-between"
          @click="addPane('counters')"
        >
          <div>
            <div>Counters</div>
            <div class="dropdown-item__subtitle">Buys/sells by intervals</div>
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
        <slider
          style="width: 100px"
          :min="0"
          :max="3"
          :step="0.01"
          :label="true"
          :value="audioVolume"
          @input="$store.dispatch('settings/setAudioVolume', $event)"
          @reset="$store.dispatch('settings/setAudioVolume', 1)"
          log
        >
          <template v-slot:tooltip>
            {{ +(audioVolume * 100).toFixed(2) }}%
          </template>
        </slider>
      </dropdown>

      <button
        type="button"
        class="dropdown-item dropdown-item--space-between"
        ref="volumeSliderTrigger"
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
        <span
          class="mr4"
          v-text="isFullscreen ? 'Exit' : 'Go Fullscreen'"
        ></span>
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

<script lang="ts">
import dialogService from '@/services/dialogService'
import { PaneType } from '@/store/panes'
import { Component, Vue } from 'vue-property-decorator'
import { isTouchSupported } from '../utils/touchevent'
import Slider from './framework/picker/Slider.vue'
import SettingsDialog from './settings/SettingsDialog.vue'

@Component({
  name: 'Menu',
  components: {
    Slider
  }
})
export default class extends Vue {
  volumeSliderOpened = false
  isFullscreen = false
  open = false

  $refs!: {
    volumeSlider: any
    volumeSliderTrigger: HTMLElement
  }

  get useAudio() {
    return this.$store.state.settings.useAudio
  }

  get audioVolume() {
    return this.$store.state.settings.audioVolume
  }

  get volumeSliderEvents() {
    if (!this.volumeSliderOpened) {
      return null
    }

    return {
      [isTouchSupported() ? 'touchstart' : 'mousedown']: event => {
        event.stopPropagation()
      },
      mouseleave: event => {
        if (
          event.toElement === this.$refs.volumeSliderTrigger ||
          this.$refs.volumeSliderTrigger.contains(event.toElement)
        ) {
          return
        }

        this.volumeSliderOpened = null
      }
    }
  }

  get volumeSliderTriggerEvents() {
    if (this.volumeSliderOpened) {
      return {
        mouseleave: event => {
          if (
            event.toElement === this.$refs.volumeSlider.$el ||
            this.$refs.volumeSlider.$el.contains(event.toElement)
          ) {
            return
          }

          this.volumeSliderOpened = null
        }
      }
    } else {
      return {
        mouseenter: event => {
          this.volumeSliderOpened = event.currentTarget
        }
      }
    }
  }

  showSettings() {
    dialogService.open(SettingsDialog)
  }

  toggleFullscreen() {
    let element = document.body

    if (event instanceof HTMLElement) {
      element = event
    }

    ;(element as any).requestFullScreen =
      (element as any).requestFullScreen ||
      (element as any).webkitRequestFullScreen ||
      (element as any).mozRequestFullScreen ||
      function() {
        return false
      }
    ;(document as any).cancelFullScreen =
      (document as any).cancelFullScreen ||
      (document as any).webkitCancelFullScreen ||
      (document as any).mozCancelFullScreen ||
      function() {
        return false
      }

    if (this.isFullscreen) {
      ;(document as any).cancelFullScreen()
      this.isFullscreen = false
    } else {
      ;(element as any).requestFullScreen()
      this.isFullscreen = true
    }
  }

  toggleMenu() {
    this.open = !this.open

    if (this.open) {
      this.isFullscreen =
        (document as any).webkitIsFullScreen || (document as any).mozFullScreen
          ? true
          : false
    }
  }

  addPane(type: PaneType) {
    this.$store.dispatch('panes/addPane', { type })
  }

  toggleAudio() {
    this.$store.commit('settings/TOGGLE_AUDIO', !this.useAudio)
  }
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
    color: var(--theme-color-base);
    z-index: 1;
    position: relative;

    &:hover {
      background-color: var(--theme-buy-base);
      color: var(--theme-buy-color);
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
