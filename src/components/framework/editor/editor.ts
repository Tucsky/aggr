import 'monaco-editor/esm/vs/editor/editor.all.js'
import 'monaco-editor/esm/vs/language/typescript/monaco.contribution'
import 'monaco-editor/esm/vs/basic-languages/monaco.contribution'

import { editor, languages } from 'monaco-editor/esm/vs/editor/editor.api'
import { provideCompletionItems, provideHover } from './completion'

languages.typescript.javascriptDefaults.setCompilerOptions({
  noLib: true,
  lib: [],
  allowNonTsExtensions: true
})

languages.typescript.javascriptDefaults.setDiagnosticsOptions({
  noSemanticValidation: true,
  noSyntaxValidation: true
})

languages.registerCompletionItemProvider('javascript', {
  provideCompletionItems
})

languages.registerHoverProvider('javascript', {
  provideHover
})

export default editor
