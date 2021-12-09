// eslint-disable-next-line @typescript-eslint/no-empty-function
self.addEventListener('fetch', () => {})

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open('airhorner').then(function(cache) {
      return cache.addAll(global.serviceWorkerOption.assets)
    })
  )
})
