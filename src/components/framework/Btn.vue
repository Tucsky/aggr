<template>
  <button type="button" class="btn" @click="onClick">
    <loader v-if="loading" class="btn__loader" small />
    <slot />
  </button>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import Loader from '@/components/framework/Loader.vue'

@Component({
  name: 'Btn',
  components: {
    Loader
  },
  props: {
    loading: {
      type: Boolean,
      default: false
    },
    type: {
      type: String,
      default: 'button'
    }
  }
})
export default class extends Vue {
  loading: boolean

  onClick(event) {
    if (!this.loading) {
      this.$emit('click', event)
    }
  }
}
</script>

<style lang="scss" scoped>
.btn {
  &__loader {
    margin-right: 0.25rem;
    width: 0.5em;
    height: 0.5em;

    &:first-child + * {
      display: none;
    }
  }
}
</style>
