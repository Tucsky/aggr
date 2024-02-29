<template>
  <div class="form-group toggable-group">
    <label class="checkbox-control" :class="[small && '-small']">
      <input
        type="checkbox"
        class="form-control"
        :checked="value"
        @change="$emit('change', $event)"
      />
      <div></div>
      <span>{{ label }}</span>
    </label>
    <transition-height name="toggable-group">
      <div class="toggable-group__collapse" v-if="value" key="content-on">
        <div class="pt8">
          <slot />
        </div>
      </div>
      <div
        class="toggable-group__collapse"
        v-if="$slots.off && !value"
        key="content-off"
      >
        <div class="pt8">
          <slot name="off" />
        </div>
      </div>
    </transition-height>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import TransitionHeight from './TransitionHeight.vue'

@Component({
  name: 'ToggableGroup',
  components: {
    TransitionHeight
  },
  props: {
    label: {
      type: String,
      required: true
    },
    small: {
      type: Boolean,
      default: false
    },
    value: {
      required: true
    }
  }
})
export default class TogglableGroup extends Vue {}
</script>
<style lang="scss" scoped>
.toggable-group {
  &__collapse {
    margin-left: 2.625rem;

    &.toggable-group-leave-active,
    &.toggable-group-enter-active {
      overflow: hidden;
      transition: all 0.52s $ease-out-expo;
    }

    &.toggable-group-enter,
    &.toggable-group-leave-to {
      transform: translateX(-20%);
      opacity: 0;
    }
  }
}
</style>
