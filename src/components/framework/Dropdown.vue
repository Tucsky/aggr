<template>
  <div class="dropdown">
    <div v-if="label" class="dropdown__label" @click="toggle" v-html="label"></div>
    <button class="dropdown__selected btn" @click="toggle" :class="selectionClass">
      <slot name="selection" :item="selection" :placeholder="placeholder">
        <span>{{ (alwaysShowPlaceholder && selection) || placeholder }}</span>
      </slot>
    </button>
    <transition name="dropdown">
      <div ref="options" class="dropdown__options" v-if="isOpen">
        <div class="dropdown__scroller hide-scrollbar">
          <a
            href="javascript:void(0)"
            class="dropdown__option"
            v-for="(value, index) in options"
            :key="index"
            :class="{ active: !alwaysShowPlaceholder && index === selected }"
          >
            <slot v-if="value.id && $slots['option-' + value.id]" :name="'option-' + value.id">
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
import { getScrollParent } from '@/utils/helpers'
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
      required: false,
      default: 'Selection'
    },
    alwaysShowPlaceholder: {
      default: true
    },
    autoClose: {
      default: true
    },
    selectionClass: {
      required: false,
      default: '-arrow'
    },
    returnValue: {
      type: Boolean,
      default: false
    }
  }
})
export default class extends Vue {
  options: any
  autoClose: boolean
  returnValue: boolean
  selected: any
  isOpen = false

  private _clickOutsideHandler: () => void

  $refs!: {
    options: HTMLElement
  }

  get selection() {
    if (!this.returnValue) {
      return this.options[this.selected]
    }

    return this.selected
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

      document.addEventListener('mousedown', this._clickOutsideHandler)
    }
  }

  unbindClickOutside() {
    if (this._clickOutsideHandler) {
      document.removeEventListener('mousedown', this._clickOutsideHandler)
      delete this._clickOutsideHandler
    }
  }

  ajustPlacement() {
    if (!this.$refs.options) {
      return
    }

    const dropdown = this.$refs.options

    const dropdownRect = dropdown.getBoundingClientRect()

    const container = getScrollParent(dropdown) || document.getElementById('app')

    const containerRect = container.getBoundingClientRect()

    if (dropdownRect.y + dropdownRect.height + 32 > containerRect.y + containerRect.height) {
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
      this.$emit('output', this.returnValue ? this.options[index] : index)

      if (this.autoClose) {
        this.hide()
      }
    }
  }
}
</script>
