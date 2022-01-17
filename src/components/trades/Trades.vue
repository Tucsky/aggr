<template>
  <div class="pane-trades">
    <pane-header :paneId="paneId" />
    <div
      ref="tradesContainer"
      class="trades-list"
      :class="['hide-scrollbar', this.showLogos && '-logos', !this.monochromeLogos && '-logos-colors']"
    ></div>
    <trades-placeholder v-if="showPlaceholder" :paneId="paneId"></trades-placeholder>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'

import { formatMarketPrice, formatAmount, parseMarket } from '@/utils/helpers'
import { getColorByWeight, getColorLuminance, getAppBackgroundColor, splitRgba } from '@/utils/colors'
import { SlippageMode, Trade } from '@/types/test'
import { Threshold } from '@/store/panesSettings/trades'

import aggregatorService from '@/services/aggregatorService'
import gifsService from '@/services/gifsService'
import audioService, { AudioFunction } from '@/services/audioService'
import PaneMixin from '@/mixins/paneMixin'
import PaneHeader from '@/components/panes/PaneHeader.vue'
import TradesPlaceholder from '@/components/trades/TradesPlaceholder.vue'

interface TradesPaneCache {
  showTrades?: boolean
  showLiquidations?: boolean
  slippageMode?: SlippageMode
  showGifs?: boolean
  showLogos?: boolean
  showTradesPairs?: boolean
  marketsMultipliers?: { [identifier: string]: number }
  paneMarkets?: { [identifier: string]: boolean }

  tradesAudios?: PreparedAudioStep[]
  tradesColors?: PreparedColorStep[]
  minimumTradeAmount?: number
  significantTradeAmount?: number

  liquidationsAudios?: PreparedAudioStep[]
  liquidationsColors?: PreparedColorStep[]
  minimumLiquidationAmount?: number
  significantLiquidationAmount?: number

  audioThreshold?: number
}

interface PreparedColorStep {
  min?: number
  max?: number
  range?: number
  level?: number
  buy: {
    from: number[]
    to: number[]
    fromLuminance: number
    toLuminance: number
    gif: string
  }
  sell: {
    from: number[]
    to: number[]
    fromLuminance: number
    toLuminance: number
    gif: string
  }
}

interface PreparedAudioStep {
  buy: AudioFunction
  sell: AudioFunction
}

@Component({
  components: { PaneHeader, TradesPlaceholder },
  name: 'Trades'
})
export default class extends Mixins(PaneMixin) {
  showPlaceholder = true

  private _onStoreMutation: () => void
  private _timeAgoInterval: number
  private _tradesCount = 0
  private _lastTradeTimestamp: number
  private _lastSide: string

  private _preferences: TradesPaneCache

  get maxRows() {
    return this.$store.state[this.paneId].maxRows
  }

  get tradesThresholds(): Threshold[] {
    return this.$store.state[this.paneId].thresholds
  }

  get liquidationsThresholds(): Threshold[] {
    return this.$store.state[this.paneId].liquidations
  }

  get tradeType() {
    return this.$store.state[this.paneId].tradeType
  }

  get showTradesPairs() {
    return this.$store.state[this.paneId].showTradesPairs
  }

  get showLogos() {
    return this.$store.state[this.paneId].showLogos
  }

  get monochromeLogos() {
    return this.$store.state[this.paneId].monochromeLogos
  }

  get exchanges() {
    return this.$store.state.exchanges
  }

  get audioThreshold() {
    return this.$store.state[this.paneId].audioThreshold
  }

  $refs!: {
    tradesContainer: HTMLElement
  }

