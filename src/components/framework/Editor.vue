<template>
  <div class="editor"></div>
</template>

<script lang="ts">
import { Component, Vue, Watch } from 'vue-property-decorator'
import * as ace from 'ace-builds'
ace.config.set(
  'basePath',
  'https://cdn.jsdelivr.net/npm/ace-builds@1.13.1/src-noconflict/'
)

@Component({
  name: 'Editor',
  props: {
    value: {
      type: String,
      default: ''
    },
    fontSize: {
      type: Number,
      default: () => (window.devicePixelRatio > 1 ? 12 : 14)
    },
    minimal: {
      type: Boolean,
      default: false
    }
  }
})
export default class extends Vue {
  private value: string
  private fontSize: number
  private minimal: boolean

  private editorInstance: any

  private _blurTimeout: number
  private _beforeUnloadHandler: (event: Event) => void

  get options() {
    const baseOptions = {
      mode: 'ace/mode/javascript',
      keyboardHandler: 'ace/keyboard/vscode',
      theme:
        this.$store.state.settings.theme === 'light'
          ? 'ace/theme/github'
          : 'ace/theme/tomorrow_night',
      fontSize: this.fontSize,
      value: this.value,
      showFoldWidgets: true,
      showGutter: true,
      showLineNumbers: true,
      showPrintMargin: false,
      tabSize: 2,
      useWorker: false
    }

    if (this.minimal) {
      baseOptions.showFoldWidgets = false
      baseOptions.showGutter = false
      baseOptions.showLineNumbers = false
    }

    return baseOptions
  }

  @Watch('fontSize')
  onFontSizeChange() {
    this.editorInstance.setOption('fontSize', this.fontSize)
  }

  @Watch('value')
  onValueChange(value) {
    this.editorInstance.setValue(value)
  }

  async mounted() {
    this.createEditor()
  }

  beforeDestroy() {
    this.editorInstance.destroy()

    if (this._blurTimeout) {
      this.onBlur()
    }
  }

  resize() {
    this.editorInstance.resize()
  }

  onBlur() {
    if (this._beforeUnloadHandler) {
      window.removeEventListener('beforeunload', this._beforeUnloadHandler)
      this._beforeUnloadHandler = null
    }

    this.$emit('blur', this.editorInstance.getValue())
  }

  onFocus() {
    if (this._beforeUnloadHandler) {
      return
    }

    this._beforeUnloadHandler = (event: any) => {
      event.preventDefault()
      event.returnValue = ''
      return false
    }
    window.addEventListener('beforeunload', this._beforeUnloadHandler)
  }

  async createEditor() {
    this.editorInstance = ace.edit(this.$el, this.options)
    ;(window as any).editorInstance = this.editorInstance
    this.editorInstance.renderer.setPadding(8)
    this.editorInstance.renderer.setScrollMargin(8, 0, 0, 0)
    this.editorInstance.container.style.lineHeight = 1.25

    this.editorInstance.setKeyboardHandler('ace/keyboard/vscode')

    this.editorInstance.on('blur', () => {
      if (this._blurTimeout) {
        clearTimeout(this._blurTimeout)
      }

      this._blurTimeout = setTimeout(() => {
        this.onBlur()
        this._blurTimeout = null
      }, 100) as unknown as number
    })

    this.editorInstance.on('focus', () => {
      if (this._blurTimeout) {
        clearTimeout(this._blurTimeout)
        this._blurTimeout = null
      }

      this.onFocus()
    })

    this.editorInstance.on('change', () => {
      this.$emit('input', this.editorInstance.getValue())
    })

    await this.$nextTick()

    this.editorInstance.focus()
  }
}
</script>

<style lang="scss">
.editor {
  width: 100%;
  height: 100%;
  min-height: 50px;

  &.ace_editor {
    background: var(--theme-background-75);
    font-family: $font-monospace;
    color: var(--theme-color-50);

    .ace_scrollbar {
      z-index: 10;

      &-v {
        width: 1rem !important;
        height: auto !important;
        background: var(--theme-background-75);
      }

      &-h {
        height: 1rem !important;
        width: auto !important;
        background: var(--theme-background-75);
      }
    }

    .ace_scrollbar::-webkit-scrollbar-track {
      background: 0;
    }

    .ace_scrollbar::-webkit-scrollbar-thumb {
      background-color: var(--theme-buy-100);
      border: 4px solid var(--theme-background-75);
      border-radius: 8px;
    }

    .ace_scrollbar::-webkit-scrollbar {
      width: 1rem;
      height: 1rem;
    }

    .ace_gutter {
      background-color: var(--theme-background-100);
      border-right: 0;
      color: var(--theme-color-o50);

      &-cell {
        padding-left: 0.25rem;
      }
    }

    .ace_mobile-menu {
      display: none;
    }

    .ace_marker-layer .ace_active-line,
    .ace_gutter-active-line {
      background: rgba(white, 0.05);
    }

    .ace-github.ace_focus .ace_marker-layer .ace_active-line {
      background: rgba(white, 0.05);
    }

    .ace_marker-layer .ace_selection {
      background: rgba(white, 0.1);
    }

    .ace_fold {
      box-shadow: 0 0 0.25em var(--theme-buy-base),
        0 0 0.5em var(--theme-buy-100);
      border-color: white;
    }

    .ace_fold-widget {
      background: 0;

      &:before {
        font-family: 'icon';
        font-size: 0.75em;
        content: $icon-down-thin;
        display: block;
        line-height: 1.5;
      }

      &.ace_closed:before {
        transform: rotateZ(-90deg);
      }

      &:hover {
        border: 0;
        box-shadow: none;
        opacity: 1;
        color: var(--theme-color-base);
      }
    }
  }
}
</style>
