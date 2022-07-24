<template>
  <div
    contenteditable
    class="w-100"
    ref="input"
    @input="onInput"
    @keydown="onKeydown"
    :placeholder="placeholder"
  ></div>
</template>

<script lang="ts">
import { isTouchSupported } from '@/utils/touchevent'
import { Component, Vue } from 'vue-property-decorator'
import { getTimeframeForHuman } from '../../utils/helpers'

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
    input: HTMLInputElement
  }

  mounted() {
    if (!isTouchSupported()) {
      this.$nextTick(() => {
        this.$refs.input.focus()
      })
    }
  }

  onKeydown(event) {
    if (event.which === 13) {
      event.preventDefault()

      this.$emit('submit', this.format(event.currentTarget.innerText))

      this.$refs.input.innerText = ''
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
