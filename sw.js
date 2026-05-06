/* eslint-disable */

self.addEventListener('fetch', event => {})

self.addEventListener('push', event => {
  const data = event.data.json()

  const notification = {
    body: data.body,
    data: {
      url: data.origin,
      price: data.price,
      market: data.market,
      direction: data.direction,
      message: data.message
    }
  }

  self.registration.showNotification(data.title, notification)

  self.clients
    .matchAll({
      type: 'window'
    })
    .then(function (clients) {
      clients.forEach(function (client) {
        client.postMessage({
          price: data.price,
          market: data.market,
          direction: data.direction,
          message: data.message
        })
      })
    })
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()

  let url = 'https://aggr.trade'

  if (event.notification.data.url) {
    url = event.notification.data.url
  }

  event.waitUntil(
    clients
      .matchAll({
        type: 'window'
      })
      .then(function (clientsArr) {
        for (let i = 0; i < clientsArr.length; i++) {
          const client = clientsArr[i]
          if (client.url == url && 'focus' in client) {
            return client.focus()
          }
        }

        if (clients.openWindow) {
          return clients.openWindow(url)
        }
      })
  )
})
