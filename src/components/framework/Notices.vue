<template>
  <TransitionHeight
    :name="transitionGroupName"
    tag="div"
    class="notices"
    width-auto
  >
    <div
      v-for="notice in notices"
      :key="notice.id"
      class="notice"
      :class="'-' + notice.type"
    >
      <div class="notice__wrapper" @click="onClick(notice)">
        <i v-if="notice.icon" class="notice__icon" :class="notice.icon"></i>
        <div
          v-if="!notice.html"
          v-text="notice.title"
          class="notice__title"
        ></div>
        <div v-else v-html="notice.title" class="notice__title"></div>
      </div>
    </div>
  </TransitionHeight>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import store from '@/store'
import TransitionHeight from './TransitionHeight.vue'
import type { Notice } from '@/store/app'

/**
 * Computed property to retrieve notices from the Vuex store.
 */
const notices = computed<Notice[]>(() => store.state.app.notices)

/**
 * Computed property to check if animations are disabled.
 */
const disableAnimations = computed<boolean>(
  () => store.state.settings.disableAnimations
)

/**
 * Computed property to determine the transition group name based on animation settings.
 */
const transitionGroupName = computed<string | null>(() => {
  return !disableAnimations.value ? 'slide-notice' : null
})

/**
 * Handles the click event on a notice.
 * If the notice has an action, it executes it.
 * If the action returns false, it aborts hiding the notice.
 * Otherwise, it dispatches an action to hide the notice.
 * @param {Notice} notice - The notice object that was clicked.
 */
const onClick = (notice: Notice) => {
  if (typeof notice.action === 'function') {
    const result = notice.action()

    if (result === false) {
      return
    }
  }

  store.dispatch('app/hideNotice', notice.id)
}
</script>
