<template>
  <div id="menu" class="menu" :class="{ '-open': open }">
    <button class="menu__button btn" @click="toggleMenu">
      <i class="icon-menu"></i>
    </button>
    <div class="menu__actions" @click="onClickItem">
      <button class="menu-action btn" type="button" @click="showSettings">
        <span class="mr4">Settings</span>
        <i class="icon-cog"></i>
      </button>
      <tippy to="myTrigger" :interactive="true" :delay="[0, 400]" :distance="20" placement="left" :theme="'transparent'">
        <div class="mt4 mb4 text-nowrap">
          <slider
            style="width: 100px"
            :min="0"
            :max="10"
            :step="0.1"
            :label="true"
            :editable="false"
            :value="audioVolume"
            @input="$store.dispatch('settings/setAudioVolume', $event)"
            @reset="$store.dispatch('settings/setAudioVolume', 1)"
          ></slider>
        </div>
      </tippy>
      <button type="button" class="menu-action btn -volume" @click="$store.commit('settings/TOGGLE_AUDIO', !useAudio)" name="myTrigger">
        <span class="mr4">Audio</span>
        <i v-if="!useAudio" class="icon-volume-off"></i>
        <i v-else class="icon-volume-medium" :class="{ 'icon-volume-high': audioVolume > 1 }"></i>
      </button>
      <dropdown class="menu-action" :options="paneTypes" placeholder="tf." @output="addPane" selectionClass="-green" @click.stop>
        <template v-slot:selection>
          <i class="icon-dashboard -center mr16"></i>
          <span class="mr4">Pane</span>
          <i class="icon-plus"></i>
        </template>
        <template v-slot:option="{ value }">
          <span>
            <div class="dropdown-option__title">{{ value.title }}</div>
            <div class="dropdown-option__description">{{ value.description }}</div>
          </span>
          <i class="icon-plus mr4"></i>
        </template>
      </dropdown>
      <button class="menu-action btn" type="button" @click="$store.dispatch('app/showSearch')">
        <span class="mr4">Search</span>
        <i class="icon-search"></i>
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import dialogService from '@/services/dialogService'
import { PaneType } from '@/store/panes'
import { Component, Vue } from 'vue-property-decorator'
import Slider from './framework/picker/Slider.vue'
import SettingsDialog from './settings/SettingsDialog.vue'

@Component({
  name: 'Header',
  components: {
    Slider
  }
})
export default class extends Vue {
  open = false
  paneTypes = {
    chart: {
      title: 'Chart',
      description: 'Live chart'
    },
    trades: {
      title: 'Trades',
      description: 'Trades feed'
    },
    stats: {
      title: 'Stats',
      description: 'Rolling metrics'
    },
    counters: {
      title: 'Counters',
      description: 'Buys/sells by intervals'
    },
    prices: {
      title: 'Markets',
      description: 'Tickers sorted by price'
    }
  }

  get useAudio() {
    return this.$store.state.settings.useAudio
  }

  get audioVolume() {
    return this.$store.state.settings.audioVolume
  }

  showSettings() {
    dialogService.open(SettingsDialog)
  }

  toggleMenu() {
    this.open = !this.open
  }

  addPane(type: PaneType) {
    this.$store.dispatch('panes/addPane', { type })
  }

  onClickItem(event) {
    if (event.target.classList.contains('dropdown__selected') || event.target.parentElement.classList.contains('dropdown__selected')) {
      return
    }

    this.toggleMenu()
  }
}
</script>

<style lang="scss">
.menu {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  z-index: 11;

  .menu__button {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 50%;
    justify-content: center;
    background-color: var(--theme-background-100);

    &:hover {
      color: white;
    }
  }

  .menu__actions {
    position: absolute;
    bottom: 100%;
    right: 0;
    display: flex;
    flex-direction: column-reverse;
    align-items: flex-end;
    width: 0;
  }

  .menu-action {
    transform: translateY(100%) scale(0.5);
    opacity: 0;
    transition: all 0.4s $ease-elastic, visibility 0.4s linear 0.4s;
    margin-bottom: 0.625rem;
    text-decoration: none;

    visibility: hidden;

    &.btn {
      background-color: var(--theme-background-100);

      &:hover {
        background-color: $green;
        color: white;
      }
    }
  }

  &.-open {
    .menu__button {
      background-color: $green;
      color: white;
    }

    .menu-action {
      transition: all 0.4s $ease-elastic;
      transform: none;
      opacity: 1;

      visibility: visible;
    }
  }

  .dropdown__options {
    right: 100%;
    left: auto;
    top: auto;
    bottom: 0;
    margin-right: 0.5rem;
  }
}
</style>
