const CACHE_NAME = "mediavault-static-v3";
const STATIC_ASSETS = ["/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((key) => key === CACHE_NAME ? undefined : caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  const isStatic = url.pathname.startsWith("/icons/") || url.pathname === "/manifest.json";
  if (!isStatic) return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