  created() {
    this._tradesCount = 0

    this.cachePreferences()
    this.cachePaneMarkets()
    this.loadGifs()
    this.prepareColors()
    this.prepareAudio()

    aggregatorService.on('trades', this.onTrades)

    this._onStoreMutation = this.$store.subscribe(mutation => {
      switch (mutation.type) {
        case 'app/EXCHANGE_UPDATED':
        case 'settings/TOGGLE_SLIPPAGE':
        case this.paneId + '/TOGGLE_TRADE_TYPE':
        case this.paneId + '/TOGGLE_TRADES_PAIRS':
        case this.paneId + '/TOGGLE_LOGOS':
          this.cachePreferences()
          this.refreshList()
          break
        case this.paneId + '/SET_MAX_ROWS':
          this.trimRows()
          break
        case 'panes/SET_PANE_MARKETS':
        case this.paneId + '/SET_THRESHOLD_MULTIPLIER':
          if (mutation.type !== 'panes/SET_PANE_MARKETS' || mutation.payload.id === this.paneId) {
            this.cachePaneMarkets()
            this.refreshList()
          }
          break
        case this.paneId + '/SET_THRESHOLD_GIF':
          gifsService.getGifs(mutation.payload.value, true)
          this.refreshList()
          break
        case this.paneId + '/SET_THRESHOLD_AUDIO':
        case this.paneId + '/SET_AUDIO_VOLUME':
        case this.paneId + '/SET_AUDIO_PITCH':
        case 'settings/SET_AUDIO_VOLUME':
        case 'settings/TOGGLE_AUDIO':
          this.prepareAudio()
          break
        case this.paneId + '/SET_AUDIO_THRESHOLD':
        case this.paneId + '/TOGGLE_MUTED':
          this.prepareAudio(false)
          break
        case 'settings/SET_CHART_BACKGROUND_COLOR':
        case this.paneId + '/SET_THRESHOLD_COLOR':
        case this.paneId + '/SET_THRESHOLD_AMOUNT':
        case this.paneId + '/DELETE_THRESHOLD':
        case this.paneId + '/ADD_THRESHOLD':
          this.prepareColors()
          this.refreshList()

          if (mutation.type === this.paneId + '/DELETE_THRESHOLD' || this.paneId + '/ADD_THRESHOLD') {
            this.prepareAudio()
          }
          break
      }
    })
  }
  mounted() {
    this.startTimeAgoInterval()
  }

  beforeDestroy() {
    aggregatorService.off('trades', this.onTrades)

    this._onStoreMutation()

    clearInterval(this._timeAgoInterval)
  }

  startTimeAgoInterval() {
    let now

    const timeAgo = milliseconds => {
      if (milliseconds < 60000) {
        return Math.floor(milliseconds / 1000) + 's'
      } else if (milliseconds < 3600000) {
        return Math.floor(milliseconds / 60000) + 'm'
      } else {
        return Math.floor(milliseconds / 3600000) + 'h'
      }
    }

    this._timeAgoInterval = setInterval(() => {
      const elements = this.$el.getElementsByClassName('-timestamp')
      const length = elements.length

      if (!length) {
        return
      }

      now = Date.now()

      const topOfTheMinute = (now / 1000) % 60 < 1

      let previousRowTimeAgo

      for (let i = 0; i < length; i++) {
        if (typeof elements[i] === 'undefined') {
          break
        }

        const milliseconds = now - (elements[i] as any).getAttribute('data-timestamp')
        const txt = timeAgo(milliseconds)

        if (txt === previousRowTimeAgo && txt) {
          elements[i - 1].textContent = ''
          elements[i - 1].className = 'trade__time'
          continue
        }

        if (txt != elements[i].textContent) {
          elements[i].textContent = txt

          if (!topOfTheMinute && txt[txt.length - 1] !== 's') {
            break
          }
        }

        previousRowTimeAgo = txt
      }
    }, 1000)
  }

  onTrades(trades: Trade[]) {
    let html = ''

    for (let i = 0; i < trades.length; i++) {
      const marketKey = trades[i].exchange + ':' + trades[i].pair

      if (!this._preferences.paneMarkets[marketKey]) {
        continue
      }

      const trade = trades[i]

      if (typeof this._preferences.marketsMultipliers[marketKey] !== 'undefined') {
        trade.amount /= this._preferences.marketsMultipliers[marketKey]
      }

      if (!trade.liquidation && this._preferences.showTrades) {
        if (trade.amount >= this._preferences.minimumTradeAmount) {
          html += this.showTrade(
            trade,
            marketKey,
            this._preferences.tradesColors,
            this._preferences.tradesAudios,
            this._preferences.significantTradeAmount
          )
        } else if (trade.amount > this._preferences.audioThreshold) {
          this._preferences.tradesAudios[0][trade.side](audioService, trade.amount / this._preferences.significantTradeAmount)
        }
      } else if (trade.liquidation && this._preferences.showLiquidations) {
        if (trade.amount >= this._preferences.minimumLiquidationAmount) {
          html += this.showTrade(
            trade,
            marketKey,
            this._preferences.liquidationsColors,
            this._preferences.liquidationsAudios,
            this._preferences.significantLiquidationAmount
          )
        } else if (trade.amount > this._preferences.audioThreshold) {
          this._preferences.liquidationsAudios[0][trade.side](audioService, trade.amount / this._preferences.significantLiquidationAmount)
        }
      }
    }

    this.$refs.tradesContainer.insertAdjacentHTML('afterbegin', html)

    this.trimRows()
  }

