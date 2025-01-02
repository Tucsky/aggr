<template>
  <div class="threshold-dropdown">
    <h3>@ {{ formatAmount(threshold.amount) }}</h3>
    <div class="form-group mb8 threshold-panel__gif">
      <div class="column">
        <div class="form-group" v-if="isLegacy">
          <label>Buy gif</label>
          <input
            type="text"
            class="form-control w-100"
            placeholder="Giphy keyword"
            :value="threshold.buyGif"
            v-commit="[
              paneId + '/SET_THRESHOLD_GIF',
              value => ({
                id: threshold.id,
                side: 'buy',
                value
              })
            ]"
          />
        </div>
        <div class="form-group" v-if="isLegacy">
          <label>Sell gif</label>
          <input
            type="text"
            class="form-control w-100"
            placeholder="Giphy keyword"
            :value="threshold.sellGif"
            v-commit="[
              paneId + '/SET_THRESHOLD_GIF',
              value => ({
                id: threshold.id,
                side: 'sell',
                value
              })
            ]"
          />
        </div>
      </div>
    </div>
    <div class="form-group mb8 threshold-panel__colors">
      <label>Custom colors</label>
      <div class="column mt8">
        <div
          class="form-group column flex-center"
          title="When buy"
          v-tippy="{ placement: 'bottom' }"
        >
          <p class="help-text -center mr16 mt0 mb0">Buy</p>
          <ColorPickerControl
            label="Buy color"
            :modelValue="threshold.buyColor"
            @update:modelValue="
              store.commit(paneId + '/SET_THRESHOLD_COLOR', {
                id: threshold.id,
                side: 'buyColor',
                value: $event
              })
            "
          ></ColorPickerControl>
        </div>
        <div
          class="form-group column flex-center"
          title="When sell"
          v-tippy="{ placement: 'bottom' }"
        >
          <p class="help-text -center mr16 mt0 mb0">Sell</p>
          <ColorPickerControl
            label="Sell color"
            :modelValue="threshold.sellColor"
            @update:modelValue="
              store.commit(paneId + '/SET_THRESHOLD_COLOR', {
                id: threshold.id,
                side: 'sellColor',
                value: $event
              })
            "
          ></ColorPickerControl>
        </div>
      </div>
    </div>
    <button type="button" class="btn -red mt16" @click="removeThreshold">
      <i class="icon-trash mr8"></i> Remove
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import store from '@/store'
import dialogService from '../../services/oldDialogService'
import { formatAmount } from '../../services/productsService'
import type { Threshold } from '../../store/panesSettings/trades'
import ColorPickerControl from '../framework/picker/ColorPickerControl.vue'

// Define props with types and defaults
const props = withDefaults(
  defineProps<{
    paneId: string
    threshold: Threshold
    canDelete?: boolean
  }>(),
  {
    canDelete: false
  }
)

// Define emits for the component
const emit = defineEmits<{
  (e: 'input', value: Threshold | null): void
}>()

// Computed property to determine if the pane type is 'trades'
const isLegacy = computed(() => {
  return store.state.panes.panes[props.paneId].type === 'trades'
})

// Method to remove the threshold
const removeThreshold = () => {
  if (!props.canDelete) {
    dialogService.confirm({
      message: `You can't delete the threshold because there is only 2 and the minimum is 2`,
      cancel: null
    })
    return
  }

  store.commit(`${props.paneId}/DELETE_THRESHOLD`, props.threshold.id)
  emit('input', null)
}
</script>

<style lang="scss" scoped>
.threshold-dropdown {
  background-color: var(--theme-background-100);
  border-radius: 4px;
  padding: 1rem;
  max-width: 220px;

  .form-group {
    min-width: 1px;

    .form-control {
      background: none;
      border: 1px solid var(--theme-background-300);
      color: var(--theme-color-base);
    }
  }

  code {
    color: var(--theme-color-base);
    font-weight: 600;
  }

  h3 {
    font-weight: 400;
    margin: 0 0 1rem;
    color: var(--theme-color-base);

    [contenteditable] {
      color: black;
      background-color: white;
      padding: 0.25rem;
      border-radius: 1px;
      font-size: 0.75rem;
      vertical-align: top;
      font-family: inherit;
    }
  }

  &__close {
    position: absolute;
    opacity: 0.5;
    right: 0;
    top: 0;
    padding: 1rem;
    font-size: 1.125rem;
    text-decoration: none;

    &:hover {
      opacity: 1;
    }
  }

  &__colors {
    .form-group .form-control {
      height: auto;
      width: auto;
      min-width: 1px;
      border: 0;
      font-family: monospace;
      letter-spacing: -0.1rem;
      font-size: 0.9rem;
      font-weight: 400;
      padding: 1.25rem 1rem;
    }
  }

  &.-minimum {
    .threshold-panel__gif {
      display: none;
    }
  }
}
</style>
