<template>
  <div class="editor"></div>
</template>

<script lang="ts">
import { Component, Vue, Watch } from 'vue-property-decorator'
import { rgbToHex, splitColorCode } from '@/utils/colors'
import monaco from './editor'

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
export default class Editor extends Vue {
  private value: string
  private fontSize: number
  private preventOverride: boolean

  private editorInstance: any

  private _blurTimeout: number
  private _beforeUnloadHandler: (event: Event) => void

  @Watch('fontSize')
  onFontSizeChange() {
    this.editorInstance.updateOptions({ fontSize: this.fontSize })
  }

  @Watch('value')
  onValueChange(value) {
    if (!this.preventOverride) {
      this.editorInstance.setValue(value)
    }
  }

  async mounted() {
    this.createTheme()

    this.createEditor()
  }

  beforeDestroy() {
    this.editorInstance.dispose()

    if (this._blurTimeout) {
      this.onBlur(true)
    }
  }

  async resize() {
    this.editorInstance.layout({ width: 0, height: 0 })

    await this.$nextTick()
    this.editorInstance.layout()
  }

  async onBlur(silent = false) {
    if (this._beforeUnloadHandler) {
      window.removeEventListener('beforeunload', this._beforeUnloadHandler)
      this._beforeUnloadHandler = null
    }

    if (!silent) {
      this.preventOverride = true
      this.$emit('blur', this.editorInstance.getValue())

      await this.$nextTick()

      this.preventOverride = false
    }
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

  createTheme() {
    const style = getComputedStyle(document.documentElement)
    const backgroundColor = splitColorCode(
      style.getPropertyValue('--theme-background-base')
    )
    const backgroundColor100 = splitColorCode(
      style.getPropertyValue('--theme-background-100')
    )

    monaco.defineTheme('my-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': rgbToHex(backgroundColor100),
        'editor.lineHighlightBackground': rgbToHex(backgroundColor),
        'editor.lineHighlightBorder': rgbToHex(backgroundColor)
      }
    })
  }

  async createEditor() {
    this.editorInstance = monaco.create(this.$el as HTMLElement, {
      value: this.value,
      language: 'javascript',
      fontSize: this.fontSize,
      scrollbar: {
        vertical: 'hidden'
      },
      overviewRulerBorder: false,
      theme:
        this.$store.state.settings.theme === 'light' ? 'vs-light' : 'my-dark'
    })
    this.editorInstance.onDidBlurEditorText(() => {
      if (this._blurTimeout) {
        clearTimeout(this._blurTimeout)
      }

      this._blurTimeout = setTimeout(() => {
        this.onBlur()
        this._blurTimeout = null
      }, 100) as unknown as number
    })
    this.editorInstance.onDidFocusEditorText(() => {
      if (this._blurTimeout) {
        clearTimeout(this._blurTimeout)
        this._blurTimeout = null
      }

      this.onFocus()
    })
  }
}
</script>

<style lang="scss">
.editor {
  height: 100%;
  min-height: 50px;

  .monaco-editor .minimap-shadow-visible {
    box-shadow: rgb(0 0 0 / 33%) -6px 0 6px -6px inset;
  }
}
</style>
