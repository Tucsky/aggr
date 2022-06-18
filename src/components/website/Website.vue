<template>
  <div class="pane-website">
    <pane-header :paneId="paneId" />
    <div class="iframe__lock" v-if="locked">
      <div class="ml8 mr8">
        <p>Load <span class="condensed" v-text="trimmedUrl" title="url" v-tippy></span> ?</p>
        <div class="text-center">
          <button class="btn" @click="$store.commit(paneId + '/UNLOCK_URL')">Yes, authorize</button>
        </div>
      </div>
    </div>
    <div class="iframe__wrapper" v-else>
      <iframe :src="url" ref="iframe" frameborder="0" width="100%" height="100%" :style="style"></iframe>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'

import PaneMixin from '@/mixins/paneMixin'
import PaneHeader from '../panes/PaneHeader.vue'

@Component({
  components: { PaneHeader },
  name: 'Website'
})
export default class extends Mixins(PaneMixin) {
  customId = ''

  $refs!: {
    iframe: HTMLElement
  }

  get locked() {
    return this.$store.state[this.paneId].locked
  }

  get url() {
    return this.$store.state[this.paneId].url
  }

  get interactive() {
    return this.$store.state[this.paneId].interactive
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
  }
}
</style>
