<template>
  <div v-if="isActive" class="tab__content">
    <slot />
  </div>
</template>

<script lang="ts">
import { slugify } from '@/utils/helpers'
import { Component, Vue, Watch } from 'vue-property-decorator'

@Component({
  props: {
    id: {
      default: null
    },
    name: {
      required: true
    },
    badge: {
      type: Number,
      required: false,
      default: null
    },
    isDisabled: {
      default: false
    }
  }
})
export default class extends Vue {
  private _uid: string
  private id: string
  private name: string
  private isDisabled: boolean
  isActive = false

  @Watch('isActive')
  onActiveChange(isActive) {
    if (isActive) {
      this.$emit('active')
    }
  }

  get hash() {
    if (this.isDisabled) {
      return '#'
    }

    if (this.id) {
      return '#' + this.id
    } else if (this.name) {
      return '#' + slugify(this.name)
    }

    return '#' + this._uid
  }
}
</script>
