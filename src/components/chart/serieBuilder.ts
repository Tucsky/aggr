/* eslint-disable no-unused-vars */
import * as seriesUtils from './serieUtils'

import {
  Renderer,
  IndicatorRealtimeAdapter,
  IndicatorTranspilationResult,
  IndicatorPlot,
  IndicatorVariable,
  IndicatorFunction,
  LoadedIndicator,
  IndicatorApi,
  IndicatorReference,
  IndicatorMarkets
} from './chart'
import store from '@/store'
import { findClosingBracketMatchIndex, parseFunctionArguments, randomString, uniqueName } from '@/utils/helpers'
import { plotTypesMap } from './options'
const SERIE_UPDATE_REGEX = /series\[[a-zA-Z0-9+\-$ ]+\]\.update\(/
const VARIABLES_VAR_NAME = 'vars'
const FUNCTIONS_VAR_NAME = 'fns'
const SERIE_TYPES = {
  candlestick: 'ohlc',
  bar: 'ohlc',
  line: 'number',
  histogram: 'number',
  area: 'number',
  cloudarea: 'range',
  brokenarea: 'range',
  baseline: 'number'
}
export default class SerieBuilder {
  private paneId: string
  private markets: string[]
  private indicatorId: string
  private serieIndicatorsMap: { [serieId: string]: IndicatorReference }

  /**
   * build indicator
   * parse variable, functions referenced sources and indicator used in it
   * prepare dedicated state for each variables and functions
   * @param indicator indicator to build
   * @param serieIndicatorsMap serieId => { indicatorId, plotIndex } of activated indicators for dependency matching
   * @param paneId paneId that trigged the build
   * @returns {IndicatorTranspilationResult} build result
   */
  build(indicator: LoadedIndicator, serieIndicatorsMap: { [serieId: string]: IndicatorReference }, paneId: string) {
    this.paneId = paneId
    this.indicatorId = indicator.id
    this.serieIndicatorsMap = serieIndicatorsMap

    this.markets = []
    for (const market of store.state.panes.panes[this.paneId].markets) {
      if (this.markets.indexOf(market) === -1) {
        this.markets.push(market)
      }
    }

    const result = this.parse(indicator.script)

    // guess the initial state of each function/variable in the code
    for (const instruction of result.functions) {
      this.determineFunctionState(instruction)
    }

    for (const instruction of result.variables) {
      this.determineVariableState(instruction)
    }

    // run test (will affect functions length)
    const type = this.test(result, indicator.options)

    // rollback states to original
    for (const instruction of result.functions) {
      this.determineFunctionState(instruction)
    }

    for (const instruction of result.variables) {
      this.determineVariableState(instruction)
    }

    return {
      output: result.output,
      silentOutput: result.silentOutput,
      functions: result.functions,
      variables: result.variables,
      references: result.references,
      markets: result.markets,
      plots: result.plots,
      type
    }
  }

  /**
   * replace shorthands with real variables names :
   * replace 'bar' with renderer.bar
   * replace all data (vbuy, vsell etc) from bar with renderer.bar.*
   * remove spaces (keep new lines)
   * @param input
   * @returns
   */
  normalizeInput(input, strings) {
    input = input.replace(/([^.])?\b(bar)\b/gi, '$1renderer')
    input = input.replace(/([^.]|^)\b(vbuy|vsell|cbuy|csell|lbuy|lsell)\b/gi, '$1renderer.bar.$2')
    input = input.replace(/([^.]|^)\b(time)\b([^:])/gi, '$1renderer.localTimestamp$3')
    input = input.replace(/(\n|^)\s*?\/\/.*/g, '')

    const STRING_REGEX = /'([^']*)'|"([^"]*)"/
    let stringMatch = null
    let iterations = 0

    do {
      if ((stringMatch = STRING_REGEX.exec(input))) {
        let refIndex = strings.indexOf(stringMatch[0])

        if (refIndex === -1) {
          refIndex = strings.push(stringMatch[0]) - 1
        }
        input = input.slice(0, stringMatch.index) + '#STRING_' + refIndex + '#' + input.slice(stringMatch.index + stringMatch[0].length)
      }
    } while (stringMatch && ++iterations < 1000)

    // input = input.replace(/[^\S\r\n]/g, '')

    const PARANTHESIS_REGEX = /\(/g
    let paranthesisMatch
    iterations = 0

    do {
      if ((paranthesisMatch = PARANTHESIS_REGEX.exec(input))) {
        const closingParenthesisIndex = findClosingBracketMatchIndex(input, paranthesisMatch.index, /\(|{|\[/, /\)|}|\]/)

        if (closingParenthesisIndex !== -1) {
          const contentWithinParenthesis = input.slice(paranthesisMatch.index + 1, closingParenthesisIndex).replace(/\n/g, ' ')

          input =
            input.slice(0, paranthesisMatch.index) +
            input.slice(paranthesisMatch.index, paranthesisMatch.index + 1) +
            contentWithinParenthesis.replace(/\n/g, '') +
            input.slice(closingParenthesisIndex, closingParenthesisIndex + 1) +
            '\n' +
            input.slice(closingParenthesisIndex + 1, input.length)

          PARANTHESIS_REGEX.lastIndex = closingParenthesisIndex
        }
      }
    } while (paranthesisMatch && ++iterations < 1000)

    return input
  }

  /**
   * use default state instruction defined in seriesUtils for each functions
   * @param instruction
   * @returns void
   */
  determineFunctionState(instruction: IndicatorFunction) {
    if (typeof seriesUtils[instruction.name] && typeof seriesUtils[instruction.name] === 'object') {
      instruction.state = {}

      for (const prop in seriesUtils[instruction.name]) {
        if (prop === 'lengthIndexes') {
          continue
        }

        try {
          instruction.state[prop] = JSON.parse(JSON.stringify(seriesUtils[instruction.name][prop]))
        } catch (error) {
          instruction.state[prop] = seriesUtils[instruction.name]
        }
      }

      return
    }

    instruction.state = {}
  }

  /**
   * use instruction.length to know how much values the variables need to keep track of
   * no state needed if variable history are never called in the script
   * @param instruction
   */
  determineVariableState(instruction: IndicatorVariable) {
    if (instruction.length > 1) {
      instruction.state = []
    } else {
      instruction.state = 0
    }
  }

  getSilentOutput(originalOutput) {
    let silentOutput = originalOutput

    let instructionMatch = null
    let iterations = 0

    do {
      if ((instructionMatch = SERIE_UPDATE_REGEX.exec(silentOutput))) {
        const openingParenthesisIndex = instructionMatch.index + instructionMatch[0].length - 1
        const closingParenthesisIndex = findClosingBracketMatchIndex(silentOutput, openingParenthesisIndex)
        silentOutput = silentOutput.replace(instructionMatch[0] + silentOutput.slice(openingParenthesisIndex + 1, closingParenthesisIndex + 1), 1)
      }
    } while (instructionMatch && ++iterations < 1000)

    return silentOutput
  }

  /**
   * parse variable, functions referenced sources and external indicators used in it
   * @param input
   * @returns
   */
  parse(input): IndicatorTranspilationResult {
    const functions: IndicatorFunction[] = []
    const variables: IndicatorVariable[] = []
    const plots: IndicatorPlot[] = []
    const markets: IndicatorMarkets = {}
    const references: IndicatorReference[] = []
    const strings = []

    let output = this.normalizeInput(input, strings)

    output = this.parseVariables(output, variables)

    for (let i = 0; i < strings.length; i++) {
      output = output.replace(new RegExp('#STRING_' + i + '#', 'g'), strings[i].replace(/\$/g, '$$$'))
    }

    output = this.parseFunctions(output, functions, plots)

    output = this.parseMarkets(output, markets)
    output = this.parseReferences(output, references, plots)

    output = this.formatOutput(output)

    const silentOutput = this.getSilentOutput(output)

    return {
      output,
      silentOutput,
      functions,
      variables,
      plots,
      markets,
      references
    }
  }

  formatOutput(input) {
    const PARANTHESIS_REGEX = /\(|{|\[/g

    let paranthesisMatch
    let iterations = 0

    do {
      if ((paranthesisMatch = PARANTHESIS_REGEX.exec(input))) {
        const lineBreakIt = paranthesisMatch[0] === '('

        const closingParenthesisIndex = findClosingBracketMatchIndex(input, paranthesisMatch.index, /\(|{|\[/, /\)|}|\]/)
        const contentWithinParenthesis = input.slice(paranthesisMatch.index + 1, closingParenthesisIndex).replace(/\n/g, ' ')

        if (/if|for|else/.test(input.slice(paranthesisMatch.index - 2, 2))) {
          input =
            input.slice(0, paranthesisMatch.index) +
            input.slice(paranthesisMatch.index, paranthesisMatch.index + 1) +
            contentWithinParenthesis +
            input.slice(closingParenthesisIndex, closingParenthesisIndex + 1) +
            (lineBreakIt ? '\n' : '') +
            input.slice(closingParenthesisIndex + 1, input.length)
        }

        PARANTHESIS_REGEX.lastIndex = closingParenthesisIndex
      }
    } while (paranthesisMatch && ++iterations < 1000)

    const lines = input.trim().split(/\n/)

    for (let i = 0; i < lines.length; i++) {
      const sourcesMatches = lines[i].match(/renderer.sources\['[\w/:_-]+']\.\w+/g)

      if (sourcesMatches && sourcesMatches.length === 1) {
        lines[i] = `if (${sourcesMatches[0]}) {
          ${lines[i]}
        }`
      }
    }

    return lines.join('\n').replace(/\n\n/g, '\n')
  }

  parseVariables(output, variables): string {
    const VARIABLE_REGEX = /(?:^|\n)\s*((?:var )?[a-zA-Z0-9_]+)\(?(\d*)\)?\s*=\s*([^\n;,]*)?/
    let variableMatch = null
    let iterations = 0

    const nonPersistentVariables = []

    do {
      if ((variableMatch = VARIABLE_REGEX.exec(output))) {
        let variableName = variableMatch[1]
        const isNonPersistent = /^var/.test(variableName)

        if (nonPersistentVariables.indexOf(variableName) !== -1 || isNonPersistent) {
          if (isNonPersistent) {
            variableName = variableName.replace(/var\s*/, '')
            output = output.replace(variableMatch[0], '\nvar ' + variableName + '=' + variableMatch[3])
            nonPersistentVariables.push(variableName)
          }

          // eslint-disable-next-line no-useless-escape
          output = output.replace(new RegExp('([^.$]|^)\\b(' + variableName + ')\\b(?!:)(?!\\()(?!\\$)', 'ig'), `$1${variableName}$`)
          continue
        }

        const variableLength = +variableMatch[2] || 1

        output = output.replace(new RegExp('([^.]|^)\\b(' + variableName + ')\\b(?!:)', 'ig'), `$1${VARIABLES_VAR_NAME}[${variables.length}]`)

        const variable: IndicatorVariable = {
          length: variableLength
        }

        variables.push(variable)
        output = output.replace(new RegExp(`(${VARIABLES_VAR_NAME}\\[${variables.length - 1}\\])\\(${variable.length}\\)\\s*=\\s*`), '$1=')
      }
    } while (variableMatch && ++iterations < 1000)

    output = this.determineVariablesType(output, variables)

    return output
  }

  parseSerie(output: string, match: RegExpExecArray, plots: IndicatorPlot[]) {
    // absolute serie type eg. plotline -> line)
    const serieType = match[1].replace(/^plot/, '')

    // serie arguments eg. sma($price.close,options.smaLength),color=red
    const closingBracketIndex = findClosingBracketMatchIndex(output, match.index + match[1].length)
    const rawFunctionArguments = output.slice(match.index + match[1].length + 1, closingBracketIndex)

    // full function call eg. plotline(sma($price.close,options.smaLength),color=red)
    const rawFunctionInstruction = match[1] + '(' + rawFunctionArguments + ')'

    // plot function arguments ['sma($price.close,options.smaLength)','color=red']
    const args = parseFunctionArguments(rawFunctionArguments)
    const serieOptions: { [key: string]: any } = {}

    // parse and store serie options in dedicated object (eg. color=red in plotline arguments)
    for (let i = 1; i < args.length; i++) {
      try {
        const [, key, value] = args[i].match(/^(\w+)\s*=(.*)/)

        if (!key || !value.length) {
          continue
        }

        let parsedValue = value.trim()

        try {
          parsedValue = JSON.parse(parsedValue)
        } catch (error) {
          // value a string
        }

        serieOptions[key.trim()] = parsedValue

        args.splice(i, 1)
        i--
      } catch (error) {
        continue
      }
    }

    // prepare final input that goes in plotline (store it for reference)
    const pointVariable = `renderer.indicators['${this.indicatorId}'].series[${plots.length}]`
    let seriePoint = `${pointVariable} = `

    const expectedInput = SERIE_TYPES[serieType]
    let timeProperty = `renderer.localTimestamp`

    if (serieOptions.offset) {
      timeProperty += `+renderer.timeframe*${serieOptions.offset}`
    }

    // tranform input into valid lightweight-charts data point
    if (serieType !== 'line' && args.length === 1 && ((/{/.test(args[0]) && /}/.test(args[0])) || /^[\w_]+\$/.test(args[0]))) {
      seriePoint += args[0]
    } else if (expectedInput === 'ohlc') {
      if (args.length === 4) {
        seriePoint += `{ time: ${timeProperty}, open: ${args[0]}, high: ${args[1]}, low: ${args[2]}, close: ${args[3]} }`
      } else if (args.length === 1) {
        if (/^[A-Z_]+:\w+/.test(args[0])) {
          seriePoint += `${args[0]}.close === null ? { time: ${timeProperty} } : { time: ${timeProperty}, open: ${args[0]}.open, high: ${args[0]}.high, low: ${args[0]}.low, close: ${args[0]}.close }`
        } else {
          seriePoint += args[0]
        }
      } else {
        throw new Error(`Invalid input for function ${match[1]}, expected a ohlc object or 4 number`)
      }
    } else if (expectedInput === 'range') {
      if (args.length === 2) {
        seriePoint += `{ time: ${timeProperty}, lowerValue: ${args[0]}, higherValue: ${args[1]} }`
      } else {
        throw new Error(`Invalid input for function ${match[1]}, expected 2 arguments (lowerValue and higherValue)`)
      }
    } else if (expectedInput === 'number') {
      if (args.length === 1) {
        seriePoint += `{ time: ${timeProperty}, value: ${args[0]} }`
      } else {
        throw new Error(`Invalid input for function ${match[1]}, expected 1 value (number)`)
      }
    }

    // this line will paint the point
    const serieUpdate = `series[${plots.length}].update(renderer.indicators['${this.indicatorId}'].series[${plots.length}])`

    // put everything together
    let finalInstruction = seriePoint + ','

    if (serieType === 'histogram') {
      // only update point if there is a value to avoid long histogram * base line * at zero
      finalInstruction += pointVariable + '.value&&'
    } else if (serieType === 'line') {
      // prevent null
      finalInstruction += pointVariable + '.value !== null&&'
    } else if (serieType === 'cloudarea' || serieType === 'brokenarea') {
      // prevent null
      finalInstruction += pointVariable + '.lowerValue !== null&&'
    }

    finalInstruction += serieUpdate

    output = output.replace(rawFunctionInstruction, finalInstruction)

    let id: string

    if (typeof serieOptions.id === 'string' && serieOptions.id.length) {
      id = serieOptions.id

      delete serieOptions.id
    } else if (plots.length === 0) {
      id = this.indicatorId
    } else {
      id = randomString(8)
    }

    const names = Object.keys(this.serieIndicatorsMap).concat(plots.map(plot => plot.id))

    // register plot
    plots.push({
      id: uniqueName(id, names),
      type: plotTypesMap[serieType] || serieType,
      expectedInput: expectedInput,
      options: serieOptions
    })

    return output
  }

  parseFunctions(output: string, instructions: IndicatorFunction[], plots: IndicatorPlot[]): string {
    const FUNCTION_LOOKUP_REGEX = new RegExp(`([a-zA-Z0_9_]+)\\(`, 'g')

    let functionMatch = null
    let iterations = 0

    do {
      if ((functionMatch = FUNCTION_LOOKUP_REGEX.exec(output))) {
        const functionName = functionMatch[1]

        const isMathFunction = Object.prototype.hasOwnProperty.call(Math, functionName)
        const isSerieFunction = SERIE_TYPES[functionName.replace(/^plot/, '')]
        const isMethod = output[functionMatch.index - 1] === '.'

        if (isMathFunction || isSerieFunction || isMethod) {
          FUNCTION_LOOKUP_REGEX.lastIndex = functionMatch.index + functionMatch[0].length

          if (typeof isSerieFunction === 'string') {
            output = this.parseSerie(output, functionMatch, plots)
          }
          continue
        }

        const instruction: IndicatorFunction = {
          name: functionName,
          args: []
        }

        const targetFunction = seriesUtils[functionName + '$']

        if (!targetFunction) {
          if (/for|if|rgba/i.test(functionName)) {
            FUNCTION_LOOKUP_REGEX.lastIndex = functionMatch.index + functionMatch[0].length
            continue
          } else {
            throw new Error(`Function ${functionName} doesn't exists`)
          }
        }

        const start = functionMatch.index
        const end = findClosingBracketMatchIndex(output, start + functionMatch[1].length)

        instruction.args = parseFunctionArguments(output.slice(start + functionMatch[1].length + 1, end))

        if ((functionName === 'ohlc' || functionName === 'cum_ohlc') && instruction.args.length === 1) {
          // ohlc and cum_ohlc that uses number as input need bar timestamp to construct the point
          instruction.args.push('renderer.localTimestamp')
        }

        // replace original function call, add function state to arguments
        output = `${output.slice(0, start)}utils.${functionName}$(${FUNCTIONS_VAR_NAME}[${instructions.length}].state,${instruction.args.join(
          ','
        )})${output.slice(end + 1, output.length)}`

        // register instruction
        instructions.push(instruction)
      }
    } while (functionMatch && ++iterations < 1000)

    return output
  }

  parseMarkets(output: string, markets: IndicatorMarkets): string {
    const EXCHANGE_REGEX = /\b([A-Z_]{3,}:[a-zA-Z0-9/_-]{5,})(:[\w]{4,})?\.?([a-z]{3,})?\b/g

    let marketMatch = null
    let iterations = 0

    do {
      if ((marketMatch = EXCHANGE_REGEX.exec(output))) {
        const marketName = marketMatch[1] + (marketMatch[2] ? marketMatch[2] : '')
        const marketDataKey = marketMatch[3]

        if (!markets[marketName]) {
          markets[marketName] = []
        }

        if (marketDataKey) {
          if (markets[marketName].indexOf(marketDataKey) === -1) {
            markets[marketName].push(marketDataKey)
          }
        }

        const replacement = `renderer.sources['${marketName}']${marketDataKey ? '.' + marketDataKey : ''}`

        EXCHANGE_REGEX.lastIndex = marketMatch.index + replacement.length

        output = output.slice(0, marketMatch.index) + replacement + output.slice(marketMatch.index + marketMatch[0].length)
      }
    } while (marketMatch && ++iterations < 1000)

    return output
  }
  parseReferences(output: string, references: IndicatorReference[], plots: IndicatorPlot[]): string {
    const REFERENCE_REGEX = new RegExp('\\$(\\w+[a-z_\\-0-9]+)\\b')

    let referenceMatch = null
    let iterations = 0

    do {
      if ((referenceMatch = REFERENCE_REGEX.exec(output))) {
        const serieId = referenceMatch[1]

        try {
          const [indicatorId, plotIndex] = this.getSeriePath(serieId, plots)

          if (!references.find(reference => reference.indicatorId === indicatorId && reference.plotIndex === plotIndex)) {
            references.push({
              indicatorId,
              serieId,
              plotIndex
            })
          }

          output = output.replace(new RegExp('\\$(' + serieId + ')\\b', 'ig'), `renderer.indicators['${indicatorId}'].series[${plotIndex}]`)
        } catch (error) {
          throw {
            message: `The serie "${serieId}" was not found in the current indicators`,
            status: 'indicator-required',
            serieId: serieId
          }
        }
      }
    } while (referenceMatch && ++iterations < 1000)

    return output
  }

  getSeriePath(serieId: string, plots: IndicatorPlot[]): [string, number] {
    let indicatorId: string
    let plotIndex: number

    // see if we can find the serie in the plots that are already processed
    const reference = plots.find(plot => plot.id === serieId || plot.id.replace(/\W/g, '') === serieId.replace(/\W/g, ''))

    if (reference) {
      indicatorId = this.indicatorId
      plotIndex = plots.indexOf(reference)
    }

    // or in the others indicator that are already in
    if (!indicatorId && this.serieIndicatorsMap[serieId]) {
      ;({ indicatorId, plotIndex } = this.serieIndicatorsMap[serieId])
    }

    // or match with indicatorId, taking first serie as result
    if (
      !indicatorId &&
      Object.values(this.serieIndicatorsMap)
        .map(a => a.indicatorId)
        .indexOf(serieId) !== -1
    ) {
      indicatorId = serieId
      plotIndex = 0
    }

    if (indicatorId) {
      return [indicatorId, plotIndex]
    }
  }

  determineVariablesType(output, variables: IndicatorVariable[]) {
    for (const variable of variables) {
      const index = variables.indexOf(variable)
      const VARIABLE_LENGTH_REGEX = new RegExp(`${VARIABLES_VAR_NAME}\\[${index}\\](?:\\[(\\d+)\\])?`, 'g')

      let lengthMatch = null
      let iterations = 0

      do {
        if ((lengthMatch = VARIABLE_LENGTH_REGEX.exec(output))) {
          const variableLength = lengthMatch[1]
          const position = lengthMatch.index + lengthMatch[0].length

          if (typeof variableLength === 'undefined') {
            const hasSpecifiedIndex = output[position] === '['
            output = output.substring(0, position) + '.state' + (!hasSpecifiedIndex ? '[0]' : '') + output.substring(position)
          } else {
            const beforeVariable = output.substring(0, lengthMatch.index)
            const variableReplacement = `${VARIABLES_VAR_NAME}[${index}].state[Math.min(${VARIABLES_VAR_NAME}[${index}].state.length-1,${variableLength})]`
            const afterVariable = output.substring(lengthMatch.index + lengthMatch[0].length)
            output = `${beforeVariable}${variableReplacement}${afterVariable}`

            VARIABLE_LENGTH_REGEX.lastIndex = beforeVariable.length + variableReplacement.length
          }

          variable.length = Math.max(variable.length, (+variableLength || 0) + 1)
        }
      } while (lengthMatch && ++iterations < 1000)

      if (!variable.length) {
        throw new Error('Unexpected no length on var')
      }

      if (variable.length === 1) {
        output = output.replace(new RegExp(`${VARIABLES_VAR_NAME}\\[${index}\\]\\.state\\[\\d+\\]`, 'g'), `${VARIABLES_VAR_NAME}[${index}].state`)
      }

      output = output.replace(new RegExp(`#${VARIABLES_VAR_NAME}\\[${index}\\]\\.state\\[\\d+\\]`, 'g'), `${VARIABLES_VAR_NAME}[${index}].state`)
    }

    return output
  }

  test({ silentOutput, functions, variables, markets, plots, references }: IndicatorTranspilationResult, options) {
    let adapter: IndicatorRealtimeAdapter
    try {
      adapter = this.getAdapter(silentOutput)
    } catch (error) {
      console.log('%c' + silentOutput, 'font-size: 8px;line-height:1;')

      throw new Error(`Syntax error: ${error.message} - see console`)
    }

    let renderer = this.getFakeRenderer(null, functions, variables, markets, references)

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const series = (plots.map(() => ({ update: () => {} })) as unknown) as IndicatorApi[]

    for (let t = 0; t < 3; t++) {
      try {
        adapter(renderer, functions, variables, series, options, seriesUtils)
      } catch (error) {
        throw new Error('Syntax error: ' + (typeof error === 'string' ? error : error.message))
      }

      for (let p = 0; p < renderer.indicators[this.indicatorId].series.length; p++) {
        const point = renderer.indicators[this.indicatorId].series[p]

        if (typeof point === 'undefined') {
          continue
        }
        const plot = plots[p]

        if (isNaN(point.time)) {
          throw new Error(`${plot.type}.time expected a valid timestamp (number of seconds since January 1, 1970) but got NaN`)
        }

        /*if (point.time < renderer.timestamp) {
          throw new Error(`${plot.type}.time should be the same as the current bar timestamp ${renderer.timestamp}, got ${point.time}`)
        }*/

        /*if (resultedType && resultedType !== plot.expectedInput) {
          throw new Error(`Plot ${plot.type} expected ${plot.expectedInput} but got ${resultedType}`)
        }*/

        /*if (resultedType === 'ohlc') {
          if (isNaN(point.open)) {
            throw new Error(`${plot.type}.open expected value to be a number, got NaN`)
          }
          if (isNaN(point.high)) {
            throw new Error(`${plot.type}.high expected value to be a number, got NaN`)
          }
          if (isNaN(point.low)) {
            throw new Error(`${plot.type}.low expected value to be a number, got NaN`)
          }
          if (isNaN(point.close)) {
            throw new Error(`${plot.type}.close expected value to be a number, got NaN`)
          }
        }

        if (resultedType === 'number') {
          if (isNaN(point.value)) {
            throw new Error(`${plot.type} expected value to be a number, got NaN`)
          }
        }*/
      }

      renderer = this.getFakeRenderer(renderer, functions, variables, markets, references)
      this.refreshSerieMeta(functions, variables)
    }
  }

  refreshSerieMeta(functions: IndicatorFunction[], variables: IndicatorVariable[]) {
    for (let f = 0; f < functions.length; f++) {
      const instruction = functions[f]

      if (typeof instruction.state.count !== 'undefined') {
        instruction.state.count++
      }

      if (typeof instruction.state.points !== 'undefined') {
        instruction.state.points.push(instruction.state.output)
        instruction.state.sum += instruction.state.output

        if (instruction.state.count > instruction.length) {
          instruction.state.sum -= instruction.state.points.shift()
          instruction.state.count--
        }
      } else if (instruction.state.open !== 'undefined') {
        instruction.state.open = instruction.state.close
        instruction.state.high = instruction.state.close
        instruction.state.low = instruction.state.close
      }
    }

    for (let v = 0; v < variables.length; v++) {
      const instruction = variables[v]

      if (instruction.length > 1) {
        instruction.state.unshift(instruction.state[0])

        if (instruction.state.length > instruction.length) {
          instruction.state.pop()
        }
      }
    }
  }

  getFakeRenderer(
    previousRenderer,
    functions: IndicatorFunction[],
    variables: IndicatorVariable[],
    markets: IndicatorMarkets,
    references: IndicatorReference[]
  ) {
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

    const renderer: Renderer = previousRenderer || {
      timeframe: 10,
      timestamp: null,
      localTimestamp: null,
      length: 1,
      bar: {
        vbuy: 11,
        vsell: 22,
        cbuy: 2,
        csell: 3,
        lbuy: 1,
        lsell: 0
      },
      sources: {},
      indicators: {
        [this.indicatorId]: {
          functions,
          variables,
          series: [],
          plotsOptions: []
        }
      }
    }

    if (!previousRenderer) {
      renderer.timestamp = Math.floor(Math.round(Date.now() / 1000) / 10) * 10
      renderer.localTimestamp = renderer.timestamp

      // fake references
      for (const reference of references) {
        if (!renderer.indicators[reference.indicatorId]) {
          renderer.indicators[reference.indicatorId] = {
            canRender: false,
            series: [],
            plotsOptions: [],
            functions: [],
            variables: []
          }

          if (reference.indicatorId === this.indicatorId) {
            renderer.indicators[reference.indicatorId].functions = functions
            renderer.indicators[reference.indicatorId].variables = variables
          }
        }

        renderer.indicators[reference.indicatorId].series[reference.plotIndex] = {
          time: renderer.timestamp,
          value: 1,
          open: 2,
          high: 2,
          low: 2,
          close: 2
        }
      }
    } else {
      renderer.timestamp = previousRenderer.timestamp + 10
      renderer.localTimestamp = renderer.timestamp
    }

    for (const id in markets) {
      const exchangeBar = Object.assign({}, sample)

      const priceVariation = (Math.random() - 0.5) / 100
      const volumeVariation = (Math.random() - 0.5) / 100

      if (previousRenderer) {
        exchangeBar.open *= previousRenderer.sources[id].close
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

      renderer.sources[id] = exchangeBar
    }

    return renderer
  }

  getAdapter(output) {
    return (function() {
      'use strict'
      return new Function('renderer', FUNCTIONS_VAR_NAME, VARIABLES_VAR_NAME, 'series', 'options', 'utils', '"use strict"; ' + output)
    })() as IndicatorRealtimeAdapter
  }

  /**
   * get fresh state of indicator for the renderer
   * @param indicator
   */
  getRendererIndicatorData(indicator: LoadedIndicator) {
    const { functions, variables, plots } = JSON.parse(JSON.stringify(indicator.model)) as IndicatorTranspilationResult

    indicator.options.minLength = 0

    // update functions arguments from script input
    for (const instruction of functions) {
      for (let i = 0; i < instruction.args.length; i++) {
        try {
          instruction.args[i] = new Function('options', `'use strict'; return ${instruction.args[i]}`)(indicator.options)
        } catch (error) {
          // nothing to see here
        }
      }

      instruction.length = 0

      if (!instruction.state.points) {
        continue
      }

      if (seriesUtils[instruction.name].baseLength > 0) {
        instruction.length = seriesUtils[instruction.name].baseLength
      }

      const lengthIndexes = seriesUtils[instruction.name].lengthIndexes || [1]

      for (const index of lengthIndexes) {
        if (!isNaN(instruction.args[index])) {
          instruction.length += instruction.args[index]
        }
      }

      indicator.options.minLength = Math.max(indicator.options.minLength, instruction.length)

      if (!instruction.length) {
        delete instruction.state.points
        delete instruction.state.count
        delete instruction.state.sum
      }
    }

    const plotsOptions = []

    // update plot options from script input
    for (const plot of plots) {
      plotsOptions.push(this.getCustomPlotOptions(indicator, plot))
    }

    return {
      canRender: indicator.options.minLength <= 1,
      series: [],
      functions,
      variables,
      plotsOptions,
      minLength: indicator.options.minLength
    }
  }

  getCustomPlotOptions(indicator, plot) {
    // update plot options from script input

    const options = {}

    for (const prop in plot.options) {
      try {
        options[prop] = new Function('options', `'use strict'; return ${plot.options[prop]}`)(indicator.options)
      } catch (error) {
        options[prop] = plot.options[prop]
      }
    }

    return options
  }
}
