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

  private editorInstance: any

  private _blurTimeout: number
  private _beforeUnloadHandler: (event: Event) => void

  @Watch('fontSize')
  onFontSizeChange() {
    this.editorInstance.updateOptions({ fontSize: this.fontSize })
  }

  @Watch('value')
  onValueChange(value) {
    this.editorInstance.setValue(value)
  }

  async mounted() {
    this.createTheme()

    this.createEditor()
  }

  beforeDestroy() {
    this.editorInstance.dispose()

    if (this._blurTimeout) {
      this.onBlur()
    }
  }

  async resize() {
    this.editorInstance.layout({ width: 0, height: 0 })

    await this.$nextTick()
    this.editorInstance.layout()
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

  createTheme() {
    const style = getComputedStyle(document.documentElement)
    const backgroundColor = splitColorCode(
      style.getPropertyValue('--theme-background-base')
    )
    const backgroundColor100 = splitColorCode(
      style.getPropertyValue('--theme-background-100')
    )

    monaco.editor.defineTheme('my-dark', {
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
    this.editorInstance = monaco.editor.create(this.$el as HTMLElement, {
      value: this.value,
      language: 'javascript',
      fontSize: this.fontSize,
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
}
</style>
