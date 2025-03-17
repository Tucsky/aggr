<template>
  <div class="editor" @contextmenu="onContextMenu"></div>
</template>

<script lang="ts">
import { Component, Vue, Watch } from 'vue-property-decorator'
import { rgbToHex, splitColorCode } from '@/utils/colors'
import monaco from './editor'
import { createComponent, getEventCords, mountComponent } from '@/utils/helpers'
import {
  IndicatorEditorOptions,
  IndicatorEditorWordWrapOption
} from '@/store/panesSettings/chart'
@Component({
  name: 'Editor',
  props: {
    value: {
      type: String,
      default: ''
    },
    editorOptions: {
      type: Object,
      default: {}
    }
  }
})
export default class Editor extends Vue {
  private value: string
  private editorOptions: IndicatorEditorOptions
  private preventOverride: boolean
  private editorInstance: any

  private _blurTimeout: number
  private _beforeUnloadHandler: (event: Event) => void
  private contextMenuComponent: any

  currentEditorOptions = {
    fontSize: window.devicePixelRatio > 1 ? 12 : 14,
    wordWrap: 'off' as IndicatorEditorWordWrapOption
  }

  @Watch('editorOptions', {
    deep: true
  })
  onEditorOptionsChange(options) {
    this.editorInstance.updateOptions(options)
  }

  @Watch('value')
  onValueChange(value) {
    if (!this.preventOverride) {
      this.editorInstance.setValue(value)
    }
  }

  async mounted() {
    for (const key in this.editorOptions) {
      if (this.editorOptions[key]) {
        this.currentEditorOptions[key] = this.editorOptions[key]
      }
    }

    this.createEditor()
  }

  beforeDestroy() {
    if (this._blurTimeout) {
      this.onBlur(true)
    }

    this.editorInstance.dispose()
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

  async createEditor() {
    this.editorInstance = monaco.create(this.$el as HTMLElement, {
      value: this.value,
      language: 'javascript',
      tabSize: 2,
      insertSpaces: true,
      fontSize: this.currentEditorOptions.fontSize,
      wordWrap: this.currentEditorOptions.wordWrap,
      scrollbar: {
        vertical: 'hidden'
      },
      overviewRulerLanes: 0,
      overviewRulerBorder: false,
      contextmenu: false,
      theme: 'aggr'
    })

    this.editorInstance.getDomNode().addEventListener('mousedown', () => {
      if (this.contextMenuComponent && this.contextMenuComponent.value) {
        this.contextMenuComponent.value = null
      }
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

  async onContextMenu(event) {
    if (window.innerWidth < 375) {
      return
    }

    event.preventDefault()
    const { x, y } = getEventCords(event, true)

    const propsData = {
      value: {
        top: y,
        left: x,
        width: 2,
        height: 2
      },
      editorOptions: this.currentEditorOptions
    }

    if (this.contextMenuComponent) {
      this.contextMenuComponent.$off('cmd')
      for (const key in propsData) {
        this.contextMenuComponent[key] = propsData[key]
      }
    } else {
      document.body.style.cursor = 'progress'
      const module = await import(
        `@/components/framework/editor/EditorContextMenu.vue`
      )
      document.body.style.cursor = ''

      this.contextMenuComponent = createComponent(module.default, propsData)
      mountComponent(this.contextMenuComponent)
    }

    this.contextMenuComponent.$on('cmd', args => {
      if (this[args[0]] instanceof Function) {
        this[args[0]](...args.slice(1))
      } else {
        throw new Error(`[editor] ContextMenu-->${args[0]} is not a function`)
      }
    })
  }

  zoom(value, override?: boolean) {
    if (override) {
      this.currentEditorOptions.fontSize = value
    } else {
      this.currentEditorOptions.fontSize += value
    }
    this.$emit('options', this.currentEditorOptions)
  }

  toggleWordWrap(value) {
    this.currentEditorOptions.wordWrap = !value ? 'on' : 'off'
    this.$emit('options', this.currentEditorOptions)
  }
}
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