  getTradeInlineStyles(trade: Trade, colorStep: PreparedColorStep, significantAmount: number) {
    const percentToNextThreshold = (Math.max(trade.amount, colorStep.min) - colorStep.min) / colorStep.range
    const percentToSignificant = Math.min(1, trade.amount / significantAmount)

    const colorBySide = colorStep[trade.side]

    let backgroundGif = ''

    if (this._preferences.showGifs && colorStep[trade.side].gif) {
      const keyword = colorStep[trade.side].gif

      if (gifsService.cache[keyword]) {
        backgroundGif = `background-image:url('${gifsService.cache[keyword][Math.floor(Math.random() * (gifsService.cache[keyword].length - 1))]}')`
      }
    }

    // 0-255 luminance of nearest color
    const luminance = colorBySide[(percentToNextThreshold < 0.5 ? 'from' : 'to') + 'Luminance']

    // background color simple color to color based on percentage of amount to next threshold
    const backgroundColor = getColorByWeight(colorBySide.from, colorBySide.to, percentToNextThreshold)

    // take background color and apply logarithmic shade based on amount to this._significantThresholdAmount percentage
    // darken if luminance of background is high, lighten otherwise
    let foregroundColor

    if (luminance > (backgroundGif ? 144 : 170)) {
      foregroundColor = 'rgba(0, 0, 0, ' + Math.min(1, 0.33 + percentToSignificant) + ')'
    } else {
      foregroundColor = 'rgba(255, 255, 255, ' + Math.min(1, 0.33 + percentToSignificant) + ')'
    }

    return `background-color:rgb(${backgroundColor[0]}, ${backgroundColor[1]}, ${backgroundColor[2]});color:${foregroundColor};${backgroundGif}`
  }

  showTrade(trade: Trade, marketKey: string, colors: PreparedColorStep[], audios: PreparedAudioStep[], significantAmount: number) {
    if (!this._tradesCount++) {
      this.showPlaceholder = false
    }

    let level = 0
    let colorStep: PreparedColorStep

    for (level = 0; level < colors.length; level++) {
      if (trade.amount < colors[level].max) {
        colorStep = colors[level]
        break
      }
    }

    if (trade.amount > this._preferences.audioThreshold) {
      audios[level][trade.side](audioService, trade.amount / significantAmount)
    }

    return this.renderRow(trade, marketKey, colorStep, significantAmount)
  }

  renderRow(trade: Trade, marketKey: string, colorStep: PreparedColorStep, significantAmount: number) {
    let timestampClass = ''

    if (trade.timestamp !== this._lastTradeTimestamp) {
      timestampClass = ' -timestamp'

      this._lastTradeTimestamp = trade.timestamp
    }

    let priceSlippage = ''

    if (this._preferences.slippageMode && trade.slippage) {
      priceSlippage = `<small>${trade.slippage > 0 ? '+' : ''}${trade.slippage}${this._preferences.slippageMode === 'bps' ? 'bps' : ''}</small>`
    }

    let exchangeName = ''

    if (!this._preferences.showLogos) {
      exchangeName = trade.exchange.replace('_', ' ')
    }

    let sideClass = ''

    const sideType = trade.side + (trade.liquidation ? '-liquidation' : '')

    if (sideType !== this._lastSide) {
      sideClass = ' icon-side'
      this._lastSide = sideType
    }

    let pairName = ''

    if (this._preferences.showTradesPairs) {
      pairName = `<div class="trade__pair">${trade.pair.replace('_', ' ')}</div>`
    }

    return `<li class="trade -${trade.exchange} -${trade.side} -level-${colorStep.level}${trade.liquidation ? ' -liquidation' : ''}" title="${
      trade.exchange
    }:${trade.pair}" style="${this.getTradeInlineStyles(trade, colorStep, significantAmount)}">
    <div class="trade__side${sideClass}"></div>
    <div class="trade__exchange">${exchangeName}</div>
    ${pairName}
    <div class="trade__price">${formatMarketPrice(trade.price, marketKey)}${priceSlippage}</div>
    <div class="trade__amount">
      <span class="trade__amount__quote">
        <span class="icon-quote"></span>
        <span>${formatAmount(trade.size * trade.price)}</span>
      </span>
      <span class="trade__amount__base">
        <span class="icon-base"></span>
        <span>${formatAmount(trade.size)}</span>
      </span>
    </div>
    <div class="trade__time ${timestampClass}" data-timestamp="${trade.timestamp.toString()}"></div>
    </li>`
  }

