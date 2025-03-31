import audioService, { AudioFunction } from '@/services/audioService'
import gifsService from '@/services/gifsService'
import { formatAmount, formatMarketPrice } from '@/services/productsService'
import store from '@/store'
import { SlippageMode, Trade } from '@/types/types'
import {
  getAppBackgroundColor,
  getColorByWeight,
  getColorLuminance,
  splitColorCode
} from '@/utils/colors'

interface PreparedColorStep {
  from?: number
  to?: number
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
export default class TradesFeed {
  paneId: string
  containerElement: HTMLElement

  private count: number
  private maxCount: number
  private maxLevel: number

  private showGifs: boolean
  private showTrades: boolean
  private showLiquidations: boolean
  private showLogos: boolean
  private showPairs: boolean
  private showPrices: boolean
  private showAvgPrice: boolean
  private showTimeAgo: boolean
  private slippageMode: SlippageMode
  private paneMarkets: { [identifier: string]: boolean }

  private tradesAudios: PreparedAudioStep[]
  private tradesColors: PreparedColorStep[]
  private minimumTradeAmount: number
  private significantTradeAmount: number
  private maximumTradeAmount: number

  private liquidationsAudios: PreparedAudioStep[]
  private liquidationsColors: PreparedColorStep[]
  private minimumLiquidationAmount: number
  private significantLiquidationAmount: number
  private maximumLiquidationAmount: number

  private audioThreshold: number

  private lastSide: 'buy' | 'sell' | 'lbuy' | 'lsell'
  private lastTimestamp: number
  private timeUpdateInterval: number
  private marketsMultipliers: { [identifier: string]: number }

  constructor(paneId: string, containerElement: HTMLElement, maxCount: number) {
    this.paneId = paneId
    this.containerElement = containerElement
    this.count = 0
    this.maxCount = maxCount

    this.cachePreferences()
    this.cachePaneMarkets()
    this.loadGifs()
    this.prepareColors()
    this.cacheAudio()
  }

  processTrades(trades: Trade[]) {
    let html = ''

    for (let i = 0; i < trades.length; i++) {
      const marketKey = trades[i].exchange + ':' + trades[i].pair

      if (!this.paneMarkets[marketKey]) {
        continue
      }

      const trade = trades[i]

      if (typeof this.marketsMultipliers[marketKey] !== 'undefined') {
        trade.amount /= this.marketsMultipliers[marketKey]
      }

      if (!trade.liquidation && this.showTrades) {
        if (
          trade.amount >= this.minimumTradeAmount &&
          trade.amount < this.maximumTradeAmount
        ) {
          html += this.showTrade(
            trade,
            marketKey,
            this.tradesColors,
            this.tradesAudios,
            this.significantTradeAmount
          )
        } else if (
          trade.amount > this.audioThreshold &&
          trade.amount < this.maximumTradeAmount
        ) {
          this.tradesAudios[0][trade.side](
            audioService,
            trade.amount / this.significantTradeAmount
          )
        }
      } else if (trade.liquidation && this.showLiquidations) {
        if (
          trade.amount >= this.minimumLiquidationAmount &&
          trade.amount < this.maximumLiquidationAmount
        ) {
          html += this.showTrade(
            trade,
            marketKey,
            this.liquidationsColors,
            this.liquidationsAudios,
            this.significantLiquidationAmount
          )
        } else if (
          trade.amount > this.audioThreshold &&
          trade.amount < this.maximumLiquidationAmount
        ) {
          this.liquidationsAudios[0][trade.side](
            audioService,
            trade.amount / this.significantLiquidationAmount
          )
        }
      }
    }

    if (html.length) {
      this.containerElement.insertAdjacentHTML('afterbegin', html)
      this.trim()
      return true
    } else {
      return false
    }
  }

