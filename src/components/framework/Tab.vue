<template>
  <button
    type="button"
    class="btn tab"
    :class="{ 'tab--active': isSelected }"
    @click="handleClick"
  >
    <slot />
    <transition
      name="tab__control"
      @before-enter="beforeEnter"
      @enter="enter"
      @after-enter="afterEnter"
      @before-leave="beforeLeave"
      @leave="leave"
    >
      <div v-if="slots.control && isSelected" class="tab__control">
        <slot name="control"></slot>
      </div>
    </transition>
  </button>
</template>

<script setup lang="ts">
import { computed, inject, Ref, useSlots } from 'vue'

const props = defineProps({
  name: {
    type: String,
    required: true
  }
})

const slots = useSlots()
const selectedTab = inject('selectedTab') as Ref<string | null>
const selectTab = inject('selectTab') as (name: string) => void

// Determine if this tab is selected
const isSelected = computed(() => selectedTab.value === props.name)

const handleClick = () => {
  selectTab(props.name)
}

// Transition hooks remain the same...
const beforeEnter = (el: HTMLElement) => {
  el.style.position = 'absolute'
}

const enter = (el: HTMLElement) => {
  const finalWidth = el.scrollWidth + 'px'
  el.style.position = ''
  el.style.width = '0px'
  requestAnimationFrame(() => {
    el.style.width = finalWidth
  })
}

const afterEnter = (el: HTMLElement) => {
  el.style.width = ''
}

const beforeLeave = (el: HTMLElement) => {
  el.style.width = el.scrollWidth + 'px'
}

const leave = (el: HTMLElement) => {
  requestAnimationFrame(() => {
    el.style.width = '0px'
  })
}
</script>

<style lang="scss" scoped>
.tab {
  display: inline-flex;
  border: 0;
  background: 0;
  text-align: center;
  padding: 0 1rem;
  align-items: center;
  cursor: pointer;
  text-transform: none;
  border-radius: 8px 8px 0 0;
  font-size: 1.125rem;
  color: var(--theme-color-100);
  font-family: $font-base;
  border: 1px solid transparent;
  border-bottom: 0;

  &:hover {
    color: var(--theme-color-base);
    background: 0;
    border-color: transparent;
  }

  &:focus {
    box-shadow: none;
  }

  &.tab--active {
    position: relative;
    z-index: 1;
    color: var(--theme-color-base);
    border: 1px solid var(--theme-background-200);
    border-bottom: 0;
    outline: 0;
    background: var(--theme-background-100);
    z-index: 26;
    position: relative;

    &:active {
      box-shadow: 0 1px 0 1px var(--theme-background-100);
      background: var(--theme-background-100);
    }
  }

  &__control {
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    right: -0.5rem;

    transition:
      width 0.5s $ease-out-expo 0.1s,
      opacity 0.5s $ease-out-expo,
      transform 0.5s $ease-out-expo;

    &-enter-active {
      transition:
        width 0.5s $ease-out-expo,
        opacity 0.5s $ease-out-expo 0.1s,
        transform 0.5s $ease-out-expo 0.1s;
    }

    &-enter-from,
    &-leave-to {
      opacity: 0;
      transform: translateX(100%);
    }
  }
}
</style>
