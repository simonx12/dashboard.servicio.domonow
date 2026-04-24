/* ══════════════════════════════════════════
   DomoNow Service Worker — PWA + Web
   Compatible con cualquier base path (/, /app/, etc.)
   ══════════════════════════════════════════ */
const CACHE_NAME = 'domonow-v3-2';

// Base path dinámico (funciona en / y en /subdir/)
const BASE = self.registration.scope;

// Assets locales (relativos al scope del SW)
const LOCAL_ASSETS = [
  '',               // index.html (raíz del scope)
  'manifest.json',
  'css/base.css',
  'css/layout.css',
  'css/components.css',
  'css/dashboard.css',
  'css/progress.css',
  'css/strategy.css',
  'css/tasks.css',
  'css/lineal.css',
  'css/login.css',
  'js/app.js',
  'assets/logo.svg',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
];

// Assets externos (CDN / Fonts) — absolutos
const EXTERNAL_ASSETS = [
  'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600&family=Syne:wght@700;800&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js',
];

// ── Install ──
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Cachear locales con path absoluto construido desde el scope
    const localUrls = LOCAL_ASSETS.map(p => BASE + p);
    await Promise.allSettled([
      ...localUrls.map(url => cache.add(url).catch(e => console.warn('[SW] No cacheado:', url, e.message))),
      ...EXTERNAL_ASSETS.map(url => cache.add(url).catch(e => console.warn('[SW] No cacheado:', url, e.message))),
    ]);
  })());
});

// ── Activate ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ── Fetch ──
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Supabase API → Network-first (datos siempre frescos)
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Google Fonts / CDN → Cache-first
  if (
    url.hostname.includes('fonts.goog') ||
    url.hostname.includes('fonts.gstatic') ||
    url.hostname.includes('cdn.jsdelivr.net') ||
    url.hostname.includes('cdnjs')
  ) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // Assets locales → Cache-first, fallback a red, fallback a index.html
  if (url.href.startsWith(BASE)) {
    event.respondWith(cacheFirst(event.request, true));
  }
});

// ── Cache-first ──
async function cacheFirst(request, fallbackToIndex = false) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Si es una navegación HTML, devolver index.html (SPA fallback)
    if (fallbackToIndex && request.headers.get('accept')?.includes('text/html')) {
      const indexCache = await caches.match(BASE);
      if (indexCache) return indexCache;
    }
    return new Response('', { status: 503, statusText: 'Offline' });
  }
}

// ── Network-first ──
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response(JSON.stringify({ error: 'offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
