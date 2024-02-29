<template>
  <button
    class="btn color-picker-control"
    @click="openPicker"
    :style="{
      '--text-color': inverseValue,
      '--background-color': value
    }"
  >
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
  position: relative;
  padding: 0 !important;
  border-radius: 0.25rem;
  outline: 1px solid var(--theme-base-o50);
  background-color: transparent;
  box-sizing: content-box;
  background-image: $checkerboard;
  background-size: 14px 14px;
  background-position:
    0 0,
    7px -7px,
    0 7px,
    -7px 0px;

  &:after {
    content: '';
    background-color: var(--background-color);
    border: 1px solid var(--background-color);
    width: 2rem;
    height: 2rem;
    border-radius: 0.25rem;
  }

  + label {
    color: var(--theme-color-base);
  }

  &:hover {
    border-color: transparent;
    background-color: transparent;
  }
}
</style>
