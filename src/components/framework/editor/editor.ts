import 'monaco-editor/esm/vs/editor/editor.all.js'
import 'monaco-editor/esm/vs/language/typescript/monaco.contribution'
import 'monaco-editor/esm/vs/basic-languages/monaco.contribution'

import { editor, languages } from 'monaco-editor/esm/vs/editor/editor.api'
import AGGR_SUGGESTIONS from './suggestions'

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
  provideCompletionItems: function (model, position) {
    const word = model.getWordUntilPosition(position)
    const range = {
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      startColumn: word.startColumn,
      endColumn: word.endColumn
    }

    const queryFilter = new RegExp(`${word}`, 'i')

    return {
      suggestions: AGGR_SUGGESTIONS.filter(
        a => queryFilter.test(a.label) || queryFilter.test(a.detail)
      ).map(s => ({
        ...s,
        kind: languages.CompletionItemKind.Function,
        range
      }))
    }
  }
})

export default editor
