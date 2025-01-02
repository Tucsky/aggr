<template>
  <Btn :loading="loading" :class="buttonClass" @click="toggleDropdown">
    <slot name="selection" :item="modelValue" :placeholder="placeholder">
      <span>{{ label }}</span>
    </slot>
    <Dropdown
      v-model="dropdownTrigger"
      @mousedown="selectFromElementRecursive($event)"
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
        {{ option }}
      </button>
    </Dropdown>
  </Btn>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue'
import Btn from '@/components/framework/Btn.vue'
import Dropdown from '@/components/framework/Dropdown.vue'

// Define props
const props = defineProps<{
  modelValue?: any
  loading?: boolean
  buttonClass?: string
  placeholder?: string
  options?: any[] | Record<string, any>
}>()

// Define emits
const emit = defineEmits(['update:modelValue'])

// Dropdown trigger element state
const dropdownTrigger = ref<HTMLElement | null>(null)

// Determine if options is an array or object
const isArray = computed(() => Array.isArray(props.options))

// Computed label for the button
const label = computed(() => {
  if (props.modelValue) {
    return isArray.value ? props.options[props.modelValue] : props.modelValue
  }
  return props.placeholder || 'Choose'
})

// Flatten options into a list for rendering
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const optionsList = computed(
  () => (isArray.value ? props.options : Object.values(props.options)) || []
)

// Methods
function toggleDropdown(event: Event) {
  if (!dropdownTrigger.value) {
    dropdownTrigger.value = event.currentTarget as HTMLElement
  } else {
    dropdownTrigger.value = null
  }
}

function selectFromElementRecursive(event: Event) {
  let element = event.target as HTMLElement | null
  let depth = 0
  while (element && ++depth < 3) {
    if (element.classList.contains('dropdown-item')) {
      selectOption(element)
      toggleDropdown(event)
      event.stopPropagation()
      break
    }
    element = element.parentElement
  }
}

function selectOption(optionElement: HTMLElement) {
  const index = Array.prototype.indexOf.call(
    optionElement.parentElement?.children,
    optionElement
  )
  const value = isArray.value
    ? props.options[index]
    : Object.keys(props.options)[index]
  emit('update:modelValue', value)
}
</script>
