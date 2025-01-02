<template>
  <div ref="paneElementRef" class="pane-trades" @mouseenter="bindScroll">
    <PaneHeader
      :paneId="paneId"
      :settings="() => import('@/components/trades/TradesDialog.vue')"
      @zoom="onZoom"
    >
      <hr />
      <Dropdown
        v-if="market"
        v-model="sliderDropdownTrigger"
        :margin="0"
        interactive
        no-scroll
      >
        <slider
          class="pane-trades__slider"
          :min="0"
          :max="10"
          :step="0.01"
          label
          :show-completion="false"
          :gradient="gradient"
          :modelValue="thresholdsMultipler"
          @update:modelValue="
            store.commit(paneId + '/SET_THRESHOLDS_MULTIPLER', {
              value: $event,
              market: market
            })
          "
          @reset="
            store.commit(paneId + '/SET_THRESHOLDS_MULTIPLER', {
              value: 1,
              market: market
            })
          "
          log
        >
          <template #tooltip>
            {{ formatAmount(thresholdsMultipler * minAmount) }}
          </template>
        </slider>
      </Dropdown>
      <button
        class="btn"
        :name="paneId"
        @click="
          sliderDropdownTrigger = sliderDropdownTrigger
            ? null
            : $event.currentTarget
        "
      >
        <i class="icon-gauge"></i>
      </button>
    </PaneHeader>
    <code v-if="paused" class="pane-trades__paused">
      {{ paused }}
    </code>
    <canvas ref="canvas" @dblclick="prepareEverything" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import PaneHeader from '@/components/panes/PaneHeader.vue'
import Slider from '@/components/framework/picker/Slider.vue'
import aggregatorService from '@/services/aggregatorService'
import { formatAmount, formatMarketPrice } from '@/services/productsService'
import {
  getColorByWeight,
  getLinearShadeText,
  getLinearShade,
  joinRgba,
  rgbaToRgb,
  splitColorCode,
  getAppBackgroundColor
} from '@/utils/colors'
import audioService, { AudioFunction } from '@/services/audioService'
import logos from '@/assets/exchanges'
import { Trade } from '@/types/types'
import { Threshold, TradesPaneState } from '@/store/panesSettings/trades'
import { usePane } from '@/composables/usePane'
import store from '@/store'

const DEBUG = false
const GRADIENT_DETAIL = 5
const LOGOS = {}

enum TradeType {
  trade,
  liquidation
}

// Define props
const props = defineProps({
  paneId: {
    type: String,
    required: true
  }
})

// Refs
const canvas = ref<HTMLCanvasElement | null>(null)

// Reactive data
let ctx: CanvasRenderingContext2D | null = null
let width: number
let maxWidth: number
let pairOffset: number
let priceOffset: number
let amountOffset: number
let height: number
let lineHeight: number
let fontSize: number
let paddingTop: number
let paddingLeft: number
let margin: number
let logoWidth: number
let timeWidth: number
let pxRatio: number
let maxLines: number
let maxHistory: number
let buyColorBase: string
let buyColor100: string
let sellColorBase: string
let sellColor100: string
let themeBase: string
let renderTrades: boolean
let showPairs: boolean
let showPrices: boolean
let showHistograms: boolean
let drawOffset: number

// Prepared thresholds
let minAmount: number
let minAudio: number
let colors: {
  [type: string]: {
    lastRangeIndex: number
    minAmount: number
    maxAmount: number
    significantAmount: number
    ranges: {
      from: number
      to: number
      buy: {
        background: string
        color: string
        step: number
      }[]
      sell: {
        background: string
        color: string
        step: number
      }[]
      max?: boolean
    }[]
  }
} = {}

let sounds: {
  [type: string]: { buy: AudioFunction; sell: AudioFunction }[]
} = {}

let baseSizingCurrency: boolean
let filters: {
  [key in TradeType]: boolean
} = { [TradeType.trade]: true, [TradeType.liquidation]: true }

