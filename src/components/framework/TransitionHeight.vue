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
  private single: boolean

  beforeEnter(element) {
    element.style.height = '0px'
  }

  enter(element) {
    const wrapper = element.children[0]

    let height = wrapper.offsetHeight
    height += parseInt(window.getComputedStyle(wrapper).getPropertyValue('margin-top'))
    height += parseInt(window.getComputedStyle(wrapper).getPropertyValue('margin-bottom'))
    height += 'px'

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
