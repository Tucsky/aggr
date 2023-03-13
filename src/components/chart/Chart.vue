<template>
  <div class="pane-chart">
    <pane-header
      ref="paneHeader"
      :paneId="paneId"
      :settings="() => import('@/components/chart/ChartDialog.vue')"
    >
      <template v-slot:menu>
        <button type="button" class="dropdown-item" @click="toggleLayout">
          <i class="icon-resize-height"></i>
          <span>Arrange</span>
        </button>
        <button type="button" class="dropdown-item" @click="resetChart">
          <i class="icon-refresh"></i>
          <span>Restart</span>
        </button>
        <button type="button" class="dropdown-item" @click="takeScreenshot">
          <i class="icon-add-photo"></i>
          <span>Snapshot</span>
        </button>
      </template>
      <button
        v-for="(timeframeLabel, timeframe) of favoriteTimeframes"
        :key="timeframe"
        @click="changeTimeframe(timeframe)"
        title="Maintain shift key to change timeframe on all panes"
        class="toolbar__label timeframe"
      >
        <span>{{ timeframeLabel }}</span>
      </button>
      <button @click="toggleTimeframeDropdown" class="-arrow toolbar__label">
        {{ timeframeForHuman }}
      </button>

      <dropdown v-model="timeframeDropdownTrigger">
        <timeframe-dropdown
          class="timeframe-dropdown"
          :pane-id="paneId"
          @timeframe="changeTimeframe($event)"
        />
      </dropdown>
    </pane-header>
    <div
      class="chart-overlay hide-scrollbar"
      :style="{ left: overlayLeft + 'px' }"
    >
      <indicators-overlay
        v-model="showIndicatorsOverlay"
        :pane-id="paneId"
        @input="$event ? bindLegend() : unbindLegend()"
      />
      <markets-overlay :pane-id="paneId" />
    </div>

    <div class="chart__container" ref="chartContainer">
      <chart-layout
        v-if="layouting"
        :pane-id="paneId"
        :layouting="layouting"
        :axis="axis"
      ></chart-layout>
    </div>
    <dropdown v-model="contextMenuDropdownTrigger">
      <button @click="toggleTimeframeDropdown" class="dropdown-item -arrow">
        {{ timeframeForHuman }}
      </button>
      <button @click="takeScreenshot" class="dropdown-item">
        <i class="icon-add-photo"></i>
        <span>Snapshot</span>
      </button>
      <button @click="resetChart" class="dropdown-item">
        <i class="icon-refresh"></i>
        <span>Restart</span>
      </button>
      <div class="dropdown-divider" data-label="alerts"></div>
      <button
        @click="
          createAlertAtPrice(
            contextMenuDropdownTrigger.price,
            contextMenuDropdownTrigger.timestamp
          )
        "
        class="dropdown-item"
      >
        <i class="icon-plus"></i>
        <span v-if="contextMenuDropdownTrigger">{{
          contextMenuDropdownTrigger.price
        }}</span>
      </button>
      <button
        v-if="showAlerts"
        type="button"
        class="dropdown-item"
        @click.stop="toggleAlertsDropdown"
      >
        <i class="icon-edit"></i>
        <span>Alerts</span>
      </button>
    </dropdown>
    <dropdown
      v-if="contextMenuDropdownTrigger"
      v-model="alertsDropdownTrigger"
      @click.stop
    >
      <alerts-list :query="contextMenuDropdownTrigger.market" />
    </dropdown>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'

import ChartController, { TimeRange } from './chart'

import {
  formatBytes,
  openBase64InNewTab,
  getTimeframeForHuman,
  floorTimestampToTimeframe,
  getEventCords
} from '@/utils/helpers'
import {
  formatPrice,
  formatAmount,
  formatMarketPrice
} from '@/services/productsService'
import {
  defaultChartOptions,
  getChartBorderOptions,
  getChartCustomColorsOptions,
  getChartGridlinesOptions
} from '../../services/chartService'
import { ChartPaneState } from '@/store/panesSettings/chart'
import { joinRgba, splitColorCode } from '@/utils/colors'
import { Chunk } from './cache'
import { isTouchSupported, getEventOffset } from '@/utils/touchevent'
import { AlertUpdate, MarketAlert, Trade } from '@/types/types'

import aggregatorService from '@/services/aggregatorService'
import historicalService, {
  HistoricalResponse
} from '@/services/historicalService'
import dialogService from '@/services/dialogService'
import workspacesService from '@/services/workspacesService'
import alertService from '@/services/alertService'

