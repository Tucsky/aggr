<template>
  <button class="btn verte-control" @click="openPicker">
    <div
      class="verte-control__color"
      :style="{
        backgroundColor: value
      }"
    ></div>
    <i class="icon-dropper"></i>
  </button>
</template>

<script>
import dialogService from '../../../services/dialogService'

export default {
  name: 'Verte',
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
    currentColor: null,
    dialogInstance: null
  }),
  /* watch: {
    value(newColor) {
      this.currentColor = newColor
    }
  }, */
  beforeDestroy() {
    if (this.dialogInstance) {
      this.dialogInstance.close()
    }
  },
  methods: {
    openPicker() {
      this.dialogInstance = dialogService.openPicker(
        this.value,
        color => {
          this.$emit('input', color)
        },
        this.label
      )
    }
  }
}
</script>