let rendering = false
let tradesRendering: any[] = []
let tradesHistory: any[] = []
let paneMarkets: { [market: string]: boolean } = {}
let volumeBySide = { buy: 0, sell: 0 }
let insignificantVolumeBySide = { buy: 0, sell: 0 }
let addedVolumeBySide = { buy: 0, sell: 0 }
let offset = 0
let maxCount = 0
let showAvgPrice: boolean
let limit = 0
let batchSize = 1

const sliderDropdownTrigger = ref(null)
const paused = ref(0)

let scrollHandler: ((event: WheelEvent) => void) | null = null
let blurHandler: ((event: Event) => void) | null = null

// Computed properties

const pane = computed(() => store.state.panes.panes[props.paneId])

const market = computed(() => {
  return pane.value.markets[0]
})

const thresholdsMultipler = computed(() => {
  return store.state[props.paneId].thresholdsMultipler
})

const gradient = computed(() => {
  const paneState = store.state[props.paneId]
  return [
    paneState.thresholds[0].buyColor,
    paneState.thresholds[paneState.thresholds.length - 1].buyColor
  ]
})

// Watchers

const _onStoreMutation = store.subscribe(async mutation => {
  switch (mutation.type) {
    case 'panes/SET_PANE_MARKETS':
      if (mutation.payload.id === props.paneId) {
        clear()
        prepareMarkets()
        renderHistory()
      }
      break
    case 'app/EXCHANGE_UPDATED':
    case props.paneId + '/SET_MAX_ROWS':
    case props.paneId + '/TOGGLE_PREFERENCE':
      prepareTypeFilter(true)
      prepareDisplaySettings()
      refreshColumnsWidth()
      renderHistory()
      break
    case props.paneId + '/SET_THRESHOLD_AUDIO':
    case props.paneId + '/SET_AUDIO_VOLUME':
    case props.paneId + '/SET_AUDIO_PITCH':
    case props.paneId + '/TOGGLE_MUTED':
    case 'settings/SET_AUDIO_VOLUME':
    case 'settings/TOGGLE_AUDIO':
      await prepareAudio()
      break
    case props.paneId + '/SET_AUDIO_THRESHOLD':
      await prepareAudio(false)
      break
    case 'settings/SET_BACKGROUND_COLOR':
    case props.paneId + '/SET_THRESHOLD_COLOR':
    case props.paneId + '/SET_THRESHOLD_AMOUNT':
    case props.paneId + '/SET_THRESHOLDS_MULTIPLER':
    case props.paneId + '/TOGGLE_THRESHOLD_MAX':
    case props.paneId + '/DELETE_THRESHOLD':
    case props.paneId + '/ADD_THRESHOLD':
      prepareColors()
      renderHistory()

      if (
        mutation.type === props.paneId + '/DELETE_THRESHOLD' ||
        mutation.type === props.paneId + '/SET_THRESHOLDS_MULTIPLER' ||
        mutation.type === props.paneId + '/ADD_THRESHOLD'
      ) {
        await prepareAudio()
      }
      break
  }
})

// Lifecycle hooks

onMounted(async () => {
  ctx = canvas.value.getContext('2d', { alpha: false })

  await nextTick()
  await prepareEverything()

  aggregatorService.on('trades', onTrades)
})

onBeforeUnmount(() => {
  aggregatorService.off('trades', onTrades)

  _onStoreMutation()

  if (blurHandler) {
    onBlur()
  }
})

// Methods

async function prepareEverything() {
  reset()

  prepareTypeFilter()
  prepareMarkets()
  prepareColors()
  await prepareAudio()

  renderHistory()
}

