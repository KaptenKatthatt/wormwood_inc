import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { createApp } from '../server/app.mjs';

let base = '';
let app: any;
let dataDir = '';
let clock = 1_000_000;
const sent: any[] = [];
const fakePush = {
  generateVAPIDKeys: () => ({ publicKey: 'pub', privateKey: 'priv' }),
  setVapidDetails: () => {},
  sendNotification: async (sub: any, payload: string) => { sent.push({ sub, payload: JSON.parse(payload) }); },
};

beforeAll(async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ww-'));
  dataDir = join(dir, 'data');
  await mkdir(join(dir, 'dist'));
  await writeFile(join(dir, 'dist', 'index.html'), '<h1>spel</h1>');
  app = await createApp({ distDir: join(dir, 'dist'), dataDir, webpush: fakePush, now: () => clock });
  await new Promise<void>((ok) => app.server.listen(0, '127.0.0.1', ok));
  base = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`;
});
afterAll(() => app.server.close());

const post = (p: string, body: unknown) =>
  fetch(base + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

describe('server', () => {
  it('serves the game with SPA fallback', async () => {
    const r = await fetch(base + '/byn');
    expect(await r.text()).toContain('spel');
    expect(r.headers.get('x-robots-tag')).toContain('noindex');
  });

  it('stores playtest events as NDJSON', async () => {
    const r = await post('/api/log', { playerId: 'abcdefgh1234', session: 's1', events: [{ t: 1, name: 'start', data: { a: 1 } }] });
    expect(r.status).toBe(200);
    const [file] = await readdir(join(dataDir, 'logs'));
    const line = JSON.parse((await readFile(join(dataDir, 'logs', file), 'utf8')).trim());
    expect(line).toMatchObject({ playerId: 'abcdefgh1234', name: 'start', data: { a: 1 } });
  });

  it('rejects bad player ids', async () => {
    expect((await post('/api/log', { playerId: '../x', events: [] })).status).toBe(400);
  });

  it('only accepts known push services, including Apple', async () => {
    const sub = (endpoint: string) => ({ playerId: 'abcdefgh1234', subscription: { endpoint, keys: { p256dh: 'p', auth: 'a' } } });
    expect((await post('/api/push/subscribe', sub('https://evil.example/x'))).status).toBe(400);
    expect((await post('/api/push/subscribe', sub('https://web.push.apple.com/abc'))).status).toBe(200);
  });

  it('sends a scheduled notification when it is due', async () => {
    await post('/api/push/schedule', { playerId: 'abcdefgh1234', id: 'build-sjobod', inMs: 120_000, title: 'Klart', body: 'Sjöboden är byggd' });
    expect(await app.flushDue()).toBe(0);
    clock += 120_000;
    expect(await app.flushDue()).toBe(1);
    expect(sent.at(-1).payload).toMatchObject({ title: 'Klart', body: 'Sjöboden är byggd' });
  });

  it('gives the VAPID key', async () => {
    expect(await (await fetch(base + '/api/push/key')).json()).toEqual({ key: 'pub' });
  });
});
