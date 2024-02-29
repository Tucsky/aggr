import 'monaco-editor/esm/vs/editor/editor.all.js'
import 'monaco-editor/esm/vs/language/typescript/monaco.contribution'
import 'monaco-editor/esm/vs/basic-languages/monaco.contribution'

import {
  editor,
  languages,
  Range
} from 'monaco-editor/esm/vs/editor/editor.api'
import AGGR_SUGGESTIONS from './suggestions'
import { loadMd, showReference, TOKENS } from './references'

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

languages.registerHoverProvider('javascript', {
  provideHover: async function (model, position) {
    // Get the word at the current position
    const word = model.getWordAtPosition(position)

    if (!word || !word.word) {
      return
    }

    const token = word.word.replace(/^plot/, '')

    // Check if the word is one of the specific tokens
    if (TOKENS.indexOf(token) !== -1) {
      const md = await loadMd(token)
      let contents
      if (md) {
        contents = md
          .split(/\n\n/)
          .slice(0, 2)
          .map(row => ({
            value: row
          }))
          .concat({
            value: `[Learn more](${token})`
          })

        setTimeout(() => {
          const linkElement = document.querySelector(`a[data-href="${token}"]`)

          if (!linkElement) {
            return
          }

          linkElement.addEventListener('click', (event: MouseEvent) => {
            event.preventDefault()

            showReference(token, md, {
              x: event.clientX,
              y: event.clientY
            })
          })
        }, 500)
      } else {
        contents = [{ value: 'no definition found' }]
      }

      return {
        range: new Range(
          position.lineNumber,
          word.startColumn,
          position.lineNumber,
          word.endColumn
        ),
        contents
      }
    }
  }
})

export default editor