function onTrades(trades: Trade[]) {
  let date = null
  let side = null

  for (let i = 0; i < trades.length; i++) {
    const marketKey = trades[i].exchange + ':' + trades[i].pair
    const type = trades[i].liquidation ? TradeType.liquidation : TradeType.trade

    if (!filters[type] || !paneMarkets[marketKey]) {
      continue
    }

    if (
      trades[i].amount < colors[type].minAmount ||
      trades[i].amount > colors[type].maxAmount
    ) {
      if (trades[i].amount > minAudio) {
        sounds[type][0][trades[i].side](
          audioService,
          trades[i].amount / colors[type].significantAmount
        )
      }

      insignificantVolumeBySide[trades[i].side] += trades[i].amount
      continue
    }

    volumeBySide[trades[i].side] += trades[i].amount

    if (side === null) {
      side = trades[i].side
    }

    const { background, color, step } = getColors(
      trades[i].amount,
      trades[i].side,
      type
    )

    maxCount = Math.max(maxCount, trades[i].count)

    const trade = {
      type,
      background,
      color,
      step,
      exchange: trades[i].exchange,
      pair: trades[i].pair,
      amount: trades[i].amount,
      count: trades[i].count,
      price: showAvgPrice ? trades[i].avgPrice : trades[i].price,
      side: trades[i].side,
      time: null
    }

    if (!date) {
      date = new Date(+trades[i].timestamp)

      trade.time = `${date.getHours().toString().padStart(2, '0')}:${date
        .getMinutes()
        .toString()
        .padStart(2, '0')}`
    }

    if (trade.amount > minAudio) {
      sounds[type][Math.floor(trade.step / GRADIENT_DETAIL)][trade.side](
        audioService,
        trade.amount / colors[type].significantAmount
      )
    }

    tradesRendering.push(trade)
  }

  if (date && !rendering) {
    volumeBySide[side] += insignificantVolumeBySide[side]
    addedVolumeBySide[side] += insignificantVolumeBySide[side]
    insignificantVolumeBySide[side] = 0
    renderTradesBatch()
  }

  renderVolumeBySide()
}

function getThresholdsByType(type: TradeType | string): Threshold[] {
  const paneSettings = store.state[props.paneId] as TradesPaneState

  if (type === TradeType.liquidation) {
    return paneSettings.liquidations
  }

  return paneSettings.thresholds
}

async function prepareTypeFilter(checkRequirements?: boolean) {
  filters = {
    [TradeType.trade]: store.state[props.paneId].showTrades,
    [TradeType.liquidation]: store.state[props.paneId].showLiquidations
  }

  baseSizingCurrency = !store.state.settings.preferQuoteCurrencySize

  if (checkRequirements) {
    for (const type in filters) {
      if (!filters[type] && typeof colors[type] !== 'undefined') {
        delete colors[type]
      } else if (filters[type] && typeof colors[type] === 'undefined') {
        prepareThresholds(
          type as unknown as TradeType,
          getThresholdsByType(type)
        )
      }

      if (!filters[type] && typeof sounds[type] !== 'undefined') {
        delete sounds[type]
      } else if (
        filters[type] &&
        typeof sounds[type] === 'undefined' &&
        minAudio > 0
      ) {
        await prepareSounds(type, getThresholdsByType(+type))
      }
    }
  }

  for (let i = 0; i < tradesHistory.length; i++) {
    if (!filters[tradesHistory[i].type]) {
      tradesHistory.splice(i, 1)
      i--
    }
  }
}

function prepareMarkets() {
  paneMarkets = pane.value.markets.reduce((output, marketKey) => {
    const [exchange] = marketKey.split(':')

    if (!store.state.app.activeExchanges[exchange]) {
      output[marketKey] = false
      return output
    }

    output[marketKey] = true
    return output
  }, {})
}

async function prepareAudio(prepareSoundsFlag = true) {
  const audioThreshold = store.state[props.paneId].audioThreshold

  if (
    !store.state.settings.useAudio ||
    store.state[props.paneId].muted ||
    store.state[props.paneId].audioVolume === 0
  ) {
    minAudio = Infinity
    sounds = {}
    return
  }

  if (audioThreshold) {
    if (typeof audioThreshold === 'string' && /\d\s*%$/.test(audioThreshold)) {
      minAudio = minAmount * (parseFloat(audioThreshold) / 100)
    } else {
      minAudio = +audioThreshold
    }
  } else {
    minAudio = minAmount * 0.1
  }

  if (prepareSoundsFlag) {
    for (const type in filters) {
      if (filters[type]) {
        await prepareSounds(type, getThresholdsByType(+type))
      }
    }
  }
}

