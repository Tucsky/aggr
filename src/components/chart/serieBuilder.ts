import seriesUtils from './serieUtils'

import {
  IndicatorRealtimeAdapter,
  IndicatorTranspilationResult,
  IndicatorPlot,
  IndicatorVariable,
  IndicatorFunction,
  LoadedIndicator,
  IndicatorReference,
  IndicatorMarkets
} from './chart'
import store from '@/store'
import {
  findClosingBracketMatchIndex,
  parseFunctionArguments,
  randomString,
  uniqueName
} from '@/utils/helpers'
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
  build(
    indicator: LoadedIndicator,
    serieIndicatorsMap: { [serieId: string]: IndicatorReference },
    paneId: string
  ) {
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

    return {
      output: result.output,
      silentOutput: result.silentOutput,
      functions: result.functions,
      variables: result.variables,
      references: result.references,
      markets: result.markets,
      plots: result.plots
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
    input = input.replace(
      /([^.])?\b(indicatorId)\b/gi,
      `$1'${this.indicatorId}'`
    )
    input = input.replace(/([^.])?\b(bar)\b/gi, '$1renderer')
    input = input.replace(
      /([^.]|^)\b(vbuy|vsell|cbuy|csell|lbuy|lsell)\b/gi,
      '$1renderer.bar.$2'
    )
    input = input.replace(
      /([^.]|^)\b(time)\b([^:])/gi,
      '$1renderer.localTimestamp$3'
    )
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
        input =
          input.slice(0, stringMatch.index) +
          '#STRING_' +
          refIndex +
          '#' +
          input.slice(stringMatch.index + stringMatch[0].length)
      }
    } while (stringMatch && ++iterations < 1000)

    // input = input.replace(/[^\S\r\n]/g, '')

    const PARANTHESIS_REGEX = /\(/g
    let paranthesisMatch
    iterations = 0

    do {
      if ((paranthesisMatch = PARANTHESIS_REGEX.exec(input))) {
        const closingParenthesisIndex = findClosingBracketMatchIndex(
          input,
          paranthesisMatch.index,
          /\(|{|\[/,
          /\)|}|\]/
        )

        if (closingParenthesisIndex !== -1) {
          const contentWithinParenthesis = input
            .slice(paranthesisMatch.index + 1, closingParenthesisIndex)
            .replace(/\n/g, ' ')

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
    if (
      typeof seriesUtils[instruction.name] &&
      typeof seriesUtils[instruction.name].state === 'object'
    ) {
      instruction.state = {}

      for (const prop in seriesUtils[instruction.name].state) {
        try {
          instruction.state[prop] = JSON.parse(
            JSON.stringify(seriesUtils[instruction.name].state[prop])
          )
        } catch (error) {
          instruction.state[prop] = seriesUtils[instruction.name].state[prop]
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
      instruction.state = [0]
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
        const openingParenthesisIndex =
          instructionMatch.index + instructionMatch[0].length - 1
        const closingParenthesisIndex = findClosingBracketMatchIndex(
          silentOutput,
          openingParenthesisIndex
        )
        silentOutput = silentOutput.replace(
          instructionMatch[0] +
            silentOutput.slice(
              openingParenthesisIndex + 1,
              closingParenthesisIndex + 1
            ),
          1
        )
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

    output = this.parseMarkets(output, markets)

    for (let i = 0; i < strings.length; i++) {
      output = output.replace(
        new RegExp('#STRING_' + i + '#', 'g'),
        strings[i].replace(/\$/g, '$$$')
      )
    }

    output = this.parseFunctions(output, functions, plots)
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

        const closingParenthesisIndex = findClosingBracketMatchIndex(
          input,
          paranthesisMatch.index,
          /\(|{|\[/,
          /\)|}|\]/
        )
        const contentWithinParenthesis = input
          .slice(paranthesisMatch.index + 1, closingParenthesisIndex)
          .replace(/\n/g, ' ')

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
      const sourcesMatches = lines[i].match(
        /renderer.sources\['[\w/:_-]+']\.\w+/g
      )

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

        if (
          nonPersistentVariables.indexOf(variableName) !== -1 ||
          isNonPersistent
        ) {
          if (isNonPersistent) {
            variableName = variableName.replace(/var\s*/, '')
            output = output.replace(
              variableMatch[0],
              '\nvar ' + variableName + '=' + variableMatch[3]
            )
            nonPersistentVariables.push(variableName)
          }

          // eslint-disable-next-line no-useless-escape
          output = output.replace(
            new RegExp(
              '([^.$]|^)\\b(' + variableName + ')\\b(?!:)(?!\\()(?!\\$)',
              'ig'
            ),
            `$1${variableName}$`
          )
          continue
        }

        const variableLength = +variableMatch[2] || 1

        output = output.replace(
          new RegExp('([^.]|^)\\b(' + variableName + ')\\b(?!:)', 'ig'),
          `$1${VARIABLES_VAR_NAME}[${variables.length}]`
        )

        const variable: IndicatorVariable = {
          length: variableLength
        }

        variables.push(variable)
        output = output.replace(
          new RegExp(
            `(${VARIABLES_VAR_NAME}\\[${variables.length - 1}\\])\\(${
              variable.length
            }\\)\\s*=\\s*`
          ),
          '$1='
        )
      }
    } while (variableMatch && ++iterations < 1000)

    output = this.determineVariablesType(output, variables)

    return output
  }

  parseSerie(output: string, match: RegExpExecArray, plots: IndicatorPlot[]) {
    // absolute serie type eg. plotline -> line)
    const serieType = match[1].replace(/^plot/, '')

    // serie arguments eg. sma($price.close,options.smaLength),color=red
    const closingBracketIndex = findClosingBracketMatchIndex(
      output,
      match.index + match[1].length
    )
    const rawFunctionArguments = output.slice(
      match.index + match[1].length + 1,
      closingBracketIndex
    )

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
    const argIsObject = /{/.test(args[0]) && /}/.test(args[0])
    const argContainSpecialChars = /^[\w_$]+\$/.test(args[0])
    if (
      args.length === 1 &&
      (argIsObject || (serieType !== 'line' && argContainSpecialChars))
    ) {
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
        throw new Error(
          `Invalid input for function ${match[1]}, expected a ohlc object or 4 number`
        )
      }
    } else if (expectedInput === 'range') {
      if (args.length === 2) {
        seriePoint += `{ time: ${timeProperty}, lowerValue: ${args[0]}, higherValue: ${args[1]} }`
      } else {
        throw new Error(
          `Invalid input for function ${match[1]}, expected 2 arguments (lowerValue and higherValue)`
        )
      }
    } else if (expectedInput === 'number') {
      if (args.length === 1) {
        seriePoint += `{ time: ${timeProperty}, value: ${args[0]} }`
      } else {
        throw new Error(
          `Invalid input for function ${match[1]}, expected 1 value (number)`
        )
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

    const names = Object.keys(this.serieIndicatorsMap).concat(
      plots.map(plot => plot.id)
    )

    // register plot
    plots.push({
      id: uniqueName(id, names),
      type: plotTypesMap[serieType] || serieType,
      expectedInput: expectedInput,
      options: serieOptions
    })

    return output
  }

  parseFunctions(
    output: string,
    instructions: IndicatorFunction[],
    plots: IndicatorPlot[]
  ): string {
    const FUNCTION_LOOKUP_REGEX = new RegExp(`([a-zA-Z0_9_]+)\\(`, 'g')

    let functionMatch = null
    let iterations = 0

    do {
      if ((functionMatch = FUNCTION_LOOKUP_REGEX.exec(output))) {
        const functionName = functionMatch[1]

        const isMathFunction = Object.prototype.hasOwnProperty.call(
          Math,
          functionName
        )
        const isSerieFunction = SERIE_TYPES[functionName.replace(/^plot/, '')]
        const isMethod = output[functionMatch.index - 1] === '.'

        if (isMathFunction || isSerieFunction || isMethod) {
          FUNCTION_LOOKUP_REGEX.lastIndex =
            functionMatch.index + functionMatch[0].length

          if (typeof isSerieFunction === 'string') {
            output = this.parseSerie(output, functionMatch, plots)
          }
          continue
        }

        const targetFunction = seriesUtils[functionName]

        if (!targetFunction) {
          if (/for|if|rgba/i.test(functionName)) {
            FUNCTION_LOOKUP_REGEX.lastIndex =
              functionMatch.index + functionMatch[0].length
            continue
          } else {
            throw new Error(`Function ${functionName} doesn't exists`)
          }
        }

        const instruction: IndicatorFunction = {
          name: functionName,
          args: []
        }

        let injectedArgCount = 0

        const customArgsStartIndex = functionMatch.index
        const customArgsEndIndex = findClosingBracketMatchIndex(
          output,
          customArgsStartIndex + functionMatch[1].length
        )
        const customArgs = parseFunctionArguments(
          output.slice(
            customArgsStartIndex + functionMatch[1].length + 1,
            customArgsEndIndex
          )
        )
        let totalArgsCount =
          (targetFunction.args ? targetFunction.args.length : 0) +
          customArgs.length

        for (let i = 0; i < totalArgsCount; i++) {
          const argDefinition =
            targetFunction.args && targetFunction.args[i]
              ? targetFunction.args[i]
              : {}

          const arg = {
            ...argDefinition
          }

          if (argDefinition.injected) {
            injectedArgCount++

            instruction.args.push(arg)

            continue
          } else {
            totalArgsCount--
          }

          const customArg = customArgs[i - injectedArgCount]

          if (typeof customArg !== 'undefined') {
            arg.instruction = customArg
          }

          instruction.args.push(arg)
        }

        output = `${output.slice(
          0,
          customArgsStartIndex
        )}utils.${functionName}.update(${FUNCTIONS_VAR_NAME}[${
          instructions.length
        }].state,${instruction.args
          .map(a => a.instruction)
          .join(',')})${output.slice(customArgsEndIndex + 1, output.length)}`

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
        const marketName =
          marketMatch[1] + (marketMatch[2] ? marketMatch[2] : '')
        const marketDataKey = marketMatch[3]

        if (!markets[marketName]) {
          markets[marketName] = []
        }

        if (marketDataKey) {
          if (markets[marketName].indexOf(marketDataKey) === -1) {
            markets[marketName].push(marketDataKey)
          }
        }

        const replacement = `renderer.sources['${marketName}']${
          marketDataKey ? '.' + marketDataKey : ''
        }`

        EXCHANGE_REGEX.lastIndex = marketMatch.index + replacement.length

        output =
          output.slice(0, marketMatch.index) +
          replacement +
          output.slice(marketMatch.index + marketMatch[0].length)
      }
    } while (marketMatch && ++iterations < 1000)

    return output
  }
  parseReferences(
    output: string,
    references: IndicatorReference[],
    plots: IndicatorPlot[]
  ): string {
    const REFERENCE_REGEX = new RegExp('\\$(\\w+[a-z_\\-0-9]+)\\b')

    let referenceMatch = null
    let iterations = 0

    do {
      if ((referenceMatch = REFERENCE_REGEX.exec(output))) {
        const serieId = referenceMatch[1]

        try {
          const [indicatorId, plotIndex] = this.getSeriePath(serieId, plots)

          if (
            !references.find(
              reference =>
                reference.indicatorId === indicatorId &&
                reference.plotIndex === plotIndex
            )
          ) {
            references.push({
              indicatorId,
              serieId,
              plotIndex
            })
          }

          output = output.replace(
            new RegExp('\\$(' + serieId + ')\\b', 'ig'),
            `renderer.indicators['${indicatorId}'].series[${plotIndex}]`
          )
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
    const reference = plots.find(
      plot =>
        plot.id === serieId ||
        plot.id.replace(/\W/g, '') === serieId.replace(/\W/g, '')
    )

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
      const VARIABLE_LENGTH_REGEX = new RegExp(
        `${VARIABLES_VAR_NAME}\\[${index}\\](?:\\[(\\d+)\\])?`,
        'g'
      )

      let lengthMatch = null
      let iterations = 0

      do {
        if ((lengthMatch = VARIABLE_LENGTH_REGEX.exec(output))) {
          const variableLength = lengthMatch[1]
          const position = lengthMatch.index + lengthMatch[0].length

          if (typeof variableLength === 'undefined') {
            const hasSpecifiedIndex = output[position] === '['
            output =
              output.substring(0, position) +
              '.state' +
              (!hasSpecifiedIndex ? '[0]' : '') +
              output.substring(position)
          } else {
            const beforeVariable = output.substring(0, lengthMatch.index)
            const variableReplacement = `${VARIABLES_VAR_NAME}[${index}].state[Math.min(${VARIABLES_VAR_NAME}[${index}].state.length-1,${variableLength})]`
            const afterVariable = output.substring(
              lengthMatch.index + lengthMatch[0].length
            )
            output = `${beforeVariable}${variableReplacement}${afterVariable}`

            VARIABLE_LENGTH_REGEX.lastIndex =
              beforeVariable.length + variableReplacement.length
          }

          variable.length = Math.max(
            variable.length,
            (+variableLength || 0) + 1
          )
        }
      } while (lengthMatch && ++iterations < 1000)

      if (!variable.length) {
        throw new Error('Unexpected no length on var')
      }

      if (variable.length === 1) {
        output = output.replace(
          new RegExp(
            `${VARIABLES_VAR_NAME}\\[${index}\\]\\.state\\[\\d+\\]`,
            'g'
          ),
          `${VARIABLES_VAR_NAME}[${index}].state`
        )
      }

      output = output.replace(
        new RegExp(
          `#${VARIABLES_VAR_NAME}\\[${index}\\]\\.state\\[\\d+\\]`,
          'g'
        ),
        `${VARIABLES_VAR_NAME}[${index}].state`
      )
    }

    return output
  }

  getAdapter(output) {
    return (function() {
      'use strict'
      return new Function(
        'renderer',
        FUNCTIONS_VAR_NAME,
        VARIABLES_VAR_NAME,
        'series',
        'options',
        'utils',
        '"use strict"; ' + output
      )
    })() as IndicatorRealtimeAdapter
  }

  /**
   * get fresh state of indicator for the renderer
   * @param indicator
   */
  getRendererIndicatorData(indicator: LoadedIndicator) {
    const { functions, variables, plots } = JSON.parse(
      JSON.stringify(indicator.model)
    ) as IndicatorTranspilationResult

    indicator.options.minLength = 0

    // update functions arguments from script input
    for (const instruction of functions) {
      instruction.length = 0

      for (let i = 0; i < instruction.args.length; i++) {
        if (
          typeof instruction.args[i].instruction === 'undefined' ||
          instruction.args[i].instruction === ''
        ) {
          continue
        }

        try {
          instruction.args[i].instruction = new Function(
            'options',
            `'use strict'; return ${instruction.args[i].instruction}`
          )(indicator.options)

          if (
            instruction.args[i].length &&
            !isNaN(instruction.args[i].instruction)
          ) {
            instruction.length += instruction.args[i].instruction
          }
        } catch (error) {
          // nothing to see here
        }
      }

      indicator.options.minLength = Math.max(
        indicator.options.minLength,
        instruction.length
      )
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
        options[prop] = new Function(
          'options',
          `'use strict'; return ${plot.options[prop]}`
        )(indicator.options)
      } catch (error) {
        options[prop] = plot.options[prop]
      }
    }

    return options
  }
}