import PaneMixin from '@/mixins/paneMixin'
import PaneHeader from '@/components/panes/PaneHeader.vue'
import ChartLayout from '@/components/chart/Layout.vue'
import TimeframeDropdown from '@/components/chart/TimeframeDropdown.vue'
import IndicatorsOverlay from '@/components/chart/IndicatorsOverlay.vue'
import MarketsOverlay from '@/components/chart/MarketsOverlay.vue'
import AlertsList from '@/components/alerts/AlertsList.vue'

@Component({
  name: 'Chart',
  components: {
    ChartLayout,
    PaneHeader,
    TimeframeDropdown,
    IndicatorsOverlay,
    MarketsOverlay,
    AlertsList
  }
})
export default class extends Mixins(PaneMixin) {
  axis = {
    top: 0,
    left: 0,
    right: 0,
    time: 0
  }

  showIndicatorsOverlay = false
  timeframeDropdownTrigger = null
  alertsDropdownTrigger = null
  contextMenuDropdownTrigger = null

  private _timeToRecycle: number
  private _recycleTimeout: number
  private _onPanTimeout: number
  private _chartController: ChartController
  private _legendElements: { [id: string]: HTMLElement }
  private _lastCrosshairCoordinates: number
  private _reachedEnd: boolean
  private _loading: boolean
  private _levelDragMoveHandler: any
  private _levelDragEndHandler: any

  get layouting() {
    this.getAxisSize()
    return (this.$store.state[this.paneId] as ChartPaneState).layouting
  }

  get overlayLeft() {
    return this.axis.left
  }

  get overlayTop() {
    return this.axis.top
  }

  get showLegend() {
    return (this.$store.state[this.paneId] as ChartPaneState).showLegend
  }

  get showAlerts() {
    return this.$store.state.settings.alerts
  }

  get favoriteTimeframes() {
    return this.$store.state.settings.favoriteTimeframes
  }

  get timeframe() {
    return this.$store.state[this.paneId].timeframe
  }

  get timeframeForHuman() {
    if (!this.timeframe) {
      return 'ERR'
    }

    return getTimeframeForHuman(this.timeframe)
  }

  $refs!: {
    chartContainer: HTMLElement
    paneHeader: PaneHeader
  }

  created() {
    this._chartController = new ChartController(this.paneId)

    this._legendElements = {}

    this._onStoreMutation = this.$store.subscribe(mutation => {
      switch (mutation.type) {
        case this.paneId + '/FLAG_INDICATOR_AS_SAVED':
          this.saveIndicatorPreview(mutation.payload)
          break
        case 'settings/SET_CHART_THEME':
        case 'settings/SET_TEXT_COLOR':
          this._chartController.chartInstance.applyOptions(
            getChartCustomColorsOptions(this.paneId)
          )
          break
        case 'settings/TOGGLE_NORMAMIZE_WATERMARKS':
          this._chartController.refreshMarkets()
          break
        case 'settings/SET_TIMEZONE_OFFSET':
          this._chartController.setTimezoneOffset(
            this.$store.state.settings.timezoneOffset
          )
          this._chartController.clearChart()
          this._chartController.renderAll()
          break
        case 'panes/SET_PANE_MARKETS':
          if (mutation.payload.id === this.paneId) {
            ;(this.$store.state[this.paneId] as ChartPaneState).hiddenMarkets =
              {}
            this._chartController.refreshMarkets()

            this.clear()
            this.fetch()
          }
          break
        case 'panes/SET_PANE_ZOOM':
          if (mutation.payload.id === this.paneId) {
            this._chartController.updateFontSize()
            this.$nextTick(() => this.getAxisSize())
          }
          break
        case this.paneId + '/SET_TIMEFRAME':
          this.onTimeframeChange(mutation.payload)
          break
        case 'settings/TOGGLE_ALERTS':
        case 'settings/SET_ALERTS_COLOR':
        case 'settings/SET_ALERTS_LINESTYLE':
        case 'settings/SET_ALERTS_LINEWIDTH':
        case 'app/EXCHANGE_UPDATED':
        case this.paneId + '/TOGGLE_MARKET':
          this._chartController.refreshMarkets()
          this._chartController.renderAll()
          break
        case this.paneId + '/SET_REFRESH_RATE':
          this._chartController.clearQueue()
          this._chartController.setupQueue()
          break
        case this.paneId + '/TOGGLE_LEGEND':
          if (this.showLegend) {
            this.bindLegend()
          } else {
            this.unbindLegend()
          }
          break
        case this.paneId + '/SET_GRIDLINES':
          this._chartController.chartInstance.applyOptions(
            getChartGridlinesOptions(this.paneId)
          )
          break
        case this.paneId + '/SET_BORDER':
        case this.paneId + '/TOGGLE_AXIS':
          this._chartController.chartInstance.applyOptions(
            getChartBorderOptions(this.paneId)
          )
          this.$nextTick(() => this.getAxisSize())
          break
        case this.paneId + '/SET_WATERMARK':
        case this.paneId + '/TOGGLE_NORMAMIZE_WATERMARKS':
          this._chartController.updateWatermark()
          break
        case this.paneId + '/SET_INDICATOR_OPTION':
          this._chartController.setIndicatorOption(
            mutation.payload.id,
            mutation.payload.key,
            mutation.payload.value,
            mutation.payload.silent
          )
          break
        case this.paneId + '/SET_PRICE_SCALE':
          if (mutation.payload.priceScale) {
            this._chartController.refreshPriceScale(mutation.payload.id)
          }
          break
        case this.paneId + '/SET_INDICATOR_SCRIPT':
          this._chartController.rebuildIndicator(mutation.payload.id)
          break
        case this.paneId + '/ADD_INDICATOR':
          if (this._chartController.addIndicator(mutation.payload.id)) {
            this._chartController.redrawIndicator(mutation.payload.id)
            this.bindLegend(mutation.payload.id)
          }

          break
        case this.paneId + '/REMOVE_INDICATOR':
          this.unbindLegend(mutation.payload)
          this._chartController.removeIndicator(mutation.payload)
          break
        case this.paneId + '/TOGGLE_FILL_GAPS_WITH_EMPTY':
          this._chartController.toggleFillGapsWithEmpty()
          break
        case 'settings/TOGGLE_AUTO_HIDE_HEADERS':
          this.refreshChartDimensions()
          break
      }
    })
  }

