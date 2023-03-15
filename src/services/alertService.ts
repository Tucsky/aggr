import ChartController from '@/components/chart/chart'
import store from '@/store'
import { getApiUrl, handleFetchError, sleep } from '@/utils/helpers'
import aggregatorService from './aggregatorService'
import dialogService from './dialogService'
import { formatMarketPrice } from './productsService'
import workspacesService from './workspacesService'

interface AlertResponse {
  error?: string
  markets?: string[]
  alert?: any
  priceOffset?: number
}

export interface MarketAlerts {
  market: string
  alerts: MarketAlert[]
}

export interface MarketAlert {
  price: number
  market?: string
  message?: string
  active?: boolean
  timestamp?: number
  triggered?: boolean
}

export interface AlertEvent {
  type: AlertEventType
  price: number
  market: string
  timestamp?: number
  newPrice?: number
}

export enum AlertEventType {
  CREATED,
  ACTIVATED,
  DELETED,
  STATUS,
  DEACTIVATED,
  TRIGGERED
}

class AlertService {
  private publicVapidKey = process.env.VUE_APP_PUBLIC_VAPID_KEY
  private pushSubscription: PushSubscription
  private url: string

  private _promiseOfSync: Promise<void>

  constructor() {
    this.url = getApiUrl('alert')
  }

  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  getPaneMarkets(paneId: string) {
    const markets = store.state.panes.panes[paneId].markets
    const indexes = []

    for (const marketKey of markets) {
      const market = store.state.panes.marketsListeners[marketKey]
      if (market && indexes.indexOf(market.local) === -1) {
        indexes.push(market.local)
      }
    }

    return indexes.reduce(async (acc, index) => {
      const alerts = await this.getAlerts(index)
      Array.prototype.push.apply(acc, alerts)
      return acc
    }, [])
  }

  /**
   * Query database alerts for given markets
   * Wait for sync to complete before query
   * @param market
   * @returns
   */
  async getAlerts(market) {
    if (this._promiseOfSync) {
      await this._promiseOfSync
    }

    return workspacesService.getAlerts(market)
  }

  /**
   * Update alerts triggered status using pending notifications
   */
  async syncTriggeredAlerts() {
    this._promiseOfSync = new Promise<void>(resolve => {
      // recover recent triggers
      navigator.serviceWorker.ready.then(async registration => {
        await this.markAlertsAsTriggered(
          (
            await registration.getNotifications()
          ).map(notification => ({
            price: notification.data.price,
            direction: notification.data.direction,
            message: notification.data.message,
            market: notification.data.market
          }))
        )

        resolve()
      })
    }).then(() => {
      // subscribe to triggers
      navigator.serviceWorker.addEventListener('message', event => {
        this.markAlertsAsTriggered([event.data])

        aggregatorService.emit('alert', {
          ...event.data,
          type: AlertEventType.TRIGGERED
        })
      })
    })
  }

  async markAlertsAsTriggered(alerts: { price: number; market: string }[]) {
    const markets = alerts.reduce((acc, { price, market }) => {
      if (!market || typeof price !== 'number') {
        return acc
      }

      if (!acc[market]) {
        acc[market] = []
      }

      acc[market].push(price)

      return acc
    }, {})

    for (const market in markets) {
      const alerts = await workspacesService.getAlerts(market)

      if (!alerts.length) {
        continue
      }

      for (const price of markets[market]) {
        const alert = alerts.find(a => a.price === price)

        if (alert) {
          alert.triggered = true
        }
      }

      await workspacesService.saveAlerts({
        market,
        alerts
      })
    }
  }

