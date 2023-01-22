<template>
  <button type="button" class="btn" @click="!loading && $emit('click', $event)">
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
      required: true
    },
    type: {
      type: String,
      default: 'button'
    }
  }
})
export default class extends Vue {}
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
