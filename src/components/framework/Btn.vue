<template>
  <component
    :is="tag"
    :type="type"
    :href="href"
    :target="target"
    class="btn"
    @click="onClick"
  >
    <loader v-if="isLoading" class="btn__loader" small />
    <slot />
  </component>
</template>

<script lang="ts">
import { Component, Vue, Watch } from 'vue-property-decorator'
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
    },
    href: {
      type: String,
      default: null
    },
    target: {
      type: String,
      default: null
    }
  },
  computed: {
    tag() {
      if (this.href) {
        return 'a'
      }

      return 'button'
    }
  }
})
export default class Btn extends Vue {
  isLoading = false

  @Watch('loading')
  onLoadingChange(value) {
    this.isLoading = value
  }

  onClick(event) {
    if (!this.isLoading) {
      this.$emit('click', event)
    }
  }
}
</script>

<style lang="scss" scoped>
.btn {
  &__loader {
    width: 0.5em;
    height: 0.5em;

    &:first-child + * {
      display: none;
    }
  }
}
</style>
