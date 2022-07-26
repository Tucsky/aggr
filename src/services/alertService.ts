import { getApiUrl, handleFetchError } from '@/utils/helpers'
import aggregatorService from './aggregatorService'
import workspacesService from './workspacesService'

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
          (await registration.getNotifications()).map(notification => ({
            price: notification.data.price,
            market: notification.data.market
          }))
        )

        resolve()
      })
    }).then(() => {
      // subscribe to triggers
      navigator.serviceWorker.addEventListener('message', event => {
        this.markAlertsAsTriggered([event.data])

        aggregatorService.emit('alert', event.data)
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

  subscribe(market: string, price: number) {
    return this.toggleAlert(market, price)
  }

  unsubscribe(market: string, price: number) {
    return this.toggleAlert(market, price, true)
  }

  modify(market: string, price: number, newPrice: number) {
    return this.moveAlert(market, price, newPrice)
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
    unsubscribe?: boolean
  ): Promise<boolean> {
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
        unsubscribe
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
  }

  async moveAlert(
    market: string,
    price: number,
    newPrice: number
  ): Promise<boolean> {
    const subscription = await this.getPushSubscription()

    if (!subscription) {
      return
    }

    if (!(await this.validateAlert(market, newPrice))) {
      return
    }

    const origin = location.href

    return fetch(this.url, {
      method: 'POST',
      body: JSON.stringify({
        ...subscription,
        origin,
        market,
        price,
        newPrice
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
  }
}

export default new AlertService()
