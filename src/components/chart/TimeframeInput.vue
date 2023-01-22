<template>
  <editable
    contenteditable
    class="w-100"
    ref="input"
    value=""
    @input.native="onInput"
    @keydown.native="onKeydown"
    :placeholder="placeholder"
  />
</template>

<script lang="ts">
import { isTouchSupported } from '@/utils/touchevent'
import { Component, Vue } from 'vue-property-decorator'
import { getTimeframeForHuman } from '../../utils/helpers'
import EditableVue from '../framework/Editable.vue'

@Component({
  name: 'TimeframeInput',
  props: {
    hero: {
      type: Boolean,
      required: false,
      default: false
    },
    placeholder: {
      type: String,
      required: false,
      default: null
    },
    autofocus: {
      type: String,
      required: false,
      default: null
    }
  }
})
export default class extends Vue {
  disabled

  $refs!: {
    input: EditableVue
  }

  mounted() {
    if (!isTouchSupported()) {
      this.$nextTick(() => {
        const inputElement = this.$refs.input.$el as HTMLElement
        inputElement.focus()
      })
    }
  }

  onKeydown(event) {
    if (event.which === 13) {
      event.preventDefault()

      this.$emit('submit', this.format(event.currentTarget.innerText))

      const inputElement = this.$refs.input.$el as HTMLElement
      inputElement.innerText = ''
    } else {
      this.onInput(event)
    }
  }

  format(input) {
    const trimmed = input.trim()

    let output

    if (/t$|ticks?$/i.test(trimmed)) {
      return (output = parseInt(trimmed) + 't')
    } else {
      if (/d$/i.test(trimmed)) {
        output = parseFloat(trimmed) * 60 * 60 * 24
      } else if (/h$/i.test(trimmed)) {
        output = parseFloat(trimmed) * 60 * 60
      } else if (/m$/i.test(trimmed)) {
        output = parseFloat(trimmed) * 60
      } else if (/ms$/i.test(trimmed)) {
        output = parseFloat(trimmed) / 1000
      } else {
        output = parseFloat(trimmed)
      }
    }

    return output
  }

  onInput(event) {
    const value = this.format(event.currentTarget.innerText) || null
    let label
    if (value) {
      label = getTimeframeForHuman(value)
    } else {
      label = event.currentTarget.innerText
    }

    if (!label || !label.length) {
      return this.$emit('input', null)
    }

    this.$emit('input', {
      value,
      label
    })
  }
}
</script>
