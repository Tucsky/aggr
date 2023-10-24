<template>
  <div class="editor-reference">
    <dropdown :value="value" @input="$emit('input', $event)">
      <button v-if="value" @click="loadMd" class="dropdown-item">
        <i class="icon-info -lower" title="Show documentation" v-tippy></i>
        <span>{{ value.token }}</span>
      </button>
    </dropdown>
    <dropdown
      ref="dropdown"
      v-model="markdownDropdownElement"
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
          @click="markdownDropdownElement = null"
        >
          <i class="icon-cross"></i>
        </button>
      </div>
      <div
        ref="markdown"
        v-html="markdownContent"
        class="editor-reference__content"
      ></div>
    </dropdown>
  </div>
</template>

<script lang="ts">
import { marked } from 'marked'
import { Component, Vue, Watch } from 'vue-property-decorator'
import { editor } from 'monaco-editor/esm/vs/editor/editor.api'
import { getEventCords } from '@/utils/helpers'

@Component({
  name: 'EditorReference',
  props: {
    value: {
      type: Object,
      default: null
    }
  }
})
export default class Presets extends Vue {
  markdownDropdownElement: HTMLElement = null
  markdownContent = ''
  token: string = null
  monacoInstances: editor.IStandaloneCodeEditor[]
  dragging: {
    x: number
    y: number
  } = null

  $refs!: {
    markdown: HTMLDivElement
    handle: HTMLDivElement
    dropdown: any
  }

  @Watch('value')
  onTokenDropdownChange(value) {
    if (value) {
      this.token = value.token
    }
  }

  mounted() {
    this.monacoInstances = []
  }

  async loadMd(event) {
    let raw

    try {
      raw = (
        await import(
          `@/components/framework/editor/references/${this.token}.md?raw`
        )
      ).default
    } catch (error) {
      raw = 'No definition found'
    }
    this.markdownContent = marked(raw)
    this.markdownDropdownElement = event.target

    await this.$nextTick()

    this.attachMonaco()
  }

  attachMonaco() {
    const elements = this.$refs.markdown.querySelectorAll('code')

    for (const code of elements) {
      const content = code.innerText

      if (content.length > 64) {
        code.style.display = 'block'
        code.style.height = '150px'
        code.style.width = '100%'
        code.style.minWidth = '250px'
        code.innerHTML = ''
        this.monacoInstances.push(
          editor.create(code as HTMLElement, {
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
    }
  }

  detachMonaco() {
    for (let i = 0; i < this.monacoInstances.length; i++) {
      this.monacoInstances[i].dispose()
      this.monacoInstances.splice(i--, 1)
    }
  }

  beforeDestroy() {
    this.detachMonaco()
  }

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
  }

  unbindDragMove() {
    if (!this.dragging) {
      return
    }

    document.removeEventListener('mousemove', this.handleDragMove)
    document.removeEventListener('mouseup', this.unbindDragMove)
    document.removeEventListener('touchmove', this.handleDragMove)
    document.removeEventListener('touchend', this.unbindDragMove)

    this.dragging = null
  }

  handleDragMove(event) {
    const { x, y } = getEventCords(event)

    this.$refs.dropdown.top += y - this.dragging.y
    this.$refs.dropdown.left += x - this.dragging.x

    this.dragging.x = x
    this.dragging.y = y
  }

  onReferenceDropdownClose() {
    this.unbindDragMove()
    this.detachMonaco()
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
  }

  &__token {
    padding: 0.5rem;
    font-family: $font-monospace;
    flex-grow: 1;
  }
}
</style>
