<template>
  <transition name="dropdown" @enter="onEnterStart">
    <div
      class="dropdown hide-scrollbar"
      :class="[
        noScroll && 'dropdown--no-scroll',
        transparent && 'dropdown--transparent'
      ]"
      v-if="triggerElement"
      :style="{ top: top + 'px', left: left + 'px' }"
      @click.stop="!interactive && toggle(null, true)"
    >
      <slot />
    </div>
  </transition>
</template>

<script lang="ts">
import { isTouchSupported } from '@/utils/touchevent'

export default {
  name: 'Dropdown',
  props: {
    value: {
      required: false,
      default: null
    },
    margin: {
      type: Number,
      required: false,
      default: 16
    },
    interactive: {
      type: Boolean,
      required: false,
      default: false
    },
    noScroll: {
      type: Boolean,
      required: false,
      default: false
    },
    onSides: {
      type: Boolean,
      required: false,
      default: false
    },
    transparent: {
      type: Boolean,
      required: false,
      default: false
    }
  },
  watch: {
    /**
     * v-model (which contain the triggerElement) was updated from parent component
     */
    value(triggerElement) {
      this.toggle(triggerElement)
    }
  },
  data: () => ({
    triggerElement: null,
    top: null,
    left: null
  }),
  beforeDestroy() {
    this.toggle(null, true)

    if (this.$el instanceof HTMLElement) {
      document.getElementById('app').removeChild(this.$el)
    }
  },
  methods: {
    /**
     * Open the dropdown
     */
    async open(nextTriggerElement: HTMLElement) {
      nextTriggerElement.classList.add('dropdown-trigger')

      document.getElementById('app').appendChild(this.$el)

      if (this.$el instanceof HTMLElement) {
        this.fitScreen()
      }

      this.bindResize()

      await this.$nextTick()

      this.bindClickOutside()
    },

    /**
     * Closes the dropdown
     */
    close() {
      if (!this.triggerElement) {
        return
      }

      if (this.triggerElement.classList) {
        this.triggerElement.classList.remove('dropdown-trigger')
      }

      this.unbindResize()
      this.unbindClickOutside()
    },

    /**
     * Enter animation started
     */
    async onEnterStart() {
      await this.$nextTick()

      this.fitScreen()

      const button = this.$el.querySelector('button')

      if (button) {
        button.focus()
      }
    },

    /**
     * Close if was open then open if given a trigger element
     * @param {HTMLElement} triggerElement element that triggered the dropdown
     * @param {boolean} emit mutate v-model with the new triggerElement if true
     */
    toggle(triggerElement: HTMLElement, emit = false) {
      const nextTriggerElement =
        triggerElement && triggerElement !== this.triggerElement
          ? triggerElement
          : null

      if (this.triggerElement) {
        this.close()
      }

      this.triggerElement = nextTriggerElement

      if (nextTriggerElement && nextTriggerElement.classList) {
        this.open(nextTriggerElement)
      }

      if (emit) {
        this.$emit('input', this.triggerElement)
      }
    },

    /**
     * Align the dropdown below or above of trigger element
     */
    fitScreen() {
      const triggerElement = this.triggerElement as HTMLElement
      if (!triggerElement || !triggerElement.getBoundingClientRect) {
        return
      }

      const dropdownElement = this.$el as HTMLElement
      if (!dropdownElement || !dropdownElement.getBoundingClientRect) {
        return
      }

      /*const fontSize = getComputedStyle(triggerElement).fontSize
      this.$el.style.fontSize = fontSize*/
      dropdownElement.offsetHeight

      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const triggerElementRect = triggerElement.getBoundingClientRect()
      const dropdownElementRect = dropdownElement.getBoundingClientRect()
      const dropdownElementWidth = dropdownElementRect.width

      let optimalLeft

      if (this.onSides) {
        // show show the dropdown above the trigger if the later is lower than viewport mid
        const triggerIsBeyondViewportMiddle =
          triggerElementRect.left > viewportWidth / 2

        if (triggerIsBeyondViewportMiddle) {
          optimalLeft =
            triggerElementRect.left - dropdownElementWidth - this.margin
        } else {
          optimalLeft =
            triggerElementRect.left + triggerElementRect.width + this.margin
        }
      } else {
        optimalLeft = viewportWidth - dropdownElementWidth - this.margin * 2
      }

      // align the dropdown on the trigger center while avoiding going beyond the viewport
      this.left = Math.max(
        this.margin,
        Math.min(
          triggerElementRect.left +
            triggerElementRect.width / 2 -
            dropdownElementWidth / 2,
          optimalLeft
        )
      )

      const maxHeight = triggerElementRect.top - this.margin * 2
      dropdownElement.style.maxHeight = maxHeight + 'px'

      const dropdownElementHeight = Math.min(
        maxHeight,
        dropdownElement.scrollHeight
      )

      if (this.onSides) {
        this.top =
          triggerElementRect.top +
          triggerElementRect.height / 2 -
          dropdownElementHeight / 2
      } else {
        // show show the dropdown above the trigger if the later is lower than viewport mid
        const triggerIsLowerThanViewportMiddle =
          triggerElementRect.top > viewportHeight / 2

        if (triggerIsLowerThanViewportMiddle) {
          // top = trigger top - (dropdownHeight + margin)
          this.top =
            triggerElementRect.top - (dropdownElementHeight + this.margin)
        } else {
          dropdownElement.style.maxHeight =
            viewportHeight -
            triggerElementRect.top -
            triggerElementRect.height -
            this.margin * 2 +
            'px'

          // top = trigger top + it's height + margin
          this.top =
            triggerElementRect.top + triggerElementRect.height + this.margin
        }
      }
    },

    bindResize() {
      if (this._resizeHandler) {
        return
      }

      this._resizeHandler = this.onResize.bind(this)
      window.addEventListener('resize', this._resizeHandler)
    },
    onResize() {
      if (this._resizeTimeout) {
        clearTimeout(this._resizeTimeout)
      }

      this._resizeTimeout = setTimeout(() => {
        this.fitScreen(true)

        this._resizeTimeout = null
      }, 500)
    },
    unbindResize() {
      if (!this._resizeHandler) {
        return
      }

      window.removeEventListener('resize', this._resizeHandler)
      this._resizeHandler = null
    },
    bindClickOutside() {
      if (this.clickOutsideHandler) {
        return
      }

      this.clickOutsideHandler = event => {
        if (
          !this.$el.contains(event.target) &&
          !this.triggerElement.contains(event.target) &&
          this.triggerElement !== event.target
        ) {
          this.toggle(null, true)
        }
      }

      document.addEventListener(
        isTouchSupported() ? 'touchstart' : 'mousedown',
        this.clickOutsideHandler
      )
    },
    unbindClickOutside() {
      if (!this.clickOutsideHandler) {
        return
      }

      document.removeEventListener(
        isTouchSupported() ? 'touchstart' : 'mousedown',
        this.clickOutsideHandler
      )

      this.clickOutsideHandler = null
    }
  }
}
</script>

