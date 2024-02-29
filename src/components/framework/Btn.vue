<template>
  <component
    :is="tag"
    :type="type"
    :href="href"
    :target="target"
    class="btn"
    @click="onClick"
  >
    <loader v-if="loading" class="btn__loader" small />
    <slot />
  </component>
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
