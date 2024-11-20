<template>
  <div
    class="thresholds"
    :class="{ '-dragging': dragging, '-rendering': rendering }"
    ref="rootElement"
  >
    <table class="table thresholds-table" v-if="showThresholdsAsTable">
      <thead>
        <tr>
          <th colspan="2"></th>
          <th class="table-action">
            <button class="btn -text" @click="flipSwatches('buy')">flip</button>
          </th>
          <th class="table-action">
            <button class="btn -text" @click="flipSwatches('sell')">
              flip
            </button>
          </th>
        </tr>
      </thead>
      <transition-group name="flip-list" tag="tbody">
        <tr v-for="(threshold, index) in thresholds" :key="threshold.id">
          <td class="table-input table-min">
            <label
              class="checkbox-control -extra-small mb4"
              v-if="index === thresholds.length - 1"
              title="Set as maximum amount"
              v-tippy
            >
              <input
                type="checkbox"
                class="form-control"
                :checked="capToLastThreshold"
                @change="toggleMaximumThreshold(threshold)"
              />
              <div></div>
            </label>
          </td>
          <td class="table-input">
            <div class="thresholds-table__threshold">
              <i class="icon icon-currency"></i>
              <editable
                placeholder="Amount*"
                class="w-100"
                :value="formatAmount(threshold.amount)"
                @input="
                  store.commit(paneId + '/SET_THRESHOLD_AMOUNT', {
                    id: threshold.id,
                    value: $event
                  })
                "
              />
              <small
                class="text-danger"
                v-if="index === thresholds.length - 1 && threshold.max"
                title="Will only show trades below that amount"
              >
                <strong>MAX</strong>
              </small>
            </div>
          </td>
          <td class="table-action">
            <color-picker-control
              label="Buy color"
              :value="threshold.buyColor"
              @input="
                store.commit(paneId + '/SET_THRESHOLD_COLOR', {
                  id: threshold.id,
                  side: 'buyColor',
                  value: $event
                })
              "
            ></color-picker-control>
          </td>
          <td class="table-action">
            <color-picker-control
              label="Sell color"
              :value="threshold.sellColor"
              @input="
                store.commit(paneId + '/SET_THRESHOLD_COLOR', {
                  id: threshold.id,
                  side: 'sellColor',
                  value: $event
                })
              "
            ></color-picker-control>
          </td>
          <td
            v-if="useAudio"
            class="thresholds-table__audio table-action"
            @click="openThresholdAudio(threshold.id)"
            title="Configure threshold audio"
            v-tippy
          >
            <button class="btn -text"><i class="icon-music-note"></i></button>
          </td>
          <td
            class="table-action"
            @click="selectThreshold(threshold.id, $event)"
          >
            <button class="btn -text">
              <i class="icon-more"></i>
            </button>
          </td>
        </tr>
      </transition-group>
    </table>

    <div class="thresholds-slider" v-else>
      <div class="thresholds-gradients">
        <div class="thresholds-gradients__buys" ref="buysGradient"></div>
        <div class="thresholds-gradients__sells" ref="sellsGradient"></div>
      </div>

      <div class="thresholds-slider__bar" ref="thresholdContainer">
        <div
          v-for="threshold in thresholds"
          :key="threshold.id"
          class="thresholds-slider__handler"
          :class="{ '-selected': selectedThresholdId === threshold.id }"
          :data-id="threshold.id"
          :data-amount="formatAmount(threshold.amount, 2)"
        ></div>
      </div>
    </div>
    <div class="d-flex mt8">
      <presets
        class="mrauto"
        type="threshold"
        placeholder="Custom thresholds"
        :adapter="getPreset"
        @apply="applyPreset($event)"
        classes="btn -green -small -center"
      />
      <button
        type="button"
        class="btn -nowrap -text -start"
        v-tippy
        title="Add a threshold"
        @click="store.commit(paneId + '/ADD_THRESHOLD', type)"
      >
        <i class="icon-plus"></i>
      </button>
    </div>
    <dropdown v-model="thresholdPanelTrigger" interactive>
      <threshold-dropdown
        :threshold="selectedThreshold"
        :pane-id="paneId"
        :can-delete="thresholds.length > 2"
        @input="thresholdPanelTrigger = $event"
      />
    </dropdown>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { sleep, randomString } from '@/utils/helpers'
