<template>
  <button
    type="button"
    class="btn tab"
    :class="[selected && 'tab--active']"
    @click="onClick"
  >
    <slot />
  </button>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'

@Component({
  name: 'Tab',
  props: {
    name: {
      type: String,
      required: true
    }
  }
})
export default class Tab extends Vue {
  selected = false

  select() {
    this.selected = true
  }

  deselect() {
    this.selected = false
  }

  onClick() {
    this.$emit('select', this)
  }
}
</script>

<style lang="scss" scoped>
.tab {
  display: inline-flex;
  border: 0;
  background: 0;
  text-align: center;
  padding: 0 1rem;
  align-items: center;
  cursor: pointer;
  text-transform: none;
  border-radius: 8px 8px 0 0;
  font-size: 1.125rem;
  color: var(--theme-color-100);
  font-family: $font-base;
  border: 1px solid transparent;
  border-bottom: 0;

  &:hover {
    color: var(--theme-color-base);
    background: 0;
    border-color: transparent;
  }

  &:focus {
    box-shadow: none;
  }

  &.tab--active {
    position: relative;
    z-index: 1;
    color: var(--theme-color-base);
    border: 1px solid var(--theme-background-200);
    border-bottom: 0;
    outline: 0;
    background: var(--theme-background-100);
    z-index: 26;
    position: relative;

    &:active {
      box-shadow: 0 1px 0 1px var(--theme-background-100);
      background: var(--theme-background-100);
    }
  }
}
</style>
