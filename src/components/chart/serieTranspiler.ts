/* eslint-disable no-unused-vars */
import * as seriesUtils from './serieUtils'

import { exchanges } from '@/worker/exchanges'
import { Renderer, SerieAdapter, SerieInstruction, SerieTranspilationResult } from './chartController'
const AVERAGE_FUNCTIONS_NAMES = ['sma', 'ema', 'cma']
const VARIABLE_REGEX = /([a-zA-Z0_9_]+)\s*=\s*(.*)/
const STRIP_COMMENTS_REGEX = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/gm
const ARGUMENT_NAMES_REGEX = /([^\s,]+)/g
const VARIABLES_VAR_NAME = 'vars'
const FUNCTIONS_VAR_NAME = 'fns'

export default class SerieTranspiler {
  exchanges = exchanges.map(a => a.id)

  transpile(serie) {
    // input === delta = vbuy - vsell, cum(delta) + sma(ema(delta[1], 20), 10)
    const result = this.parse(serie.input)

    // guess the initial state of each function/variable in the code
    for (const instruction of [...result.functions, ...result.variables]) {
      this.guessInstructionState(instruction)
    }

    // run test (will affect functions length)
    const type = this.test(result, serie.options)

    // rollback states to original
    for (const instruction of [...result.functions, ...result.variables]) {
      this.guessInstructionState(instruction)
    }

    return {
      output: result.output,
      functions: result.functions,
      variables: result.variables,
      references: result.references,
      type
    }
  }

  normalizeInput(input) {
    input = '(' + input + ')'
    input = input.replace(/([^.])?\b(bar)\b/gi, '$1renderer')
    input = input.replace(/([^.])?\b(vbuy|vsell|cbuy|csell|lbuy|lsell)\b/gi, '$1renderer.bar.$2')
    input = input.replace(/\s/g, '')

    return input
  }

  guessInstructionState(instruction) {
    if (instruction.state) {
      if (typeof instruction.state.open === 'number') {
        instruction.type = 'ohlc'
      }
    }

    switch (instruction.type) {
      case 'number':
        instruction.state = 0
        break
      case 'array':
        instruction.state = []
        break
      case 'average_function':
        instruction.state = {
          sum: 0,
          count: 0,
          points: []
        }
        break
      default:
        instruction.state = {}
        break
    }
  }

  parse(input): SerieTranspilationResult {
    const functions: SerieInstruction[] = []
    const variables: SerieInstruction[] = []
    const exchanges: string[] = []
    const references: string[] = []

    let output = this.normalizeInput(input)

    output = this.parseVariables(output, variables)
    output = this.parseFunctions(output, functions)

    output = this.parseExchanges(output, exchanges)
    output = this.parseReferences(output, references)

    return {
      output,
      functions,
      variables,
      exchanges,
      references,
      type: null // will be guessed during test
    }
  }

  parseVariables(output, variables): string {
    let variableMatch = null

    do {
      if ((variableMatch = VARIABLE_REGEX.exec(output))) {
        const variableName = variableMatch[1]

        output = output.replace(new RegExp('\\b(' + variableName + ')\\b', 'ig'), `${VARIABLES_VAR_NAME}[${variables.length}]`)

        variables.push({
          type: 'unknown',
          length: 1,
          name: variableName
        })
      }
    } while (variableMatch)

    output = this.determineVariablesType(output, variables)

    return output
  }

