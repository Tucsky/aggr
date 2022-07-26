<template>
  <button class="btn color-picker-control" @click="openPicker">
    <div
      class="color-picker-control__color"
      :style="{
        backgroundColor: value
      }"
    ></div>
    <div class="color-picker-control__wrapper">
      <i class="icon-dropper"></i>
    </div>
  </button>
</template>

<script>
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
    },
    allowNull: {
      type: Boolean
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
  methods: {
    async openPicker() {
      let colorDidChanged = false
      let timeout

      this.dialogInstance = await dialogService.openPicker(
        this.value,
        color => {
          if (timeout) {
            clearTimeout(timeout)
          }
          colorDidChanged = true

          timeout = setTimeout(() => {
            timeout = null

            this.$emit('input', color)
          }, 500)
        },
        this.label,
        () => this.$emit('close', colorDidChanged),
        this.allowNull
      )
    }
  }
}
</script>
<style lang="scss" scoped>
.color-picker-control {
  background-color: transparent !important;
  background-image: $checkerboard;
  background-size: 6px 6px;
  background-position: 0 0, 3px -3px, 0 3px, -3px 0px;
  position: relative;
  overflow: hidden;
  border: 1px solid transparent;

  &__wrapper {
    position: relative;
    z-index: 1;
  }

  &__color {
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    position: absolute;
  }
}
</style>
