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

<script lang="ts" setup>
import EditableVue from '@/components/framework/Editable.vue'
import { isTouchSupported } from '@/utils/touchevent'
import { getTimeframeForHuman } from '@/utils/helpers'
import { ref, onMounted, nextTick } from 'vue'

// Props definition
defineProps({
  placeholder: {
    type: String,
    default: null
  },
  autofocus: {
    type: String,
    default: null
  }
})

// Local variables
const inputRef = ref<InstanceType<typeof EditableVue> | null>(null)

// Regex constants
const TIMEFRAME_VOL = /\$$|v$|k$|vol?$/i
const TIMEFRAME_BPS = /mb$|b$|bps?$/i
const TIMEFRAME_MBPS = /mb$|mbps$/i
const TIMEFRAME_TICK = /t$|ticks?$/i

// Functions
const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    event.preventDefault()
    const inputElement = inputRef.value?.$el as HTMLElement
    emit('submit', format(inputElement.innerText))
    inputElement.innerText = ''
  } else {
    onInput(event)
  }
}

const onInput = (event: Event) => {
  const value = format((event.currentTarget as HTMLElement).innerText) || null
  let label
  if (value) {
    label = getTimeframeForHuman(value)
  } else {
    label = (event.currentTarget as HTMLElement).innerText
  }

  if (!label || !label.length) {
    emit('input', null)
  } else {
    emit('input', {
      value,
      label
    })
  }
}

const format = (input: string): string => {
  const trimmed = input.trim()
  let output: string | number

  if (TIMEFRAME_BPS.test(trimmed)) {
    if (TIMEFRAME_MBPS.test(trimmed)) {
      return parseFloat(trimmed) / 1000 + 'b'
    }
    return parseFloat(trimmed) + 'b'
  } else if (TIMEFRAME_VOL.test(trimmed)) {
    if (trimmed[trimmed.length - 1] === 'k') {
      return (output = parseFloat(trimmed) * 1000 + 'v')
    }
    return (output = parseFloat(trimmed) + 'v')
  } else if (TIMEFRAME_TICK.test(trimmed)) {
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
  return output.toString()
}

// Lifecycle hooks
onMounted(() => {
  if (!isTouchSupported()) {
    nextTick(() => {
      const inputElement = inputRef.value?.$el as HTMLElement
      inputElement?.focus()
    })
  }
})

// Emits
const emit = defineEmits(['input', 'submit'])
</script>
