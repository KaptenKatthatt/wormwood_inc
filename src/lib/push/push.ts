/**
 * Web Push. The server holds the subscription and sends visible notifications
 * when a timer runs out, even with the game closed. On iPhone this only works
 * when the game is installed to the home screen (iOS 16.4+).
 */
function b64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function pushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export type PushResult = 'ok' | 'unsupported' | 'denied' | 'unanswered' | 'error';

/** The last failure, for the log (Jonas saw "denied" after allowing). */
export let lastPushError = '';

/**
 * Asks for permission. The browser's own answer can lag behind what the
 * player chose (a quiet prompt answered later, an older callback-style API),
 * so the current Notification.permission is the one that counts.
 */
async function askPermission(): Promise<NotificationPermission> {
  if (Notification.permission === 'granted') return 'granted';
  let answer: NotificationPermission | undefined;
  try {
    answer = await new Promise<NotificationPermission>((done) => {
      const p = Notification.requestPermission(done);
      if (p && typeof p.then === 'function') void p.then(done, () => done(Notification.permission));
    });
  } catch {
    answer = undefined;
  }
  const now = Notification.permission as NotificationPermission; // re-read after the await
  return now === 'granted' ? 'granted' : answer ?? Notification.permission;
}

export function permissionNow(): NotificationPermission | 'unsupported' {
  return pushSupported() ? Notification.permission : 'unsupported';
}

export async function enablePush(playerId: string): Promise<PushResult> {
  if (!pushSupported()) return 'unsupported';
  const perm = await askPermission();
  if (perm === 'denied') return 'denied';
  if (perm !== 'granted') return 'unanswered';
  return subscribe(playerId);
}

/** Subscribes without asking (permission is already granted). */
export async function subscribe(playerId: string): Promise<PushResult> {
  if (!pushSupported() || Notification.permission !== 'granted') return 'denied';
  lastPushError = '';
  try {
    const { key } = await (await fetch('/api/push/key')).json();
    const reg = await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(key) }));
    const r = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ playerId, subscription: sub.toJSON() }),
    });
    if (!r.ok) lastPushError = `subscribe ${r.status}`;
    return r.ok ? 'ok' : 'error';
  } catch (e) {
    lastPushError = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    return 'error';
  }
}

async function post(path: string, body: unknown): Promise<boolean> {
  try {
    const r = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    return r.ok;
  } catch {
    return false;
  }
}

export const schedulePush = (playerId: string, id: string, inMs: number, title: string, body: string) =>
  post('/api/push/schedule', { playerId, id, inMs: Math.round(inMs), title, body });

export const cancelPush = (playerId: string, id?: string) => post('/api/push/cancel', { playerId, id });

export const testPush = (playerId: string) => post('/api/push/test', { playerId });