  async loadGifs() {
    this.loadThresholdsGifs(this.tradesThresholds)
    this.loadThresholdsGifs(this.liquidationsThresholds)
  }

  async loadThresholdsGifs(thresholds) {
    for (const threshold of thresholds) {
      if (threshold.buyGif) {
        gifsService.getGifs(threshold.buyGif)
      }

      if (threshold.sellGif) {
        gifsService.getGifs(threshold.sellGif)
      }
    }
  }

  prepareColors() {
    const appBackgroundColor = getAppBackgroundColor()
    this._preferences.tradesColors = this.prepareColorsThresholds(this.tradesThresholds, appBackgroundColor)
    this._preferences.liquidationsColors = this.prepareColorsThresholds(this.liquidationsThresholds, appBackgroundColor)

    this._preferences.minimumTradeAmount = this.tradesThresholds[0].amount
    this._preferences.minimumLiquidationAmount = this.liquidationsThresholds[0].amount
    this._preferences.significantTradeAmount = this.tradesThresholds[1].amount
    this._preferences.significantLiquidationAmount = this.liquidationsThresholds[1].amount
  }

  prepareColorsThresholds(thresholds, appBackgroundColor) {
    const steps = []

    const len = thresholds.length

    for (let i = 0; i < len; i++) {
      if (i === len - 1) {
        steps.push({ ...steps[steps.length - 1], max: Infinity })
        break
      }

      const buyFrom = splitRgba(thresholds[i].buyColor, appBackgroundColor)
      const buyTo = splitRgba(thresholds[i + 1].buyColor, appBackgroundColor)
      const sellFrom = splitRgba(thresholds[i].sellColor, appBackgroundColor)
      const sellTo = splitRgba(thresholds[i + 1].sellColor, appBackgroundColor)

      steps.push({
        min: thresholds[i].amount,
        max: thresholds[i + 1].amount,
        range: thresholds[i + 1].amount - thresholds[i].amount,
        level: Math.floor((i / (len - 1)) * 4),
        buy: {
          from: buyFrom,
          to: buyTo,
          fromLuminance: getColorLuminance(buyFrom),
          toLuminance: getColorLuminance(buyTo),
          gif: thresholds[i].buyGif
        },
        sell: {
          from: sellFrom,
          to: sellTo,
          fromLuminance: getColorLuminance(sellFrom),
          toLuminance: getColorLuminance(sellTo),
          gif: thresholds[i].sellGif
        }
      })
    }

    return steps
  }

  async prepareAudio(prepareThresholds = true) {
    if (!this.$store.state.settings.useAudio || this.$store.state[this.paneId].muted || this.$store.state[this.paneId].audioVolume === 0) {
      this._preferences.audioThreshold = Infinity
      return
    }

    if (this.audioThreshold) {
      if (typeof this.audioThreshold === 'string' && /\d\s*%$/.test(this.audioThreshold)) {
        this._preferences.audioThreshold = this._preferences.minimumTradeAmount * (parseFloat(this.audioThreshold) / 100)
      } else {
        this._preferences.audioThreshold = +this.audioThreshold
      }
    } else {
      this._preferences.audioThreshold = this._preferences.minimumTradeAmount * 0.1
    }

    if (!this._preferences.tradesAudios || prepareThresholds) {
      const audioPitch = this.$store.state[this.paneId].audioPitch
      const paneVolume = this.$store.state[this.paneId].audioVolume

      this._preferences.tradesAudios = await this.prepareAudioThresholds(this.tradesThresholds, audioPitch, paneVolume)
      this._preferences.liquidationsAudios = await this.prepareAudioThresholds(this.liquidationsThresholds, audioPitch, paneVolume)
    }
  }