import { formatAmount as formatAmountService } from '@/services/productsService'

import dialogService from '@/services/dialogService'
import ThresholdAudioDialog from '../trades/audio/ThresholdAudioDialog.vue'
import ColorPickerControl from '../framework/picker/ColorPickerControl.vue'
import { Threshold } from '@/store/panesSettings/trades'
import ThresholdDropdown from './ThresholdDropdown.vue'
import ThresholdPresetDialog from '@/components/trades/ThresholdPresetDialog.vue'
import defaultTresholds from '@/store/defaultThresholds.json'
import merge from 'lodash.merge'
import { Preset } from '@/types/types'
import store from '@/store'
import { useMutationObserver } from '@/composables/useMutationObserver'

const props = withDefaults(
  defineProps<{
    paneId: string
    label: string
    thresholds: Threshold[]
    type: string
  }>(),
  {
    type: 'thresholds',
    label: null
  }
)

const rendering = ref(true)
const dragging = ref(null)
const selectedThresholdId = ref(null)
const selectedSliderHandle = ref(null)
const thresholdPanelTrigger = ref(null)

let _dragReference = null
let movedAmount: number | null = null

let _minimum = null
let _maximum = null
let _offsetLeft = null

let _startDrag: ((event: Event) => void) | undefined
let _endDrag: (() => void) | undefined
let _doDrag: ((event: Event) => void) | undefined
let _doResize: (() => void) | undefined
let _width: number | undefined

const rootElement = ref<HTMLElement | null>(null)
const thresholdContainer = ref<HTMLElement | null>(null)
const buysGradient = ref<HTMLElement | null>(null)
const sellsGradient = ref<HTMLElement | null>(null)

const selectedThreshold = computed(() => {
  return store.getters[props.paneId + '/getThreshold'](
    selectedThresholdId.value
  )
})

const showThresholdsAsTable = computed(() => {
  return store.state.settings.showThresholdsAsTable
})

const useAudio = computed(() => {
  return store.state.settings.useAudio
})

const capToLastThreshold = computed(() => {
  return props.thresholds[props.thresholds.length - 1].max
})

useMutationObserver(mutation => {
  switch (mutation.type) {
    case props.paneId + '/TOGGLE_SETTINGS_PANEL':
    case props.paneId + '/TOGGLE_THRESHOLDS_TABLE':
      if (
        (mutation.type === props.paneId + '/TOGGLE_SETTINGS_PANEL' &&
          mutation.payload === 'thresholds') ||
        (mutation.type === props.paneId + '/TOGGLE_THRESHOLDS_TABLE' &&
          mutation.payload === false)
      ) {
        rendering.value = true

        refreshHandlers()
        refreshGradients()
      }
      break
    case props.paneId + '/SET_THRESHOLD_AMOUNT':
    case props.paneId + '/DELETE_THRESHOLD':
    case props.paneId + '/ADD_THRESHOLD':
      refreshHandlers()
      break
    case props.paneId + '/SET_THRESHOLD_COLOR':
      refreshGradients()
      break
  }
})

onMounted(() => {
  if (!showThresholdsAsTable.value) {
    refreshHandlers()
    refreshGradients()
  }

  _startDrag = startDrag

  if (rootElement.value) {
    rootElement.value.addEventListener('touchstart', _startDrag, false)
    rootElement.value.addEventListener('mousedown', _startDrag, false)
  }

  _doDrag = doDrag

  window.addEventListener('touchmove', _doDrag, false)
  window.addEventListener('mousemove', _doDrag, false)

  _endDrag = endDrag

  window.addEventListener('touchend', _endDrag, false)
  window.addEventListener('mouseup', _endDrag, false)

  _doResize = refreshHandlers

  window.addEventListener('resize', _doResize, false)
})

