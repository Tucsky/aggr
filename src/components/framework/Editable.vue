<template>
  <component
    :is="tag || 'div'"
    :contenteditable="editable !== false"
    :disabled="editable === false"
    @keydown="onKeyDown"
    @input="onInput"
    @focus="onFocus"
    @blur="onBlur"
    @wheel="onWheel"
  ></component>
</template>

<script lang="ts">
import { Component, Vue, Watch } from 'vue-property-decorator'
import { countDecimals } from '@/services/productsService'
import { toPlainString } from '@/utils/helpers'

@Component({
  name: 'Editable',
  props: ['value', 'step', 'min', 'max', 'editable', 'disabled', 'tag']
})
export default class Editable extends Vue {
  editable: boolean
  private value: string
  private min: number
  private max: number
  private disabled: boolean
  private changed = false
  private position: number

  private _incrementSelectionTimeout: number
  private _emitTimeout: number

  mounted() {
    this.setValue(this.value)
  }

  @Watch('value')
  onValueChange() {
    const input = this.$el as HTMLElement
    const value = input.innerText

    if (
      +this.value !== +value ||
      (isNaN(+this.value) && value !== this.value)
    ) {
      input.innerText = this.value
    }
  }

  setValue(value) {
    if (typeof value === 'number' && (value < 1e-6 || value > 1e6)) {
      value = toPlainString(value)
    }
    const el = this.$el as HTMLElement
    el.innerText = value
  }

  getCursorPosition() {
    if (typeof this.position !== 'undefined') {
      return this.position // return saved position
    }

    let caretPos = 0
    let sel
    let range

    if (window.getSelection) {
      sel = window.getSelection()
      if (sel.rangeCount) {
        range = sel.getRangeAt(0)
        if (range.commonAncestorContainer.parentNode == this.$el) {
          caretPos = range.endOffset
        }
      }
    }

    return caretPos
  }

  setCursorPosition(position) {
    this.position = position

    if (this._incrementSelectionTimeout) {
      clearTimeout(this._incrementSelectionTimeout)
    }

    this._incrementSelectionTimeout = setTimeout(() => {
      this._incrementSelectionTimeout = null

      let sel

      if ((document as any).selection) {
        sel = (document as any).selection.createRange()
        sel.moveStart('character', position)
        sel.select()
      } else {
        sel = window.getSelection()
        sel.collapse(this.$el.lastChild, position)
      }

      this.position = undefined
    }, 50) as unknown as number
  }

  onBlur(event) {
    if (event.which === 13 && !isNaN(event.target.innerText)) {
      event.preventDefault()
      return
    }

    if (this.changed) {
      event.target.innerHTML = event.target.innerText
      this.$emit('input', event.target.innerText)
    }

    if (window.getSelection) {
      window.getSelection().removeAllRanges()
    } else if ((document as any).selection) {
      // eslint-disable-next-line @typescript-eslint/no-extra-semi
      ;(document as any).selection.empty()
    }
  }

  emitInput(value) {
    if (this._emitTimeout) {
      clearTimeout(this._emitTimeout)
    }
    this._emitTimeout = setTimeout(() => {
      this._emitTimeout = null
      this.$emit('input', value)
    }, 50) as unknown as number
  }

  onInput() {
    this.changed = true
  }

  onKeyDown(event) {
    if (this.disabled || event.which === 13) {
      event.preventDefault()
      ;(this.$el as HTMLInputElement).blur()

      event.target.innerText =
        this.value || (this.$el as HTMLInputElement).innerText

      this.$emit('submit', this.value)

      return
    }

    if (event.which === 38 || event.which === 40) {
      this.increment((event.which === 40 ? 1 : -1) * (event.shiftKey ? 10 : 1))
    }
  }

  onFocus() {
    this.changed = false
  }

  increment(direction: number) {
    const el = this.$el as HTMLElement // Assuming this is your input element
    let position = this.getCursorPosition() // Use saved or current position
    let text = el.innerText.trim()

    // Identify the boundaries of the number to change
    let boundaries = this.findNumberBoundaries(text, position)
    if (!boundaries && text.match(/\d/)) {
      // If no boundaries found but text contains a number
      const singleNumberMatch = text.match(/[\d.-]+/) // Adjust regex as needed
      if (singleNumberMatch && singleNumberMatch.index !== undefined) {
        boundaries = {
          start: singleNumberMatch.index,
          end: singleNumberMatch.index + singleNumberMatch[0].length
        }
        position = boundaries.start // Adjust position to the start of the found number
      }
    }
    if (!boundaries) return // Early return if no number found at position

    const numberStr = text.substring(boundaries.start, boundaries.end)
    const number = parseFloat(numberStr)

    // Calculate the new number with precision handling
    const max = typeof this.max !== 'number' ? Infinity : this.max
    const min = typeof this.min !== 'number' ? -Infinity : this.min
    const precision = countDecimals(numberStr)
    const step = 1 / Math.pow(10, precision)
    const change = step * (direction * -1)
    const newNumber = Math.max(min, Math.min(max, number + change)).toFixed(
      precision
    )

    // Replace the number in the original string
    text =
      text.slice(0, boundaries.start) + newNumber + text.slice(boundaries.end)

    // Set the updated text
    el.innerText = text
    this.emitInput(text)
    this.setCursorPosition(position)
  }

  findNumberBoundaries(text, position) {
    let start = position
    let end = position

    // Move backwards to find the start of the number
    while (start > 0 && /[\d.-]/.test(text[start - 1])) {
      start--
    }

    // Move forwards to find the end of the number
    while (end < text.length && /[\d.-]/.test(text[end])) {
      end++
    }

    if (start === end) return null // No number found
    return { start, end }
  }

  onWheel(event: WheelEvent) {
    const focusedElement = document.activeElement as HTMLElement

    if (focusedElement !== event.target || !focusedElement.isContentEditable) {
      return
    }

    event.preventDefault()

    this.increment(Math.sign(event.deltaY) * (event.shiftKey ? 10 : 1))
  }
}
</script>
