<template>
  <header id="header" class="header" v-background="2">
    <span class="title">Aggr.</span>
    <button type="button" @click="$store.dispatch('app/showSearch')" title="Search" v-tippy="{ placement: 'bottom' }">
      <i class="icon-search"></i>
    </button>
    <button type="button" v-if="!isPopupMode" @click="togglePopup" title="Open as popup" v-tippy="{ placement: 'bottom' }">
      <i class="icon-external-link-square-alt"></i>
    </button>
    <tippy v-if="useAudio" to="myTrigger" arrow :interactive="true" :delay="[0, 200]">
      <div class="mt4 mb4 text-nowrap">
        <slider
          style="width: 100px"
          :min="0"
          :max="10"
          :step="0.1"
          :editable="false"
          :value="audioVolume"
          @input="$store.dispatch('settings/setAudioVolume', $event)"
          @reset="$store.dispatch('settings/setAudioVolume', 1)"
        ></slider>
      </div>
    </tippy>
    <button type="button" class="-volume" @click="$store.commit('settings/TOGGLE_AUDIO', !useAudio)" name="myTrigger">
      <i v-if="!useAudio" class="icon-volume-off"></i>
      <i v-else class="icon-volume-medium" :class="{ 'icon-volume-high': audioVolume > 1 }"></i>
    </button>
    <dropdown :options="paneTypes" placeholder="tf." @output="addPane" title="Add pane" v-tippy>
      <template v-slot:selection>
        <i class="icon-plus"></i>
        <span>Add pane</span>
      </template>
      <template v-slot:option="{ value }">
        <div>
          <div>
            <div class="dropdown-option__title">{{ value.title }}</div>
            <div class="dropdown-option__description">{{ value.description }}</div>
          </div>
          <i class="icon-plus"></i>
        </div>
      </template>
    </dropdown>
    <button type="button" @click="$store.commit('app/TOGGLE_SETTINGS')" title="General settings" v-tippy>
      <i class="icon-cog"></i>
      <span>Settings</span>
    </button>
  </header>
</template>

<script lang="ts">
import { PaneType } from '@/store/panes'
import { Component, Vue } from 'vue-property-decorator'
import Slider from './framework/picker/Slider.vue'

@Component({
  name: 'Header',
  components: {
    Slider
  }
})
export default class extends Vue {
  isPopupMode = window.opener !== null
  paneTypes = {
    chart: {
      title: 'Chart',
      description: 'Live Chart'
    },
    trades: {
      title: 'Trades',
      description: 'Significant Market Trades'
    },
    stats: {
      title: 'Live Statistics',
      description: 'Custom counters'
    },
    counters: {
      title: 'Counters',
      description: 'Rolling buy/sell counters'
    },
    prices: {
      title: 'Tickers',
      description: 'Just the last prices'
    }
  }

  get useAudio() {
    return this.$store.state.settings.useAudio
  }

  get audioVolume() {
    return this.$store.state.settings.audioVolume
  }

  get activeExchanges() {
    return this.$store.state.app.activeExchanges
  }

  togglePopup() {
    const name = this.$store.state.app.activeMarkets.map(market => market.pair).join('+')

    window.open(window.location.href, `sig${name}`, 'toolbar=no,status=no,width=350,height=500')

    setTimeout(() => {
      window.close()
    }, 500)
  }

  addPane(type: PaneType) {
    this.$store.dispatch('panes/addPane', { type })
  }
}
</script>

<style lang="scss">
header#header {
  background-color: lighten($dark, 10%);
  color: white;
  position: absolute;
  display: flex;
  justify-content: flex-end;
  align-items: stretch;
  padding: 0 0.5em;
  top: 0;
  z-index: 1;
  left: 50%;
  transform: translate(-50%);
  border-radius: 0 0 8px 8px;

  span {
    font-size: 0.5em;
    opacity: 0.75;
    font-family: 'Barlow Semi Condensed';
    align-self: stretch;
    margin-right: 0.25em;
    line-height: 1;
    padding: 0.4em 0.5em 0.66em;
    line-height: 0.8;
  }

  .dropdown {
    align-self: stretch;

    &__options {
      margin-top: 1rem;
    }
  }

  button,
  .dropdown {
    &:hover {
      background-color: rgba(white, 0.2);

      &:last-child {
        border-bottom-right-radius: 2px;
      }

      &:first-child {
        border-bottom-left-radius: 2px;
      }
    }
  }

  button {
    border: 0;
    background: none;
    color: inherit;
    position: relative;
    cursor: pointer;
    padding: 0;
    display: inline-flex;
    align-items: center;
    line-height: 1;
    font-size: inherit;
  }

  &:after,
  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    display: block;
    background-clip: padding-box;
    transition: background-color 0.4s $ease-out-expo;
  }

  .dropdown__selected {
    height: 100%;
    display: inline-flex;
    align-items: center;
  }

  .dropdown__option {
    font-size: 1rem;
  }

  .dropdown__selected > i,
  button > i {
    font-size: 12px;
    padding: 0 0.75em;
    height: 14px;

    + span {
      padding-left: 0;
    }
  }
}

#app.-loading header#header {
  &:before {
    background-color: rgba(#f6f6f6, 0.1);
    animation: indeterminate-loading-bar-slow 2.1s cubic-bezier(0.65, 0.815, 0.735, 0.395) infinite;
  }

  &:after {
    background-color: rgba(#111111, 0.1);
    animation: indeterminate-loading-bar-fast 2.1s cubic-bezier(0.165, 0.84, 0.44, 1) infinite;
    animation-delay: 1.15s;
  }
}

@keyframes indeterminate-loading-bar-slow {
  0% {
    left: -35%;
    right: 100%;
  }

  60% {
    left: 100%;
    right: -90%;
  }

  100% {
    left: 100%;
    right: -90%;
  }
}

@keyframes indeterminate-loading-bar-fast {
  0% {
    left: -200%;
    right: 100%;
  }

  60% {
    left: 107%;
    right: -8%;
  }

  100% {
    left: 107%;
    right: -8%;
  }
}

#app.-light header#header button:hover > span,
#app.-light header#header .dropdown__selected:hover > span {
  opacity: 1;
}
</style>
