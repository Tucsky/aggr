<template>
  <component
    :is="single ? 'transition' : 'transition-group'"
    :name="name"
    :tag="tag"
    @beforeEnter="beforeEnter"
    @enter="enter"
    @afterEnter="afterEnter"
    @beforeLeave="beforeLeave"
    @leave="leave"
  >
    <slot />
  </component>
</template>
<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'

@Component({
  name: 'Transitionheight',
  props: {
    name: {
      type: String,
      required: true
    },
    single: {
      type: Boolean,
      required: false
    },
    tag: {
      type: String,
      required: false,
      default: null
    }
  }
})
export default class extends Vue {
  mounted() {
    this.$nextTick(() => {
      const element = this.$el as HTMLElement
      element.dataset.height = this.getChildrenHeight(element)
    })
  }

  private getChildrenHeight(element: HTMLElement): string {
    const children = element.children[0] as HTMLElement

    let height = children.offsetHeight

    const styles = window.getComputedStyle(children)
    height += parseInt(styles.getPropertyValue('margin-top'))
    height += parseInt(styles.getPropertyValue('margin-bottom'))

    return height + 'px'
  }

  beforeEnter(element) {
    element.style.height = '0px'
  }

  enter(element) {
    const height = this.getChildrenHeight(element)
    element.dataset.height = height

    setTimeout(() => {
      element.style.height = height
    }, 100)
  }

  afterEnter(element) {
    element.style.height = ''
  }

  beforeLeave(element) {
    element.style.height = element.dataset.height
  }

  leave(element) {
    setTimeout(() => {
      element.style.height = '0px'
    })
  }
}
</script>
