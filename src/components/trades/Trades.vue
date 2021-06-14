<template>
  <div
    class="pane-trades"
    :class="{ [scale]: true, '-logos': this.showLogos, '-logos-colors': !this.monochromeLogos, '-slippage': this.calculateSlippage }"
  >
    <pane-header :paneId="paneId" />
    <ul ref="tradesContainer" class="custom-scrollbar"></ul>
    <div v-if="!tradesCount" class="trades-placeholder">
      <div class="mt16 ml16 mr16">
        <strong>Waiting for trades</strong>

        <p class="help-text">
          No trade are matching the following markets
        </p>
        <code v-for="market of pane.markets" :key="market">{{ market.replace(/^\w+:/, '') }}<br /></code>
        <p class="help-text">with amount > {{ thresholds[0].amount }}</p>
        <p class="help-text" v-if="liquidationsOnly">liquidation only</p>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'

import { ago, formatPrice, formatAmount, slugify } from '../../utils/helpers'
import { getColorByWeight, getColorLuminance, getAppBackgroundColor, splitRgba, getLogShade } from '../../utils/colors'

import aggregatorService from '@/services/aggregatorService'
import audioService, { AudioFunction } from '../../services/audioService'
import PaneMixin from '@/mixins/paneMixin'
import PaneHeader from '../panes/PaneHeader.vue'
import { Trade } from '@/types/test'
import workspacesService from '@/services/workspacesService'
import { Threshold } from '@/store/panesSettings/trades'

const GIFS: { [keyword: string]: string[] } = {} // shared cache for gifs
const PROMISES_OF_GIFS: { [keyword: string]: Promise<string[]> } = {}

interface ThresholdColorsBySide {
  threshold?: number
  range?: number
  buy: {
    from: number[]
    to: number[]
    fromLuminance: number
    toLuminance: number
  }
  sell: {
    from: number[]
    to: number[]
    fromLuminance: number
    toLuminance: number
  }
}

interface ThresholdAudiosBySide {
  buy: AudioFunction
  sell: AudioFunction
}

@Component({
  components: { PaneHeader },
  name: 'Trades'
})
export default class extends Mixins(PaneMixin) {
  tradesCount = 0
  scale = '-normal'

  private _onStoreMutation: () => void

  private _thresholdsColors: ThresholdColorsBySide[]
  private _thresholdsAudios: ThresholdAudiosBySide[]
  private _liquidationsAudio: ThresholdAudiosBySide
  private _liquidationsColor: ThresholdColorsBySide

  private _lastTradeTimestamp: number
  private _lastSide: 'buy' | 'sell'
  private _audioThreshold: number
  private _minimumThresholdAmount: number
  private _significantThresholdAmount: number
  private _activeExchanges: { [exchange: string]: boolean }
  private _multipliers: { [identifier: string]: number }
  private _paneMarkets: { [identifier: string]: boolean }
  private _timeAgoInterval: number
  private _enableAnimationsTimeout: number

  get maxRows() {
    return this.$store.state[this.paneId].maxRows
  }

  get thresholds(): Threshold[] {
    return this.$store.state[this.paneId].thresholds
  }

  get liquidationThreshold() {
    return this.$store.state[this.paneId].liquidations
  }