onBeforeUnmount(() => {
  window.removeEventListener('touchmove', _doDrag)
  window.removeEventListener('mousemove', _doDrag)
  window.removeEventListener('touchend', _endDrag)
  window.removeEventListener('mouseup', _endDrag)
  window.removeEventListener('resize', _doResize)
})

function startDrag(event) {
  if (
    !(event.target as HTMLElement).classList.contains(
      'thresholds-slider__handler'
    )
  ) {
    return
  }

  let x = (event as MouseEvent).pageX

  if ((event as TouchEvent).touches && (event as TouchEvent).touches.length) {
    x = (event as TouchEvent).touches[0].pageX
  }

  selectThreshold((event.target as HTMLElement).getAttribute('data-id'), event)
  selectedSliderHandle.value = event.target as HTMLElement

  nextTick(() => {
    _dragReference = {
      timestamp: Date.now(),
      position: x
    }
  })
}

function selectThreshold(id, event) {
  if (thresholdPanelTrigger.value && selectedThresholdId.value === id) {
    return
  }

  selectedThresholdId.value = id

  if (selectedThresholdId.value) {
    thresholdPanelTrigger.value = event.target
  }
}

function doDrag(event) {
  let x = (event as MouseEvent).pageX

  if ((event as TouchEvent).touches && (event as TouchEvent).touches.length) {
    x = (event as TouchEvent).touches[0].pageX
  }

  if (
    selectedSliderHandle.value === null ||
    !_dragReference ||
    (Date.now() - _dragReference.timestamp < 1000 &&
      Math.abs(_dragReference.position - x) < 3)
  ) {
    return
  }

  dragging.value = true

  const minLog = Math.max(0, Math.log(_minimum + 1) || 0)
  const minLeft = (minLog / Math.log(_maximum + 1)) * _width

  const left = Math.max(
    (_width / 3) * -1,
    Math.min(_width * 1.5, x - _offsetLeft)
  )
  let amount =
    Math.exp(
      ((minLeft + (left / _width) * (_width - minLeft)) / _width) *
        Math.log(_maximum + 1)
    ) - 1

  if (amount < 0) {
    amount = 0
  }

  movedAmount = amount
  selectedSliderHandle.value.style.transform = 'translateX(' + left + 'px)'
}

function endDrag() {
  if (selectedSliderHandle.value) {
    selectedSliderHandle.value = null

    refreshHandlers()
    refreshGradients()

    if (typeof movedAmount === 'number') {
      store.commit(props.paneId + '/SET_THRESHOLD_AMOUNT', {
        id: selectedThresholdId.value,
        value: movedAmount
      })
    }
  }

  dragging.value = false
  movedAmount = null
}

async function refreshHandlers() {
  await sleep(100)
  const amounts = props.thresholds.map(threshold => threshold.amount)

  _minimum = props.thresholds[0].amount
  _maximum = Math.max.apply(null, amounts)

  if (showThresholdsAsTable.value) {
    return
  }

  if (!thresholdContainer.value) return
  const bounds = thresholdContainer.value.getBoundingClientRect()

  _offsetLeft = bounds.left
  _width = thresholdContainer.value.clientWidth

  const handlers = thresholdContainer.value.children

  const minLog = Math.max(0, Math.log(_minimum + 1) || 0)
  const maxLog = Math.log(_maximum + 1) - minLog

  for (let i = 0; i < props.thresholds.length; i++) {
    const handler = handlers[i] as HTMLElement
    const threshold = props.thresholds[i]
    const posLog = Math.log(threshold.amount + 1) - minLog
    const posPx = _width * (posLog / maxLog)

    handler.style.transform = 'translateX(' + posPx + 'px)'
  }

  rendering.value = false
}