  async prepareAudioThresholds(thresholds, audioPitch, paneVolume) {
    const audios = []

    for (let i = 0; i < thresholds.length; i++) {
      audios.push({
        buy: await audioService.buildAudioFunction(thresholds[i].buyAudio, 'buy', audioPitch, paneVolume),
        sell: await audioService.buildAudioFunction(thresholds[i].sellAudio, 'sell', audioPitch, paneVolume)
      })
    }

    return audios
  }

  cachePreferences() {
    if (!this._preferences) {
      this._preferences = {
        paneMarkets: {},
        marketsMultipliers: {}
      }
    }

    this._preferences.slippageMode = this.$store.state.settings.calculateSlippage
    this._preferences.showTrades = this.tradeType === 'both' || this.tradeType === 'trades'
    this._preferences.showLiquidations = this.tradeType === 'both' || this.tradeType === 'liquidations'
    this._preferences.showGifs = !this.$store.state.settings.disableAnimations
    this._preferences.showLogos = this.showLogos
    this._preferences.showTradesPairs = this.showTradesPairs
  }

  cachePaneMarkets() {
    this._preferences.marketsMultipliers = {}
    this._preferences.paneMarkets = this.$store.state.panes.panes[this.paneId].markets.reduce((output, marketKey) => {
      const [exchange] = marketKey.split(':')

      if (!this.$store.state.app.activeExchanges[exchange]) {
        output[marketKey] = false
        return output
      }

      const multiplier = this.$store.state[this.paneId].multipliers[marketKey]

      if (typeof multiplier !== 'undefined') {
        this._preferences.marketsMultipliers[marketKey] = multiplier
      }

      output[marketKey] = true
      return output
    }, {})
  }

  refreshThresholdsCache() {
    this.prepareColors()
  }

  clearList() {
    this.$refs.tradesContainer.innerHTML = ''
    this._tradesCount = 0
    this.showPlaceholder = true
  }

  refreshList() {
    if (!this._tradesCount) {
      return this.clearList()
    }

    const elements = this.$el.getElementsByClassName('trade')

    const trades: Trade[] = []

    for (const element of elements) {
      const [exchange, pair] = parseMarket(element.getAttribute('title'))

      const timestamp = element.querySelector('.trade__time').getAttribute('data-timestamp')
      const price = parseFloat((element.querySelector('.trade__price') as HTMLElement).innerText) || 0
      const size = parseFloat((element.querySelector('.trade__amount__base') as HTMLElement).innerText) || 0
      const side: 'buy' | 'sell' = element.classList.contains('-buy') ? 'buy' : 'sell'
      const amount = size * (this.$store.state.settings.preferQuoteCurrencySize ? price : 1)
      const trade: Trade = {
        timestamp: (timestamp as unknown) as number,
        exchange,
        pair,
        price,
        amount,
        size,
        side
      }

      if (element.classList.contains('-liquidation')) {
        trade.liquidation = true
      }

      trades.push(trade)
    }

    this.clearList()

    const audioThresholdValue = this._preferences.audioThreshold
    this._preferences.audioThreshold = Infinity
    const showGifsValue = this._preferences.showGifs
    this._preferences.showGifs = false

    this.onTrades(trades)

    this._preferences.audioThreshold = audioThresholdValue
    this._preferences.showGifs = showGifsValue
  }

  trimRows() {
    while (this._tradesCount > this.maxRows) {
      this.$refs.tradesContainer.removeChild(this.$refs.tradesContainer.lastChild)
      this._tradesCount--
    }
  }
}
</script>

<style lang="scss">
.pane-trades {
  &.-large {
    .trade__time {
      font-size: 75%;
    }
  }

  &.-small .trade {
    &.-level-0 {
      line-height: 1.5em !important;
    }
    &.-level-1 {
      line-height: 1.66em !important;
    }
    &.-level-2 {
      line-height: 1.75em !important;
    }
  }
}

