<template>
  <div class="form-group toggable-group">
    <label class="checkbox-control">
      <input
        type="checkbox"
        class="form-control"
        :checked="value"
        @change="$emit('change', $event)"
      />
      <div class="mr8"></div>
      <span>{{ label }}</span>
    </label>
    <transition-height name="toggable-group" single>
      <div class="toggable-group__collapse" v-if="value">
        <div class="pt8">
          <slot />
        </div>
      </div>
    </transition-height>
    <transition-height v-if="$slots.off" name="toggable-group" single>
      <div class="toggable-group__collapse" v-if="!value">
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
    value: {
      required: true
    }
  }
})
export default class extends Vue {}
</script>
<style lang="scss" scoped>
.toggable-group {
  &__collapse {
    margin-left: 3.25rem;

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
