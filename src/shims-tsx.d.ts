import Vue, { VNode } from 'vue'

import type monaco from 'monaco-editor'

declare global {
  namespace Monaco {
    type Editor = typeof monaco.editor
    type Options = monaco.editor.IEditorOptions &
      monaco.editor.IGlobalEditorOptions & {
        value?: string
        language?: string
      }
  }
}
