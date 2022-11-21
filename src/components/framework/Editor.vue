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
      default: 12
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
      tabSize: 2
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

  mounted() {
    this.editorInstance = ace.edit(this.$el, this.options)

    this.editorInstance.setKeyboardHandler('ace/keyboard/vscode')

    this.editorInstance.on('blur', () => {
      this.$emit('blur')
    })

    this.editorInstance.on('change', () => {
      this.$emit('input', this.editorInstance.getValue())
    })

    this.editorInstance.session.on('changeMode', () => {
      this.editorInstance.session.setOption('useWorker', false)
    })
    ;(window as any).editorI = this.editorInstance
  }

  beforeDestroy() {
    this.editorInstance.destroy()
  }

  resize() {
    this.editorInstance.resize()
  }
}
</script>

<style lang="scss">
.editor {
  width: 100%;
  height: 100%;
  min-height: 50px;
  background: 0;

  .ace_scrollbar::-webkit-scrollbar-track {
    background: 0;
  }

  .ace_scrollbar::-webkit-scrollbar-thumb {
    background-color: rgba(black, 0.5);
  }

  .ace_scrollbar::-webkit-scrollbar {
    width: 0.5rem;
    height: 0.5rem;
  }

  .ace_gutter {
    background-color: var(--theme-background-100);
    color: var(--theme-color-o50);
  }

  .ace_content {
    background-color: rgba(black, 0.1);
  }
}
</style>
