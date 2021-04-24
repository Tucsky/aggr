<template>
  <transition-group
    :name="transitionGroupName"
    @beforeEnter="beforeEnter"
    @enter="enter"
    @afterEnter="afterEnter"
    @beforeLeave="beforeLeave"
    @leave="leave"
    tag="div"
    class="notices"
  >
    <div v-for="notice in notices" :key="notice.id" class="notice" :class="'-' + notice.type">
      <div class="notice__wrapper" @click="$store.dispatch('app/hideNotice', notice.id)">
        <i v-if="notice.icon" class="notice__icon" :class="notice.icon"></i>
        <div v-html="notice.title" class="notice__title"></div>
        <!--<v-btn
          v-if="notice.button"
          :color="notice.button.color || 'dark'"
          class="ml-4 notice__action "
          outlined
          small
          @click.stop="onButtonClick(notice)"
        >
          <v-icon v-if="notice.button.icon" left small>{{ notice.button.icon }}</v-icon>
          {{ notice.button.text }}
        </v-btn>-->
      </div>
    </div>
  </transition-group>
</template>

<script lang="ts">
import { Notice } from '@/store/app'
import { Component, Vue } from 'vue-property-decorator'

@Component({
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

  beforeEnter(element) {
    element.style.height = '0px'
  }

  enter(element) {
    const wrapper = element.children[0]

    let height = wrapper.offsetHeight
    height += parseInt(window.getComputedStyle(wrapper).getPropertyValue('margin-top'))
    height += parseInt(window.getComputedStyle(wrapper).getPropertyValue('margin-bottom'))
    height += 'px'

    element.dataset.height = height

    setTimeout(() => {
      element.style.height = height
    }, 100)
  }

  afterEnter(element) {
    element.style.height = ''
  }

  beforeLeave(element) {
    element.style.height = element.dataset.height
  }

  leave(element) {
    setTimeout(() => {
      element.style.height = '0px'
    })
  }
}
</script>