async function prepareSounds(type: string, thresholds: Threshold[]) {
  const soundsArray = []
  const audioPitch = store.state[props.paneId].audioPitch

  for (let i = 0; i < thresholds.length; i++) {
    soundsArray.push({
      buy: await audioService.buildAudioFunction(
        thresholds[i].buyAudio,
        'buy',
        audioPitch
      ),
      sell: await audioService.buildAudioFunction(
        thresholds[i].sellAudio,
        'sell',
        audioPitch
      )
    })
  }

  sounds[type] = soundsArray
}

function prepareColors() {
  const style = getComputedStyle(document.documentElement)
  themeBase = style.getPropertyValue('--theme-base')

  let baseColorThreshold

  if (filters[TradeType.trade]) {
    baseColorThreshold =
      store.state[props.paneId].thresholds[
        store.state[props.paneId].thresholds.length - 2
      ]
  } else {
    baseColorThreshold =
      store.state[props.paneId].liquidations[
        store.state[props.paneId].thresholds.length - 2
      ]
  }

  buyColorBase = baseColorThreshold.buyColor
  buyColor100 = joinRgba(getLinearShade(splitColorCode(buyColorBase), 0.25))
  sellColorBase = baseColorThreshold.sellColor
  sellColor100 = joinRgba(getLinearShade(splitColorCode(sellColorBase), 0.25))

  for (const type in filters) {
    if (filters[type]) {
      prepareThresholds(
        type as unknown as TradeType,
        getThresholdsByType(+type)
      )
    }
  }

  for (let i = 0; i < tradesHistory.length; i++) {
    if (tradesHistory[i].amount < minAmount) {
      tradesHistory.splice(i, 1)
      i--
      continue
    }

    const colorData = getColors(
      tradesHistory[i].amount,
      tradesHistory[i].side,
      tradesHistory[i].type
    )

    Object.assign(tradesHistory[i], colorData)
  }
}

