// ════════════════════════════════════════════════════════════
// BECO Contadores — Service Worker
// Cachea la app para que cargue sin internet
// ════════════════════════════════════════════════════════════
const CACHE_NAME = 'beco-contadores-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.jsdelivr.net/npm/@azure/msal-browser@3.28.1/lib/msal-browser.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

// Instalación — cachear todos los assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activación — limpiar caches viejos
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — servir desde caché si no hay internet
self.addEventListener('fetch', e => {
  // Solo cachear assets propios y librerías — no Graph API
  const url = e.request.url;
  if (url.includes('graph.microsoft.com') || url.includes('login.microsoftonline.com')) {
    return; // dejar pasar al network
  }
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        // Cachear respuestas nuevas de assets estáticos
        if (resp && resp.status === 200 && e.request.method === 'GET') {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return resp;
      }).catch(() => cached); // si falla network y hay caché, usar caché
    })
  );
});
