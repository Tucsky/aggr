import 'monaco-editor/esm/vs/editor/editor.all.js'
import 'monaco-editor/esm/vs/language/typescript/monaco.contribution'
import 'monaco-editor/esm/vs/basic-languages/monaco.contribution'

import store from '@/store'
import { editor, languages } from 'monaco-editor/esm/vs/editor/editor.api'
import { provideCompletionItems, provideHover } from './completion'
import { rgbToHex, splitColorCode } from '@/utils/colors'

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

const lsLight = store.state.settings.theme === 'light'
const style = getComputedStyle(document.documentElement)
const backgroundColor = splitColorCode(
  style.getPropertyValue('--theme-background-base')
)
const backgroundColor100 = splitColorCode(
  style.getPropertyValue('--theme-background-100')
)
const backgroundColor150 = splitColorCode(
  style.getPropertyValue('--theme-background-150')
)

if (lsLight) {
  editor.defineTheme('aggr', {
    base: 'vs',
    inherit: true,
    rules: [],
    colors: {
      'minimap.background': rgbToHex(backgroundColor150),
      'editor.background': rgbToHex(backgroundColor100),
      'editor.lineHighlightBackground': rgbToHex(backgroundColor),
      'editor.lineHighlightBorder': rgbToHex(backgroundColor)
    }
  })
} else {
  editor.defineTheme('aggr', {
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

export default editor
