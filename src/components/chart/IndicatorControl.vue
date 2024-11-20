<template>
  <div class="indicator" :class="{ '-error': !!error, '-disabled': !visible }">
    <button type="button" class="indicator__name pane-overlay" @click="onClick">
      {{ name }}
    </button>

    <div class="indicator__controls">
      <button
        class="btn"
        @click="toggleVisibility"
        :title="visible ? 'Hide' : 'Show'"
      >
        <i :class="{ 'icon-visible': !visible, 'icon-hidden': visible }"></i>
      </button>

      <button
        class="btn"
        @click="
          $emit('action', { indicatorId, actionName: 'remove', event: $event })
        "
        title="Menu"
      >
        <i class="icon-cross"></i>
      </button>

      <button
        class="btn"
        @click="
          $emit('action', { indicatorId, actionName: 'menu', event: $event })
        "
        title="Menu"
      >
        <i class="icon-more"></i>
      </button>
    </div>
    <div
      class="indicator__legend pane-overlay"
      :id="paneId + indicator.id"
    ></div>
    <div v-if="error">
      <i class="icon-warning ml4 mr8"></i>
      {{ error }}
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed } from 'vue'
import store from '@/store' // Rule #11

// Props
const props = defineProps({
  paneId: {
    type: String,
    required: true
  },
  indicatorId: {
    type: String,
    required: true
  }
})

// Emits
const emit = defineEmits(['action'])

// Computed properties
const indicator = computed(
  () => store.state[props.paneId].indicators[props.indicatorId]
)

const name = computed(() => {
  if (indicator.value.displayName) {
    return indicator.value.displayName
  } else if (indicator.value.name) {
    return indicator.value.name
  } else {
    return props.indicatorId
  }
})

const visible = computed(() => {
  return !indicator.value.options ||
    typeof indicator.value.options.visible === 'undefined'
    ? true
    : indicator.value.options.visible
})

const error = computed(
  () => store.state[props.paneId].indicatorsErrors[props.indicatorId]
)

// Methods
const onClick = (event: MouseEvent) => {
  if (event.shiftKey) {
    emit('action', { actionName: 'resize', indicatorId: props.indicatorId })
    return
  }

  emit('action', { indicatorId: props.indicatorId })
}

const toggleVisibility = () => {
  store.dispatch(`${props.paneId}/toggleSerieVisibility`, props.indicatorId)
}
</script>

<style lang="scss" scoped>
.indicator {
  display: flex;
  white-space: nowrap;
  height: 1.3em;
  color: var(--theme-color-100);

  i {
    vertical-align: bottom;
  }

  &.-error {
    color: $red;
  }

  &.-disabled {
    opacity: 0.5;

    .pane-overlay {
      background: 0;
    }

    .indicator__legend {
      display: none;
    }
  }

  &__name {
    position: relative;
    padding: 0 0.25em;
    border: 0;
    font-size: inherit;
    font-family: inherit;
    cursor: pointer;
  }

  &__legend {
    color: var(--theme-buy-100);
    font-family: $font-monospace;
    pointer-events: none;
    line-height: 1.75em;
    letter-spacing: 0px;
    position: absolute;
    font-size: 0.75em;
    margin: 0 0 0 1em;
    left: 100%;
    padding: 0 0.5em;
  }

  &__controls {
    padding-left: 1rem;
    margin-left: -1rem;
    display: none;
    align-items: center;
    pointer-events: none;

    &:hover {
      display: inline-flex;
    }

    > .btn {
      border-radius: 0;
      padding: 0.25em;
      font-size: 1em;
      background-color: var(--theme-buy-50);
      border: 1px solid var(--theme-buy-base);

      &:hover {
        background-color: var(--theme-buy-base);
        border-color: var(--theme-buy-100);
      }

      border-right-width: 0;
      border-left-width: 0;

      &:first-child {
        border-radius: 0.25em 0 0 0.25em;
        border-left-width: 1px;
      }

      &:last-child {
        border-radius: 0 0.25em 0.25em 0;
        border-right-width: 1px;
      }

      &:first-child:last-child {
        border-radius: 0.25em;
      }
    }
  }

  &:hover {
    position: relative;
    z-index: 1;
    color: var(--theme-color-base);

    .indicator__controls {
      display: inline-flex;
      pointer-events: all;
    }
  }
}
</style>
