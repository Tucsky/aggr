import { ComputedRef, reactive } from 'vue'
import store from '@/store'
import { ChartPaneState } from '@/store/panesSettings/chart'
import {
  defaultPlotsOptions,
  defaultSerieOptions,
  getIndicatorOptionType,
  getIndicatorOptionValue,
  plotTypesMap
} from '../chart/options'
import { Preset } from '@/types/types'
import dialogService from '@/services/dialogService'
import IndicatorPresetDialog from '../chart/IndicatorPresetDialog.vue'
import merge from 'lodash.merge'

const ignoredOptionsKeys = [
  'crosshairMarkerVisible',
  'minLength',
  'visible',
  'priceScaleId',
  'priceFormat'
]

export interface IndicatorOptions {
  paneId: string
  indicatorId: string
  colors: string[]
  script: string[]
  default: string[]
  plotTypes: string[]
}

let state: IndicatorOptions | null = null

export function useIndicatorOptions(
  paneId: string,
  indicatorId: string,
  script?: ComputedRef<string>
) {
  const getOptionsKeys = () => {
    if (!script) {
      return
    }

    const indicator = (store.state[paneId] as ChartPaneState).indicators[
      indicatorId
    ]

    // retrieve all options keys more or less linked to that indicator
    const scriptOptionsKeysLocal = getScriptOptions(script.value)
    const defaultOptionsKeysLocal = Object.keys(defaultSerieOptions)
    const defaultSeriesOptionsKeysLocal = state.plotTypes.reduce(
      (typesKeys, key) => [
        ...typesKeys,
        ...Object.keys(defaultPlotsOptions[key] || {})
      ],
      []
    )

    // merge / clean duplicates
    const allKeys = [
      ...defaultOptionsKeysLocal,
      ...defaultSeriesOptionsKeysLocal,
      ...scriptOptionsKeysLocal
    ].filter(
      (x, i, a) => ignoredOptionsKeys.indexOf(x) === -1 && a.indexOf(x) === i
    )

    const colorKeys = []
    const nonColorScriptKeys = []
    const otherKeys = []

    // order by type / origin
    for (let i = 0; i < allKeys.length; i++) {
      const key = allKeys[i]
      if (
        getIndicatorOptionType(
          key,
          state.plotTypes,
          false,
          indicator.options[key]
        ) === 'color'
      ) {
        colorKeys.push(allKeys.shift())
      } else if (scriptOptionsKeysLocal.indexOf(key) !== -1) {
        nonColorScriptKeys.push(allKeys.shift())
      } else {
        otherKeys.push(allKeys.shift())
      }
      i--
    }

    state.script = nonColorScriptKeys
    state.default = otherKeys
    state.colors = colorKeys
  }

  const getScriptOptions = script => {
    const indicator = (store.state[paneId] as ChartPaneState).indicators[
      indicatorId
    ]

    const keys = Object.keys(indicator.optionsDefinitions || {})
    const reg =
      /options\.([a-zA-Z0-9_]+)|[\s\n]*(\w[\d\w]+)[\s\n]*=[\s\n]*option\(/g

    let match

    do {
      if (
        (match = reg.exec(script)) &&
        match[1] &&
        keys.indexOf(match[1]) === -1
      ) {
        keys.push(match[1])
      }
    } while (match)

    return keys
  }
  const getPlotsTypes = () => {
    const availableTypes = Object.keys(defaultPlotsOptions).map(a =>
      a.replace(/[^\w]/g, '')
    )

    state.plotTypes = (
      script.value.match(
        new RegExp(
          `(?:\\n|\\s|^)(?:plot)?(${availableTypes.join('|')})\\(`,
          'g'
        )
      ) || []
    )
      .map(a => {
        const justType = a.replace(/[^\w]/g, '').replace(/^plot/, '')

        return plotTypesMap[justType] || justType
      })
      .filter(
        (t, index, self) => self.indexOf(t) === index && defaultPlotsOptions[t]
      )
  }

  const getDefaultValue = key => {
    let value

    for (const type of state.plotTypes) {
      if (typeof defaultPlotsOptions[type][key] !== 'undefined') {
        return defaultPlotsOptions[type][key]
      }
    }

    if (
      typeof value === 'undefined' &&
      typeof defaultSerieOptions[key] !== 'undefined'
    ) {
      return defaultSerieOptions[key]
    }

    if (typeof value === 'undefined' && /length$/i.test(key)) {
      return 14
    }

    if (typeof value === 'undefined' && /color$/i.test(key)) {
      return '#c3a87a'
    }

    if (typeof value === 'undefined' && /width$/i.test(key)) {
      return 1
    }

    return value
  }

  const applyIndicatorPreset = async (preset?: Preset) => {
    const data = preset ? preset.data : null
    const indicator = (store.state[paneId] as ChartPaneState).indicators[
      indicatorId
    ]

    indicator.lastPreset = preset ? preset.name : null

    if (data) {
      merge(indicator, data)
    } else {
      // script + default + colors
      const keys = [...state.script, ...state.default, ...state.colors]

      for (const key of keys) {
        const defaultValue = getDefaultValue(key)
        if (typeof defaultValue !== 'undefined') {
          indicator.options[key] = defaultValue
        }
      }
    }

    state.colors = []

    store.commit(`${paneId}/SET_INDICATOR_SCRIPT`, { id: indicatorId })

    getPlotsTypes()
    getOptionsKeys()

    store.commit(`${paneId}/FLAG_INDICATOR_AS_UNSAVED`, indicatorId)
  }
  const getIndicatorPreset = async (originalPreset: Preset) => {
    const optionsKeys = [...state.colors, ...state.script, ...state.default]
    const payload = await dialogService.openAsPromise(IndicatorPresetDialog, {
      keys: optionsKeys,
      plotTypes: state.plotTypes,
      originalKeys: originalPreset
        ? Object.keys(originalPreset.data.options)
        : state.script
    })

    if (payload) {
      if (
        typeof Object.values(payload.selection).find(a => !!a) ===
          'undefined' &&
        !payload.script
      ) {
        store.dispatch('app/showNotice', {
          title: 'You did not select anything to save in the preset !',
          type: 'error'
        })
        return
      }

      const indicatorPreset: any = {
        options: {}
      }

      for (const key of optionsKeys) {
        if (!payload.selection[key]) {
          continue
        }
        indicatorPreset.options[key] = getIndicatorOptionValue(
          paneId,
          indicatorId,
          key,
          state.plotTypes
        )
      }

      if (payload.script) {
        indicatorPreset.script = script.value
      }

      return indicatorPreset
    }
  }

  if (!state || state.indicatorId !== indicatorId || state.paneId !== paneId) {
    if (!state) {
      state = reactive<IndicatorOptions>({
        indicatorId: null,
        paneId: null,
        colors: [],
        script: [],
        default: [],
        plotTypes: []
      })
    } else {
      state.colors = []
      state.script = []
      state.default = []
      state.plotTypes = []
    }

    state.indicatorId = indicatorId
    state.paneId = paneId

    getPlotsTypes()
    getOptionsKeys()
  }

  return {
    indicatorOptions: state,
    getIndicatorPreset,
    applyIndicatorPreset,
    getPlotsTypes,
    getOptionsKeys
  }
}