  async getPushSubscription() {
    if (!this.publicVapidKey) {
      return
    }

    if (this.pushSubscription) {
      return this.pushSubscription
    }

    if ('serviceWorker' in navigator) {
      const register = await navigator.serviceWorker.getRegistration('sw.js')

      this.pushSubscription = JSON.parse(
        JSON.stringify(
          await register.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: this.urlBase64ToUint8Array(
              this.publicVapidKey
            )
          })
        )
      )
    }

    return this.pushSubscription
  }

  async subscribe(
    market: string,
    price: number,
    currentPrice?: number,
    message?: string
  ) {
    const data = await this.toggleAlert(
      market,
      price,
      currentPrice,
      false,
      false,
      message
    )

    if (!data.error) {
      store.dispatch('app/showNotice', {
        title: `Added ${market} @${price} (± ${formatMarketPrice(
          data.priceOffset,
          market
        )})`,
        type: 'success'
      })
    }

    return data
  }

  async unsubscribe(market: string, price: number) {
    const data = await this.toggleAlert(market, price, null, true)

    if (data.alert) {
      const { alert } = data

      store.dispatch('app/showNotice', {
        title: `Removed ${alert.market} @${alert.price}`,
        type: 'success'
      })
    }

    return data
  }

  getPrice(market): Promise<number> {
    return new Promise(resolve => {
      aggregatorService.once('prices', marketsStats => {
        const stats = marketsStats[market]

        if (!stats) {
          return resolve(null)
        }

        resolve(marketsStats[market].price)
      })
    })
  }

  async validateAlert(market: string, price: number) {
    const marketPrice = await this.getPrice(market)

    if (marketPrice) {
      const percentChangeToAlert = (price / marketPrice - 1) * 100

      if (
        price < 0 ||
        percentChangeToAlert > 100 ||
        percentChangeToAlert < -50
      ) {
        console.error(
          `[alert] price ${price} is too far from market price (${marketPrice})`
        )
        return false
      }
    }

    return true
  }

  async toggleAlert(
    market: string,
    price: number,
    currentPrice?: number,
    unsubscribe?: boolean,
    status?: boolean,
    message?: string
  ): Promise<AlertResponse> {
    const subscription = await this.getPushSubscription()

    if (!subscription) {
      return
    }

    if (!(await this.validateAlert(market, price))) {
      return
    }

    const origin = location.href.replace(/#.*/, '')

    return fetch(this.url, {
      method: 'POST',
      body: JSON.stringify({
        ...subscription,
        origin,
        market,
        price,
        currentPrice,
        unsubscribe,
        message,
        status
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    })
      .then(response => response.json())
      .then(data => {
        if (data.error) {
          throw new Error(data.error)
        }

        return data
      })
      .catch(err => {
        handleFetchError(err)

        return { error: err.message }
      })
  }

  async createAlert(
    createdAlert: MarketAlert,
    marketAlerts: MarketAlert[],
    chartInstance?: ChartController
  ) {
    aggregatorService.emit('alert', {
      price: createdAlert.price,
      market: createdAlert.market,
      timestamp: createdAlert.timestamp,
      type: AlertEventType.CREATED
    })

    if (chartInstance && !store.state.settings.alertsClick) {
      createdAlert.message = await dialogService.openAsPromise(
        (
          await import('@/components/alerts/CreateAlertDialog.vue')
        ).default,
        {
          price: +formatMarketPrice(createdAlert.price, createdAlert.market)
        }
      )

      if (typeof createdAlert.message !== 'string') {
        aggregatorService.emit('alert', {
          price: createdAlert.price,
          market: createdAlert.market,
          type: AlertEventType.DELETED
        })
        return
      }
    }

    let currentPrice

    if (chartInstance) {
      currentPrice = chartInstance.getPrice()
    }

    await this.subscribe(
      createdAlert.market,
      createdAlert.price,
      currentPrice,
      createdAlert.message
    )
      .then(data => {
        createdAlert.active = !data.error
      })
      .catch(err => {
        store.dispatch('app/showNotice', {
          id: 'alert-registration-failure',
          title: `${err.message}\nYou need to make sure your browser is set to allow push notifications.`,
          type: 'error'
        })
      })

    if (createdAlert.active) {
      aggregatorService.emit('alert', {
        price: createdAlert.price,
        market: createdAlert.market,
        timestamp: createdAlert.timestamp,
        type: AlertEventType.ACTIVATED
      })
    }

    await sleep(1)

    workspacesService.saveAlerts({
      market: createdAlert.market,
      alerts: marketAlerts
    })
  }

  async moveAlert(
    movedAlert: MarketAlert,
    newPrice: number,
    currentPrice: number,
    marketAlerts: MarketAlert[]
  ): Promise<boolean> {
    const subscription = await this.getPushSubscription()

    if (!subscription) {
      return
    }

    if (!(await this.validateAlert(movedAlert.market, newPrice))) {
      return
    }

    const origin = location.href

    const active = await fetch(this.url, {
      method: 'POST',
      body: JSON.stringify({
        ...subscription,
        origin,
        market: movedAlert.market,
        price: movedAlert.price,
        newPrice,
        currentPrice
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    })
      .then(response => response.json())
      .then(json => {
        if (json.error) {
          throw new Error(json.error)
        }

        return true
      })
      .catch(err => {
        handleFetchError(err)

        return false
      })

    aggregatorService.emit('alert', {
      price: movedAlert.price,
      market: movedAlert.market,
      newPrice,
      type: 'update'
    })

    movedAlert.triggered = false
    movedAlert.active = active
    movedAlert.price = newPrice

    await workspacesService.saveAlerts({
      market: movedAlert.market,
      alerts: marketAlerts
    })
  }

  async deactivateAlert(alert: MarketAlert, alerts: MarketAlerts) {
    aggregatorService.emit('alert', {
      price: alert.price,
      market: alert.market,
      type: AlertEventType.DEACTIVATED
    })

    alert.active = false

    await workspacesService.saveAlerts(alerts)
  }

  async removeAlert(removedAlert: MarketAlert, marketAlerts?: MarketAlert[]) {
    aggregatorService.emit('alert', {
      price: removedAlert.price,
      market: removedAlert.market,
      type: AlertEventType.DELETED
    })

    if (!removedAlert.triggered) {
      try {
        await this.unsubscribe(removedAlert.market, removedAlert.price)
      } catch (err) {
        if (alert && removedAlert.active) {
          store.dispatch('app/showNotice', {
            id: 'alert-registration-failure',
            title: `${err.message}\nYou need to make sure your browser is set to allow push notifications.`,
            type: 'error'
          })
        }
      }
    }

    if (marketAlerts) {
      await workspacesService.saveAlerts({
        market: removedAlert.market,
        alerts: marketAlerts.filter(alert => alert.price !== removedAlert.price)
      })
    }
  }
}

export default new AlertService()