  mounted() {
    this.showIndicatorsOverlay = this.$parent.$el.clientHeight > 420

    this.createChart()
  }

  async createChart() {
    await this.$nextTick()

    this._chartController.createChart(this.$refs.chartContainer)

    await this.$nextTick()

    this.bindChartEvents()
    this.setupRecycle()

    setTimeout(() => {
      this.getAxisSize()
      this.fetch()
      this._chartController.setupQueue()
    })
  }

  getChartCanvas() {
    return this._chartController.chartElement.querySelector(
      'tr:first-child td:nth-child(2) canvas:nth-child(2)'
    )
  }

  destroyChart() {
    this.unbindChartEvents()

    this._chartController.destroy()

    clearTimeout(this._recycleTimeout)
  }

  beforeDestroy() {
    this.destroyChart()
  }

  /**
   * fetch whatever is missing based on visiblerange
   * @param {TimeRange} range range to fetch
   */
  fetch(range?: TimeRange) {
    if (!range) {
      this._reachedEnd = false
    }
    const alreadyHasData =
      this._chartController.chartCache.cacheRange &&
      this._chartController.chartCache.cacheRange.from

    const historicalMarkets = historicalService.filterOutUnavailableMarkets(
      this.$store.state.panes.panes[this.paneId].markets
    )

    if (!historicalMarkets.length) {
      return
    }

    const timeframe = +(this.$store.state[this.paneId] as ChartPaneState)
      .timeframe

    if (!timeframe) {
      this._reachedEnd = true
      return
    }

    if (
      this.$store.state.app.apiSupportedTimeframes.indexOf(
        this.timeframe.toString()
      ) === -1
    ) {
      return
    }

    const visibleRange = this._chartController.getVisibleRange() as TimeRange

    let rangeToFetch

    if (!range) {
      let rightTime

      if (alreadyHasData) {
        rightTime = this._chartController.chartCache.cacheRange.from
      } else if (visibleRange && visibleRange.from) {
        rightTime =
          visibleRange.from + this.$store.state.settings.timezoneOffset / 1000
      } else {
        rightTime = Date.now() / 1000
      }

      rangeToFetch = {
        from: rightTime - timeframe * 20,
        to: rightTime
      }
    } else {
      rangeToFetch = range
    }

    rangeToFetch.from = floorTimestampToTimeframe(
      Math.round(rangeToFetch.from),
      timeframe
    )
    rangeToFetch.to =
      floorTimestampToTimeframe(Math.round(rangeToFetch.to), timeframe) +
      timeframe

    if (this._chartController.chartCache.cacheRange.from) {
      rangeToFetch.to = Math.min(
        floorTimestampToTimeframe(
          this._chartController.chartCache.cacheRange.from,
          timeframe
        ),
        rangeToFetch.to
      )
    }

    const barsCount = Math.floor(
      (rangeToFetch.to - rangeToFetch.from) / timeframe
    )
    const bytesPerBar = 112
    const estimatedSize = formatBytes(
      barsCount * historicalMarkets.length * bytesPerBar
    )

    this.$store.dispatch('app/showNotice', {
      id: 'fetching-' + this.paneId,
      timeout: 15000,
      title: `Fetching ${
        barsCount * historicalMarkets.length
      } bars (~${estimatedSize})`,
      type: 'info'
    })

    this._loading = true

    return historicalService
      .fetch(
        rangeToFetch.from * 1000,
        rangeToFetch.to * 1000,
        timeframe,
        historicalMarkets
      )
      .then(results => this.onHistorical(results))
      .catch(err => {
        /*if (err.message === 'unknown timeframe') {
          this.$store.commit(this.paneId + '/SET_TIMEFRAME', 60)
          return
        }*/

        console.error(err)

        this._reachedEnd = true
      })
      .then(() => {
        this.$store.dispatch('app/hideNotice', 'fetching-' + this.paneId)

        setTimeout(() => {
          this._loading = false

          this.fetchMore(
            this._chartController.chartInstance
              .timeScale()
              .getVisibleLogicalRange()
          )
        }, 200)
      })
  }

