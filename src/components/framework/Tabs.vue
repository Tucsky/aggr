<template>
  <div class="tabs">
    <div role="tablist" class="tabs__header">
      <component
        v-for="(tab, i) in tabs"
        :key="i"
        :is="useUrlFragment ? 'a' : 'button'"
        :type="useUrlFragment ? null : 'button'"
        :href="useUrlFragment ? tab.hash : null"
        class="tabs__item tab btn"
        role="tab"
        :class="[
          tab.isActive && 'tab--active',
          tab.isDisabled && 'tab--disabled'
        ]"
        @click="selectTab(tab.hash, $event)"
        :aria-controls="tab.hash"
        :aria-selected="tab.isActive"
      >
        <span class="tab__name">{{ tab.name }}</span>
        <span v-if="tab.badge" class="badge -compact ml8">{{ tab.badge }}</span>
      </component>
    </div>
    <slot />
  </div>
</template>

<script lang="ts">
import { Component, Vue, Watch } from 'vue-property-decorator'

@Component({
  name: 'Tabs',
  props: {
    value: {
      default: null
    },
    useUrlFragment: {
      type: Boolean,
      default: false
    }
  }
})
export default class extends Vue {
  tabs = []
  private value: string | number
  private useUrlFragment: boolean
  private hashChangeHandler: () => void

  @Watch('value')
  onTabChange(
    newTabId: string | number,
    previousTabId: string | number = null
  ) {
    if (newTabId !== null) {
      const newTab = this.findTab(newTabId)

      if (newTab) {
        if (!newTab.isDisabled) {
          newTab.isActive = true
        }
      }
    }

    if (previousTabId !== null) {
      const previousTab = this.findTab(previousTabId)

      if (previousTab) {
        previousTab.isActive = false
      }
    }
  }

  created() {
    this.tabs = this.$children
  }

  mounted() {
    this.selectDefaultTab()
  }

  beforeDestroy() {
    this.unbindHashChange()
  }

  bindHashChange() {
    if (this.hashChangeHandler) {
      return
    }

    this.hashChangeHandler = () => this.selectTab(window.location.hash)

    window.addEventListener('hashchange', this.hashChangeHandler)
  }

  unbindHashChange() {
    if (!this.hashChangeHandler) {
      return
    }

    window.addEventListener('hashchange', this.hashChangeHandler)
  }

  findTab(hashOrIndex: string | number) {
    if (typeof hashOrIndex === 'number') {
      return this.tabs[hashOrIndex]
    }

    return this.tabs.find(tab => tab.hash === hashOrIndex)
  }

  selectDefaultTab() {
    let id = null

    if (this.useUrlFragment) {
      this.bindHashChange()

      if (this.findTab(window.location.hash)) {
        id = window.location.hash
      }
    }

    if (id === null && this.value !== null) {
      id = this.value
    }

    if (id === null && this.tabs.length) {
      id = this.tabs[0].hash
    }

    if (id !== null) {
      this.onTabChange(id)
    }
  }

  selectTab(id: string | number, event?: MouseEvent) {
    if (event && !this.useUrlFragment) {
      event.preventDefault()
    }

    this.$emit('input', id)
  }
}
</script>
<style lang="scss" scoped>
.tabs {
  &__header {
    width: 100%;
    flex-shrink: 0;
    display: flex;
    align-items: stretch;
    list-style: none;
    padding: 0;
    margin: 0;
    height: 2.5rem;
    border-bottom: 1px solid var(--theme-background-200);
  }
}

.tab {
  display: inline-flex;
  border: 0;
  background: 0;
  text-align: center;
  padding: 0 1rem;
  align-items: center;
  cursor: pointer;
  color: var(--theme-color-200);
  text-transform: none;
  border-radius: 0;
  font-size: 1.125em;
  font-family: $font-base;

  &:hover {
    background: 0;
  }

  &:focus {
    box-shadow: inherit;
    background: 0;
  }

  &.tab--active {
    position: relative;
    z-index: 1;
    color: var(--theme-color-base);
    box-shadow: 0 1px var(--theme-color-o50);

    &:active {
      box-shadow: 0 1px rgb(246 246 246 / 20%);
      background-color: rgb(255 255 255 / 3%);
    }
  }

  &:active {
    box-shadow: 0 1px rgb(246 246 246 / 20%);
    background-color: rgb(0 0 0 / 8%);
  }
}
</style>
