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

  getCaretPosition() {
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
    const parts = (this.$el as HTMLElement).innerText.trim().split(/[|,]/)

    let text
    let partIndex
    let count = 0
    let position

    if (parts.length > 0) {
      if (this._incrementSelectionTimeout) {
        clearTimeout(this._incrementSelectionTimeout)
      }

      if (this.position) {
        position = this.position
      } else {
        position = this.getCaretPosition()
      }

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i]
        if (position >= count && position <= count + part.length) {
          text = part.replace(/[^0-9-.]/g, '')
          partIndex = i
          break
        }

        count += part.length + 1
      }
    } else {
      text = parts[0]
    }

    if (isNaN(text as any)) {
      return
    }

    const max = typeof this.max !== 'number' ? Infinity : this.max
    const min = typeof this.min !== 'number' ? -Infinity : this.min
    const precision = countDecimals(text)
    const step = 1 / Math.pow(10, precision)
    const change = step * direction * -1

    text = Math.max(min, Math.min(max, +text + change)).toFixed(precision)

    if (parts.length > 1) {
      this.position = position

      parts[partIndex] = text
      text = parts.join(',')

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

        this.position = null
      }, 100) as unknown as number
    }
    // eslint-disable-next-line @typescript-eslint/no-extra-semi
    ;(this.$el as HTMLElement).innerText = text

    if (this._emitTimeout) {
      clearTimeout(this._emitTimeout)
    }
    this._emitTimeout = setTimeout(() => {
      this._emitTimeout = null
      this.$emit('input', text)
    }, 50) as unknown as number
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