  parseFunctions(output: string, instructions: SerieInstruction[]): string {
    let functionMatch = null

    const FUNCTION_REGEX = new RegExp(`([a-zA-Z0_9_]+)\\(`, 'g')

    do {
      if ((functionMatch = FUNCTION_REGEX.exec(output))) {
        const functionName = functionMatch[1]

        if (Object.prototype.hasOwnProperty.call(Math, functionName)) {
          FUNCTION_REGEX.lastIndex = functionMatch.index + functionMatch[0].length
          continue
        }

        const instruction: SerieInstruction = {
          type: AVERAGE_FUNCTIONS_NAMES.indexOf(functionName) !== -1 ? 'average_function' : 'function',
          name: functionName
        }

        const targetFunction = seriesUtils[functionName + '$']

        if (!targetFunction) {
          throw new Error(`function ${functionName} doesn't exists`)
        }

        const functionArguments = output
          .slice(
            functionMatch.index + functionMatch[1].length + 1,
            this.findClosingBracketMatchIndex(output, functionMatch.index + functionMatch[1].length)
          )
          .replace(/\(.*\)/g, '')
          .split(',')
        /*.reduce((argumentMap, argumentValue, index) => {
            argumentMap[functionArgumentsNames[index]] = argumentValue

            return argumentMap
          }, {})*/

        if (functionArguments.length == 2) {
          instruction.arg = functionArguments[1]
        }

        output = output.replace(FUNCTION_REGEX, `utils.$1$(${FUNCTIONS_VAR_NAME}[${instructions.length}].state,`)
        instructions.push(instruction)
      }
    } while (functionMatch)

    return output
  }
  parseExchanges(output: string, exchanges: string[]): string {
    const EXCHANGE_REGEX = new RegExp(`([^.$])\\b(${this.exchanges.join('|')})\\b`)

    let exchangeMatch = null
    let free = 0
    do {
      if ((exchangeMatch = EXCHANGE_REGEX.exec(output))) {
        free++
        const exchangeName = exchangeMatch[2]

        if (exchanges.indexOf(exchangeName) === -1) {
          exchanges.push(exchangeName)
        }

        output = output.replace(new RegExp('([^.$])\\b(' + exchangeName + ')\\b', 'ig'), `$1renderer.exchanges.${exchangeName}`)
      }
    } while (free < 10 && exchangeMatch)

    for (const exchange of exchanges) {
      output = `(renderer.exchanges.${exchange} ? ${output} : null)`
    }

    return output
  }
  parseReferences(output: string, references: string[]): string {
    const REFERENCE_REGEX = new RegExp('\\$([a-z_\\-0-9]+)\\b')

    let referenceMatch = null
    let free = 0

    do {
      if ((referenceMatch = REFERENCE_REGEX.exec(output))) {
        free++
        const serieId = referenceMatch[1]

        if (references.indexOf(serieId) === -1) {
          references.push(serieId)
        }

        output = output.replace(new RegExp('\\$(' + serieId + ')\\b', 'ig'), `renderer.series.$1.point`)
      }
    } while (free < 10 && referenceMatch)

    for (const reference of references) {
      output = `(renderer.series.${reference} && renderer.series.${reference}.point !== null ? ${output} : null)`
    }

    return output
  }

  determineVariablesType(output, variables) {
    for (const variable of variables) {
      const index = variables.indexOf(variable)
      const VARIABLE_LENGTH_REGEX = new RegExp(`${VARIABLES_VAR_NAME}\\[${index}\\](?:\\[(\\d+)\\])?`, 'g')

      let lengthMatch = null

      do {
        if ((lengthMatch = VARIABLE_LENGTH_REGEX.exec(output))) {
          const variableLength = lengthMatch[1]
          const position = lengthMatch.index + lengthMatch[0].length

          if (typeof variableLength === 'undefined') {
            output = output.substring(0, position) + '.state[0]' + output.substring(position)
          } else {
            const beforeVariable = output.substring(0, lengthMatch.index)
            const variableReplacement = `${VARIABLES_VAR_NAME}[${index}].state[Math.min(${VARIABLES_VAR_NAME}[${index}].state.length-1,${variableLength})]`
            const afterVariable = output.substring(lengthMatch.index + lengthMatch[0].length)
            output = `${beforeVariable}${variableReplacement}${afterVariable}`

            VARIABLE_LENGTH_REGEX.lastIndex = beforeVariable.length + variableReplacement.length
          }

          variable.length = Math.max(variable.length, (+variableLength || 0) + 1)
        }
      } while (lengthMatch)

      if (!variable.length) {
        throw new Error('no length on var ' + variable.name)
      }

      if (variable.length === 1) {
        variable.type = 'number'

        output = output.replace(new RegExp(`${VARIABLES_VAR_NAME}\\[${index}\\]\\.state\\[\\d+\\]`, 'g'), `${VARIABLES_VAR_NAME}[${index}].state`)
      } else {
        variable.type = 'array'
      }
    }

    return output
  }

