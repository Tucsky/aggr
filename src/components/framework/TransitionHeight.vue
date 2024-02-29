<template>
  <component
    :is="type"
    class="transition-height"
    :class="[active && 'transition-height--active']"
    :name="name"
    :tag="tag"
    :duration="duration"
    @before-enter="beforeEnter"
    @enter="enter"
    @after-enter="afterEnter"
    @before-leave="beforeLeave"
    @leave="leave"
  >
    <slot />
  </component>
</template>

<script>
/* eslint-disable no-param-reassign */

export default {
  name: 'TransitionHeight',
  props: {
    single: {
      type: Boolean,
      default: false
    },
    name: {
      type: String,
      required: false,
      default: 'transition-height'
    },
    tag: {
      type: String,
      required: false,
      default: 'div'
    },
    duration: {
      type: Number,
      default: null
    },
    stepper: {
      type: Boolean,
      default: false
    },
    wrapped: {
      type: Boolean,
      default: false
    },
    autoWidth: {
      type: Boolean,
      default: false
    },
    fillHeight: {
      type: Boolean,
      default: false
    }
  },
  data: () => ({
    transitionTimeout: null
  }),
  computed: {
    type() {
      if (this.single) {
        return 'transition'
      }

      return 'transition-group'
    },
    active() {
      if (!this.duration || this.transitionTimeout) {
        return true
      }

      return false
    }
  },
  methods: {
    beforeEnter(element) {
      if (this.stepper) {
        this.$el.style.height = `${this.$el.clientHeight}px`
        element.style.top = '0px'
        element.style.left = '0px'
        element.style.right = '0px'
      }

      element.style.position = 'absolute'

      if (this.autoWidth) {
        element.style.left = '0px'
        element.style.right = '0px'
      }

      if (this.fillHeight) {
        element.style.bottom = '0px'
      }
    },

    async enter(element) {
      await this.scheduleComplete()

      const height = this.getElementHeight(element)

      if (this.stepper) {
        this.$el.style.height = height
      } else {
        if (this.autoWidth) {
          element.style.left = '0px'
          element.style.right = '0px'
        }
        element.style.height = '0px'
        element.style.position = ''

        setTimeout(() => {
          element.style.height = height
        }, 100)
      }
    },

    afterEnter(element) {
      if (this.stepper) {
        this.$el.style.height = ''
        element.style.top = ''
        element.style.left = ''
        element.style.right = ''
      }

      element.style.position = ''
      element.style.left = ''
      element.style.right = ''
      element.style.bottom = ''
      element.style.height = ''

      this.$emit('after-enter', element)
    },

    beforeLeave(element) {
      element.style.height = `${element.clientHeight}px`
    },

    leave(element) {
      setTimeout(() => {
        element.style.height = '0px'
      })
    },

    async scheduleComplete() {
      if (!this.duration) {
        return
      }

      if (this.transitionTimeout) {
        clearTimeout(this.transitionTimeout)
      }

      this.transitionTimeout = setTimeout(() => {
        this.transitionTimeout = null
      }, this.duration + 100)

      await this.$nextTick()
    },

    getElementHeight(element) {
      let height

      if (this.wrapped) {
        height = element.children[0].clientHeight
      } else {
        height = element.clientHeight
      }

      return height ? `${height}px` : '0px'
    }
  }
}
</script>

<style lang="scss">
/* transition-height */

.transition-height {
  transition: height 0.25s $ease-out-expo;

  &-leave-active,
  &-enter-active {
    overflow: hidden;
    transition: all 0.25s $ease-out-expo;
  }

  &-enter,
  &-leave-to {
    opacity: 0;
  }

  &--active {
    position: relative;
  }
}

.transition-height-scale {
  &-enter-active {
    transition:
      all 0.25s $ease-out-expo 0.15s,
      height 0.375s $ease-out-expo;
  }

  &-leave-active {
    transition: all 0.15s $ease-out-expo;
  }

  &-enter,
  &-leave-to {
    opacity: 0;
    transform: scale(0.8);
  }
}

.slide-fade-right,
.slide-fade-left {
  &-enter-active,
  &-leave-active {
    transition: all 0.25s $ease-out-expo;
  }

  &-enter,
  &-leave-to {
    opacity: 0;
  }
}

.slide-fade-left {
  &-enter {
    transform: translateX(-2rem);
  }

  &-leave-to {
    transform: translateX(2rem);
  }
}

.slide-fade-right {
  &-enter {
    transform: translateX(2rem);
  }

  &-leave-to {
    transform: translateX(-2rem);
  }
}
</style>
