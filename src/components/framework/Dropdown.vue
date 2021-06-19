<template>
  <div class="dropdown">
    <div v-if="label" class="dropdown__label" @click="toggle" v-html="label"></div>
    <div class="dropdown__selected" @click="toggle">
      <slot name="selection" :item="options[selected]" :placeholder="placeholder">
        {{ (alwaysShowPlaceholder && options[selected]) || placeholder || 'Selection' }}
      </slot>
    </div>
    <transition name="scale">
      <div class="dropdown__options" v-if="isOpen">
        <div class="dropdown__scroller hide-scrollbar">
          <div
            class="dropdown__option"
            v-for="(value, index) in options"
            :key="index"
            :class="{ active: !alwaysShowPlaceholder && index === selected }"
            @click="set(index, $event)"
          >
            <slot name="option" :value="value" :index="index">
              {{ value }}
            </slot>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'

@Component({
  name: 'Dropdown',
  props: {
    options: {
      required: true
    },
    label: {
      required: false
    },
    selected: {
      required: false
    },
    placeholder: {
      required: false
    },
    alwaysShowPlaceholder: {
      default: true
    }
  }
})
export default class extends Vue {
  options: any
  isOpen = false

  private _clickOutsideHandler: () => void

  toggle() {
    if (!this.isOpen) {
      this.show()
    } else {
      this.hide()
    }
  }

  show() {
    this.isOpen = true

    this.bindClickOutside()

    this.$emit('open')
  }

  hide() {
    this.isOpen = false

    this.unbindClickOutside()

    this.$emit('close')
  }

  bindClickOutside() {
    if (!this._clickOutsideHandler) {
      this._clickOutsideHandler = (event => {
        if (!this.$el.contains(event.target)) {
          this.hide()
        }
      }).bind(this)

      document.addEventListener('mousedown', this._clickOutsideHandler)
    }
  }

  unbindClickOutside() {
    if (this._clickOutsideHandler) {
      document.removeEventListener('mousedown', this._clickOutsideHandler)
      delete this._clickOutsideHandler
    }
  }

  set(index, event: Event) {
    // this.selected = index
    if (this.options && this.options[index] && typeof this.options[index].click === 'function') {
      this.options[index].click(event, this.options[index])
    }

    if (!event.defaultPrevented) {
      this.$emit('output', index)

      this.hide()
    }
  }
}
</script>
