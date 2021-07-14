self.addEventListener('fetch', () => console.log('fetch'))

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open('airhorner').then(function(cache) {
      return cache.addAll(['/'].concat(global.serviceWorkerOption.assets))
    })
  )
})
