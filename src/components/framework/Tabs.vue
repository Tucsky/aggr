<template>
  <div class="tabs">
    <slot />
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'

@Component({
  name: 'Tabs',
  props: {
    value: {
      default: null
    }
  }
})
export default class Tabs extends Vue {
  tabs: any[]
  private value: string | number
  private selectedTab: any

  mounted() {
    this.bindTabs()
  }

  beforeDestroy() {
    this.unbindTabs()
  }

  bindTabs() {
    for (const tab of this.$slots.default) {
      tab.componentInstance.$on('select', this.selectTab)

      if (this.value === (tab.componentInstance as any).name) {
        this.selectTab(tab.componentInstance)
      }
    }
  }

  unbindTabs() {
    for (const tab of this.$slots.default) {
      tab.componentInstance.$off('select', this.selectTab)
    }
  }

  selectTab(tab) {
    const name = tab.name

    if (!this.selectedTab || this.value !== name) {
      if (this.selectedTab) {
        this.selectedTab.deselect()
      }

      this.selectedTab = tab
      this.selectedTab.select()
    }

    this.$emit('input', tab.name)
  }
}
</script>
<style lang="scss" scoped>
.tabs {
  padding: 0 1rem;
  flex-shrink: 0;
  display: flex;
  align-items: stretch;
  list-style: none;
  margin: 0;
  height: 2.5rem;
  box-shadow: inset 0 -1px 0 var(--theme-background-200);
}
</style>
