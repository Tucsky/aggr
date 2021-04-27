<template>
  <header id="header" class="header toolbar" :class="{ '-moved': left !== null }" v-background="0.01" :style="{ left }">
    <span ref="handle" class="header__handle title">Aggr.</span>
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
import { getEventCords } from '@/utils/picker'
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
      description: 'Significant market trades'
    },
    stats: {
      title: 'Stats',
      description: 'Rolling averages'
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

  left: string = null

  private _dragRef: number

  get useAudio() {
    return this.$store.state.settings.useAudio
  }

  get audioVolume() {
    return this.$store.state.settings.audioVolume
  }

  get activeExchanges() {
    return this.$store.state.app.activeExchanges
  }

  $refs!: {
    handle: HTMLElement
  }

  mounted() {
    this.bindHandle()
  }

  bindHandle() {
    this.$refs.handle.addEventListener('mousedown', this.startDrag)
  }

  startDrag(event: MouseEvent | TouchEvent) {
    const { x } = getEventCords(event)
    const rect = this.$el.getBoundingClientRect()

    this.left = (rect.left / window.innerWidth) * 100 + '%'
    this._dragRef = x

    document.addEventListener('touchmove', this.onDrag)
    document.addEventListener('mousemove', this.onDrag)
    document.addEventListener('touchend', this.stopDrag)
    document.addEventListener('mouseup', this.stopDrag)
  }

  onDrag(event: MouseEvent | TouchEvent) {
    const { x } = getEventCords(event)

    const offset = x - this._dragRef

    const percent = Math.max(0, (((this.$el as HTMLElement).offsetLeft + offset) / window.innerWidth) * 100)
    this.left = percent + '%'

    this._dragRef = x
  }

  stopDrag() {
    document.removeEventListener('touchmove', this.onDrag)
    document.removeEventListener('mousemove', this.onDrag)
    document.removeEventListener('touchend', this.stopDrag)
    document.removeEventListener('mouseup', this.stopDrag)
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
  top: 0;
  z-index: 1;
  left: 50%;
  transform: translate(-50%);
  border-radius: 0 0 8px 8px;
  font-size: 1.5rem;

  button,
  .dropdown {
    &:hover {
      background-color: rgba(white, 0.1);

      &:last-child {
        border-bottom-right-radius: 7px;
      }

      &:first-child {
        border-bottom-left-radius: 7px;
      }
    }
  }

  &:hover {
    opacity: 1;
  }

  .header__handle {
    cursor: grab;
    user-select: none;
  }

  &.-moved {
    transform: none;
  }
}
</style>
