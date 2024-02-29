<template>
  <dropdown
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
      class="editor-reference__content"
    ></div>
  </dropdown>
</template>

<script>
import { marked } from 'marked'
import { editor } from 'monaco-editor/esm/vs/editor/editor.api'
import { getEventCords } from '@/utils/helpers'

export default {
  name: 'EditorReference',
  props: {
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
    }
  },
  data() {
    return {
      dropdownTrigger: null,
      markupContent: ''
    }
  },
  async mounted() {
    this.monacoInstances = []
    this.dropdownTrigger = this.coordinates
    this.markupContent = marked(this.content)

    await this.$nextTick()

    this.attachMonaco()
  },
  methods: {
    attachMonaco() {
      const elements = this.$refs.markdown.querySelectorAll('code')

      for (const code of elements) {
        const content = code.innerText.replace(/\n$/, '')
        const lines = content.split('\n')

        if (content.length > 64) {
          code.style.display = 'block'
          code.style.width = '100%'
          code.style.minWidth = '250px'
          code.style.height = lines.length * 18 + 'px'
          code.innerHTML = ''
          this.monacoInstances.push(
            editor.create(code, {
              value: content,
              language: 'javascript',
              theme:
                this.$store.state.settings.theme === 'light'
                  ? 'vs-light'
                  : 'my-dark',
              readOnly: true,
              minimap: {
                enabled: false
              },
              scrollbar: {
                alwaysConsumeMouseWheel: false
              },
              automaticLayout: false,
              wordBreak: 'on',
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
      }
    },

    detachMonaco() {
      for (let i = 0; i < this.monacoInstances.length; i++) {
        this.monacoInstances[i].dispose()
        this.monacoInstances.splice(i--, 1)
      }
    },

    beforeDestroy() {
      this.detachMonaco()
    },

    bindDragMove(event) {
      if (event.button === 2 || this.dragging) {
        return
      }

      document.addEventListener('mousemove', this.handleDragMove)
      document.addEventListener('mouseup', this.unbindDragMove)
      document.addEventListener('touchmove', this.handleDragMove)
      document.addEventListener('touchend', this.unbindDragMove)

      const { x, y } = getEventCords(event)
      this.dragging = {
        x,
        y
      }
    },

    unbindDragMove() {
      if (!this.dragging) {
        return
      }

      document.removeEventListener('mousemove', this.handleDragMove)
      document.removeEventListener('mouseup', this.unbindDragMove)
      document.removeEventListener('touchmove', this.handleDragMove)
      document.removeEventListener('touchend', this.unbindDragMove)

      this.dragging = null
    },

    handleDragMove(event) {
      const { x, y } = getEventCords(event)

      this.$refs.dropdown.top += y - this.dragging.y
      this.$refs.dropdown.left += x - this.dragging.x

      this.dragging.x = x
      this.dragging.y = y
    },

    onReferenceDropdownClose() {
      this.unbindDragMove()
      this.detachMonaco()
    }
  }
}
</script>
<style lang="scss">
.editor-reference {
  &__content {
    padding: 0 1rem;

    .monaco-editor {
      --vscode-editor-background: var(--theme-background-50);
      --vscode-editorGutter-background: var(--theme-background-50);
    }

    p {
      line-height: 1.4;
    }

    code {
      font-size: 0.75rem;
    }

    h2 {
      margin-block: 1rem;
      font-size: 1.25rem;
    }

    blockquote {
      color: #ffd54f;
      border-color: #ffd54f;

      #app.-light & {
        color: #ff9800;
        border-color: #ff9800;
      }

      code {
        color: inherit;
      }

      p {
        margin: 0;
      }
    }

    img {
      width: 100%;
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