<style lang="scss" scoped>
.dropdown {
  position: fixed;
  z-index: 10;
  border-radius: 0.75em;
  background-color: var(--theme-background-200);
  box-shadow: rgba(0, 0, 0, 0.2) 0px 18px 50px -10px;
  max-height: 150px;
  max-width: 300px;
  overflow-y: auto;
  text-align: left;

  &--transparent {
    box-shadow: none;
    background: 0;
  }

  &--no-scroll {
    overflow: visible;
  }

  &-enter-active {
    transition: all 0.2s $ease-out-expo, transform 0.2s $ease-elastic;
    pointer-events: none;
  }

  &-leave-active {
    transition: all 0.5s $ease-out-expo;
  }

  &-leave,
  &-enter-to {
    opacity: 1;
    transform: none;
  }

  &-enter,
  &-leave-to {
    opacity: 0;
    transform: scale(0.8);
  }

  ::v-deep &-divider {
    background-color: var(--theme-color-base);
    opacity: 0.1;
    height: 1px;
    padding: 0;
    margin: 0.5em 0;
  }

  ::v-deep &-item {
    border: 0;
    background: 0;
    padding: 0.625em;
    display: flex;
    align-items: center;
    color: var(--theme-color-base);
    width: 100%;
    cursor: pointer;
    box-sizing: border-box;
    font-size: 1em;

    &:hover {
      background-color: var(--theme-color-o10);
    }

    &__subtitle {
      opacity: 0.5;
      font-size: 0.875em;
      margin-top: 0.25em;
    }

    &--space-between {
      justify-content: space-between;
    }

    > i:first-child {
      margin-right: 0.5em;
    }

    > i:last-child {
      margin-left: 0.5em;
    }
  }
}
</style>
