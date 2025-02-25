import { languages, Range } from 'monaco-editor/esm/vs/editor/editor.api'
import { loadMd, showReference, TOKENS } from './references'

import AGGR_SUGGESTIONS from './suggestions'

const COMPLETION_THRESHOLD = 10
const TIME_THRESHOLD = 5000

let persistentVariablesCache = []
let completionCount = 0
let lastCacheUpdate = Date.now()

function updatePersistentVariablesCache(model) {
  const text = model.getValue()
  persistentVariablesCache = [
    ...new Set(
      [
        ...text.matchAll(
          /(?<!var\s|let\s|const\s)([a-zA-Z_][a-zA-Z0-9_]*)\s*=/g
        )
      ].map(match => match[1])
    )
  ]

  lastCacheUpdate = Date.now()
  completionCount = 0
  return persistentVariablesCache.length
}

export function provideCompletionItems(model, position) {
  const word = model.getWordUntilPosition(position)
  const range = {
    startLineNumber: position.lineNumber,
    endLineNumber: position.lineNumber,
    startColumn: word.startColumn,
    endColumn: word.endColumn
  }

  const queryFilter = new RegExp(`${word.word}`, 'i')

  const now = Date.now()
  if (
    completionCount >= COMPLETION_THRESHOLD ||
    now - lastCacheUpdate > TIME_THRESHOLD
  ) {
    updatePersistentVariablesCache(model)
  }
  completionCount++

  const suggestions = AGGR_SUGGESTIONS.filter(
    a => queryFilter.test(a.label) || queryFilter.test(a.detail)
  ).map(s => ({
    ...s,
    kind: languages.CompletionItemKind.Function,
    range
  }))

  persistentVariablesCache.forEach(variable => {
    suggestions.push({
      label: variable,
      kind: languages.CompletionItemKind.Variable,
      range,
      detail: 'Local variable',
      insertText: variable
    })
  })

  return { suggestions }
}

export async function provideHover(model, position) {
  const word = model.getWordAtPosition(position)

  if (!word || !word.word) {
    return
  }

  const token = word.word.replace(/^plot/, '')

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
