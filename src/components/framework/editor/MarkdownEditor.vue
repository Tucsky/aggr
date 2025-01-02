<template>
  <div class="markdown-editor form-control" :class="[isLoading && 'shimmer']">
    <Loader v-if="isLoading" class="markdown-editor__loader" small />
    <template v-if="isLoaded">
      <div ref="editorElement" class="markdown-editor__monaco"></div>
      <template v-if="showPreview">
        <div class="markdown-editor__divider"></div>
        <div class="markdown-editor__preview marked" v-html="preview" />
      </template>
    </template>
  </div>
</template>
<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { marked } from 'marked'
import Loader from '@/components/framework/Loader.vue'

// Define props
const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  autofocus: {
    type: Boolean,
    default: false
  },
  showPreview: {
    type: Boolean,
    default: false
  }
})

// Component import
const emit = defineEmits(['input'])

// Refs
const editorElement = ref<HTMLElement | null>(null)

// Reactive data properties
const isLoaded = ref(false)
const isLoading = ref(true)
let editorInstance = null

// Computed property for preview
const preview = computed(() => marked(props.modelValue))

// Watchers
watch(
  () => props.modelValue,
  newValue => {
    if (editorInstance && newValue !== editorInstance.getValue()) {
      editorInstance.setValue(newValue)
    }
  }
)

watch(
  () => props.showPreview,
  async () => {
    await resize()
  }
)

// Lifecycle hooks
onMounted(async () => {
  await loadMonaco()
})

onBeforeUnmount(() => {
  editorInstance?.dispose()
})

// Methods
const loadMonaco = async () => {
  isLoading.value = true
  try {
    const { default: monaco } = await import('./editor')
    isLoaded.value = true
    await nextTick()
    createEditor(monaco)
  } catch (error) {
    console.error('Failed to load editor:', error)
  } finally {
    isLoading.value = false
  }
}

const resize = async () => {
  if (editorInstance) {
    editorInstance.layout({ width: 0, height: 0 })
    await nextTick()
    editorInstance.layout()
  }
}

// Default editor options as a method
const getDefaultOptions = (): Monaco.Options => ({
  padding: {
    top: 8,
    bottom: 8
  },
  value: props.modelValue,
  tabSize: 2,
  insertSpaces: true,
  fontSize: 12,
  lineNumbers: 'off',
  overviewRulerLanes: 0,
  overviewRulerBorder: false,
  contextmenu: false,
  theme: 'aggr',
  minimap: {
    enabled: false
  },
  glyphMargin: false,
  folding: false,
  lineNumbersMinChars: 3,
  scrollbar: {
    vertical: 'visible'
  },
  renderLineHighlight: 'none',
  renderLineHighlightOnlyWhenFocus: true,
  renderValidationDecorations: 'off',
  renderWhitespace: 'none',
  rulers: [],
  language: 'markdown'
})

// Create editor instance
const createEditor = async (monaco: Monaco.Editor) => {
  editorInstance = monaco.create(editorElement.value, getDefaultOptions())

  // Editor content change event
  editorInstance.onDidChangeModelContent(() => {
    emit('input', editorInstance.getValue())
  })

  if (props.autofocus) {
    await nextTick()
    editorInstance.focus()
    const model = editorInstance.getModel()
    const lastLine = model.getLineCount()
    const lastColumn = model.getLineMaxColumn(lastLine)
    editorInstance.setPosition({
      lineNumber: lastLine,
      column: lastColumn
    })
  }

  await nextTick()
  editorInstance.layout()
}
// Public methods
defineExpose({ resize })
</script>

<style lang="scss" scoped>
.markdown-editor {
  padding: 0;
  flex-grow: 1;
  display: flex;

  &__monaco {
    flex-grow: 1;
  }

  &__loader {
    width: 1rem;
    height: 1rem;
    margin: 1rem auto;
    visibility: visible;
  }

  &__divider {
    position: relative;
    background-color: var(--theme-background-200);
    width: 1px;
    height: 100%;
  }

  &__preview {
    position: relative;
    flex-basis: 33%;
    overflow: auto;
    padding: 0.5rem;
    background-color: var(--theme-background-50);
  }
}
</style>
