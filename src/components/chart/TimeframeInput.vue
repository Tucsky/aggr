<template>
  <div contenteditable class="form-control w-100" ref="input" @input="onInput" @keydown="onKeydown" :placeholder="placeholder"></div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'

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
    this.$nextTick(() => {
      this.$refs.input.focus()
    })
  }

  onKeydown(event) {
    if (event.which === 13) {
      event.preventDefault()

      this.$emit('submit', this.format(event.currentTarget.innerText))
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
    this.$emit('timeframe', this.format(event.currentTarget.innerText))
  }
}
</script>
