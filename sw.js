const CACHE = 'gig-checklist-v11';
const ASSETS = ['/tyo-gig-checklist/', '/tyo-gig-checklist/index.html', '/tyo-gig-checklist/manifest.json', '/tyo-gig-checklist/icons/icon.svg', '/tyo-gig-checklist/icons/icon-192.png', '/tyo-gig-checklist/icons/icon-512.png', '/tyo-gig-checklist/icons/icon-180.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  // Never intercept Firebase auth requests — let them go directly to network
  if (e.request.url.includes('/__/auth/') || e.request.url.includes('firebaseapp.com')) return;

  // Network-first for HTML
  if (e.request.mode === 'navigate' || e.request.headers.get('accept')?.includes('text/html')) {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache-first for everything else (icons, manifest, fonts)
  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
