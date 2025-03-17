<template>
  <div class="markdown-editor form-control">
    <Loader v-if="isLoading" class="markdown-editor__loader" small />
    <template v-if="isLoaded">
      <div ref="editor" class="markdown-editor__monaco" style=""></div>
      <template v-if="showPreview">
        <div class="markdown-editor__divider">
          <span class="markdown-editor__divider-badge badge ml4">
            preview
          </span>
        </div>
        <div class="markdown-editor__preview" v-html="preview" />
      </template>
    </template>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Watch } from 'vue-property-decorator'
import { marked } from 'marked'
import Loader from '@/components/framework/Loader.vue'

@Component({
  name: 'MarkdownEditor',
  components: {
    Loader
  },
  props: {
    value: {
      type: String,
      default: ''
    },
    minimal: {
      type: Boolean,
      default: false
    },
    autofocus: {
      type: Boolean,
      default: false
    },
    showPreview: {
      type: Boolean,
      default: false
    }
  }
})
export default class MarkdownEditor extends Vue {
  private value: string
  private editorInstance: any
  private minimal: boolean
  private autofocus: boolean

  isLoaded = false
  isLoading = false

  get preview() {
    return marked(this.value)
  }

  @Watch('value')
  onValueChange(value) {
    if (value !== this.editorInstance.getValue()) {
      this.editorInstance.setValue(value)
    }
  }

  @Watch('showPreview')
  onShowPreviewChange() {
    this.resize()
  }

  async mounted() {
    await this.loadMonaco()
  }

  beforeDestroy() {
    this.editorInstance.dispose()
  }

  async loadMonaco() {
    this.isLoading = true
    try {
      const { default: monaco } = await import('./editor')

      this.isLoaded = true

      await this.$nextTick()

      this.createEditor(monaco)

      await this.$nextTick()
    } catch (error) {
      console.error('Failed to load editor:', error)
    } finally {
      this.isLoading = false
    }
  }

  async resize() {
    this.editorInstance.layout({ width: 0, height: 0 })

    await this.$nextTick()
    this.editorInstance.layout()
  }

  getDefaultOptions(): any {
    return {
      padding: {
        top: 8,
        bottom: 8
      },
      value: this.value,
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
      renderLineHighlight: 'none',
      renderIndentGuides: false,
      renderLineHighlightOnlyWhenFocus: true,
      renderValidationDecorations: 'off',
      renderWhitespace: 'none',
      rulers: [],
      language: 'markdown',
      scrollBeyondLastLine: false,
      automaticLayout: false,
      scrollbar: {
        vertical: 'hidden',
        horizontal: 'auto'
      }
    }
  }

  async createEditor(monaco) {
    console.log('create editor', monaco, this.$refs.editor)
    this.editorInstance = monaco.create(
      this.$refs.editor as HTMLElement,
      this.getDefaultOptions()
    )

    const containerEl = this.$refs.editor as HTMLElement

    let previousHeight = 0

    this.editorInstance.onDidContentSizeChange(() => {
      const contentHeight = this.editorInstance.getContentHeight()
      if (contentHeight !== previousHeight) {
        previousHeight = contentHeight
        containerEl.style.height = `${contentHeight}px`
        this.editorInstance.layout()
      }
    })
    this.editorInstance.onDidChangeModelContent(() => {
      console.log('monaco change')
      this.$emit('input', this.editorInstance.getValue())
    })

    if (this.autofocus) {
      await this.$nextTick()
      this.editorInstance.focus()
      const model = this.editorInstance.getModel()
      const lastLine = model.getLineCount()
      const lastColumn = model.getLineMaxColumn(lastLine)
      this.editorInstance.setPosition({
        lineNumber: lastLine,
        column: lastColumn
      })
    }

    window.instance = this.editorInstance

    await this.$nextTick()

    this.editorInstance.layout()
  }
}
</script>
<style lang="scss" scoped>
.markdown-editor {
  padding: 0;
  flex-grow: 1;
  display: flex;

  &__monaco {
    flex-grow: 1;
    max-height: 50vh;
  }

  &__loader {
    width: 1rem;
    height: 1rem;
    margin: 1rem auto;
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
