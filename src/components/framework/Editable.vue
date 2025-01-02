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
    ref="editableElement"
  ></component>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { countDecimals } from '@/services/productsService'
import { toPlainString } from '@/utils/helpers'

// Define props
const props = defineProps<{
  modelValue: any
  step?: number
  min?: number
  max?: number
  editable?: boolean
  disabled?: boolean
  tag?: string
}>()

// Define emits
const emit = defineEmits(['update:modelValue', 'submit'])

// Refs and internal state
const editableElement = ref<HTMLElement | null>(null)
const changed = ref(false)
const position = ref<number | undefined>(undefined)
let _incrementSelectionTimeout: ReturnType<typeof setTimeout> | null = null
let _emitTimeout: ReturnType<typeof setTimeout> | null = null

// Watch the value prop and update the element's inner text if needed
watch(
  () => props.modelValue,
  () => {
    if (editableElement.value) {
      const value = editableElement.value.innerText
      if (
        +props.modelValue !== +value ||
        (isNaN(+props.modelValue) && value !== props.modelValue)
      ) {
        editableElement.value.innerText = props.modelValue
      }
    }
  }
)

// Set the initial value on mount
onMounted(() => {
  setValue(props.modelValue)
})

function setValue(value: string | number) {
  if (typeof value === 'number' && (value < 1e-6 || value > 1e6)) {
    value = toPlainString(value)
  }
  if (editableElement.value) {
    editableElement.value.innerText = value.toString()
  }
}

function getCursorPosition() {
  if (position.value !== undefined) {
    return position.value
  }

  let caretPos = 0
  const selection = window.getSelection()
  if (selection?.rangeCount) {
    const range = selection.getRangeAt(0)
    if (range.commonAncestorContainer.parentNode === editableElement.value) {
      caretPos = range.endOffset
    }
  }
  return caretPos
}

function setCursorPosition(pos: number) {
  position.value = pos
  if (_incrementSelectionTimeout) {
    clearTimeout(_incrementSelectionTimeout)
  }
  _incrementSelectionTimeout = setTimeout(() => {
    _incrementSelectionTimeout = null
    const selection = window.getSelection()
    if (selection && editableElement.value) {
      selection.collapse(editableElement.value.lastChild, pos)
    }
    position.value = undefined
  }, 50)
}

function onBlur(event: FocusEvent) {
  const target = event.target as HTMLElement
  if (event.which === 13 && !isNaN(+target.innerText)) {
    event.preventDefault()
    return
  }

  if (changed.value) {
    target.innerHTML = target.innerText
    emit('update:modelValue', target.innerText)
  }

  const selection = window.getSelection()
  selection?.removeAllRanges()
}

function emitInput(value: string) {
  if (_emitTimeout) {
    clearTimeout(_emitTimeout)
  }
  _emitTimeout = setTimeout(() => {
    _emitTimeout = null
    emit('update:modelValue', value)
  }, 50)
}

function onInput() {
  changed.value = true
}

function onKeyDown(event: KeyboardEvent) {
  if (props.disabled || event.key === 'Enter') {
    event.preventDefault()
    editableElement.value?.blur()
    const target = event.target as HTMLElement
    target.innerText =
      props.modelValue || editableElement.value?.innerText || ''
    emit('submit', props.modelValue)
    return
  }

  if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    increment((event.key === 'ArrowDown' ? 1 : -1) * (event.shiftKey ? 10 : 1))
  }
}

function onFocus() {
  changed.value = false
}

function increment(direction: number) {
  const el = editableElement.value
  if (!el) return

  let pos = getCursorPosition()
  let text = el.innerText.trim()

  let boundaries = findNumberBoundaries(text, pos)
  if (!boundaries && /\d/.test(text)) {
    const match = text.match(/[\d.-]+/)
    if (match?.index !== undefined) {
      boundaries = { start: match.index, end: match.index + match[0].length }
      pos = boundaries.start
    }
  }
  if (!boundaries) return

  const numberStr = text.substring(boundaries.start, boundaries.end)
  const number = parseFloat(numberStr)
  const max = typeof props.max !== 'number' ? Infinity : props.max
  const min = typeof props.min !== 'number' ? -Infinity : props.min
  const precision = countDecimals(numberStr)
  const step = 1 / Math.pow(10, precision)
  const change = step * direction * -1
  const newNumber = Math.max(min, Math.min(max, number + change)).toFixed(
    precision
  )

  text =
    text.slice(0, boundaries.start) + newNumber + text.slice(boundaries.end)
  el.innerText = text
  emitInput(text)
  setCursorPosition(pos)
}

function findNumberBoundaries(text: string, pos: number) {
  let start = pos
  let end = pos

  while (start > 0 && /[\d.-]/.test(text[start - 1])) start--
  while (end < text.length && /[\d.-]/.test(text[end])) end++
  return start === end ? null : { start, end }
}

function onWheel(event: WheelEvent) {
  const target = event.target as HTMLElement
  if (target !== editableElement.value || !target.isContentEditable) return

  event.preventDefault()
  increment(Math.sign(event.deltaY) * (event.shiftKey ? 10 : 1))
}

const focus = () => {
  editableElement.value.focus()
}

defineExpose({ focus })
</script>