function prepareThresholds(type: TradeType, thresholds: Threshold[]) {
  const themeBackgroundColor = splitColorCode(themeBase)
  const appBackgroundColor = getAppBackgroundColor()

  const ranges = []
  let significantAmount
  const total = thresholds.length * GRADIENT_DETAIL

  for (let i = 0; i < thresholds.length - 1; i++) {
    const from = thresholds[i].amount
    const to = thresholds[i + 1].amount

    if (i === 0) {
      significantAmount = to
    }

    const buyColorFrom = splitColorCode(thresholds[i].buyColor)
    const buyColorTo = splitColorCode(thresholds[i + 1].buyColor)
    const buyAlpha =
      typeof buyColorFrom[3] === 'undefined' ? 1 : buyColorFrom[3]

    const buyColorRange = [
      rgbaToRgb(buyColorFrom, appBackgroundColor),
      rgbaToRgb(buyColorTo, appBackgroundColor)
    ]

    const buyColorRangeTheme = [
      rgbaToRgb(buyColorFrom, themeBackgroundColor),
      rgbaToRgb(buyColorTo, themeBackgroundColor)
    ]

    const sellColorFrom = splitColorCode(thresholds[i].sellColor)
    const sellColorTo = splitColorCode(thresholds[i + 1].sellColor)
    const sellAlpha =
      typeof sellColorFrom[3] === 'undefined' ? 1 : sellColorFrom[3]

    const sellColorRange = [
      rgbaToRgb(sellColorFrom, appBackgroundColor),
      rgbaToRgb(sellColorTo, appBackgroundColor)
    ]

    const sellColorRangeTheme = [
      rgbaToRgb(sellColorFrom, themeBackgroundColor),
      rgbaToRgb(sellColorTo, themeBackgroundColor)
    ]

    const buy = []
    const sell = []

    for (let j = 0; j < GRADIENT_DETAIL; j++) {
      const position = j / (GRADIENT_DETAIL - 1)

      const buyBackground = getColorByWeight(
        buyColorRange[0],
        buyColorRange[1],
        position
      )
      const buyTextColor = getColorByWeight(
        buyColorRangeTheme[0],
        buyColorRangeTheme[1],
        position
      )
      const buyText = getLinearShadeText(
        buyTextColor,
        0.5 + Math.min(1, (i * GRADIENT_DETAIL + j) / total),
        Math.exp(1 - buyAlpha) / 5
      )

      buy.push({
        background: joinRgba(buyBackground),
        color: joinRgba(buyText),
        step: i * GRADIENT_DETAIL + j
      })

      const sellBackground = getColorByWeight(
        sellColorRange[0],
        sellColorRange[1],
        position
      )
      const sellTextColor = getColorByWeight(
        sellColorRangeTheme[0],
        sellColorRangeTheme[1],
        position
      )
      const sellText = getLinearShadeText(
        sellTextColor,
        0.5 + Math.min(1, (i * GRADIENT_DETAIL + j) / total),
        Math.exp(1 - sellAlpha) / 5
      )

      sell.push({
        background: joinRgba(sellBackground),
        color: joinRgba(sellText),
        step: i * GRADIENT_DETAIL + j
      })
    }

    ranges.push({
      from,
      to,
      buy,
      sell
    })

    if (thresholds[i + 1].max) {
      ranges[ranges.length - 1].max = true
      break
    }
  }

  const lastRangeIndex = ranges.length - 1
  const minAmountValue = ranges[0].from

  let maxAmountValue

  if (!ranges[ranges.length - 1].max) {
    maxAmountValue = Infinity
  } else {
    maxAmountValue = ranges[ranges.length - 1].to
  }

  colors[type] = {
    lastRangeIndex,
    minAmount: minAmountValue,
    maxAmount: maxAmountValue,
    significantAmount,
    ranges
  }

  if (type == TradeType.trade || !filters[TradeType.trade]) {
    minAmount = minAmountValue
  }
}

function prepareDisplaySettings() {
  const paneState = store.state[props.paneId] as TradesPaneState
  maxHistory = paneState.maxRows
  showHistograms = paneState.showHistograms
  showPairs = paneState.showPairs
  showAvgPrice = paneState.showAvgPrice
  renderTrades = !paneState.showHistograms || height > window.innerHeight / 24
  showPrices = paneState.showPrices
  offset = 0
  drawOffset = showHistograms ? lineHeight : 0

  refreshColumnsWidth()
}

function onZoom() {
  this.onResize()
}

function onResize(widthValue, heightValue, isMounting) {
  resize()

  if (!isMounting) {
    renderHistory()
  }
}

function resize() {
  const canvasElement = canvas.value

  let headerHeight = 0

  if (!store.state.settings.autoHideHeaders) {
    headerHeight = (pane.value.zoom || 1) * 2 * 16
  }

  pxRatio = window.devicePixelRatio || 1
  const zoom = pane.value.zoom || 1

  width = canvasElement.width = canvasElement.clientWidth * pxRatio
  height = canvasElement.height =
    (canvasElement.clientHeight - headerHeight) * pxRatio
  fontSize = Math.round(12 * zoom * pxRatio)
  logoWidth = fontSize
  paddingTop = Math.round(Math.max(width * 0.005 * zoom, 2) * pxRatio)
  lineHeight = Math.round(fontSize + paddingTop)
  drawOffset = showHistograms ? lineHeight : 0
  maxLines = Math.ceil(height / lineHeight)
  renderTrades =
    !store.state[props.paneId].showHistograms ||
    height > window.innerHeight / 24
  offset = offset || 0
  limit = offset + maxLines

  ctx.font = `${zoom > 1.25 ? '600 ' : ''}${fontSize}px Spline Sans Mono`
  ctx.textBaseline = 'middle'

  refreshColumnsWidth()
}

