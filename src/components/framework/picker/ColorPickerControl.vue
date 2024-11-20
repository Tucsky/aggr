<template>
  <button
    class="btn color-picker-control"
    @click="openPicker"
    :style="{
      '--text-color': inverseValue,
      '--background-color': value
    }"
  >
    <div class="color-picker-control__wrapper"></div>
  </button>
</template>
<script setup lang="ts">
import { ref, computed, defineProps, defineEmits, onBeforeUnmount } from 'vue'
import { joinRgba, splitColorCode, getLinearShadeText } from '@/utils/colors'
import dialogService from '@/services/dialogService'

// Define props and emits
const props = defineProps({
  value: {
    type: String,
    default: '#000'
  },
  label: {
    type: String,
    default: ''
  }
})
const emit = defineEmits(['input', 'close'])

// Reactive state
const dialogInstance = ref<any>(null)
let debounceTimeoutId: NodeJS.Timeout | null = null
let colorDidChanged = false

// Computed property
const inverseValue = computed(() => {
  if (!props.value) return
  return joinRgba(getLinearShadeText(splitColorCode(props.value), 0.5))
})

// Lifecycle hook
onBeforeUnmount(() => {
  if (dialogInstance.value) {
    dialogInstance.value.close()
  }
})

// Methods
function onInput(color: string) {
  if (debounceTimeoutId) {
    clearTimeout(debounceTimeoutId)
  }
  colorDidChanged = true

  debounceTimeoutId = setTimeout(() => {
    debounceTimeoutId = null
    onChange(color)
  }, 500)
}

async function openPicker() {
  colorDidChanged = false
  dialogInstance.value = await dialogService.openPicker(
    props.value,
    props.label,
    onInput,
    onClose
  )
}

function onChange(color: string) {
  emit('input', color)
}

function onClose() {
  emit('close', colorDidChanged)
}
</script>

<style lang="scss" scoped>
.color-picker-control {
  position: relative;
  padding: 0 !important;
  border-radius: 0.25rem;
  outline: 1px solid var(--theme-base-o50);
  background-color: transparent;
  box-sizing: content-box;
  background-image: $checkerboard;
  background-size: 14px 14px;
  background-position:
    0 0,
    7px -7px,
    0 7px,
    -7px 0px;

  &:after {
    content: '';
    background-color: var(--background-color);
    border: 1px solid var(--background-color);
    width: 2rem;
    height: 2rem;
    border-radius: 0.25rem;
  }

  + label {
    color: var(--theme-color-base);
  }

  &:hover {
    border-color: transparent;
    background-color: transparent;
  }
}
</style>