async function refreshGradients() {
  if (showThresholdsAsTable.value) {
    return
  }

  await sleep(100)

  const minLog = Math.max(0, Math.log(_minimum + 1) || 0)
  const maxLog = Math.log(_maximum + 1)

  const buysStops = []
  const sellsStops = []

  for (let i = 0; i < props.thresholds.length; i++) {
    const percent =
      i === 0
        ? 0
        : i === props.thresholds.length - 1
          ? 100
          : (
              ((Math.log(props.thresholds[i].amount + 1) - minLog) /
                (maxLog - minLog)) *
              100
            ).toFixed(2)

    buysStops.push(`${props.thresholds[i].buyColor} ${percent}%`)
    sellsStops.push(`${props.thresholds[i].sellColor} ${percent}%`)
  }

  if (buysGradient.value)
    buysGradient.value.style.backgroundImage = `linear-gradient(to right, ${buysStops.join(', ')})`
  if (sellsGradient.value)
    sellsGradient.value.style.backgroundImage = `linear-gradient(to right, ${sellsStops.join(', ')})`
}

function openThresholdAudio(thresholdId) {
  dialogService.open(ThresholdAudioDialog, {
    paneId: props.paneId,
    thresholds: props.thresholds,
    thresholdId
  })
}

function formatAmount(amount, precision?) {
  return formatAmountService(amount, precision)
}

function flipSwatches(side) {
  const prop = `${side}Color`

  const colors = props.thresholds.map(threshold => threshold[prop]).reverse()

  for (let i = 0; i < props.thresholds.length; i++) {
    store.commit(props.paneId + '/SET_THRESHOLD_COLOR', {
      id: props.thresholds[i].id,
      side: prop,
      value: colors[i]
    })
  }
}

function toggleMaximumThreshold(threshold) {
  store.commit(props.paneId + '/TOGGLE_THRESHOLD_MAX', threshold.id)
}

async function getPreset() {
  const payload = await dialogService.openAsPromise(ThresholdPresetDialog)

  if (payload) {
    if (!payload.amounts && !payload.audios && !payload.colors) {
      return
    }

    const audioPreset: Threshold[] = []

    for (const threshold of props.thresholds) {
      const partialThreshold: any = {}

      if (payload.amounts) {
        partialThreshold.amount = threshold.amount
      }

      if (payload.colors) {
        partialThreshold.buyColor = threshold.buyColor
        partialThreshold.sellColor = threshold.sellColor
      }

      if (payload.audios) {
        partialThreshold.buyAudio = threshold.buyAudio
        partialThreshold.sellAudio = threshold.sellAudio
      }

      audioPreset.push(partialThreshold)
    }

    return audioPreset
  }
}

async function applyPreset(preset?: Preset) {
  let presetData = preset ? preset.data : null

  const defaultSettings = JSON.parse(
    JSON.stringify(defaultTresholds[props.type])
  ) as Threshold[]

  let updateThresholdsColors = null
  let updateThresholdsAudios = null
  let updateThresholdsAmounts = null

  if (presetData) {
    if (!Array.isArray(presetData)) {
      if (presetData[props.type] && Array.isArray(presetData[props.type])) {
        presetData = presetData[props.type]
      } else if (
        presetData.thresholds &&
        Array.isArray(presetData.thresholds)
      ) {
        presetData = presetData.thresholds
      } else {
        presetData = Object.keys(presetData).reduce((acc, key) => {
          if (isNaN(+key)) {
            return acc
          }

          acc.push(presetData[key])

          return acc
        }, [])
      }
    }

    if (!presetData.length) {
      store.dispatch('app/showNotice', {
        title: 'Preset looks empty',
        type: 'error'
      })
      return
    }

    updateThresholdsAmounts = typeof presetData[0].amount !== 'undefined'
    updateThresholdsColors = typeof presetData[0].buyColor !== 'undefined'
    updateThresholdsAudios = typeof presetData[0].buyAudio !== 'undefined'

    const replaceAll =
      updateThresholdsAmounts &&
      updateThresholdsColors &&
      updateThresholdsAudios
    const defaultMaxIndex = defaultSettings.length

    if (replaceAll) {
      merge(store.state[props.paneId][props.type], presetData)
    } else {
      let previousAmount = store.state[props.paneId][props.type][0].amount

      store.state[props.paneId][props.type] = merge(
        store.state[props.paneId][props.type],
        presetData
      ).map((threshold, index) => {
        if (!threshold.id) {
          threshold.id = randomString()
        }
        if (typeof threshold.amount === 'undefined') {
          threshold.amount = previousAmount
        }
        if (typeof threshold.buyColor === 'undefined') {
          threshold.buyColor =
            defaultSettings[Math.min(index, defaultMaxIndex)].buyColor
          threshold.sellColor =
            defaultSettings[Math.min(index, defaultMaxIndex)].sellColor
        }
        if (typeof threshold.buyAudio === 'undefined') {
          threshold.buyAudio =
            defaultSettings[Math.min(index, defaultMaxIndex)].buyAudio
          threshold.sellAudio =
            defaultSettings[Math.min(index, defaultMaxIndex)].sellAudio
        }

        previousAmount = threshold.amount

        return threshold
      })
    }
  } else {
    updateThresholdsAmounts =
      updateThresholdsColors =
      updateThresholdsAudios =
        true

    if (store.state[props.paneId][props.type]) {
      store.state[props.paneId][props.type].splice(
        0,
        store.state[props.paneId][props.type].length
      )
    }

    merge(store.state[props.paneId][props.type], defaultSettings)
  }

  const referenceThreshold = store.state[props.paneId].thresholds[0]

  if (updateThresholdsAmounts) {
    store.commit(props.paneId + '/SET_THRESHOLD_AMOUNT', {
      id: referenceThreshold.id,
      value: referenceThreshold.amount
    })
  }

  if (updateThresholdsColors) {
    store.commit(props.paneId + '/SET_THRESHOLD_COLOR', {
      id: referenceThreshold.id,
      side: 'buy',
      value: referenceThreshold.buyColor
    })
  }

  if (updateThresholdsAudios) {
    store.commit(props.paneId + '/SET_THRESHOLD_AUDIO', {
      id: referenceThreshold.id,
      buyAudio: referenceThreshold.buyAudio,
      sellAudio: referenceThreshold.sellAudio
    })
  }
}
</script>