  processTradesSilent(trades: Trade[]) {
    // cache audio & gifs preferences
    const audioThresholdValue = this.audioThreshold
    const showGifsValue = this.showGifs

    // disable audio & gifs
    this.audioThreshold = Infinity
    this.showGifs = false

    this.processTrades(trades)

    // rollack to original values
    this.audioThreshold = audioThresholdValue
    this.showGifs = showGifsValue
  }

  getTradeInlineStyles(
    trade: Trade,
    colorStep: PreparedColorStep,
    significantAmount: number
  ) {
    const percentToNextThreshold =
      (Math.max(trade.amount, colorStep.from) - colorStep.from) /
      colorStep.range
    const percentToSignificant = Math.min(1, trade.amount / significantAmount)

    const colorBySide = colorStep[trade.side]

    let backgroundGif = ''

    if (this.showGifs && colorStep[trade.side].gif) {
      const keyword = colorStep[trade.side].gif

      if (gifsService.cache[keyword]) {
        backgroundGif = `background-image:url('${
          gifsService.cache[keyword][
            Math.floor(Math.random() * (gifsService.cache[keyword].length - 1))
          ]
        }')`
      }
    }

    // -1 to 1 luminance of nearest color
    const luminance =
      colorBySide[(percentToNextThreshold < 0.5 ? 'from' : 'to') + 'Luminance']

    // background color simple color to color based on percentage of amount to next threshold
    const backgroundColor = getColorByWeight(
      colorBySide.from,
      colorBySide.to,
      percentToNextThreshold
    )

    // take background color and apply logarithmic shade based on amount to this.significantThresholdAmount percentage
    // darken if luminance of background is high, lighten otherwise
    let foregroundColor

    if (luminance > (backgroundGif ? 0.15 : 0.33)) {
      foregroundColor =
        'rgba(0, 0, 0, ' + Math.min(1, 0.33 + percentToSignificant) + ')'
    } else {
      foregroundColor =
        'rgba(255, 255, 255, ' + Math.min(1, 0.33 + percentToSignificant) + ')'
    }

    return `background-color:rgb(${backgroundColor[0]}, ${backgroundColor[1]}, ${backgroundColor[2]});color:${foregroundColor};${backgroundGif}`
  }

  showTrade(
    trade: Trade,
    marketKey: string,
    colors: PreparedColorStep[],
    audios: PreparedAudioStep[],
    significantAmount: number
  ) {
    let level = this.maxLevel
    let colorStep: PreparedColorStep = colors[level]

    for (level = 0; level < colors.length; level++) {
      if (trade.amount < colors[level].to) {
        colorStep = colors[level]
        break
      }
    }

    if (level < colors.length && trade.amount > this.audioThreshold) {
      audios[level][trade.side](audioService, trade.amount / significantAmount)
    }

    this.count++

    return this.renderRow(trade, marketKey, colorStep, significantAmount)
  }

