self.addEventListener('fetch', () => console.log('fetch'))

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open('airhorner').then(function(cache) {
      return cache.addAll(['/', '/js/aggregator.worker.worker.js', '/js/app.2831203e.js', '/js/chunk-vendors.cd75ad19.js', '/css/app.5ab90439.css'])
    })
  )
})