  /**
   * TV chart mousemove event
   * @param{TV.MouseEventParams} param tv mousemove param
   */
  onCrosshair(param) {
    let x

    if (
      param &&
      param.time &&
      param.point.x > 0 &&
      param.point.x < this.$refs.chartContainer.clientWidth
    ) {
      x = param.point.x
    }

    if (this._lastCrosshairCoordinates === x) {
      return
    }

    this._lastCrosshairCoordinates = x

    for (let i = 0; i < this._chartController.loadedIndicators.length; i++) {
      const indicator = this._chartController.loadedIndicators[i]

      if (!indicator.apis.length) {
        continue
      }

      const id = this.paneId + indicator.id

      if (!this._legendElements[id]) {
        continue
      }

      if (!x) {
        continue
      }

      let text = ''

      for (let j = 0; j < indicator.apis.length; j++) {
        if (j > 10) {
          break
        }

        const api = indicator.apis[j]

        const data = param.seriesPrices.get(api)

        if (text.length) {
          text += '\u00a0|\u00a0'
        }

        if (!data) {
          text += 'na'
          continue
        }

        const formatFunction =
          indicator.options.priceFormat &&
          indicator.options.priceFormat.type === 'volume'
            ? formatAmount
            : formatPrice

        if (typeof data === 'number') {
          text += formatFunction(data, api.precision)
        } else if (data.close) {
          text += `O: ${formatFunction(
            data.open,
            api.precision
          )} H: ${formatFunction(data.high, api.precision)} L: ${formatFunction(
            data.low,
            api.precision
          )} C: ${formatFunction(data.close, api.precision)}`
        }
      }

      this._legendElements[id].textContent = text
    }
  }

  /**
   * Handle the historical service response
   * Split bars into chunks and add to chartCache
   * Render chart once everything is done
   */
  onHistorical(results: HistoricalResponse) {
    const chunk: Chunk = {
      from: results.from,
      to: results.to,
      bars: results.data
    }

    this._chartController.chartCache.saveChunk(chunk)

    this._chartController.renderAll(true)
  }

  onTrades(trades: Trade[]) {
    this._chartController.queueTrades(trades)
  }

  onAlert(alertUpdate: AlertUpdate) {
    this._chartController.triggerAlert(alertUpdate)
  }

  refreshChartDimensions() {
    if (!this._chartController || !this._chartController.chartInstance) {
      return
    }

    this.$nextTick(() => {
      let headerHeight = 0

      if (!this.$store.state.settings.autoHideHeaders) {
        headerHeight =
          (this.$store.state.panes.panes[this.paneId].zoom || 1) * 2 * 16
      }

      this._chartController.chartInstance.resize(
        this.$el.clientWidth,
        this.$el.clientHeight - headerHeight
      )
    })
  }

  onPan(visibleLogicalRange) {
    if (
      !visibleLogicalRange ||
      this._chartController.panPrevented ||
      this._loading ||
      /t$/.test(this.timeframe)
    ) {
      return
    }

    if (this._onPanTimeout) {
      clearTimeout(this._onPanTimeout)
      this._onPanTimeout = null
    }

    this._onPanTimeout = setTimeout(() => {
      this._onPanTimeout = null

      if (this._chartController.chartCache.cacheRange.from === null) {
        return
      }

      // get latest visible logical range
      visibleLogicalRange = this._chartController.chartInstance
        .timeScale()
        .getVisibleLogicalRange()

      this.savePosition(visibleLogicalRange)

      this.fetchMore(visibleLogicalRange)
    }, 500)
  }

  bindChartEvents() {
    aggregatorService.on('trades', this.onTrades)
    aggregatorService.on('alert', this.onAlert)

    if (this.showLegend && this.showIndicatorsOverlay) {
      this.bindLegend()
    }

    this._chartController.chartInstance
      .timeScale()
      .subscribeVisibleLogicalRangeChange(this.onPan)

    if (process.env.VUE_APP_PUBLIC_VAPID_KEY) {
      const canvas = this.getChartCanvas()
      canvas.addEventListener(
        isTouchSupported() ? 'touchstart' : 'mousedown',
        this.onLevelDragStart
      )
      canvas.addEventListener('contextmenu', this.onContextMenu)
    }
  }

