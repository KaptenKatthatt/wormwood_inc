/**
 * Keeps the installed game on the newest build, by itself (Jonas, 2026-11-19:
 * the test version did not update itself).
 *
 * Two ways, so one can fail:
 *  1. The service worker: the browser fetches a new /sw.js, it takes over at
 *     once, and the page reloads when it does.
 *  2. A plain check of /version.json, straight from the network. If the
 *     server has another build than the one running and the service worker
 *     has not brought it within a while, the game throws away its service
 *     worker and its cache and loads again from the network.
 *
 * Both look on start, every 15 minutes and whenever the game comes back to
 * the foreground (a home screen app is rarely restarted). A reload never
 * comes in the middle of a challenge: it waits until the player is out of it.
 */
import { registerSW } from 'virtual:pwa-register';
import { derived, get } from 'svelte/store';
import { inLevel } from '../state/game';
import { qOpen } from '../state/questionnaire';
import { log } from '../log/logger';

const CHECK_EVERY = 15 * 60 * 1000;
/** How long the service worker gets to bring a new build before the game fetches it itself. */
const PATIENCE = 45 * 1000;

let reloading = false;
/** Reloads now, or as soon as the player is out of the challenge or the questionnaire on screen. */
function reloadWhenFree(): void {
  if (reloading) return;
  reloading = true;
  const busy = derived([inLevel, qOpen], ([level, q]) => level || q !== null);
  if (!get(busy)) { location.reload(); return; }
  const stop = busy.subscribe((b) => {
    if (b) return;
    queueMicrotask(() => stop());
    location.reload();
  });
}

/** The build the server has now, or null when it cannot be reached. */
async function serverBuild(): Promise<string | null> {
  try {
    const r = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) return null;
    const v = (await r.json()) as { build?: unknown };
    return typeof v.build === 'string' ? v.build : null;
  } catch {
    return null;
  }
}

/** The last resort: no service worker, no cache, straight from the network. */
async function forceFresh(build: string): Promise<void> {
  // once per build, so a server that is mid-deploy cannot make the game reload in a loop
  try {
    if (sessionStorage.getItem('forcedBuild') === build) return;
    sessionStorage.setItem('forcedBuild', build);
  } catch { /* private mode: go on */ }
  log('update_forced', { from: __BUILD_ID__, to: build });
  try {
    for (const reg of await navigator.serviceWorker.getRegistrations()) await reg.unregister();
    // the sounds stay: they are large and do not change with the build
    for (const key of await caches.keys()) if (!key.startsWith('audio-')) await caches.delete(key);
  } catch { /* still reload */ }
  reloadWhenFree();
}

export function keepUpdated(): void {
  if (import.meta.env.DEV || !('serviceWorker' in navigator)) return;
  let registration: ServiceWorkerRegistration | undefined;
  let waitingFor: string | null = null;

  async function check(): Promise<void> {
    if (!navigator.onLine) return;
    void registration?.update().catch(() => {});
    const build = await serverBuild();
    if (!build || build === __BUILD_ID__ || waitingFor === build) return;
    waitingFor = build;
    setTimeout(() => void forceFresh(build), PATIENCE);
  }

  registerSW({
    immediate: true,
    onRegisteredSW(_url, reg) { registration = reg; },
  });
  // Reload once when a new version takes control, so the player sees it.
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController) reloadWhenFree(); });

  void check();
  setInterval(() => void check(), CHECK_EVERY);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void check(); });
}
