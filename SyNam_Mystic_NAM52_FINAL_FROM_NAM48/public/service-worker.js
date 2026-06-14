const CACHE = "synam-mystic-nam52-banner-20260614-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./knowledge.js",
  "./manifest.webmanifest",
  "./assets/icon.svg",
  "./assets/hero-right-dangnam-nam52.jpg",
  "./assets/hero-right-dangnam-nam52.png"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(key => key !== CACHE ? caches.delete(key) : null)))
  );
});

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  const isFreshFile = url.pathname.endsWith("/") || url.pathname.endsWith(".html") || url.pathname.endsWith(".js") || url.pathname.endsWith(".css");
  if (isFreshFile) {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});