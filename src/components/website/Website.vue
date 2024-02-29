<template>
  <div class="pane-website">
    <pane-header
      ref="paneHeader"
      :paneId="paneId"
      :settings="() => import('@/components/website/WebsiteDialog.vue')"
      :show-search="false"
    >
      <template v-slot:menu>
        <div class="dropdown-item">
          <label class="checkbox-control -small" @click.stop>
            <input
              type="checkbox"
              class="form-control"
              :checked="interactive"
              @change="$store.commit(paneId + '/TOGGLE_INTERACTIVE')"
            />
            <div></div>
            <span>Interactive</span>
          </label>
        </div>
        <button type="button" class="dropdown-item" @click="reload(true)">
          <i class="icon-refresh"></i>
          <span>Reload</span>
        </button>
        <div class="dropdown-divider"></div>
      </template>
    </pane-header>
    <div class="iframe__lock" v-if="locked">
      <div class="ml8 mr8">
        <p>
          Load
          <span
            class="text-condensed"
            v-text="trimmedUrl"
            title="url"
            v-tippy
          ></span>
          ?
        </p>
        <div class="text-center">
          <button class="btn" @click="$store.commit(paneId + '/UNLOCK_URL')">
            Yes, authorize
          </button>
        </div>
      </div>
    </div>
    <div class="iframe__wrapper" v-else>
      <iframe
        :src="url"
        ref="iframe"
        frameborder="0"
        width="100%"
        height="100%"
        :class="invert && '-solid'"
        :scrolling="!interactive && 'no'"
        :style="style"
      ></iframe>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator'

import PaneMixin from '@/mixins/paneMixin'
import PaneHeader from '../panes/PaneHeader.vue'

@Component({
  components: { PaneHeader },
  name: 'Website'
})
export default class Website extends Mixins(PaneMixin) {
  customId = ''
  private _reloadTimeout: number

  $refs!: {
    iframe: HTMLIFrameElement
    paneHeader: PaneHeader
  }

  get locked() {
    return this.$store.state[this.paneId].locked
  }

  get url() {
    return (
      this.$store.state[this.paneId].url ||
      'https://alternative.me/crypto/fear-and-greed-index.png'
    )
  }

  get interactive() {
    return this.$store.state[this.paneId].interactive
  }

  get invert() {
    return this.$store.state[this.paneId].invert
  }

  get reloadTimer() {
    return this.$store.state[this.paneId].reloadTimer
  }

  get zoom() {
    return this.$store.state.panes.panes[this.paneId].zoom
  }

  get style() {
    const size = (1 / this.zoom) * 100

    return {
      transform: `scale(${this.zoom})`,
      width: size + '%',
      height: size + '%',
      pointerEvents: this.interactive ? 'all' : 'none'
    }
  }

  get trimmedUrl() {
    if (this.url.length <= 33) {
      return this.url
    } else {
      return this.url.slice(0, 15) + '[...]' + this.url.substr(-15)
    }
  }

  @Watch('reloadTimer')
  onReloadTimerChange() {
    this.setupReloadTimer()
  }

  created() {
    this.setupReloadTimer()
  }

  getSettingsDialog() {
    return import('@/components/website/WebsiteDialog.vue')
  }

  beforeDestroy() {
    if (this._reloadTimeout) {
      clearTimeout(this._reloadTimeout)
    }
  }

  setupReloadTimer() {
    if (this._reloadTimeout) {
      clearTimeout(this._reloadTimeout)
    }

    if (!this.reloadTimer) {
      return
    }

    let interval = this.reloadTimer.trim()

    if (/[\d.]+s/.test(interval)) {
      interval = parseFloat(interval) * 1000
    } else if (/[\d.]+h/.test(interval)) {
      interval = parseFloat(interval) * 1000 * 60 * 60
    } else {
      interval = parseFloat(interval) * 1000 * 60
    }

    if (!interval) {
      return
    }

    const now = Date.now()
    let delay = Math.ceil(now / interval) * interval - now - 20

    if (delay < 1000) {
      delay += interval
    }

    this._reloadTimeout = setTimeout(() => {
      this._reloadTimeout = null

      this.reload()

      this.setupReloadTimer()
    }, delay) as unknown as number
  }

  async reload(focus?: boolean) {
    this.$refs.iframe.src += ''

    if (focus) {
      this.$refs.iframe.onload = () => {
        this.$refs.iframe.onload = null

        this.$refs.iframe.focus()
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.iframe__lock {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba($red, 0.5);
}

.iframe__wrapper {
  width: 100%;
  height: 100%;
  overflow: hidden;

  iframe {
    border: 0;
    width: 100%;
    height: 100%;
    transform-origin: top left;

    &.-solid {
      filter: invert(1);
    }
  }
}
</style>