  renderRow(
    trade: Trade,
    marketKey: string,
    colorStep: PreparedColorStep,
    significantAmount: number
  ) {
    let timestampClass = ''
    let timestampText = ''

    if (trade.timestamp !== this.lastTimestamp) {
      timestampClass = ' -timestamp'

      this.lastTimestamp = trade.timestamp

      if (!this.showTimeAgo) {
        const date = new Date(+trade.timestamp)
        const minutes = date.getMinutes()

        timestampText = `${date.getHours()}:${
          minutes < 10 ? '0' : ''
        }${minutes}`

        timestampClass += ' -fixed'
      }
    }

    let priceSlippage = ''

    if (this.slippageMode && trade.slippage) {
      priceSlippage = `<small>${trade.slippage > 0 ? '+' : ''}${
        trade.slippage
      }${this.slippageMode === 'bps' ? ' bps' : ''}</small>`
    }

    let exchangeName = ''

    if (!this.showLogos) {
      exchangeName = trade.exchange.replace('_', ' ')
    }

    let sideClass = ''

    const sideType: any = trade.side
    if (trade.liquidation || sideType !== this.lastSide) {
      sideClass = ' icon-side'
      this.lastSide = sideType
    }

    let pairName = ''

    if (this.showPairs) {
      pairName = `<div class="trade__pair">${trade.pair.replace(
        '_',
        ' '
      )}</div>`
    }

    return `<li class="trade -${trade.exchange} -${trade.side} -level-${
      colorStep.level
    }${trade.liquidation ? ' -liquidation' : ''}" title="${trade.exchange}:${
      trade.pair
    }" style="${this.getTradeInlineStyles(
      trade,
      colorStep,
      significantAmount
    )}">
    <div class="trade__side${sideClass}"></div>
    <div class="trade__exchange">${exchangeName}</div>
    ${pairName}
    ${
      this.showPrices
        ? `<div class="trade__price">${priceSlippage}<span>${formatMarketPrice(
            this.showAvgPrice ? trade.avgPrice : trade.price,
            marketKey
          )}</span></div>`
        : ''
    }
    <div class="trade__amount">
    <span class="trade__amount__quote">
        ${' '}
        <span class="icon-quote"></span>
        <span>${formatAmount(trade.size * trade.avgPrice)}</span>
        ${' '}
      </span>
      <span class="trade__amount__base">
        <span class="icon-base"></span>
        <span>${Math.round(trade.size * 1e6) / 1e6}</span>
      </span>
    </div>
    <div class="trade__time ${timestampClass}" data-timestamp="${trade.timestamp.toString()}">${timestampText}</div>
    </li>`
  }

  getTradesThesholds() {
    return store.state[this.paneId].thresholds
  }

  getLiquidationsThresholds() {
    return store.state[this.paneId].liquidations
  }

  async loadGifs() {
    this.loadThresholdsGifs(this.getTradesThesholds())
    this.loadThresholdsGifs(this.getLiquidationsThresholds())
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
    const tradesThresholds = this.getTradesThesholds()
    const liquidationsThresholds = this.getLiquidationsThresholds()

    const appBackgroundColor = getAppBackgroundColor()
    this.tradesColors = this.prepareColorsThresholds(
      tradesThresholds,
      appBackgroundColor
    )
    this.liquidationsColors = this.prepareColorsThresholds(
      liquidationsThresholds,
      appBackgroundColor
    )

    this.maxLevel = tradesThresholds.length - 1

    this.minimumTradeAmount = tradesThresholds[0].amount
    this.significantTradeAmount = tradesThresholds[1].amount
    if (tradesThresholds[tradesThresholds.length - 1].max) {
      this.maximumTradeAmount =
        tradesThresholds[tradesThresholds.length - 1].amount
    } else {
      this.maximumTradeAmount = Infinity
    }

    this.minimumLiquidationAmount = liquidationsThresholds[0].amount
    this.significantLiquidationAmount = liquidationsThresholds[1].amount
    if (liquidationsThresholds[liquidationsThresholds.length - 1].max) {
      this.maximumLiquidationAmount =
        liquidationsThresholds[liquidationsThresholds.length - 1].amount
    } else {
      this.maximumLiquidationAmount = Infinity
    }
  }

  prepareColorsThresholds(thresholds, appBackgroundColor) {
    const steps = []

    const len = thresholds.length

    for (let i = 0; i < len; i++) {
      if (i === len - 1) {
        steps.push({ ...steps[steps.length - 1], max: Infinity })
        break
      }

      const buyFrom = splitColorCode(thresholds[i].buyColor, appBackgroundColor)
      const buyTo = splitColorCode(
        thresholds[i + 1].buyColor,
        appBackgroundColor
      )
      const sellFrom = splitColorCode(
        thresholds[i].sellColor,
        appBackgroundColor
      )
      const sellTo = splitColorCode(
        thresholds[i + 1].sellColor,
        appBackgroundColor
      )

      steps.push({
        from: thresholds[i].amount,
        to: thresholds[i + 1].amount,
        range: thresholds[i + 1].amount - thresholds[i].amount,
        level: Math.floor((i / (len - 1)) * 4),
        max: i === len - 1 && thresholds[i + 1].max,
        buy: {
          from: buyFrom,
          to: buyTo,
          fromLuminance: getColorLuminance(buyFrom, appBackgroundColor),
          toLuminance: getColorLuminance(buyTo, appBackgroundColor),
          gif: thresholds[i].buyGif
        },
        sell: {
          from: sellFrom,
          to: sellTo,
          fromLuminance: getColorLuminance(sellFrom, appBackgroundColor),
          toLuminance: getColorLuminance(sellTo, appBackgroundColor),
          gif: thresholds[i].sellGif
        }
      })
    }

    return steps
  }