function refreshColumnsWidth() {
  if (typeof showPairs === 'undefined') {
    return
  }

  const zoom = pane.value.zoom || 1
  const count = (showPairs ? 1 : 0) + (showPrices ? 1 : 0) + 2

  paddingLeft =
    Math.round(Math.max(width * 0.01 * zoom, 2) * pxRatio) * (count < 3 ? 4 : 1)
  margin = Math.round(Math.max(width * 0.01 * zoom, 4) * pxRatio)

  const contentWidth = width - margin * 2 - logoWidth - paddingLeft * count
  timeWidth = contentWidth * (0.75 / count)
  maxWidth = (contentWidth - timeWidth) / (count - 1)
  amountOffset = width - timeWidth - margin - paddingLeft
  priceOffset = margin + logoWidth + paddingLeft
  pairOffset = priceOffset + (showPrices ? paddingLeft + maxWidth : 0)
}

function getColors(amount, side, type) {
  const colorsData = colors[type]

  for (let i = 0; i < colorsData.ranges.length; i++) {
    if (i === colorsData.lastRangeIndex || amount < colorsData.ranges[i].to) {
      let innerStep = GRADIENT_DETAIL - 1

      if (amount < colorsData.ranges[i].to) {
        innerStep = Math.floor(
          ((amount - colorsData.ranges[i].from) /
            (colorsData.ranges[i].to - colorsData.ranges[i].from)) *
            GRADIENT_DETAIL
        )
      }

      return colorsData.ranges[i][side][innerStep]
    }
  }
}

function clear() {
  ctx.resetTransform()
  const style = getComputedStyle(document.documentElement)
  const themeBaseArray = splitColorCode(style.getPropertyValue('--theme-base'))
  const backgroundColor = splitColorCode(
    style.getPropertyValue('--theme-background-base'),
    themeBaseArray
  )
  themeBaseArray[3] = 0.1
  ctx.fillStyle = joinRgba(
    splitColorCode(joinRgba(themeBaseArray), backgroundColor)
  )
  ctx.fillRect(0, 0, width, height)
}

function reset() {
  if (ctx) {
    clear()
  }

  tradesRendering = []
  tradesHistory = []
  volumeBySide = { buy: 0, sell: 0 }
  insignificantVolumeBySide = { buy: 0, sell: 0 }
  addedVolumeBySide = { buy: 0, sell: 0 }
  colors = {}
  sounds = {}
  offset = 0
  limit = 0
  maxCount = 100

  prepareDisplaySettings()
}

function renderTradesBatch() {
  if (paused.value) {
    paused.value = tradesRendering.length
    rendering = false
    return
  }

  let count = Math.ceil(tradesRendering.length * 0.1)
  let i = 0
  while (count-- && ++i <= batchSize) {
    const trade = tradesRendering.shift()

    if (renderTrades) {
      renderTrade(trade)

      if (offset >= 1) {
        offset++
      }
    }

    tradesHistory.unshift(trade)

    if (tradesHistory.length > maxHistory) {
      const removedTrade = tradesHistory.pop()

      if (addedVolumeBySide[removedTrade.side]) {
        removedTrade.amount += addedVolumeBySide[removedTrade.side]
        addedVolumeBySide[removedTrade.side] = 0
      }

      volumeBySide[removedTrade.side] -= removedTrade.amount
    }
  }

  const rate = Math.ceil(tradesRendering.length / 10)
  batchSize = rate

  rendering = tradesRendering.length > 0

  if (rendering) {
    return requestAnimationFrame(renderTradesBatch)
  }
}

