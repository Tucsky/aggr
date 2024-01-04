<template>
  <Btn :loading="loading" :class="buttonClass" @click="toggleDropdown">
    <slot name="selection" :item="value" :placeholder="placeholder">
      <span>{{ label }}</span>
    </slot>
    <dropdown
      v-model="dropdownTrigger"
      @mousedown.native="selectFromElementRecursive($event.target)"
    >
      <button
        type="button"
        class="dropdown-item"
        v-for="(option, index) in options"
        :key="index"
      >
        <slot name="option" :value="option" :index="index">
          <span>{{ option }}</span>
        </slot>
      </button>
    </dropdown>
  </Btn>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import Btn from '@/components/framework/Btn.vue'

@Component({
  name: 'DropdownButton',
  components: {
    Btn
  },
  props: {
    value: {
      required: false,
      default: null
    },
    loading: {
      type: Boolean,
      default: false
    },
    buttonClass: {
      required: false,
      default: '-arrow'
    },
    placeholder: {
      required: false,
      default: null
    },
    options: {
      type: [Array, Object],
      required: false,
      default: () => []
    }
  }
})
export default class DropdownButton extends Vue {
  private value: any
  private placeholder: string
  private options: any[] | { [key: string]: any }
  private isArray: boolean
  dropdownTrigger = null

  created() {
    this.isArray = Array.isArray(this.options as any[])
  }

  get label() {
    if (this.value) {
      return this.options[this.value] || this.value
    }

    if (this.placeholder) {
      return this.placeholder
    }

    return 'Choose'
  }

  toggleDropdown(event) {
    if (event && !this.dropdownTrigger) {
      this.dropdownTrigger = event.currentTarget
    } else {
      this.dropdownTrigger = null
    }
  }

  selectFromElementRecursive(element: HTMLElement) {
    let depth = 0
    while (element && ++depth < 3) {
      if (element.classList && element.classList.contains('dropdown-item')) {
        this.selectOption(element)

        break
      }

      element = element.parentElement
    }
  }

  selectOption(optionElement: HTMLElement) {
    const index = Array.prototype.indexOf.call(
      optionElement.parentElement.children,
      optionElement
    )

    let value
    if (this.isArray) {
      value = this.options[index]
    } else {
      value = Object.keys(this.options)[index]
    }

    this.$emit('input', value)
  }
}
</script>