<style lang="scss">
.thresholds {
  position: relative;
  z-index: 1;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;

  &.-rendering .thresholds-slider {
    opacity: 0;

    &__handler {
      transform: scale(0.5) !important;
    }
  }

  &.-dragging {
    .thresholds-gradients,
    .thresholds-slider__handler {
      opacity: 0.5;

      &.-selected {
        opacity: 1;
      }
    }

    .thresholds-slider__handler {
      transition: box-shadow 0.2s $ease-elastic;
    }
  }
}

.thresholds-table {
  &__color {
    border: 0 !important;
    width: 2.25rem;
    transition: box-shadow 0.2s $ease-out-expo;
    cursor: pointer;

    &.-active {
      box-shadow: 0 0 0 0.5rem rgba(white, 0.2);
      position: relative;
      z-index: 1;
    }
  }

  &__threshold {
    display: flex;
    align-items: center;
    gap: 0.25rem;

    i {
      color: var(--theme-buy-100);
      top: 0;
    }
  }
}

.thresholds-slider {
  padding: 2rem 0 1rem;
  transition: opacity 0.2s $ease-out-expo;
  position: relative;

  &__bar {
    position: absolute;
    z-index: 1;

    padding: 2.75rem 0 0;
    top: 0;
    left: 1rem;
    right: 1rem;
  }

  &__handler {
    position: absolute;
    width: 1rem;
    height: 1rem;
    background-color: white;
    margin-top: -0.5rem;
    margin-left: -0.75rem;
    padding: 0.25rem;
    border-radius: 50%;
    transition:
      box-shadow 0.2s $ease-elastic,
      transform 0.2s $ease-out-expo;
    box-shadow: 0 1px 0 1px rgba(black, 0.2);
    cursor: grab;

    &:before {
      position: absolute;
      content: attr(data-amount);
      top: -2rem;
      left: 50%;
      transform: translateX(-50%);
      font-size: 0.875rem;
      white-space: nowrap;
    }
  }
}

.thresholds-gradients {
  width: 100%;

  > div {
    height: 1rem;
    width: 100%;
    border-radius: 0.75rem 0.75rem 0 0;

    + div {
      border-radius: 0 0 0.75rem 0.75rem;
    }
  }
}
</style>