  unbindChartEvents() {
    aggregatorService.off('trades', this.onTrades)
    aggregatorService.off('alert', this.onAlert)

    this.unbindLegend()

    this._chartController.chartInstance
      .timeScale()
      .unsubscribeVisibleLogicalRangeChange(this.onPan)

    if (process.env.VUE_APP_PUBLIC_VAPID_KEY) {
      const canvas = this.getChartCanvas()
      canvas.removeEventListener(
        isTouchSupported() ? 'touchstart' : 'mousedown',
        this.onLevelDragStart
      )
      canvas.removeEventListener('contextmenu', this.onContextMenu)
    }
  }

  onContextMenu(event) {
    if (window.innerWidth < 375) {
      return
    }

    event.preventDefault()
    const { x, y } = getEventCords(event)
    const { left, top } = this.$el.getBoundingClientRect()
    const api = this._chartController.getPriceApi()
    const market = this._chartController.getMainIndex()
    const price = +formatMarketPrice(api.coordinateToPrice(y), market)
    const timestamp = this._chartController.chartInstance
      .timeScale()
      .coordinateToTime(x)
    this.contextMenuDropdownTrigger = {
      top: top + y - 1,
      left: left + x - 1,
      width: 2,
      height: 2,
      market,
      price,
      timestamp
    }
  }

  async clearAlerts() {
    const alerts = await alertService.getPaneMarkets(this.paneId)

    const indexes = []

    for (const alert of alerts) {
      if (indexes.indexOf(alert.market) === -1) {
        indexes.push(alert.market)
      }

      await alertService.removeAlert(alert)
    }

    for (const index of indexes) {
      await workspacesService.saveAlerts({
        market: index,
        alerts: []
      })
    }
  }

  onLevelDragStart(event) {
    if (
      this._levelDragEndHandler ||
      !this.$store.state.settings.alerts ||
      event.button ||
      dialogService.hasDialogOpened
    ) {
      return
    }

    const dataAtPoint = this._chartController.getPricelineAtPoint(event)

    if (!dataAtPoint || !dataAtPoint.api) {
      return
    }

    const canvas = this.getChartCanvas()

    if ((dataAtPoint as any).priceline) {
      this._chartController.disableCrosshair()
    }

    this._levelDragMoveHandler = this.onLevelDragMove.bind(
      this,
      dataAtPoint,
      Date.now()
    )
    canvas.addEventListener(
      /touch/.test(event.type) ? 'touchmove' : 'mousemove',
      this._levelDragMoveHandler
    )

    this._levelDragEndHandler = this.onLevelDragEnd.bind(
      this,
      dataAtPoint,
      Date.now()
    )
    canvas.addEventListener(
      /touch/.test(event.type) ? 'touchend' : 'mouseup',
      this._levelDragEndHandler
    )
  }

  onLevelDragMove(
    { api, priceline, originalOffset, offset },
    startedAt,
    event
  ) {
    const { x, y } = getEventOffset(event)

    const canMove =
      Math.abs(originalOffset.y - y) > 5 || Date.now() - startedAt > 100

    offset.x = x
    offset.y = y

    if (priceline) {
      event.stopPropagation()

      if (!canMove) {
        return
      }

      const price = +formatPrice(
        api.coordinateToPrice(y) as number,
        api.options().priceFormat.precision
      )

      priceline.applyOptions({
        price
      })
    }
  }

  async onLevelDragEnd(
    {
      api,
      priceline,
      price,
      currentPrice,
      market,
      canCreate,
      originalOffset,
      offset
    },
    startedAt,
    event
  ) {
    const canvas = this.getChartCanvas()

    const canMove =
      Math.abs(originalOffset.y - offset.y) > 5 || Date.now() - startedAt > 200
    canCreate = !priceline && canCreate && !canMove

    if (priceline || canCreate) {
      this._chartController.chartInstance.clearCrosshairPosition()
    }

    // unbind up
    canvas.removeEventListener(
      /touch/.test(event.type) ? 'touchend' : 'mouseup',
      this._levelDragEndHandler
    )
    this._levelDragEndHandler = null

    if (this._levelDragMoveHandler) {
      // unbind move
      canvas.removeEventListener(
        /touch/.test(event.type) ? 'touchmove' : 'mousemove',
        this._levelDragMoveHandler
      )
      this._levelDragMoveHandler = null
    }

    if (this._onPanTimeout) {
      return
    }

    if (priceline) {
      this._chartController.enableCrosshair()
      const alert = this._chartController.alerts[market].find(
        a => a.price === price
      )
      const newPrice = priceline.options().price

      if (price !== newPrice && canMove) {
        await alertService.moveAlert(
          alert,
          newPrice,
          currentPrice,
          this._chartController.alerts[market]
        )
        api.removePriceLine(priceline)
      } else {
        await alertService.removeAlert(
          {
            price,
            market
          },
          this._chartController.alerts[market]
        )
      }
    } else if (canCreate) {
      let timestamp

      if (!(event.ctrlKey || event.metaKey)) {
        timestamp = this._chartController.chartInstance
          .timeScale()
          .coordinateToTime(offset.x)
      }

      const alert: MarketAlert = {
        price,
        market,
        timestamp,
        active: false
      }

      alertService.createAlert(
        alert,
        this._chartController.alerts[market],
        currentPrice
      )
    }
  }

