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

export type PushResult = 'ok' | 'unsupported' | 'denied' | 'error';

export async function enablePush(playerId: string): Promise<PushResult> {
  if (!pushSupported()) return 'unsupported';
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return 'denied';
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
    return r.ok ? 'ok' : 'error';
  } catch {
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
