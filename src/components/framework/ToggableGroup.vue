<template>
  <div class="form-group toggable-group">
    <label class="checkbox-control" :class="[small && '-small']">
      <input
        type="checkbox"
        class="form-control"
        :checked="modelValue"
        @change="emit('change', $event)"
      />
      <div></div>
      <span>{{ label }}</span>
    </label>
    <TransitionHeight name="toggable-group">
      <div class="toggable-group__collapse" v-if="modelValue" key="content-on">
        <div class="pt8">
          <slot />
        </div>
      </div>
      <div
        class="toggable-group__collapse"
        v-if="$slots.off && !modelValue"
        key="content-off"
      >
        <div class="pt8">
          <slot name="off" />
        </div>
      </div>
    </TransitionHeight>
  </div>
</template>

<script setup lang="ts">
import TransitionHeight from './TransitionHeight.vue'

defineProps<{
  label: string
  small?: boolean
  modelValue: boolean
}>()

const emit = defineEmits(['change'])
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