  async createAlertAtPrice(price, timestamp) {
    if (!this.showAlerts) {
      if (
        !(await dialogService.confirm({
          title: 'Alerts are disabled',
          message: 'Enable alerts ?',
          ok: 'Yes please'
        }))
      ) {
        return
      }

      this.$store.commit('settings/TOGGLE_ALERTS', true)
    }

    const market = this._chartController.getMainIndex()

    const message = await dialogService.prompt({
      action: `Create alert @${formatMarketPrice(price, market)}`,
      question: 'Label',
      submitLabel: 'Create',
      placeholder: 'Custom message (optional)'
    })

    if (typeof message !== 'string') {
      return
    }

    const alert: MarketAlert = {
      price,
      market,
      timestamp,
      message: message.length ? message : null,
      active: false
    }
    alertService.createAlert(alert, this._chartController.alerts[market], price)
  }

  getBarSpacing(visibleLogicalRange) {
    if (!visibleLogicalRange) {
      return defaultChartOptions.timeScale.barSpacing
    }

    const canvasWidth = this.getChartCanvas().clientWidth
    const barSpacing =
      canvasWidth / (visibleLogicalRange.to - visibleLogicalRange.from)

    return barSpacing
  }

  savePosition(visibleLogicalRange) {
    this.$store.commit(
      this.paneId + '/SET_BAR_SPACING',
      this.getBarSpacing(visibleLogicalRange)
    )
  }

  setupRecycle() {
    this._recycleTimeout = setTimeout(this.trimChart.bind(this), 1000 * 60 * 3)
    this.setTimeToRecycle()
  }

  trimChart() {
    if (Date.now() > this._timeToRecycle) {
      const visibleRange = this._chartController.getVisibleRange() as TimeRange

      let end

      if (visibleRange) {
        end = visibleRange.from - (visibleRange.to - visibleRange.from) * 2
      }

      if (this._chartController.chartCache.trim(end)) {
        this.renderChart()
      }

      this.setTimeToRecycle()
    }

    const fastRefreshRate =
      (this.$store.state[this.paneId] as ChartPaneState).refreshRate < 1000

    if (fastRefreshRate) {
      this.fixFastRefreshRate()
    }

    this._recycleTimeout = setTimeout(
      this.trimChart,
      1000 * 60 * (fastRefreshRate ? 3 : 15)
    )
  }

  fixFastRefreshRate() {
    const fontSize =
      this._chartController.chartInstance.options().layout.fontSize

    this._chartController.preventPan()
    this._chartController.chartInstance.applyOptions({
      layout: { fontSize: fontSize + 1 }
    })

    setTimeout(() => {
      this._chartController.chartInstance.applyOptions({
        layout: { fontSize: fontSize }
      })
    }, 50)
  }

  renderChart() {
    this._chartController.renderAll()
  }

  resetChart() {
    this.destroyChart()
    this.$nextTick(() => {
      this.createChart()
    })
  }

  async fetchMore(visibleLogicalRange) {
    if (
      this._loading ||
      this._reachedEnd ||
      !visibleLogicalRange ||
      visibleLogicalRange.from > 0
    ) {
      return
    }

    let indicatorLength = 0

    if (this._chartController.activeRenderer) {
      for (const indicatorId in this._chartController.activeRenderer
        .indicators) {
        if (
          !this._chartController.activeRenderer.indicators[indicatorId]
            .minLength
        ) {
          continue
        }
        indicatorLength = Math.max(
          indicatorLength,
          this._chartController.activeRenderer.indicators[indicatorId].minLength
        )
      }
    }

    const barsToLoad =
      Math.round(
        Math.min(Math.abs(visibleLogicalRange.from) + indicatorLength, 500)
      ) + 1

    if (!barsToLoad) {
      return
    }

    const rangeToFetch = {
      from:
        this._chartController.chartCache.cacheRange.from -
        barsToLoad * this.$store.state[this.paneId].timeframe,
      to: this._chartController.chartCache.cacheRange.from - 1
    }

    await this.fetch(rangeToFetch)
  }

