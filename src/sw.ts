/// <reference lib="webworker" />
/**
 * Service worker: precaches the built game so it starts offline, shows push
 * notifications, and opens the game when one is tapped.
 */
import { cleanupOutdatedCaches, precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { clientsClaim } from 'workbox-core';

declare const self: ServiceWorkerGlobalScope;

// A new version takes over at once instead of waiting until every tab and
// the home screen app are closed; the page reloads itself when it does.
void self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
// Music and sound effects are not precached (several MB); each file is kept
// the first time it is played, so sound works offline after that. Rename the
// cache (audio-v3 …) if a file is replaced under the same name; v2 came with
// the softer Christmas music of 2026-11-19.
const AUDIO_CACHE = 'audio-v2';
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('audio-') && k !== AUDIO_CACHE).map((k) => caches.delete(k)))));
});
registerRoute(
  ({ url }) => url.origin === self.location.origin && url.pathname.startsWith('/audio/'),
  async ({ request }) => {
    const cache = await caches.open(AUDIO_CACHE);
    const hit = await cache.match(request);
    if (hit) return hit;
    const res = await fetch(request);
    if (res.ok) void cache.put(request, res.clone());
    return res;
  },
);
// The art of worlds 2-5: shown from the cache at once and refreshed behind it.
registerRoute(
  ({ url }) => url.origin === self.location.origin && (url.pathname.startsWith('/art/worlds/') || url.pathname.startsWith('/art/village/winter/') || url.pathname.startsWith('/art/village/xmas/')),
  async ({ request }) => {
    const cache = await caches.open('worlds-art-v1');
    const hit = await cache.match(request);
    const fresh = fetch(request).then((res) => { if (res.ok) void cache.put(request, res.clone()); return res; });
    if (hit) { fresh.catch(() => {}); return hit; }
    return fresh;
  },
);
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html'), { denylist: [/^\/api\//] }));

self.addEventListener('message', (e) => {
  if (e.data?.type === 'SKIP_WAITING') void self.skipWaiting();
});

self.addEventListener('push', (event) => {
  let data: { title?: string; body?: string; tag?: string } = {};
  try { data = event.data?.json() ?? {}; } catch { data = { body: event.data?.text() }; }
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Skärgårdsbyn', {
      body: data.body ?? '',
      tag: data.tag,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-96.png',
      lang: 'sv',
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const open = all.find((c) => 'focus' in c);
      if (open) return (open as WindowClient).focus();
      return self.clients.openWindow('/');
    })(),
  );
});