.trades-list {
  margin: 0;
  padding: 0;
  overflow: auto;
  max-height: 100%;
  transform: translateZ(0);
  -webkit-transform: translateZ(0);
  scrollbar-width: none;

  &:not(.-logos) {
    .trade__exchange,
    .trade__pair {
      font-size: 75%;
    }
  }

  &.-logos {
    .trade__exchange {
      overflow: visible;
      text-align: center;
      max-width: 10%;
      flex-basis: 10%;

      &:before {
        font-family: 'icon';
        font-weight: 400;
        font-size: 1em;
        line-height: 0;
        position: relative;
        top: 0.1em;
      }
    }

    @each $exchange, $icon in $exchanges {
      .-#{$exchange} .trade__exchange:before {
        content: $icon;
      }
    }

    &.-logos-colors {
      .trade__exchange {
        background-repeat: no-repeat;
        background-position: center;
        background-size: 1em;

        &:before {
          display: none;
        }
      }

      @each $exchange, $icon in $exchanges {
        .-#{$exchange} .trade__exchange {
          background-image: url('../../assets/exchanges/#{$exchange}.svg');
        }
      }
    }
  }
}

.trades-placeholder {
  text-align: center;
  overflow: auto;
  max-height: 100%;

  &__market {
    color: var(--theme-color-200);
  }
}

.trade {
  display: flex;
  background-position: center center;
  background-size: cover;
  background-blend-mode: overlay;
  position: relative;

  &:after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    opacity: 0;
    background-color: white;
    animation: 1s $ease-out-expo highlight;
    pointer-events: none;
  }

  &.-empty {
    justify-content: center;
    padding: 1em;

    &:after {
      display: none;
    }
  }

  &.-liquidation {
    .icon-side {
      font-size: inherit;

      &:after {
        margin-left: 1rem;
      }
    }

    &.-buy .icon-side:before {
      content: unicode($icon-bear);
    }

    &.-sell .icon-side:before {
      content: unicode($icon-bull);
    }
  }

  &.-sell {
    background-color: lighten($red, 35%);
    color: $red;

    .icon-side:before {
      content: unicode($icon-down);
    }
  }

  &.-buy {
    background-color: lighten($green, 50%);
    color: $green;

    .icon-side:before {
      content: unicode($icon-up);
    }
  }

  &.-level-0 {
    line-height: 1.875em;
    font-size: 0.875em;
  }

  &.-level-1 {
    line-height: 1.875em;
    font-size: 1em;
  }

  &.-level-2 {
    line-height: 2em;
    font-size: 1.125em;
    font-weight: 600;
    padding-bottom: 1px;
  }

  &.-level-3 {
    line-height: 2em;
    box-shadow: 0 0 20px rgba(black, 0.5);
    z-index: 1;
    font-size: 1.25em;
    padding-bottom: 2px;
    font-weight: 600;
  }

  > div {
    flex-basis: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .trade__side {
    overflow: visible;
    max-width: 10%;
    flex-basis: 10%;
    text-align: center;
    line-height: inherit;
  }

  .icon-side {
    font-size: 75%;
  }

  .icon-currency,
  .icon-quote,
  .icon-base {
    line-height: 0;
  }

  .trade__pair {
    font-size: 87.5%;
    text-align: left;
    flex-grow: 0.4;
    margin-left: 2%;

    + .trade__price {
      flex-grow: 0.5;
    }
  }

  .trade__exchange {
    text-align: left;
    flex-grow: 0.4;
  }

  .trade__price {
    flex-grow: 0.6;
    margin-left: 2%;

    small {
      font-size: 0.75em;
      font-weight: 400;
      line-height: 1em;
      display: inline-block;
      vertical-align: top;
      padding: 0.2em 0.25em;
    }
  }

  .trade__amount {
    flex-grow: 0.5;
    padding-left: 2%;

    .trade__amount__base {
      display: none;
    }

    &:hover {
      > .trade__amount__base {
        display: block;
      }

      > .trade__amount__quote {
        display: none;
      }
    }
  }

  .trade__time {
    text-align: right;
    overflow: visible;
    max-width: 9%;
    flex-basis: 9%;
    margin-right: 2%;
    font-size: 87.5%;
  }
}

#app[data-prefered-sizing-currency='base'] .trade .trade__amount {
  .trade__amount__quote {
    display: none;
  }

  .trade__amount__base {
    display: block;
  }

  &:hover {
    > span.trade__amount__base {
      display: none;
    }

    > span.trade__amount__quote {
      display: block;
    }
  }
}

#app.-light .trade.-level-3 {
  box-shadow: 0 0 20px rgba(white, 0.5);
}
</style>