  onResize() {
    this.refreshChartDimensions()
    this._chartController.updateFontSize()
  }

  clear() {
    this._chartController.clear()

    this._reachedEnd = false
  }

  changeTimeframe(newTimeframe) {
    if ((window.event as any).shiftKey) {
      for (const id in this.$store.state.panes.panes) {
        const type = this.$store.state.panes.panes[id].type
        if (
          type === 'chart' &&
          this.$store.state[id].timeframe !== newTimeframe
        ) {
          this.$store.commit(id + '/SET_TIMEFRAME', newTimeframe)
        }
      }
    } else {
      this.$store.commit(this.paneId + '/SET_TIMEFRAME', newTimeframe)
    }
  }

  onTimeframeChange(newTimeframe) {
    const timeframe = parseInt(newTimeframe)
    const type = newTimeframe[newTimeframe.length - 1] === 't' ? 'tick' : 'time'

    if (
      this._chartController.renderedRange.from &&
      type === this._chartController.type &&
      type === 'time' &&
      this.$store.state.app.apiSupportedTimeframes.indexOf(newTimeframe) ===
        -1 &&
      this._chartController.timeframe < timeframe &&
      Number.isInteger(timeframe / this._chartController.timeframe)
    ) {
      this._chartController.resample(newTimeframe)
      this.fetchMore(
        this._chartController.chartInstance.timeScale().getVisibleLogicalRange()
      )
    } else {
      this._chartController.clear()
      this.fetch()
    }

    this._reachedEnd = false
  }

  async bindLegend(indicatorId?: string) {
    if (!this.showLegend) {
      return
    }

    if (!indicatorId) {
      for (const id in (this.$store.state[this.paneId] as ChartPaneState)
        .indicators) {
        this.bindLegend(id)
      }

      this._chartController.chartInstance.subscribeCrosshairMove(
        this.onCrosshair
      )
      return
    }

    await this.$nextTick()

    const legendId = this.paneId + indicatorId

    if (this._legendElements[legendId]) {
      return
    }

    const el = document.getElementById(legendId)

    if (el) {
      this._legendElements[legendId] = el
    }
  }

  unbindLegend(indicatorId?: string) {
    if (!indicatorId) {
      for (const id in (this.$store.state[this.paneId] as ChartPaneState)
        .indicators) {
        this.unbindLegend(id)
      }

      this._chartController.chartInstance.unsubscribeCrosshairMove(
        this.onCrosshair
      )
      return
    }

    const legendId = this.paneId + indicatorId

    for (const bindedLegendId in this._legendElements) {
      if (legendId === bindedLegendId) {
        this._legendElements[bindedLegendId].innerText = ''
        delete this._legendElements[bindedLegendId]
        return
      }
    }
  }

  async getAxisSize() {
    if (!this.$refs.chartContainer) {
      return
    }

    await new Promise(resolve => setTimeout(resolve, 10))

    const chartOptions = this.$store.state[this.paneId] as ChartPaneState

    const axis = {
      top: 0,
      left: 0,
      right: 0,
      time: 0
    }

    if (chartOptions.showLeftScale) {
      axis.left = this.$refs.chartContainer.querySelector(
        'tr:first-child td:first-child canvas'
      ).clientWidth
    }

    if (chartOptions.showRightScale) {
      axis.right = this.$refs.chartContainer.querySelector(
        'tr:first-child td:last-child canvas'
      ).clientWidth
    }

    if (chartOptions.showTimeScale) {
      axis.time = this.$refs.chartContainer.querySelector(
        'tr:last-child td:nth-child(2) canvas'
      ).clientHeight
    }

    this.axis = axis
  }