function renderTrade(trade) {
  const marketKey = trade.exchange + ':' + trade.pair

  const paddingTopValue = paddingTop + Math.round((trade.step / 2) * pxRatio)
  const heightValue = lineHeight + paddingTopValue * 2

  ctx.drawImage(ctx.canvas, 0, heightValue)
  ctx.fillStyle = trade.background
  ctx.fillRect(0, drawOffset, width, heightValue)

  drawHistogram(trade, heightValue)
  ctx.fillStyle = trade.color

  drawLogo(trade.exchange, margin, drawOffset + heightValue / 2 - logoWidth / 2)

  if (showPairs) {
    drawPair(trade, heightValue)
  }

  if (showPrices) {
    drawPrice(trade, marketKey, heightValue)
  }

  drawAmount(trade, heightValue, trade.type === TradeType.liquidation)

  if (trade.time) {
    drawTime(trade, heightValue)
  }
}

function drawTime(trade, heightValue) {
  ctx.fillText(
    trade.time,
    width - margin,
    drawOffset + heightValue / 2 + 1,
    timeWidth
  )
}

function drawHistogram(trade, heightValue) {
  ctx.fillStyle = 'rgba(255,255,255,0.05)'
  ctx.fillRect(
    0,
    0,
    Math.min(1, trade.count / 100) * width,
    drawOffset + heightValue
  )
}

function drawPair(trade, heightValue) {
  ctx.textAlign = 'left'
  ctx.fillText(
    trade.pair,
    pairOffset,
    drawOffset + heightValue / 2 + 1,
    maxWidth
  )
}

function drawPrice(trade, market, heightValue) {
  ctx.textAlign = 'left'
  ctx.fillText(
    formatMarketPrice(trade.price, market),
    priceOffset,
    drawOffset + heightValue / 2 + 1,
    maxWidth
  )
}

function drawAmount(trade: Trade, heightValue, liquidation) {
  ctx.textAlign = 'right'
  const backupFont = ctx.font
  ctx.font = ctx.font.replace(new RegExp(`^(${fontSize}px)`), 'bold $1')
  const amountValue = baseSizingCurrency
    ? Math.round(trade.amount * 1e6) / 1e6
    : formatAmount(trade.amount)

  ctx.fillText(
    amountValue + (liquidation ? (trade.side === 'buy' ? '🐻' : '🐂') : ''),
    amountOffset,
    drawOffset + heightValue / 2 + 1,
    maxWidth
  )

  ctx.font = backupFont
}

function renderHistory() {
  clear()

  if (!renderTrades) {
    return
  }

  if (DEBUG) {
    renderDebug()
  }

  const offsetValue = Math.round(offset)
  const limitValue = Math.round(limit)

  if (limitValue - offsetValue <= 0) {
    ctx.fillText('waiting for trades', 8, 8)
    return
  }

  for (let i = limitValue - 1; i >= offsetValue; i--) {
    if (!tradesHistory[i]) {
      continue
    }

    renderTrade(tradesHistory[i])
  }
}

function renderVolumeBySide() {
  if (!showHistograms) {
    return
  }

  const insignificantVolume =
    insignificantVolumeBySide.buy + insignificantVolumeBySide.sell
  const volume = volumeBySide.buy + volumeBySide.sell
  const total = insignificantVolume + volume
  const buyWidthValue = width * (volumeBySide.buy / total)
  const buyWidthFast = width * (insignificantVolumeBySide.buy / total)
  const sellWidthFast = width * (insignificantVolumeBySide.sell / total)
  const sellWidthValue = width * (volumeBySide.sell / total)

  const lineHeightValue = renderTrades ? lineHeight : height

  ctx.fillStyle = buyColorBase
  ctx.fillRect(0, 0, buyWidthValue, lineHeightValue)
  ctx.fillStyle = buyColor100
  ctx.fillRect(buyWidthValue, 0, buyWidthFast, lineHeightValue)
  ctx.fillStyle = sellColor100
  ctx.fillRect(buyWidthValue + buyWidthFast, 0, sellWidthFast, lineHeightValue)
  ctx.fillStyle = sellColorBase
  ctx.fillRect(width - sellWidthValue, 0, sellWidthValue, lineHeightValue)
}

