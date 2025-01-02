<template>
  <Dropdown v-model="dropdownTrigger">
    <div class="d-flex btn-group" style="width: 135px">
      <button
        type="button"
        class="btn -green"
        @click.stop="dispatch('zoom', -1)"
      >
        <i class="icon-minus"></i>
      </button>
      <button
        type="button"
        class="btn -green text-monospace flex-grow-1 text-center -cases"
        @click.stop="dispatch('zoom', 14, true)"
      >
        <div class="text-center w-100">
          {{ currentEditorOptions.fontSize.toFixed(0) }}px
        </div>
      </button>
      <button
        type="button"
        class="btn -green"
        @click.stop="dispatch('zoom', 1)"
      >
        <i class="icon-plus"></i>
      </button>
    </div>
    <div class="dropdown-item" @click.stop>
      <label class="checkbox-control -small" @mousedown.prevent>
        <input
          type="checkbox"
          class="form-control"
          :checked="currentEditorOptions.wordWrap === 'on'"
          @change="toggleWordWrap"
        />
        <div></div>
        <span>Word Wrap</span>
      </label>
    </div>
    <a
      class="dropdown-item mb8"
      href="https://github.com/Tucsky/aggr/wiki/introduction-to-scripting"
      target="_blank"
      title="Scripting documentation"
      v-tippy
      @click.stop
    >
      <label class="checkbox-control -small" @mousedown.prevent>
        <i class="dropdown-item__icon icon-external-link-square-alt mr8"></i>
        <span>Wiki</span>
      </label>
    </a>
  </Dropdown>
</template>
<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'

// Define props and emits
const props = defineProps({
  modelValue: {
    type: Object,
    default: null
  },
  editorOptions: {
    type: Object,
    required: true
  },
  onCmd: {
    type: Function,
    default: null
  }
})

// Reactive state
const dropdownTrigger = ref(props.modelValue)
const currentEditorOptions = ref(props.editorOptions)

// Watchers
watch(
  () => props.modelValue,
  newValue => {
    dropdownTrigger.value = newValue
  }
)

watch(
  () => props.editorOptions,
  newValue => {
    currentEditorOptions.value = newValue
  }
)

// Lifecycle hook
onMounted(() => {
  dropdownTrigger.value = props.modelValue
})

const toggleWordWrap = (event: Event) => {
  const target = event.target as HTMLInputElement
  dispatch('toggleWordWrap', target.checked)
}

const dispatch = (...args) => {
  if (typeof props.onCmd === 'function') {
    props.onCmd(args)
  }
}
</script>
