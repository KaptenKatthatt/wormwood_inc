import { DEV_MENU } from '../config/flags';
/**
 * Playtest event log. Events are queued and sent in batches to /api/log, and
 * flushed with sendBeacon when the page is hidden. Nothing is sent before the
 * player has said yes (settings.logging === true); the id is a random
 * pseudonym made on the device, never a name or e-mail.
 */
import { load, randomId, save } from '../state/storage';

/** What every event carries, so that one line can be analysed on its own. */
export interface LogContext {
  /** Day of the test: 1 on the first day the game was opened. */
  day: number;
  /** Minutes of game time since the introduction ended. */
  min: number;
  /** The hook staircase's step. */
  step: number;
  /** Challenges won at least once. */
  won: number;
}

interface LogEvent {
  t: number; gameT?: number; name: string; data?: Record<string, unknown>;
  /** The player's event number, counting up over every session, so lost or doubled events show. */
  seq: number;
  /** The app version that made the event. */
  v: string;
  site: 'test' | 'dev';
  ctx?: LogContext;
}

const session = randomId();
let queue: LogEvent[] = load('logQueue', []);
let timer: ReturnType<typeof setTimeout> | undefined;
let consent = (): boolean => false;
let pid = (): string => '';
let gameTime = (): number | undefined => undefined;
let context = (): LogContext | undefined => undefined;
let seq: number = load('logSeq', 0);

export function initLogger(opts: { consent: () => boolean; playerId: () => string; gameTime: () => number; context?: () => LogContext }): void {
  consent = opts.consent;
  pid = opts.playerId;
  gameTime = opts.gameTime;
  if (opts.context) context = opts.context;
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
  let ctx: LogContext | undefined;
  try { ctx = context(); } catch { /* the context must never stop the log */ }
  seq += 1;
  save('logSeq', seq);
  queue.push({ t: Date.now(), gameT: gameTime(), name, data, seq, v: __APP_VERSION__, site: DEV_MENU ? 'dev' : 'test', ctx });
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
