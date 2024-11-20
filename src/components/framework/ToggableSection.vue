<template>
  <section
    class="toggable-section"
    :class="[
      small && 'toggable-section--small',
      outline && 'toggable-section--outline',
      inset && 'toggable-section--inset',
      disabled && 'toggable-section--disabled'
    ]"
  >
    <div class="toggable-section__wrapper">
      <div class="toggable-section__header" @click="toggle">
        <slot name="title">
          <div class="toggable-section__title">
            {{ title }}
            <span v-if="!value && badge" class="badge -outline ml8">{{
              badge
            }}</span>
          </div>
        </slot>
        <small v-if="description">
          {{ description }}
        </small>
        <div
          v-if="$slots.control"
          class="toggable-section__control"
          @click.stop
        >
          <slot name="control" />
        </div>
        <i class="icon-up-thin"></i>
      </div>
      <TransitionHeight single auto-width>
        <div v-if="value" class="toggable-section__content" key="section">
          <div class="toggable-section__spacer" />
          <slot />
        </div>
      </TransitionHeight>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { randomString } from '../../utils/helpers'
import TransitionHeight from './TransitionHeight.vue'
import store from '@/store'

const props = defineProps<{
  model?: string[]
  id?: string
  disabled?: boolean
  title?: string
  description?: string
  inset?: boolean
  small?: boolean
  outline?: boolean
  badge?: string | number
  autoClose?: boolean
  autoOpen?: boolean
}>()

const model = ref(props.model || [])

const emit = defineEmits(['update:model'])
const sectionId = ref(props.id || randomString(8))

const sections = computed(() => {
  return props.id ? store.state.settings.sections : model.value
})

const value = computed(() => {
  return sections.value?.includes(sectionId.value)
})

function toggle(event?: MouseEvent) {
  event?.stopPropagation()

  if (props.id) {
    store.commit('settings/TOGGLE_SECTION', sectionId.value)
  } else {
    const index = model.value?.indexOf(sectionId.value) ?? -1

    if (props.autoClose && model.value && model.value.length) {
      model.value.splice(0, model.value.length)
      if (index === -1) {
        model.value.push(sectionId.value)
      }
      emit('update:model', model.value)
      return
    }

    if (index === -1) {
      model.value?.push(sectionId.value)
    } else {
      model.value?.splice(index, 1)
    }

    emit('update:model', model.value)
  }
}

onMounted(() => {
  if (props.autoOpen && !value.value) {
    toggle()
  }
})
</script>

<style lang="scss" scoped>
.toggable-section {
  $self: &;
  padding: 1rem;

  &--inset {
    margin: -1rem;

    + .toggable-section {
      margin-top: 1rem;
    }
  }

  &--disabled {
    opacity: 0.5;
    pointer-events: none;
    cursor: default;
  }

  &--outline {
    border: 1px solid var(--theme-color-o20);
    border-radius: 0.5rem;

    &:not(:last-child) {
      border-bottom-left-radius: 0;
      border-bottom-right-radius: 0;
    }

    + .toggable-section {
      border-top: 0;
      border-top-left-radius: 0;
      border-top-right-radius: 0;
    }
  }

  &--small {
    padding: 0;

    .toggable-section__header {
      margin: 0;
      padding: 0.5rem;
    }

    .toggable-section__spacer {
      margin: 0;
    }
  }

  &__wrapper {
    position: relative;
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
    margin: -1rem;
    padding: 1rem;
    color: var(--theme-color-base);
    position: relative;
    cursor: pointer;

    small {
      visibility: hidden;
      margin-left: auto;
      font-size: 12px;
      line-height: 1;
      text-align: right;
      padding-left: 1rem;
      color: var(--theme-color-200);

      + .icon-up-thin {
        margin-left: 1rem;
      }
    }

    .icon-up-thin {
      margin-left: 0.5rem;
      transition: transform 0.2s $ease-elastic;
    }

    &:last-child {
      color: var(--theme-color-100);

      .toggable-section__control {
        display: none;
      }

      .icon-up-thin {
        transform: rotateZ(180deg);
      }
    }
  }

  &__spacer {
    margin-top: 0.5rem;
  }

  &__content {
    position: relative;
  }

  &__control {
    position: absolute;
    right: 0.75rem;
    top: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    width: 0;
  }

  &__title {
    position: relative;
    display: flex;
    align-items: center;

    .badge {
      margin-left: 0.5rem;
      font-size: 0.75rem;
    }
  }

  &:hover {
    background-color: var(--theme-background-150);

    .toggable-section__header {
      opacity: 1;

      small {
        visibility: visible;
      }
    }
  }
}
</style>
