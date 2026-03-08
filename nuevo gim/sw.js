const CACHE_NAME = 'entrenador-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/app.jsx',
  '/manifest.json',
];

// Instala el SW y cachea los archivos estáticos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Limpia caches antiguas
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Estrategia: Cache first para assets estáticos, network first para la API
self.addEventListener('fetch', event => {
  // Las llamadas a la API de Anthropic siempre van a la red
  if (event.request.url.includes('api.anthropic.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Para el resto: intenta cache primero, si falla va a la red
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        // Guarda en cache si es una respuesta válida
        if (response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return response;
      });
    }).catch(() => caches.match('/index.html'))
  );
});