  async cacheAudio(prepareThresholds = true) {
    const audioThreshold = store.state[this.paneId].audioThreshold

    if (
      !store.state.settings.useAudio ||
      store.state[this.paneId].muted ||
      store.state[this.paneId].audioVolume === 0
    ) {
      this.audioThreshold = Infinity
      return
    }

    if (audioThreshold) {
      if (
        typeof audioThreshold === 'string' &&
        /\d\s*%$/.test(audioThreshold)
      ) {
        this.audioThreshold =
          this.minimumTradeAmount * (parseFloat(audioThreshold) / 100)
      } else {
        this.audioThreshold = +audioThreshold
      }
    } else {
      this.audioThreshold = this.minimumTradeAmount * 0.1
    }

    if (!this.tradesAudios || prepareThresholds) {
      const audioPitch = store.state[this.paneId].audioPitch

      this.tradesAudios = await this.cacheAudioThresholds(
        this.getTradesThesholds(),
        audioPitch
      )
      this.liquidationsAudios = await this.cacheAudioThresholds(
        this.getLiquidationsThresholds(),
        audioPitch
      )
    }
  }

  async cacheAudioThresholds(thresholds, audioPitch) {
    const audios = []

    for (let i = 0; i < thresholds.length; i++) {
      audios.push({
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

    return audios
  }

  cachePreferences() {
    this.slippageMode = store.state.settings.calculateSlippage
    this.showTrades = store.state[this.paneId].showTrades
    this.showLiquidations = store.state[this.paneId].showLiquidations
    this.showGifs = !store.state.settings.disableAnimations
    this.showLogos = store.state[this.paneId].showLogos
    this.showPairs = store.state[this.paneId].showPairs
    this.showPrices = store.state[this.paneId].showPrices
    this.showAvgPrice = store.state[this.paneId].showAvgPrice
    this.showTimeAgo = store.state[this.paneId].showTimeAgo

    if (this.showTimeAgo && !this.timeUpdateInterval) {
      this.setupTimeUpdateInterval()
    } else if (!this.showTimeAgo && this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval)
      this.timeUpdateInterval = null
    }
  }

  cachePaneMarkets() {
    this.marketsMultipliers = {}

    this.paneMarkets = store.state.panes.panes[this.paneId].markets.reduce(
      (output, marketKey) => {
        const [exchange] = marketKey.split(':')

        if (!store.state.app.activeExchanges[exchange]) {
          output[marketKey] = false
          return output
        }

        const multiplier = store.state[this.paneId].multipliers[marketKey]

        if (typeof multiplier !== 'undefined') {
          this.marketsMultipliers[marketKey] = multiplier
        }

        output[marketKey] = true
        return output
      },
      {}
    )
  }

  setupTimeUpdateInterval() {
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

    this.timeUpdateInterval = setInterval(() => {
      const elements =
        this.containerElement.getElementsByClassName('-timestamp')
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

        const milliseconds =
          now - (elements[i] as any).getAttribute('data-timestamp')
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
    }, 1000) as unknown as number
  }

  setMaxCount(maxCount: number) {
    this.maxCount = maxCount
  }

  trim() {
    while (this.count > this.maxCount) {
      this.containerElement.removeChild(this.containerElement.lastChild)
      this.count--
    }
  }

  clear() {
    this.containerElement.innerHTML = ''
    this.count = 0
  }

  destroy() {
    clearInterval(this.timeUpdateInterval)
  }
}
