var CACHE = 'fc-supervisao-v3';
var ARQUIVOS = [
  '/first-class-forms/first_class_supervisao.html',
  '/first-class-forms/manifest.json',
  '/first-class-forms/icon-192.png',
  '/first-class-forms/icon-512.png'
];

// Instalação: salva arquivos no cache
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(ARQUIVOS);
    })
  );
  self.skipWaiting();
});

// Ativação: remove caches antigos
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// Requisições: cache primeiro, rede como fallback
self.addEventListener('fetch', function(e) {
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(resp) {
        if (!resp || resp.status !== 200 || resp.type !== 'basic') return resp;
        var copia = resp.clone();
        caches.open(CACHE).then(function(cache) {
          cache.put(e.request, copia);
        });
        return resp;
      });
    }).catch(function() {
      return caches.match('/first-class-forms/first_class_supervisao.html');
    })
  );
});
