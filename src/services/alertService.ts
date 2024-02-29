import store from '@/store'
import { getApiUrl, handleFetchError } from '@/utils/helpers'
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
  market: string
  message?: string
  active?: boolean
  timestamp?: number
  triggered?: boolean
}

export interface AlertEvent {
  type: AlertEventType
  price: number
  market: string
  message?: string
  timestamp?: number
  newPrice?: number
}

export enum AlertEventType {
  CREATED,
  ACTIVATED,
  DELETED,
  STATUS,
  DEACTIVATED,
  TRIGGERED,
  UPDATED
}

class AlertService {
  alerts: { [market: string]: MarketAlert[] } = {}

  private publicVapidKey = import.meta.env.VITE_APP_PUBLIC_VAPID_KEY
  private pushSubscription: PushSubscription
  private url: string
  private _promiseOfSync: Promise<void>

  constructor() {
    this.url = getApiUrl('alert')
  }

  formatPrice(price) {
    return +price.toFixed(8)
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

  /**
   * Query database alerts for given markets
   * Wait for sync to complete before query
   * @param market
   * @returns
   */
  async getAlerts(market) {
    if (this.alerts[market]) {
      return this.alerts[market]
    }

    if (this._promiseOfSync) {
      await this._promiseOfSync
    }

    const alerts = await workspacesService.getAlerts(market)

    this.alerts[market] = alerts

    return this.alerts[market]
  }

  async getAlert(market, price) {
    if (!this.alerts[market]) {
      await this.getAlerts(market)
    }

    const alert = this.alerts[market].find(alert => alert.price === price)

    return alert
  }

  /**
   * Update alerts triggered status using pending notifications
   */
  async syncTriggeredAlerts() {
    this._promiseOfSync = new Promise<void>(resolve => {
      // recover recent triggers
      navigator.serviceWorker.ready.then(async registration => {
        const notifications = (await registration.getNotifications()).map(
          notification => ({
            price: notification.data.price,
            direction: notification.data.direction,
            message: notification.data.message,
            market: notification.data.market
          })
        )
        await this.markAlertsAsTriggered(notifications)

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
      if (!this.alerts[market]) {
        this.alerts[market] = await workspacesService.getAlerts(market)
      }

      if (!this.alerts[market].length) {
        continue
      }

      let mutation = false

      for (const price of markets[market]) {
        const alert = this.alerts[market].find(a => a.price === price)

        if (alert && !alert.triggered) {
          alert.triggered = true
          mutation = true
        } else {
          console.error(
            `[alertService] couldn't set alert as triggered (alert not found @${price})`
          )
        }
      }

      if (mutation) {
        await workspacesService.saveAlerts({
          market,
          alerts: this.alerts[market]
        })
      }
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
      const base_url = import.meta.env.VITE_APP_BASE_PATH || '/'
      const register = await navigator.serviceWorker.getRegistration(
        `${base_url}sw.js`
      )

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
        title: `Added ${market} ${this.getNoticeLabel(
          market,
          price,
          data.priceOffset
        )}`,
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
        title: `Removed ${alert.market} ${this.getNoticeLabel(market, price)}`,
        type: 'success'
      })
    }

    return data
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
    referencePrice?: number,
    askMessage?: boolean
  ) {
    if (!this.alerts[createdAlert.market]) {
      await this.getAlerts(createdAlert.market)
    }

    aggregatorService.emit('alert', {
      price: createdAlert.price,
      market: createdAlert.market,
      timestamp: createdAlert.timestamp,
      type: AlertEventType.CREATED
    })

    if (askMessage) {
      createdAlert.message = await dialogService.openAsPromise(
        (await import('@/components/alerts/CreateAlertDialog.vue')).default,
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

    this.alerts[createdAlert.market].push(createdAlert)

    await this.subscribe(
      createdAlert.market,
      createdAlert.price,
      referencePrice,
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
        message: createdAlert.message,
        type: AlertEventType.ACTIVATED
      })
    }

    workspacesService.saveAlerts({
      market: createdAlert.market,
      alerts: this.alerts[createdAlert.market]
    })
  }

  async moveAlert(
    market,
    price,
    newAlert: MarketAlert,
    currentPrice: number
  ): Promise<void> {
    const subscription = await this.getPushSubscription()

    if (subscription) {
      const origin = location.href

      newAlert.triggered = false

      newAlert.active = await fetch(this.url, {
        method: 'POST',
        body: JSON.stringify({
          ...subscription,
          origin,
          market,
          price,
          newPrice: newAlert.price,
          message: newAlert.message,
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

          store.dispatch('app/showNotice', {
            title: `Moved ${market} ${this.getNoticeLabel(
              market,
              price,
              json.priceOffset
            )}`,
            type: 'success'
          })

          return true
        })
        .catch(err => {
          handleFetchError(err)

          return false
        })
    }

    const alert = await this.getAlert(market, price)

    if (alert) {
      this.alerts[market][this.alerts[market].indexOf(alert)] = {
        ...alert,
        ...newAlert
      }
      await workspacesService.saveAlerts({
        market: market,
        alerts: this.alerts[market]
      })
    } else {
      console.error(
        `[alertService] couldn't update alert (alert not found @${price})`,
        this.alerts[market]
      )
    }

    aggregatorService.emit('alert', {
      price,
      market,
      newPrice: newAlert.price,
      type: AlertEventType.UPDATED
    })

    if (newAlert.active) {
      aggregatorService.emit('alert', {
        price: newAlert.price,
        market,
        message: newAlert.message,
        type: AlertEventType.ACTIVATED
      })
    }
  }

  async deactivateAlert({ market, price }: { market: string; price: number }) {
    const alert = await this.getAlert(market, price)

    if (alert) {
      alert.active = false

      await workspacesService.saveAlerts({
        market,
        alerts: this.alerts[market]
      })
    }

    aggregatorService.emit('alert', {
      price,
      market,
      type: AlertEventType.DEACTIVATED
    })
  }

  async removeAlert(removedAlert: MarketAlert) {
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

    if (!this.alerts[removedAlert.market]) {
      await this.getAlerts(removedAlert.market)
    }

    if (this.alerts[removedAlert.market].length) {
      const removedAlertIndex = this.alerts[removedAlert.market].findIndex(
        alert => alert.price === removedAlert.price
      )

      if (removedAlertIndex !== -1) {
        this.alerts[removedAlert.market].splice(removedAlertIndex, 1)

        await workspacesService.saveAlerts({
          market: removedAlert.market,
          alerts: this.alerts[removedAlert.market]
        })
      } else {
        console.error(
          `[alertService] couldn't splice alert (no alerts with price @${removedAlert.price})`,
          this.alerts[removedAlert.market]
        )
      }
    } else {
      console.error(
        `[alertService] couldn't update alert (no alerts data for market ${removedAlert.price})`
      )
    }
  }

  getNoticeLabel(market: string, price: number, offset?: number) {
    const priceLabel = `@${formatMarketPrice(price, market)}`

    let offsetLabel = ''

    if (offset) {
      const percent = Math.abs((1 - (price + offset) / price) * -1 * 100)
      offsetLabel = ` (± ${formatMarketPrice(offset, market)}${
        percent > 0.5 ? ` ⚠️` : ''
      })`
    }

    return priceLabel + offsetLabel
  }
}

export default new AlertService()
