/* ══════════════════════════════════════════
   DomoNow Service Worker — PWA
   Cache-first para assets estáticos
   Network-first para Supabase (datos en vivo)
   ══════════════════════════════════════════ */

const CACHE_NAME = 'domonow-v3-1';

// Assets que se cachean en la instalación
const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/base.css',
  '/css/layout.css',
  '/css/components.css',
  '/css/dashboard.css',
  '/css/progress.css',
  '/css/strategy.css',
  '/css/tasks.css',
  '/css/lineal.css',
  '/css/login.css',
  '/js/app.js',
  '/assets/logo.svg',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600&family=Syne:wght@700;800&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
];

// ── Install: precachear assets estáticos ──
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        PRECACHE.map(url =>
          cache.add(url).catch(e => console.warn('[SW] No se pudo cachear:', url, e))
        )
      );
    })
  );
});

// ── Activate: limpiar caches viejos ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: estrategia por tipo de request ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // 1. Supabase API → Network-first (datos siempre frescos)
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // 2. Google Fonts → Cache-first
  if (url.hostname.includes('fonts.goog') || url.hostname.includes('fonts.gstatic')) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // 3. CDN (Chart.js, Supabase SDK) → Cache-first
  if (url.hostname.includes('cdn.jsdelivr.net') || url.hostname.includes('cdnjs')) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // 4. Assets locales (CSS, JS, imágenes, HTML) → Cache-first con fallback
  if (event.request.method === 'GET') {
    event.respondWith(cacheFirst(event.request));
  }
});

// ── Estrategia: Cache-first ──
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('<h2>Sin conexión</h2><p>DomoNow no está disponible offline para este recurso.</p>', {
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

// ── Estrategia: Network-first ──
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response(JSON.stringify({ error: 'offline' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
