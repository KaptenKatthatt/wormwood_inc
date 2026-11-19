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
  await mkdir(join(dir, 'dist-test'));
  await writeFile(join(dir, 'dist-test', 'index.html'), '<h1>testversion</h1>');
  app = await createApp({ distDir: join(dir, 'dist'), testDistDir: join(dir, 'dist-test'), dataDir, webpush: fakePush, now: () => clock });
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

  /** GET with a chosen Host header; a redirect comes back as "301 <location>". */
  const fetchHost = async (host: string, path = '/') => {
    const http = await import('node:http');
    return new Promise<string>((ok) => {
      http.get(base + path, { headers: { host } }, (r) => { let b = ''; r.on('data', (c) => (b += c)); r.on('end', () => ok(r.statusCode === 301 ? `301 ${r.headers.location}` : b)); });
    });
  };

  it('serves the playtest build to the skargardsbyn. host', async () => {
    expect(await fetchHost('skargardsbyn.84.247.143.6.sslip.io')).toContain('testversion');
  });

  it('retires a game installed from an old address: its worker empties the cache and goes to the new address', async () => {
    const test = await fetchHost('spela.84.247.143.6.sslip.io', '/sw.js');
    expect(test).toContain('caches.delete');
    expect(test).toContain('unregister');
    expect(test).toContain('"https://skargardsbyn.84.247.143.6.sslip.io/"');
    expect(await fetchHost('wormwood.84.247.143.6.sslip.io', '/sw.js')).toContain('"https://dev.skargardsbyn.84.247.143.6.sslip.io/"');
    // everything else on an old address is a redirect, with the path kept
    expect(await fetchHost('spela.84.247.143.6.sslip.io', '/byn?x=1')).toBe('301 https://skargardsbyn.84.247.143.6.sslip.io/byn?x=1');
    // the real addresses keep their own service worker path (a 404 here: the fake build has none)
    expect(await fetchHost('skargardsbyn.84.247.143.6.sslip.io', '/sw.js')).not.toContain('unregister');
  });

  it('serves the dev build to dev.skargardsbyn.', async () => {
    expect(await fetchHost('dev.skargardsbyn.84.247.143.6.sslip.io')).not.toContain('testversion');
  });

  /** POST with a chosen Host header (fetch does not allow setting it). */
  const postHost = async (host: string, p: string, body: unknown) => {
    const http = await import('node:http');
    const data = JSON.stringify(body);
    return new Promise<number>((ok, fail) => {
      const r = http.request(base + p, { method: 'POST', headers: { host, 'content-type': 'application/json', 'content-length': Buffer.byteLength(data) } }, (res) => { res.resume(); res.on('end', () => ok(res.statusCode ?? 0)); });
      r.on('error', fail);
      r.end(data);
    });
  };

  it("stores the playtest site's events in logs/ and the dev site's in logs/dev/", async () => {
    expect(await postHost('skargardsbyn.84.247.143.6.sslip.io', '/api/log', { playerId: 'abcdefgh1234', session: 's1', events: [{ t: 1, name: 'start', data: { a: 1 } }] })).toBe(200);
    expect(await postHost('dev.skargardsbyn.84.247.143.6.sslip.io', '/api/log', { playerId: 'devdevdev123', session: 's2', events: [{ t: 2, name: 'devstart' }] })).toBe(200);
    const files = (await readdir(join(dataDir, 'logs'))).filter((f) => f.endsWith('.ndjson'));
    const test = (await readFile(join(dataDir, 'logs', files[0]), 'utf8')).trim().split('\n').map((l) => JSON.parse(l));
    expect(test).toHaveLength(1);
    expect(test[0]).toMatchObject({ playerId: 'abcdefgh1234', name: 'start', data: { a: 1 } });
    const [devFile] = await readdir(join(dataDir, 'logs', 'dev'));
    expect(JSON.parse((await readFile(join(dataDir, 'logs', 'dev', devFile), 'utf8')).trim())).toMatchObject({ playerId: 'devdevdev123', name: 'devstart' });
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