  test({ output, functions, variables, exchanges, references }: SerieTranspilationResult, options) {
    const adapter = (function() {
      'use strict'
      return new Function('renderer', FUNCTIONS_VAR_NAME, VARIABLES_VAR_NAME, 'options', 'utils', '"use strict"; return ' + output)
    })()

    const values = []
    let renderer = this.getRenderer(null, exchanges, references)

    for (let t = 0; t < 3; t++) {
      const value = adapter(renderer, functions, variables, options, seriesUtils)
      values.push(value)

      renderer = this.getRenderer(renderer, exchanges, references)
    }

    const valueSample = values[values.length - 1]

    if (typeof valueSample === 'number') {
      return 'value'
    } else if (valueSample && typeof valueSample === 'object') {
      if (typeof valueSample.open === 'number') {
        return 'ohlc'
      } else if (typeof valueSample.value === 'number') {
        return 'custom'
      }
    }

    throw new Error('unknown serie output type')
  }

  getRenderer(previousRenderer, exchanges, references) {
    const sample = {
      open: 58137,
      high: 58137,
      low: 58102,
      close: 58112,
      pair: 'BTCUSD',
      vbuy: 3532,
      vsell: 54550,
      cbuy: 7,
      csell: 15,
      lbuy: 0,
      lsell: 0
    }

    const renderer: Renderer = {
      timestamp: null,
      length: 1,
      bar: {
        vbuy: 0,
        vsell: 0,
        cbuy: 0,
        csell: 0,
        lbuy: 0,
        lsell: 0
      },
      sources: {},
      series: {}
    }

    if (references) {
      for (const serieId of references) {
        ;(renderer as any).series[serieId] = {
          value: 1,
          point: {
            close: 1
          }
        }
      }
    }

    if (!previousRenderer) {
      renderer.timestamp = Math.floor(Math.round(+new Date() / 1000) / 10) * 10
    } else {
      renderer.timestamp = previousRenderer.timestamp + 10
    }

    for (const name of exchanges) {
      const exchangeBar = Object.assign({}, sample)

      const priceVariation = (Math.random() - 0.5) / 100
      const volumeVariation = (Math.random() - 0.5) / 100

      if (previousRenderer) {
        exchangeBar.open *= previousRenderer.exchanges[name].close
      }
      exchangeBar.close = Math.abs(exchangeBar.close * priceVariation)
      exchangeBar.high = Math.max(exchangeBar.high, exchangeBar.close)
      exchangeBar.low = Math.min(exchangeBar.low, exchangeBar.close)
      exchangeBar.vbuy = Math.abs(exchangeBar.vbuy * volumeVariation)
      exchangeBar.vsell = Math.abs(exchangeBar.vsell * volumeVariation)
      exchangeBar.cbuy = Math.abs(exchangeBar.cbuy * volumeVariation)
      exchangeBar.csell = Math.abs(exchangeBar.csell * volumeVariation)
      exchangeBar.lbuy = Math.abs(exchangeBar.lbuy * volumeVariation)
      exchangeBar.lsell = Math.abs(exchangeBar.lsell * volumeVariation)

      renderer.bar.vbuy += exchangeBar.vbuy
      renderer.bar.vsell += exchangeBar.vsell
      renderer.bar.cbuy += exchangeBar.cbuy
      renderer.bar.csell += exchangeBar.csell
      renderer.bar.lbuy += exchangeBar.lbuy
      renderer.bar.lsell += exchangeBar.lsell

      renderer.sources[name] = exchangeBar
    }

    return renderer
  }

  getAdapter(output) {
    return (function() {
      'use strict'
      return new Function('renderer', FUNCTIONS_VAR_NAME, VARIABLES_VAR_NAME, 'options', 'utils', '"use strict"; return ' + output)
    })() as SerieAdapter
  }

  findClosingBracketMatchIndex(str, pos) {
    if (str[pos] != '(') {
      throw new Error("No '(' at index " + pos)
    }

    let depth = 1

    for (let i = pos + 1; i < str.length; i++) {
      switch (str[i]) {
        case '(':
          depth++
          break
        case ')':
          if (--depth == 0) {
            return i
          }
          break
      }
    }
    return -1 // No matching closing parenthesis
  }

  getParamNames(func) {
    const fnStr = func.toString().replace(STRIP_COMMENTS_REGEX, '')
    let result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(ARGUMENT_NAMES_REGEX)

    if (result === null) {
      result = []
    }

    return result
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  updateInstructionsArgument(functions, options) {
    let minLength = 0

    for (const instruction of functions) {
      if (typeof instruction.arg === 'undefined') {
        continue
      }

      try {
        instruction.arg = eval(instruction.arg)

        if (typeof instruction.arg === 'number') {
          minLength = Math.max(minLength, instruction.arg)
        }
      } catch (error) {
        // nothing to see here
      }
    }

    options.minLength = minLength
  }
}
