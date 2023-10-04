/* eslint-disable */
const CACHE_NAME = 'airhorner';

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        // Update cache if new version is fetched
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse.clone()));
        return networkResponse;
      }).catch(() => cachedResponse); // If network fails, try to serve from cache

      return cachedResponse || fetchPromise; // Serve from cache if available, else from network
    })
  );
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(global.serviceWorkerOption.assets);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((cacheName) => cacheName !== CACHE_NAME)
                  .map((cacheName) => caches.delete(cacheName))  // Delete old caches
      );
    })
  );
});

self.addEventListener('push', event => {
  const data = event.data.json()

  const notification = {
    body: data.body,
    data: {
      url: data.origin,
      price: data.price,
      market: data.market,
      direction: data.direction,
      message: data.message,
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
          market: data.market,
          direction: data.direction,
          message: data.message
        })
      })
    })
})

self.addEventListener('notificationclick', function(event) {
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
