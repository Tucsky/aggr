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
      <iframe :src="url" frameborder="0" :class="customId" width="100%" height="100%"></iframe>
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

  get locked() {
    return this.$store.state[this.paneId].locked
  }

  get url() {
    const url = this.$store.state[this.paneId].url
    this.customId = this.getCustomId(url)
    return url
  }

  get trimmedUrl() {
    if (this.url.length <= 33) {
      return this.url
    } else {
      return this.url.slice(0, 15) + '[...]' + this.url.substr(-15)
    }
  }

  getCustomId(url) {
    if (/okotoki.com/.test(url)) {
      return 'okotoki'
    }

    return null
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

    &.okotoki {
      transform: translate(-30px, -66px);
      height: calc(100% + 146px);
      width: calc(100% + 280px);
    }
  }
}
</style>