  get liquidationsOnly() {
    return this.$store.state[this.paneId].liquidationsOnly
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

  get multipliers() {
    return this.$store.state[this.paneId].multipliers
  }

  get exchanges() {
    return this.$store.state.exchanges
  }

  get useAudio() {
    return this.$store.state.settings.useAudio
  }

  get calculateSlippage() {
    return this.$store.state.settings.calculateSlippage
  }

  get preferQuoteCurrencySize() {
    return this.$store.state.settings.preferQuoteCurrencySize
  }

  get decimalPrecision() {
    return this.$store.state.settings.decimalPrecision
  }

  get activeExchanges() {
    return this.$store.state.app.activeExchanges
  }

  get disableAnimations() {
    return this.$store.state.settings.disableAnimations
  }

  get audioThreshold() {
    return this.$store.state[this.paneId].audioThreshold
  }

  $refs!: {
    tradesContainer: HTMLElement
  }

  created() {
    this.cacheFilters()

    this.retrieveStoredGifs()
    this.prepareColorsSteps()
    this.prepareThresholdsSounds()
    this.prepareAudioThreshold()

    aggregatorService.on('trades', this.onTrades)

    this._onStoreMutation = this.$store.subscribe(mutation => {
      switch (mutation.type) {
        case 'app/EXCHANGE_UPDATED':
        case this.paneId + '/SET_THRESHOLD_MULTIPLIER':
          this.cacheFilters()
          break
        case 'panes/SET_PANE_MARKETS':
          if (mutation.payload.id === this.paneId) {
            this.cacheFilters()
            this.refreshList()
          }
          break
        case this.paneId + '/SET_THRESHOLD_GIF':
          this.fetchGifByKeyword(mutation.payload.value, mutation.payload.isDeleted)
          this.refreshList()
          break
        case this.paneId + '/SET_THRESHOLD_AUDIO':
        case 'settings/TOGGLE_AUDIO':
          this.prepareThresholdsSounds()
          this.prepareAudioThreshold()
          break
        case 'settings/SET_CHART_BACKGROUND_COLOR':
        case this.paneId + '/SET_THRESHOLD_COLOR':
        case this.paneId + '/SET_THRESHOLD_AMOUNT':
        case this.paneId + '/DELETE_THRESHOLD':
        case this.paneId + '/ADD_THRESHOLD':
          this.prepareColorsSteps()
          this.refreshList()
          this.prepareAudioThreshold()
          break
        case this.paneId + '/SET_AUDIO_THRESHOLD':
          this.prepareAudioThreshold()
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
    this._timeAgoInterval = setInterval(() => {
      const elements = this.$el.getElementsByClassName('-timestamp')

      if (!elements.length) {
        return
      }

      let ref

      for (let i = elements.length - 1; i >= 0; i--) {
        const txt = ago(elements[i].getAttribute('timestamp'))

        if (typeof ref !== 'undefined' && ref === txt) {
          elements[i].textContent = ''
          elements[i].className = 'trade__time'
          i--
          continue
        }

        if (txt !== elements[i].textContent) {
          elements[i].textContent = txt
        }

        ref = txt
      }
    }, 2500)
  }

  onTrades(trades: Trade[]) {
    for (let i = 0; i < trades.length; i++) {
      const identifier = trades[i].exchange + trades[i].pair

      if (!this._activeExchanges[trades[i].exchange] || !this._paneMarkets[identifier]) {
        continue
      }

      const trade = trades[i]
      const amount = trade.size * (this.preferQuoteCurrencySize ? trade.price : 1)
      const multiplier = this._multipliers[identifier]

      if (trade.liquidation) {
        if (amount >= this._minimumThresholdAmount * multiplier) {
          this.appendRow(trade, amount, multiplier)
        }
        continue
      } else if (this.liquidationsOnly) {
        continue
      }

      if (amount >= this._minimumThresholdAmount * multiplier) {
        this.appendRow(trade, amount, multiplier)
      } else if (amount > this._audioThreshold) {
        this._thresholdsAudios[0][trade.side](audioService._play, amount / (this._significantThresholdAmount * multiplier), trade.side, 0)
      }
    }
  }

  appendRow(trade: Trade, amount, multiplier) {
    if (!this.tradesCount) {
      this.$forceUpdate()
    }

    this.tradesCount++

    const li = document.createElement('li')
    li.className = 'trade'
    li.className += ' -' + trade.exchange

    li.className += ' -' + trade.side

    if (trade.exchange.length > 10) {
      li.className += ' -sm'
    }

    if (trade.liquidation && !this.liquidationsOnly) {
      li.className += ' -liquidation'

      const side = document.createElement('div')
      side.className = 'trade__side ' + (trade.side === 'buy' ? 'icon-bear' : 'icon-bull')

      li.appendChild(side)

      if (
        this.liquidationThreshold.gif &&
        !this.disableAnimations &&
        GIFS[this.liquidationThreshold.gif] &&
        amount >= this.liquidationThreshold.amount * multiplier
      ) {
        // get random gif for this this.liquidationThreshold
        li.style.backgroundImage = `url('${
          GIFS[this.liquidationThreshold.gif][Math.floor(Math.random() * (GIFS[this.liquidationThreshold.gif].length - 1))]
        }`
      }

      const intensity = Math.min(1, amount / this.liquidationThreshold.amount)

      const luminance = this._liquidationsColor[trade.side][(intensity < 0.5 ? 'from' : 'to') + 'Luminance']
      const backgroundColor = this._liquidationsColor[trade.side].to
      const thrs = Math.max(intensity, 0.25)
      li.style.color = getLogShade(backgroundColor, thrs * (luminance < 170 ? 2 : -3))
      li.style.backgroundColor = 'rgb(' + backgroundColor[0] + ', ' + backgroundColor[1] + ', ' + backgroundColor[2] + ', ' + intensity + ')'

      if (amount > this._audioThreshold) {
        this._liquidationsAudio[trade.side](audioService._play, amount / (this._significantThresholdAmount * multiplier), trade.side, 0)
      }
    } else {
      if (trade.liquidation) {
        li.className += ' -liquidation'

        const side = document.createElement('div')
        side.className = 'trade__side ' + (trade.side === 'buy' ? 'icon-bear' : 'icon-bull')
        li.appendChild(side)
      } else {
        if (trade.side !== this._lastSide) {
          const side = document.createElement('div')
          side.className = 'trade__side icon-side'
          li.appendChild(side)
          this._lastSide = trade.side
        }
      }

      for (let i = 0; i < this.thresholds.length; i++) {
        li.className += ' -level-' + i

        if (!this.thresholds[i + 1] || amount < this.thresholds[i + 1].amount * multiplier) {
          const color = this._thresholdsColors[Math.min(this.thresholds.length - 2, i)]
          const threshold = this.thresholds[i]

          if (!this.disableAnimations && threshold.gif && GIFS[threshold.gif]) {
            // get random gif for this threshold
            li.style.backgroundImage = `url('${GIFS[threshold.gif][Math.floor(Math.random() * (GIFS[threshold.gif].length - 1))]}`
          }

          // percentage to next threshold
          const percentToNextThreshold = (Math.max(amount, color.threshold) - color.threshold) / color.range

          // 0-255 luminance of nearest color
          const luminance = color[trade.side][(percentToNextThreshold < 0.5 ? 'from' : 'to') + 'Luminance']
          // background color simple color to color based on percentage of amount to next threshold
          const backgroundColor = getColorByWeight(color[trade.side].from, color[trade.side].to, percentToNextThreshold)
          li.style.backgroundColor = 'rgb(' + backgroundColor[0] + ', ' + backgroundColor[1] + ', ' + backgroundColor[2] + ')'

          if (i >= 1) {
            // ajusted amount > this._significantThresholdAmount
            // only pure black or pure white foreground
            li.style.color = luminance < 170 ? 'white' : 'black'
          } else {
            // take background color and apply logarithmic shade based on amount to this._significantThresholdAmount percentage
            // darken if luminance of background is high, lighten otherwise
            const thrs = Math.max(percentToNextThreshold, 0.25)
            li.style.color = getLogShade(backgroundColor, thrs * (luminance < 170 ? 2 : -3))
          }

          if (amount > this._audioThreshold) {
            this._thresholdsAudios[i][trade.side](audioService._play, amount / this._significantThresholdAmount, trade.side, i)
          }

          break
        }
      }
    }

    const exchange = document.createElement('div')
    exchange.className = 'trade__exchange'

    if (!this.showLogos) {
      exchange.innerText = trade.exchange.replace('_', ' ')
    }

    exchange.setAttribute('title', trade.exchange)
    li.appendChild(exchange)

    if (this.showTradesPairs) {
      const pair = document.createElement('div')
      pair.className = 'trade__pair'
      pair.innerText = trade.pair.replace('_', ' ')
      pair.setAttribute('title', trade.pair)
      li.appendChild(pair)
    }

    const price = document.createElement('div')
    price.className = 'trade__price'
    price.innerText = `${formatPrice(trade.price)}`
    li.appendChild(price)

    if (this.calculateSlippage === 'price' && Math.abs(trade.slippage) / trade.price > 0.0005) {
      price.setAttribute(
        'slippage',
        (trade.slippage > 0 ? '+' : '') + formatPrice(trade.slippage) + document.getElementById('app').getAttribute('data-quote-symbol')
      )
    } else if (this.calculateSlippage === 'bps' && trade.slippage) {
      price.setAttribute('slippage', (trade.slippage > 0 ? '+' : '-') + formatPrice(trade.slippage))
    }

    const amount_div = document.createElement('div')
    amount_div.className = 'trade__amount'

    const amount_quote = document.createElement('span')
    amount_quote.className = 'trade__amount__quote'
    amount_quote.innerHTML = `<span class="icon-quote"></span> <span>${formatAmount(trade.price * trade.size)}</span>`

    const amount_base = document.createElement('span')
    amount_base.className = 'trade__amount__base'
    amount_base.innerHTML = `<span class="icon-base"></span> <span>${formatAmount(trade.size)}</span>`

    amount_div.appendChild(amount_quote)
    amount_div.appendChild(amount_base)
    li.appendChild(amount_div)

    const date = document.createElement('div')
    date.className = 'trade__time'

    const timestamp = Math.floor(trade.timestamp / 1000) * 1000

    if (timestamp !== this._lastTradeTimestamp) {
      this._lastTradeTimestamp = timestamp

      date.setAttribute('timestamp', trade.timestamp.toString())
      date.innerText = ago(timestamp)

      date.className += ' -timestamp'
    }

    li.appendChild(date)

    this.$refs.tradesContainer.prepend(li)

    while (this.tradesCount > this.maxRows) {
      this.tradesCount--
      this.$refs.tradesContainer.removeChild(this.$refs.tradesContainer.lastChild)
    }
  }

  async retrieveStoredGifs(refresh = false) {
    for (const threshold of this.thresholds) {
      if (!threshold.gif || GIFS[threshold.gif]) {
        continue
      }

      const slug = slugify(threshold.gif)

      const storage = await workspacesService.getGifs(slug)

      if (!refresh && storage && +new Date() - storage.timestamp < 1000 * 60 * 60 * 24 * 7) {
        GIFS[threshold.gif] = storage.data
      } else if (!PROMISES_OF_GIFS[threshold.gif]) {
        this.fetchGifByKeyword(threshold.gif)
      }
    }
  }

  async fetchGifByKeyword(keyword: string, isDeleted = false) {
    if (!keyword || !GIFS) {
      return
    }

    const slug = slugify(keyword)

    if (isDeleted) {
      if (GIFS[keyword]) {
        delete GIFS[keyword]
      }

      await workspacesService.deleteGifs(slug)

      return
    }

    const promise = fetch('https://g.tenor.com/v1/search?q=' + keyword + '&key=LIVDSRZULELA&limit=100&key=DF3B0979C761')
      .then(res => res.json())
      .then(async res => {
        if (!res.results || !res.results.length) {
          return
        }

        GIFS[keyword] = []

        for (const item of res.results) {
          GIFS[keyword].push(item.media[0].gif.url)
        }

        await workspacesService.saveGifs({
          slug,
          keyword,
          timestamp: +new Date(),
          data: GIFS[keyword]
        })

        return GIFS[keyword]
      })
      .finally(() => {
        delete PROMISES_OF_GIFS[keyword]
      })

    PROMISES_OF_GIFS[keyword] = promise

    return promise
  }

  prepareColorsSteps() {
    const appBackgroundColor = getAppBackgroundColor()

    const liquidationBuy = splitRgba(this.liquidationThreshold.buyColor, appBackgroundColor)
    const liquidationBuyFrom = [liquidationBuy[0], liquidationBuy[1], liquidationBuy[2], 0]
    const liquidationBuyTo = [liquidationBuy[0], liquidationBuy[1], liquidationBuy[2], 1]
    const liquidationSell = splitRgba(this.liquidationThreshold.sellColor, appBackgroundColor)
    const liquidationSellFrom = [liquidationSell[0], liquidationSell[1], liquidationSell[2], 0]
    const liquidationSellTo = [liquidationSell[0], liquidationSell[1], liquidationSell[2], 1]

    this._liquidationsColor = {
      buy: {
        from: liquidationBuyFrom,
        to: liquidationBuyTo,
        fromLuminance: getColorLuminance(liquidationBuyFrom),
        toLuminance: getColorLuminance(liquidationBuyTo)
      },
      sell: {
        from: liquidationSellFrom,
        to: liquidationSellTo,
        fromLuminance: getColorLuminance(liquidationSellFrom),
        toLuminance: getColorLuminance(liquidationSellTo)
      }
    }

    this._thresholdsColors = []
    this._minimumThresholdAmount = this.thresholds[0].amount
    this._significantThresholdAmount = this.thresholds[1].amount

    for (let i = 0; i < this.thresholds.length - 1; i++) {
      const buyFrom = splitRgba(this.thresholds[i].buyColor, appBackgroundColor)
      const buyTo = splitRgba(this.thresholds[i + 1].buyColor, appBackgroundColor)
      const sellFrom = splitRgba(this.thresholds[i].sellColor, appBackgroundColor)
      const sellTo = splitRgba(this.thresholds[i + 1].sellColor, appBackgroundColor)

      this._thresholdsColors.push({
        threshold: this.thresholds[i].amount,
        range: this.thresholds[i + 1].amount - this.thresholds[i].amount,
        buy: {
          from: buyFrom,
          to: buyTo,
          fromLuminance: getColorLuminance(buyFrom),
          toLuminance: getColorLuminance(buyTo)
        },
        sell: {
          from: sellFrom,
          to: sellTo,
          fromLuminance: getColorLuminance(sellFrom),
          toLuminance: getColorLuminance(sellTo)
        }
      })
    }
  }

  prepareThresholdsSounds() {
    this._thresholdsAudios = this.thresholds.map(threshold => ({
      buy: audioService.buildAudioFunction(threshold.buyAudio, 'buy'),
      sell: audioService.buildAudioFunction(threshold.sellAudio, 'sell')
    }))

    this._liquidationsAudio = {
      buy: audioService.buildAudioFunction(this.liquidationThreshold.buyAudio, 'buy'),
      sell: audioService.buildAudioFunction(this.liquidationThreshold.sellAudio, 'sell')
    }
  }

  prepareAudioThreshold() {
    if (!this.useAudio) {
      this._audioThreshold = Infinity
      return
    }

    this._audioThreshold = +this.audioThreshold ? this.audioThreshold : this._minimumThresholdAmount * 0.1
  }

  cacheFilters() {
    this._activeExchanges = { ...this.activeExchanges }
    this._multipliers = {}
    this._paneMarkets = this.$store.state.panes.panes[this.paneId].markets.reduce((output, market) => {
      const identifier = market.replace(':', '')
      const multiplier = this.multipliers[identifier]

      this._multipliers[identifier] = !isNaN(multiplier) ? multiplier : 1

      output[identifier] = true
      return output
    }, {})
  }

  clearList() {
    this.$refs.tradesContainer.innerHTML = ''
    this.tradesCount = 0
  }

  refreshList() {
    if (!this.tradesCount) {
      return this.clearList()
    }

    this.$el.classList.add('-no-animations')
    if (this._enableAnimationsTimeout) {
      clearTimeout(this._enableAnimationsTimeout)
    }
    this._enableAnimationsTimeout = setTimeout(() => {
      if (!this.$store.state.settings.disableAnimations) {
        this.$el.classList.remove('-no-animations')
      }

      this._enableAnimationsTimeout = null
    }, 1000)
    const elements = this.$el.getElementsByClassName('trade')

    const pairByExchanges = this.$store.state.app.activeMarkets.reduce((obj, market) => {
      if (!obj[market.exchange]) {
        obj[market.exchange] = market.pair
      }

      return obj
    }, {})

    const trades: Trade[] = []

    for (const element of elements) {
      const exchange = element.querySelector('.trade__exchange').getAttribute('title')

      const pair = pairByExchanges[exchange]

      if (!pair) {
        console.warn('unable to map pair for exchange', exchange, pairByExchanges)
        continue
      }

      const timestamp = +element.querySelector('.trade__time').getAttribute('timestamp')
      const price = parseFloat((element.querySelector('.trade__price') as HTMLElement).innerText) || 0
      const size = parseFloat((element.querySelector('.trade__amount__base') as HTMLElement).innerText) || 0
      const side: 'buy' | 'sell' = element.classList.contains('-buy') ? 'buy' : 'sell'

      const trade: Trade = {
        timestamp,
        exchange,
        pair,
        price,
        size,
        side
      }

      if (element.classList.contains('-liquidation')) {
        trade.liquidation = true
      }

      trades.push(trade)
    }

    trades.reverse()

    this.clearList()

    const audioThresholdValue = this._audioThreshold
    this._audioThreshold = Infinity

    for (const trade of trades) {
      const identifier = trade.exchange + trade.pair
      const amount = trade.size * (this.preferQuoteCurrencySize ? trade.price : 1)
      const multiplier = this._multipliers[identifier] || 1

      this.appendRow(trade, amount, multiplier)
    }

    this._audioThreshold = audioThresholdValue
  }
}
</script>

<style lang="scss">
@mixin tradesVariant($base: 20) {
  font-size: $base * 0.7px;

  .trade {
    height: round($base * 1px);

    &.-level-1 {
      height: round($base * 1.1px);
    }

    &.-level-2 {
      height: round($base * 1.33px);
    }

    &.-level-3 {
      font-size: round($base * 0.8px);
      height: round($base * 1.5px);
    }
  }
}

.pane-trades {
  line-height: 1;

  ul {
    margin: 0;
    padding: 0;
    overflow: auto;
    max-height: 100%;
  }

  &.-normal ul {
    @include tradesVariant(22);
  }

  &.-small ul {
    @include tradesVariant(18);
    font-weight: 600;

    .-large {
      display: none;
    }
  }

  &.-large ul {
    @include tradesVariant(24);
  }

  &.-slippage {
    .trade__price {
      flex-grow: 1.5;
    }
  }

  &.-logos {
    .trade__exchange {
      flex-basis: 0;
      flex-grow: 0.3;
      text-align: center;
      overflow: visible;

      &:before {
        font-family: 'icon';
        display: inline-block;
        vertical-align: -2px;
        font-weight: 400;
      }
    }

    @each $exchange, $icon in $exchanges {
      .-#{$exchange} .trade__exchange:before {
        content: $icon;
      }
    }

    &.-logos-colors {
      .trade__exchange {
        height: 1em;
        background-position: center;

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

  &:not(.-logos) .trade.-sm {
    .trade__exchange {
      font-size: 0.75em;
      letter-spacing: -0.5px;
      margin-top: -0.2em;
      margin-bottom: -0.5em;
      white-space: normal;
      word-break: break-word;
      line-height: 0.9;
    }
  }
}

.trades-placeholder {
  text-align: center;
  text-align: center;
  overflow: hidden;
  max-height: 100%;

  @media (-webkit-min-device-pixel-ratio: 2) {
    font-size: 75%;
  }
}

.trade {
  display: flex;
  flex-flow: row nowrap;
  background-position: center center;
  background-size: cover;
  background-blend-mode: overlay;
  position: relative;
  align-items: center;
  height: 1.8em;
  padding: 0 0.5em 2px;

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
    .trade__side {
      font-weight: 400;

      &:after {
        margin-left: 1rem;
      }
    }

    /* &.-buy .trade__side:after {
      content: 'SHORT';
    }

    &.-sell .trade__side:after {
      content: 'LONG';
    } */
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

  &.-level-1 {
    color: white;
  }

  &.-level-3 {
    box-shadow: 0 0 20px rgba(black, 0.5);
    z-index: 1;
  }

  > div {
    flex-basis: 0;
    flex-grow: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 1.4;
  }

  .trade__side {
    flex-grow: 0;
    flex-basis: 1em;
    font-size: 1em;
    position: absolute;
    font-weight: 600;
  }

  .icon-currency,
  .icon-quote,
  .icon-base {
    line-height: 0;
  }

  .trade__exchange {
    background-repeat: no-repeat;
    flex-grow: 0.8;
    margin-left: 1.5em;
    font-size: 80%;
    white-space: normal;
    line-height: 1;
    word-break: inherit;
  }

  .trade__price:after {
    content: attr(slippage);
    font-size: 80%;
    position: relative;
    top: -2px;
    left: 2px;
    opacity: 0.75;
    font-weight: 400;
  }

  .trade__amount {
    position: relative;
    font-weight: 600;

    > span {
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      transition: transform 0.1s ease-in-out;
      display: block;
      padding: 0 1px;

      &.trade__amount__quote {
        position: absolute;
      }

      &.trade__amount__base {
        transform: translateX(25%);
        opacity: 0;
      }
    }

    &:hover {
      > span.trade__amount__base {
        transform: none;
        opacity: 1;
      }

      > span.trade__amount__quote {
        transform: translateX(-25%);
        opacity: 0;
      }
    }
  }

  .trade__time {
    text-align: right;
    flex-basis: 1.75em;
    flex-grow: 0;
    font-size: 75%;
    font-weight: 400;
    text-overflow: inherit;
  }
}

#app[data-prefered-sizing-currency='base'] .trade .trade__amount {
  .trade__amount__quote {
    transform: translateX(-25%);
    opacity: 0;
  }

  .trade__amount__base {
    transform: none;
    opacity: 1;
  }

  &:hover {
    > span.trade__amount__base {
      transform: translateX(25%);
      opacity: 0;
    }

    > span.trade__amount__quote {
      transform: none;
      opacity: 1;
    }
  }
}

#app.-light .trade.-level-3 {
  box-shadow: 0 0 20px rgba(white, 0.5);
}
</style>
