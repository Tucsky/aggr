/* eslint-disable */
self.addEventListener('fetch', () => {})

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open('airhorner').then(function(cache) {
      return cache.addAll(global.serviceWorkerOption.assets)
    })
  )
})

self.addEventListener('push', event => {
  const data = event.data.json()

  const notification = {
    body: data.body,
    data: {
      url: data.origin,
      price: data.price,
      market: data.market
    }
  }

  self.registration.showNotification(data.title, notification)

  self.clients
    .matchAll({
      type: 'window'
    })
    .then(function(clients) {
      clients.forEach(function(client) {
        client.postMessage({
          price: data.price,
          market: data.market
        })
      })
    })
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()

  let url = 'https://charts.aggr.trade'

  if (event.notification.data.url) {
    url = event.notification.data.url
  }

  event.waitUntil(
    clients
      .matchAll({
        type: 'window'
      })
      .then(function(clients) {
        for (let i = 0; i < clients.length; i++) {
          const client = clients[i]
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
