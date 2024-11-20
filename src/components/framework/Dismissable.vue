<template>
  <div v-if="!isDismissed" class="dismissable">
    <div class="dismissable__wrapper">
      <div class="dismissable__head">
        <h3 class="dismissable__title">
          <slot name="title"></slot>
        </h3>
        <Btn class="dismissable__close -small -text" @click="dismiss">
          <i class="icon-cross" />
        </Btn>
      </div>
      <p class="dismissable__subtitle">
        <slot></slot>
      </p>
      <div class="dismissable__footer" v-if="hasFooter">
        <slot name="footer"></slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, defineProps, onMounted, computed, useSlots } from 'vue'
import Btn from '@/components/framework/Btn.vue'
import notificationService from '@/services/notificationService'

// Define props
const props = defineProps<{
  id?: string
}>()

// Access slots
const slots = useSlots()

// Reactive state
const isDismissed = ref(false)

// Initialize dismiss state on mount
onMounted(() => {
  if (props.id) {
    isDismissed.value = notificationService.hasDismissed(props.id)
  }
})

// Computed property to check if the footer slot is provided
const hasFooter = computed(() => !!slots.footer)

// Dismiss function to update state and notify service
const dismiss = () => {
  if (props.id) {
    notificationService.dismiss(props.id)
  }
  isDismissed.value = true
}
</script>

<style lang="scss" scoped>
.dismissable {
  border: 1px solid var(--theme-background-50);
  border-radius: 0.5rem;
  position: relative;

  &--dismissed {
    order: 1;
  }

  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: var(--theme-background-base);
    background-size: cover;
    background-position: 0 10%;
    opacity: 0.5;
    background-blend-mode: overlay;

    #app.-light & {
      background-blend-mode: darken;
    }
  }

  &__wrapper {
    position: relative;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  &__head {
    display: flex;
    gap: 1rem;
    justify-content: space-between;
    align-items: flex-start;
  }

  &__title {
    margin: 0;
    color: var(--theme-color-base);
  }

  &__close {
    margin: -0.5rem -0.5rem 0 0;
  }

  &__subtitle {
    margin: 0;
  }

  &__footer {
    align-self: flex-end;
  }
}
</style>
