<template>
  <transition name="draggable-market">
    <div class="draggable-market" :style="styles">
      <i :class="`icon-${market.exchange}`" class="draggable-market__icon"></i>
      {{ market.id }}
    </div>
  </transition>
</template>
<script setup lang="ts">
import { ref, computed, watch } from 'vue'

// Props
const props = defineProps({
  market: {
    type: Object,
    required: true
  },
  target: {
    type: Object,
    required: true
  }
})

// Reactive position
const position = ref({
  x: props.target.x,
  y: props.target.y
})

// Computed styles
const styles = computed(() => ({
  top: Math.round(position.value.y) + 'px',
  left: Math.round(position.value.x) + 'px'
}))

// Animation flag
let animating = false

// Animate function
const animate = target => {
  if (target) {
    animating = true
  }

  const offset = {
    x: target.x - position.value.x,
    y: target.y - position.value.y
  }

  const distance = Math.abs(offset.x) + Math.abs(offset.y)

  if (distance < 1) {
    animating = false
    return
  }

  position.value.x += offset.x * 0.125
  position.value.y += offset.y * 0.125

  requestAnimationFrame(() => animate(target))
}

// Watch for changes in target
watch(
  () => props.target,
  newValue => {
    if (!animating) {
      animate(newValue)
    }
  }
)
</script>

<style lang="scss">
.draggable-market {
  pointer-events: none;
  position: absolute;
  display: inline-flex;
  align-items: center;
  background-color: var(--theme-background-100);
  box-shadow: rgba(0, 0, 0, 0.2) 0px 18px 50px -10px;
  padding: 0.5rem;
  border-radius: 0.5rem;
  gap: 0.25rem;
  z-index: 10;
  line-height: 1;

  &__icon {
    font-size: 1.25rem;
  }

  &-enter-active {
    transition:
      all 0.2s $ease-out-expo,
      transform 0.2s $ease-elastic;
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

  &-enter-from,
  &-leave-to {
    opacity: 0;
    transform: scale(0.8);
  }
}
</style>
