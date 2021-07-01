<template>
  <div class="dropdown">
    <div v-if="label" class="dropdown__label" @click="toggle" v-html="label"></div>
    <button class="dropdown__selected btn" @click="toggle" :class="selectionClass">
      <slot name="selection" :item="options[selected]" :placeholder="placeholder">
        {{ (alwaysShowPlaceholder && options[selected]) || placeholder || 'Selection' }}
      </slot>
    </button>
    <transition name="scale">
      <div ref="options" class="dropdown__options" v-if="isOpen">
        <div class="dropdown__scroller hide-scrollbar">
          <a
            href="javascript:void(0)"
            class="dropdown__option"
            v-for="(value, index) in options"
            :key="index"
            :class="{ active: !alwaysShowPlaceholder && index === selected }"
          >
            <slot v-if="$slots['option-' + index]" :name="'option-' + index">
              {{ value }}
            </slot>
            <slot v-else name="option" :value="value" :index="index">
              {{ value }}
            </slot>
          </a>
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
    },
    selectionClass: {
      required: false
    }
  }
})
export default class extends Vue {
  options: any
  isOpen = false

  private _clickOutsideHandler: () => void

  $refs!: {
    options: HTMLElement
  }

  toggle() {
    if (!this.isOpen) {
      this.show()
    } else {
      this.hide()
    }
  }

  show() {
    this.isOpen = true

    this.$nextTick(() => {
      this.ajustPlacement()
    })

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
        } else {
          let el = event.target as HTMLElement

          while (el) {
            if (el.classList.contains('dropdown__option')) {
              this.set(event, el)

              break
            }

            el = el.parentElement
          }
        }
      }).bind(this)

      document.addEventListener('mouseup', this._clickOutsideHandler)
      document.addEventListener('touchend', this._clickOutsideHandler)
    }
  }

  unbindClickOutside() {
    if (this._clickOutsideHandler) {
      document.removeEventListener('mouseup', this._clickOutsideHandler)
      document.removeEventListener('touchend', this._clickOutsideHandler)
      delete this._clickOutsideHandler
    }
  }

  ajustPlacement() {
    if (!this.$refs.options) {
      return
    }

    const dropdown = this.$refs.options

    const rect = dropdown.getBoundingClientRect()

    if (rect.y + rect.height > window.innerHeight) {
      dropdown.classList.add('-upside-down')
    }
  }

  set(event: Event, el: HTMLElement) {
    let index = Array.prototype.indexOf.call(el.parentElement.children, el)

    if (!Array.isArray(this.options)) {
      index = Object.keys(this.options)[index]
    }

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