  takeScreenshot(event) {
    const chartCanvas = this._chartController.chartInstance.takeScreenshot()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    const zoom = this.$store.state.panes.panes[this.paneId].zoom || 1

    const pxRatio = window.devicePixelRatio || 1
    const textPadding = 16 * zoom * pxRatio
    const textFontsize = 12 * zoom * pxRatio
    canvas.width = chartCanvas.width
    ctx.font = `${textFontsize}px Share Tech Mono`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'

    const lines = []
    const [date, time] = new Date().toISOString().split('T')

    lines.push(date + ' ' + time.split('.')[0])
    lines.push(this._chartController.watermark + ' | ' + this.timeframeForHuman)

    const lineHeight = Math.round(textFontsize)
    canvas.height = chartCanvas.height

    const styles = getComputedStyle(document.documentElement)
    const themeColor = styles.getPropertyValue('--theme-base')
    const textColor = styles.getPropertyValue('--theme-color-base')
    const backgroundColor = this.$store.state.settings.backgroundColor

    if (!event.shiftKey) {
      ctx.fillStyle = themeColor
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = backgroundColor
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }

    ctx.fillStyle =
      this.$store.state.settings.theme === 'light'
        ? 'rgba(255,255,255,.2)'
        : 'rgba(0,0,0,.2)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(chartCanvas, 0, 0)

    ctx.fillStyle = textColor
    ctx.font = `${textFontsize}px Share Tech Mono`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'

    let offsetY = 0

    for (let i = 0; i < lines.length; i++) {
      ctx.strokeStyle = themeColor
      ctx.lineWidth = 4 * pxRatio
      ctx.lineJoin = 'round'
      ctx.strokeText(lines[i], textPadding, textPadding + offsetY)
      ctx.fillText(lines[i], textPadding, textPadding + offsetY)

      offsetY += lineHeight * 1.2 * (i + 1)
    }

    if (this.showIndicatorsOverlay) {
      offsetY += textPadding * 2

      Object.values(
        (this.$store.state[this.paneId] as ChartPaneState).indicators
      ).forEach(indicator => {
        const options = indicator.options as any

        if (options.visible === false) {
          return
        }

        let color = options.color || options.upColor || textColor

        try {
          color = splitColorCode(color)

          if (typeof color[3] !== 'undefined') {
            color[3] = 1
          }

          color = joinRgba(color)
        } catch (error) {
          // not rgb(a)
        }

        const text = indicator.displayName || indicator.name

        ctx.fillStyle = textColor
        ctx.strokeStyle = themeColor
        ctx.lineWidth = 4 * pxRatio
        ctx.fillStyle = color
        ctx.lineJoin = 'round'
        ctx.strokeText(text, textPadding, offsetY)
        ctx.fillText(text, textPadding, offsetY)

        offsetY += lineHeight * 1.2
      })
    }

    const dataURL = canvas.toDataURL('image/png')
    const startIndex = dataURL.indexOf('base64,') + 7
    const b64 = dataURL.substr(startIndex)

    openBase64InNewTab(b64, 'image/png')
  }

  toggleIndicatorOverlay() {
    if (this.showIndicatorsOverlay) {
      this.unbindLegend()
    }

    this.showIndicatorsOverlay = !this.showIndicatorsOverlay

    if (this.showIndicatorsOverlay) {
      this.$nextTick(() => {
        this.bindLegend()
      })
    }
  }

  toggleLayout() {
    this.$store.commit(this.paneId + '/TOGGLE_LAYOUTING')
  }

  setTimeToRecycle() {
    const now = Date.now()

    if (this._chartController.type === 'time') {
      const chartWidth = this.$el.clientWidth - this.axis.left - this.axis.right
      const barSpacing = this.getBarSpacing(
        this._chartController.chartInstance.timeScale().getVisibleLogicalRange()
      )
      this._timeToRecycle =
        now +
        Math.min(
          1000 * 60 * 60 * 24,
          (parseInt(this.timeframe) * 1000 * (chartWidth / barSpacing)) / 2
        )
    }

    this._timeToRecycle = now + 900000
  }

  toggleTimeframeDropdown(event) {
    if (this.timeframeDropdownTrigger) {
      this.timeframeDropdownTrigger = null
    } else {
      this.timeframeDropdownTrigger = event.currentTarget
    }
  }

  toggleAlertsDropdown(event) {
    if (this.alertsDropdownTrigger) {
      this.alertsDropdownTrigger = null
    } else {
      this.alertsDropdownTrigger = event.currentTarget
    }
  }

  async saveIndicatorPreview(indicatorId) {
    const blob = await this._chartController.screenshotIndicator(indicatorId)
    workspacesService.saveIndicatorPreview(indicatorId, blob)
  }
}
</script>

<style lang="scss" scoped>
.pane-chart {
  font-family: $font-condensed;

  &:hover .chart-overlay {
    display: flex;
  }

  &.-loading {
    cursor: wait;
  }
}

.chart__container {
  position: relative;
  width: 100%;
  flex-grow: 1;

  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -khtml-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}

.timeframe {
  opacity: 0.5;

  &:hover {
    opacity: 1;
  }

  &__title {
    flex-grow: 1;
    letter-spacing: 1px;
    text-transform: uppercase;
    opacity: 0.5;
    font-size: 0.875em;
    align-self: flex-end;
    margin-top: 1rem;

    ~ * {
      margin-top: 3rem;
    }
  }

  &__favorite {
    &:hover {
      background-color: var(--theme-color-o20);
    }

    &.icon-star-filled {
      background-color: $red;
      color: white;
      font-weight: 600;
    }
  }
}

body.-unselectable .chart-overlay {
  display: none !important;
}
</style>
