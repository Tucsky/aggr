<template>
  <img v-if="imageObjectUrl" :src="imageObjectUrl" />
</template>

<script lang="ts">
import { Component, Vue, Watch } from 'vue-property-decorator'

@Component({
  name: 'BlobImage',
  props: {
    value: {
      type: [Blob, File],
      default: null
    }
  }
})
export default class BlobImage extends Vue {
  value: Blob | File
  imageObjectUrl: string = null

  @Watch('value', { immediate: true })
  onBlobChange() {
    this.loadBlob()
  }

  beforeDestroy() {
    this.clearBlob()
  }

  loadBlob() {
    this.clearBlob()

    if (this.value instanceof Blob || (this.value as any) instanceof File) {
      this.imageObjectUrl = URL.createObjectURL(this.value)
    }
  }

  clearBlob() {
    if (this.imageObjectUrl) {
      URL.revokeObjectURL(this.imageObjectUrl)
      this.imageObjectUrl = null
    }
  }
}
</script>
