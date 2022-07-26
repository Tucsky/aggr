<template>
  <transition-height :name="transitionGroupName" tag="div" class="notices">
    <div
      v-for="notice in notices"
      :key="notice.id"
      class="notice"
      :class="'-' + notice.type"
    >
      <div
        class="notice__wrapper"
        @click="$store.dispatch('app/hideNotice', notice.id)"
      >
        <i v-if="notice.icon" class="notice__icon" :class="notice.icon"></i>
        <div
          v-if="!notice.html"
          v-text="notice.title"
          class="notice__title"
        ></div>
        <div v-else v-html="notice.title" class="notice__title"></div>
      </div>
    </div>
  </transition-height>
</template>

<script lang="ts">
import { Notice } from '@/store/app'
import { Component, Vue } from 'vue-property-decorator'
import TransitionHeight from './TransitionHeight.vue'

@Component({
  components: { TransitionHeight },
  name: 'Notices'
})
export default class extends Vue {
  get notices(): Notice[] {
    return this.$store.state.app.notices
  }

  get disableAnimations() {
    return this.$store.state.settings.disableAnimations
  }

  get transitionGroupName() {
    if (!this.disableAnimations) {
      return 'slide-notice'
    } else {
      return null
    }
  }

  onButtonClick(notice) {
    let hide = true

    if (typeof notice.button.click === 'function') {
      hide = notice.button.click()
    }

    hide !== false && this.$store.dispatch('app/hideNotice', notice.id)
  }
}
</script>
