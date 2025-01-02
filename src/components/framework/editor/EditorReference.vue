<template>
  <Dropdown
    ref="dropdown"
    v-model="dropdownTrigger"
    class="editor-reference__dropdown"
    interactive
    draggable
    @closed="onReferenceDropdownClose"
  >
    <div class="editor-reference__header">
      <div
        class="editor-reference__token"
        @mousedown="bindDragMove"
        @touchstart="bindDragMove"
      >
        {{ token }}
      </div>
      <button
        class="editor-reference__close btn -text"
        @click="dropdownTrigger = null"
      >
        <i class="icon-cross"></i>
      </button>
    </div>
    <div
      ref="markdown"
      v-html="markupContent"
      class="editor-reference__content marked"
    ></div>
  </Dropdown>
</template>
<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { marked } from 'marked'
import { editor } from 'monaco-editor/esm/vs/editor/editor.api'
import { getEventCords } from '@/utils/helpers'
import Dropdown from '@/components/framework/Dropdown.vue'

// Define props
const props = defineProps({
  token: {
    type: String,
    required: true
  },
  coordinates: {
    type: Object,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  onClosed: {
    type: Function,
    default: null
  }
})

// Reactive state
const dropdownTrigger = ref(props.coordinates)
const markupContent = ref('')
const monacoInstances = ref<any[]>([])
const dragging = ref<{ x: number; y: number } | null>(null)

// Lifecycle hook
onMounted(async () => {
  markupContent.value = marked(props.content)
  await nextTick()
  attachMonaco()
})

// Cleanup on unmount
onBeforeUnmount(() => {
  detachMonaco()
})

// Methods
function attachMonaco() {
  const elements =
    (document.querySelectorAll('.markdown code') as NodeListOf<HTMLElement>) ||
    []

  elements.forEach(code => {
    const content = code.innerText.replace(/\n$/, '')
    const lines = content.split('\n')

    if (content.length > 64) {
      code.classList.add('-monaco')
      code.style.display = 'block'
      code.style.width = '100%'
      code.style.minWidth = '250px'
      code.style.height = `${lines.length * 18}px`
      code.innerHTML = ''

      monacoInstances.value.push(
        editor.create(code, {
          value: content,
          language: 'javascript',
          theme: 'aggr',
          readOnly: true,
          minimap: { enabled: false },
          scrollbar: { alwaysConsumeMouseWheel: false },
          automaticLayout: false,
          glyphMargin: false,
          lineNumbers: 'off',
          tabSize: 2,
          contextmenu: false,
          insertSpaces: true,
          lineDecorationsWidth: 4,
          renderLineHighlight: 'none',
          scrollBeyondLastLine: false,
          folding: false,
          renderWhitespace: 'none',
          overviewRulerBorder: false,
          guides: {
            highlightActiveIndentation: false,
            bracketPairsHorizontal: false,
            indentation: false
          }
        })
      )
    } else {
      code.classList.add('-filled')
    }
  })
}

function detachMonaco() {
  monacoInstances.value.forEach(instance => instance.dispose())
  monacoInstances.value = []
}

function bindDragMove(event: MouseEvent | TouchEvent) {
  if ((event instanceof MouseEvent && event.button === 2) || dragging.value)
    return

  document.addEventListener('mousemove', handleDragMove)
  document.addEventListener('mouseup', unbindDragMove)
  document.addEventListener('touchmove', handleDragMove)
  document.addEventListener('touchend', unbindDragMove)

  const { x, y } = getEventCords(event)
  dragging.value = { x, y }
}

function unbindDragMove() {
  if (!dragging.value) return

  document.removeEventListener('mousemove', handleDragMove)
  document.removeEventListener('mouseup', unbindDragMove)
  document.removeEventListener('touchmove', handleDragMove)
  document.removeEventListener('touchend', unbindDragMove)

  dragging.value = null
}

function handleDragMove(event: MouseEvent | TouchEvent) {
  const { x, y } = getEventCords(event)

  const dropdown = document.querySelector('.dropdown') as HTMLElement
  if (dropdown) {
    dropdown.style.top = `${dropdown.offsetTop + (y - dragging.value.y)}px`
    dropdown.style.left = `${dropdown.offsetLeft + (x - dragging.value.x)}px`

    dragging.value = { x, y }
  }
}

function onReferenceDropdownClose() {
  unbindDragMove()
  detachMonaco()

  if (typeof props.onClosed === 'function') {
    props.onClosed()
  }
}
</script>

<style lang="scss">
.editor-reference {
  &__content {
    padding: 0 1rem;

    blockquote {
      color: #ffd54f;
      border-color: #ffd54f;

      #app.-light & {
        color: #ff9800;
        border-color: #ff9800;
      }
    }
  }

  &__dropdown {
    background-color: var(--theme-background-50) !important;
  }

  &__close {
    position: absolute;
    right: 0;
    top: 0;
  }

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: sticky;
    backdrop-filter: blur(1rem);
    top: 0;
    z-index: 1;
  }

  &__token {
    padding: 0.5rem;
    font-family: $font-monospace;
    flex-grow: 1;
  }
}
</style>
