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
            @change="
              $store.commit(paneId + '/SET_THRESHOLD_GIF', {
                id: threshold.id,
                side: 'buy',
                value: $event.target.value
              })
            "
          />
        </div>
        <div class="form-group" v-if="isLegacy">
          <label>Sell gif</label>
          <input
            type="text"
            class="form-control w-100"
            placeholder="Giphy keyword"
            :value="threshold.sellGif"
            @change="
              $store.commit(paneId + '/SET_THRESHOLD_GIF', {
                id: threshold.id,
                side: 'sell',
                value: $event.target.value
              })
            "
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
          <color-picker-control
            label="Buy color"
            :value="threshold.buyColor"
            @input="
              $store.commit(paneId + '/SET_THRESHOLD_COLOR', {
                id: threshold.id,
                side: 'buyColor',
                value: $event
              })
            "
          ></color-picker-control>
        </div>
        <div
          class="form-group column flex-center"
          title="When sell"
          v-tippy="{ placement: 'bottom' }"
        >
          <p class="help-text -center mr16 mt0 mb0">Sell</p>
          <color-picker-control
            label="Sell color"
            :value="threshold.sellColor"
            @input="
              $store.commit(paneId + '/SET_THRESHOLD_COLOR', {
                id: threshold.id,
                side: 'sellColor',
                value: $event
              })
            "
          ></color-picker-control>
        </div>
      </div>
    </div>
    <button type="button" class="btn -red mt16" @click="removeThreshold">
      <i class="icon-trash mr8"></i> Remove
    </button>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import dialogService from '../../services/dialogService'
import { formatAmount } from '../../services/productsService'
import { Threshold } from '../../store/panesSettings/trades'
import ColorPickerControl from '../framework/picker/ColorPickerControl.vue'

@Component({
  name: 'ThresholdDropdown',
  components: {
    ColorPickerControl
  },
  props: {
    paneId: {
      type: String,
      required: true
    },
    threshold: {
      required: true
    },
    canDelete: {
      default: false
    }
  }
})
export default class ThresholdDropdown extends Vue {
  private paneId: string
  private threshold: Threshold
  private canDelete: boolean

  get isLegacy() {
    return this.$store.state.panes.panes[this.paneId].type === 'trades'
  }

  formatAmount(value) {
    return formatAmount(value)
  }

  removeThreshold() {
    if (!this.canDelete) {
      dialogService.confirm({
        message: `You can't delete the threshold because there is only 2 and the minimum is 2`,
        cancel: null
      })

      return
    }

    this.$store.commit(this.paneId + '/DELETE_THRESHOLD', this.threshold.id)
    this.$emit('input', null)
  }
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
