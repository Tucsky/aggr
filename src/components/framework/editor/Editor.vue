<template>
  <div
    ref="editorRef"
    class="editor"
    :class="[isLoading && 'shimmer']"
    @contextmenu="onContextMenu"
  ></div>
</template>
<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { createComponent, getEventCords, mountComponent } from '@/utils/helpers'
import { IndicatorEditorWordWrapOption } from '@/store/panesSettings/chart'

// Define props and emits
const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  editorOptions: {
    type: Object,
    default: () => ({})
  }
})
const emit = defineEmits(['blur', 'options'])

// Reactive state and refs
const editorRef = ref<HTMLElement>()
const isLoading = ref(true)
const isLoaded = ref(false)
const preventOverride = ref(false)
let editorInstance = null
let contextMenuComponent: any = null
let unmountContextMenu: () => void
const currentEditorOptions = ref({
  fontSize: window.devicePixelRatio > 1 ? 12 : 14,
  wordWrap: 'off' as IndicatorEditorWordWrapOption
})
let blurTimeout: number | null = null
let beforeUnloadHandler: ((event: Event) => void) | null = null

// Watchers for prop changes
watch(
  () => props.editorOptions,
  options => {
    editorInstance.updateOptions(options)
  },
  { deep: true }
)

watch(
  () => props.modelValue,
  newValue => {
    if (!preventOverride.value) {
      editorInstance.setValue(newValue)
    }
  }
)

// Lifecycle hooks
onMounted(async () => {
  Object.assign(currentEditorOptions.value, props.editorOptions)
  await loadMonaco()
})

onBeforeUnmount(() => {
  if (blurTimeout) {
    onBlur(true)
  }
  editorInstance.dispose()

  if (typeof unmountContextMenu === 'function') {
    unmountContextMenu()
    unmountContextMenu = null
  }
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
  editorInstance.layout({ width: 0, height: 0 })

  await nextTick()
  editorInstance.layout()
}

const createEditor = async (monaco: Monaco.Editor) => {
  editorInstance = monaco.create(editorRef.value, {
    value: props.modelValue,
    language: 'javascript',
    tabSize: 2,
    insertSpaces: true,
    fontSize: currentEditorOptions.value.fontSize,
    wordWrap: currentEditorOptions.value.wordWrap,
    scrollbar: { vertical: 'hidden' },
    overviewRulerLanes: 0,
    overviewRulerBorder: false,
    contextmenu: false,
    theme: 'aggr'
  })

  editorInstance.getDomNode().addEventListener('mousedown', () => {
    if (contextMenuComponent) contextMenuComponent.value = null
  })

  editorInstance.onDidBlurEditorText(() => {
    if (blurTimeout) clearTimeout(blurTimeout)
    blurTimeout = setTimeout(() => {
      onBlur()
      blurTimeout = null
    }, 100) as unknown as number
  })

  editorInstance.onDidFocusEditorText(() => {
    if (blurTimeout) clearTimeout(blurTimeout)
    onFocus()
  })

  await nextTick()
  editorInstance.layout()
}

function onBlur(silent = false) {
  if (beforeUnloadHandler) {
    window.removeEventListener('beforeunload', beforeUnloadHandler)
    beforeUnloadHandler = null
  }
  if (!silent) {
    preventOverride.value = true
    emit('blur', editorInstance.getValue())
    preventOverride.value = false
  }
}

function onFocus() {
  if (beforeUnloadHandler) return
  beforeUnloadHandler = (event: Event) => {
    event.preventDefault()
    ;(event as any).returnValue = ''
  }
  window.addEventListener('beforeunload', beforeUnloadHandler)
}

async function onContextMenu(event: MouseEvent) {
  if (window.innerWidth < 375) return
  event.preventDefault()
  const { x, y } = getEventCords(event, true)
  const propsData = {
    modelValue: { top: y, left: x, width: 2, height: 2 },
    editorOptions: currentEditorOptions.value
  }

  if (contextMenuComponent) {
    Object.assign(contextMenuComponent, propsData)
  } else {
    document.body.style.cursor = 'progress'
    const module = await import(
      '@/components/framework/editor/EditorContextMenu.vue'
    )
    document.body.style.cursor = ''
    contextMenuComponent = createComponent(module.default, {
      ...propsData,
      onCmd(args) {
        const method = args[0] as keyof typeof methods
        if (typeof methods[method] === 'function') {
          methods[method].apply(null, args.slice(1))
        } else {
          throw new Error(`[editor] ContextMenu-->${args[0]} is not a function`)
        }
      }
    })
    unmountContextMenu = mountComponent(contextMenuComponent)
  }
}

// Exported methods for zooming and toggling word wrap
const methods = {
  zoom(value: number, override?: boolean) {
    currentEditorOptions.value.fontSize = override
      ? value
      : currentEditorOptions.value.fontSize + value
    emit('options', currentEditorOptions.value)
  },
  toggleWordWrap(value: boolean) {
    currentEditorOptions.value.wordWrap = value ? 'off' : 'on'
    emit('options', currentEditorOptions.value)
  }
}

defineExpose({
  resize
})
</script>

<style lang="scss">
.editor {
  height: 100%;
  min-height: 50px;

  .monaco-editor {
    #app.-light & {
      --vscode-editor-background: var(--theme-background-100);
      --vscode-editorStickyScroll-background: var(--theme-background-100);
      --vscode-editorStickyScrollHover-background: var(--theme-background-100);
      --vscode-editorGutter-background: var(--theme-background-100);
    }

    .minimap-shadow-visible {
      box-shadow: rgb(0 0 0 / 10%) -6px 0 6px -6px inset;
    }

    .scroll-decoration {
      box-shadow: rgb(0 0 0 / 10%) 0 6px 6px -6px inset;
    }

    .view-overlays .current-line {
      border-color: var(--theme-background-100);
    }

    .minimap {
      left: auto !important;
      right: 0 !important;
    }
  }
}
</style>