function renderDebug() {
  const quarterWidth = width / 4
  ctx.fillStyle = buyColorBase
  ctx.fillRect(0, 0, quarterWidth, lineHeight)
  ctx.fillStyle = buyColor100
  ctx.fillRect(quarterWidth, 0, quarterWidth, lineHeight)
  ctx.fillStyle = sellColor100
  ctx.fillRect(quarterWidth * 2, 0, quarterWidth, lineHeight)
  ctx.fillStyle = sellColorBase
  ctx.fillRect(quarterWidth * 3, 0, quarterWidth, lineHeight)

  for (const type in filters) {
    if (filters[type]) {
      for (const range of colors[type].ranges) {
        for (let i = 0; i < range.buy.length; i++) {
          ctx.translate(0, lineHeight)
          const buy = range.buy[i]
          ctx.fillStyle = buy.background
          ctx.fillRect(0, 0, width / 2, lineHeight)
          ctx.fillStyle = buy.color
          ctx.textAlign = 'left'
          ctx.fillText('B:' + buy.color, 0, lineHeight / 2)

          const sell = range.sell[i]
          ctx.fillStyle = sell.background
          ctx.fillRect(width / 2, 0, width / 2, lineHeight)
          ctx.fillStyle = sell.color
          ctx.textAlign = 'left'
          ctx.fillText('S: ' + sell.color, width / 2, lineHeight / 2)
        }
      }
    }
  }

  ctx.resetTransform()
}

function onBlur() {
  canvas.value.removeEventListener('mouseleave', blurHandler)
  canvas.value.removeEventListener('wheel', scrollHandler)
  scrollHandler = null
  blurHandler = null
  paused.value = 0
  offset = 0
  limit = maxLines
  renderHistory()
  renderTradesBatch()
}

function onScroll(event) {
  event.preventDefault()

  const direction = Math.sign(event.deltaY) * (event.shiftKey ? 2 : 1)

  const offsetValue = Math.max(
    0,
    Math.min(tradesHistory.length, offset + direction)
  )
  const limitValue = Math.min(
    tradesHistory.length,
    Math.max(offsetValue + maxLines, limit + direction)
  )

  const redraw = Math.round(offsetValue) !== Math.round(offset)

  paused.value = offsetValue
  offset = offsetValue
  limit = limitValue

  if (redraw) {
    renderHistory()
  }
}

function bindScroll() {
  if (scrollHandler) {
    onBlur()
    return
  }

  paused.value = 1

  blurHandler = onBlur
  scrollHandler = onScroll
  canvas.value.addEventListener('wheel', scrollHandler)
  canvas.value.addEventListener('mouseleave', blurHandler)
}

function drawLogo(exchange, x, y) {
  if (!LOGOS[exchange]) {
    const logoCanvas = document.createElement('canvas')
    logoCanvas.width = logoWidth
    logoCanvas.height = logoWidth

    const image = new Image()
    image.onload = () => {
      const logoCtx = logoCanvas.getContext('2d')
      logoCtx.drawImage(image, 0, 0, logoWidth, logoWidth)
    }
    image.src = logos[exchange]

    LOGOS[exchange] = logoCanvas
  } else {
    ctx.drawImage(LOGOS[exchange], x, y, logoWidth, logoWidth)
  }
}

const paneElementRef = ref<HTMLElement>()
usePane(props.paneId, paneElementRef, onResize)
defineExpose({ onResize })
</script>

<style lang="scss" scoped>
canvas {
  width: 100%;
  height: 100%;
  background-color: var(--theme-background-base);
}

.pane-trades {
  position: relative;

  &__slider {
    width: 100%;
    margin-top: 1rem;
  }

  &__paused {
    position: absolute;
    bottom: 1rem;
    right: 1rem;
    padding: 1rem;
    text-shadow: 1px 1px black;
  }
}
</style>
