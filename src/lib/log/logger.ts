import { DEV_MENU } from '../config/flags';
/**
 * Playtest event log. Events are queued and sent in batches to /api/log, and
 * flushed with sendBeacon when the page is hidden. Nothing is sent before the
 * player has said yes (settings.logging === true); the id is a random
 * pseudonym made on the device, never a name or e-mail.
 */
import { load, randomId, save } from '../state/storage';

interface LogEvent { t: number; gameT?: number; name: string; data?: Record<string, unknown> }

const session = randomId();
let queue: LogEvent[] = load('logQueue', []);
let timer: ReturnType<typeof setTimeout> | undefined;
let consent = (): boolean => false;
let pid = (): string => '';
let gameTime = (): number | undefined => undefined;

export function initLogger(opts: { consent: () => boolean; playerId: () => string; gameTime: () => number }): void {
  consent = opts.consent;
  pid = opts.playerId;
  gameTime = opts.gameTime;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush(true);
  });
  window.addEventListener('pagehide', () => flush(true));
}

type LogListener = (name: string, data: Record<string, unknown>) => void;
const listeners: LogListener[] = [];
/** Lets other parts of the game react to logged events (the sound, for one). */
export function onLog(fn: LogListener): void {
  listeners.push(fn);
}

export function log(name: string, data?: Record<string, unknown>): void {
  for (const fn of listeners) {
    try { fn(name, data ?? {}); } catch { /* a listener must never stop the log */ }
  }
  if (import.meta.env.DEV) console.debug('[log]', name, data ?? '');
  // Events from the playtest build are marked too (the server also files the two sites apart).
  if (!DEV_MENU) data = { ...data, build: 'test' };
  queue.push({ t: Date.now(), gameT: gameTime(), name, data });
  if (queue.length > 500) queue = queue.slice(-500);
  save('logQueue', queue);
  // Send at most every 5 s, and at once when many events are waiting.
  if (queue.length >= 25) flush(false);
  else timer ??= setTimeout(() => { timer = undefined; flush(false); }, 5000);
}

export function flush(beacon: boolean): void {
  if (!consent()) return;
  if (queue.length === 0 || !pid()) return;
  const events = queue.splice(0, 200);
  save('logQueue', queue);
  const body = JSON.stringify({ playerId: pid(), session, events });
  if (beacon && navigator.sendBeacon) {
    navigator.sendBeacon('/api/log', new Blob([body], { type: 'application/json' }));
    return;
  }
  fetch('/api/log', { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true }).catch(() => {
    queue = [...events, ...queue]; // offline: try again later
    save('logQueue', queue);
  });
}
