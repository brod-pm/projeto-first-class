var CACHE = 'fc-supervisao-v6';
var ARQUIVOS = [
  '/first-class-forms/first_class_supervisao.html',
  '/first-class-forms/manifest.json',
  '/first-class-forms/icon-192.png',
  '/first-class-forms/icon-512.png'
];

// Instalação: salva arquivos no cache (sem falhar se um não carregar)
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      // Adiciona cada arquivo individualmente — se um falhar, o SW continua
      return Promise.allSettled(
        ARQUIVOS.map(function(url) {
          return cache.add(url).catch(function(err) {
            console.warn('SW: falha ao cachear ' + url, err);
          });
        })
      );
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

// Requisições: rede primeiro para o HTML (sempre atualizado),
// cache primeiro para assets (icons, manifest)
self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  // Estratégia: rede primeiro → cache como fallback
  e.respondWith(
    fetch(e.request).then(function(resp) {
      // Se veio da rede com sucesso, salva no cache e retorna
      if (resp && resp.status === 200 && resp.type !== 'opaque') {
        var copia = resp.clone();
        caches.open(CACHE).then(function(cache) {
          cache.put(e.request, copia);
        });
      }
      return resp;
    }).catch(function() {
      // Offline: tenta servir do cache
      return caches.match(e.request).then(function(cached) {
        if (cached) return cached;
        // Último recurso: HTML principal
        return caches.match('/first-class-forms/first_class_supervisao.html');
      });
    })
  );
});
