<template>
  <button
    class="btn color-picker-control"
    @click="openPicker"
    :style="{
      '--text-color': inverseValue,
      '--background-color': value
    }"
  >
    <div class="color-picker-control__color"></div>
    <div class="color-picker-control__wrapper"></div>
  </button>
</template>

<script lang="ts">
import { joinRgba, splitColorCode, getLinearShadeText } from '@/utils/colors'
import dialogService from '../../../services/dialogService'

export default {
  name: 'ColorPickerControl',
  props: {
    value: {
      type: String,
      default: '#000'
    },
    label: {
      type: String
    }
  },
  data: () => ({
    dialogInstance: null
  }),
  beforeDestroy() {
    if (this.dialogInstance) {
      this.dialogInstance.close()
    }
  },
  computed: {
    inverseValue() {
      if (!this.value) {
        return
      }

      return joinRgba(getLinearShadeText(splitColorCode(this.value), 0.5))
    }
  },
  methods: {
    async openPicker() {
      this.colorDidChanged = false

      this.dialogInstance = await dialogService.openPicker(
        this.value,
        this.label,
        this.onInput,
        this.onClose
      )
    },
    onInput(color) {
      if (this._debounceTimeoutId) {
        clearTimeout(this._debounceTimeoutId)
      }
      this.colorDidChanged = true

      this._debounceTimeoutId = setTimeout(() => {
        this._debounceTimeoutId = null

        this.onChange(color)
      }, 500)
    },
    onChange(color) {
      this.$emit('input', color)
    },
    onClose() {
      this.$emit('close', this.colorDidChanged)
    }
  }
}
</script>
<style lang="scss" scoped>
.color-picker-control {
  background-color: transparent !important;
  background-image: $checkerboard;
  background-size: 14px 14px;
  background-position:
    0 0,
    7px -7px,
    0 7px,
    -7px 0px;
  position: relative;
  overflow: hidden;
  padding: 0;

  + label {
    color: var(--theme-color-base);
  }

  &__wrapper {
    position: relative;
    width: 2em;
    height: 2em;
    border: 1px solid var(--background-color);
    border-radius: 0.25rem;
    outline: 1px solid #0000000f;
    background-color: var(--background-color);
    box-sizing: border-box;

    i {
      display: block;
      color: var(--text-color);
    }
  }

  &__color {
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    position: absolute;
    border-radius: 0.25rem;
  }
}
</style>
