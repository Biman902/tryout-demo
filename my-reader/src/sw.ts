/// <reference lib="webworker" />

const sw = self as unknown as ServiceWorkerGlobalScope

const CACHE_NAME = 'myreader-shell-v1'
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
]

sw.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => sw.skipWaiting())
  )
})

sw.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))).then(() => sw.clients.claim())
  )
})

sw.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  event.respondWith((async () => {
    const cached = await caches.match(req)
    if (cached) return cached
    try {
      const res = await fetch(req)
      const copy = res.clone()
      const cache = await caches.open(CACHE_NAME)
      cache.put(req, copy)
      return res
    } catch (e) {
      return cached ?? new Response('Offline', { status: 503, statusText: 'Offline' })
    }
  })())
})