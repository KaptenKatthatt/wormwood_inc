// @ts-check
/**
 * Small backend for Skärgårdsbyn, no framework:
 *  - serves the built game from dist/ (SPA fallback, sw.js never cached)
 *  - POST /api/log            playtest events, appended as NDJSON per day
 *  - GET  /api/push/key       the VAPID public key
 *  - POST /api/push/subscribe store a Web Push subscription for a player
 *  - POST /api/push/schedule  schedule a visible notification (e.g. "Sjöboden är klar")
 *  - POST /api/push/cancel    cancel one
 *  - POST /api/push/test      send one now
 *  - GET  /api/health
 *  - /api/messages/*, /api/contact/*, /api/admin/*: messages from Jonas and the
 *    testers' e-mail addresses (server/reach.mjs)
 *
 * Data lives in DATA_DIR as plain JSON / NDJSON files; there is one player
 * per device, identified by a random pseudonymous id made in the browser.
 */
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, writeFile, appendFile, stat, rename } from 'node:fs/promises';
import { join, extname, normalize, resolve } from 'node:path';
import { createReach } from './reach.mjs';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.txt': 'text/plain; charset=utf-8',
};

/** Push services we deliver to. Apple's host is needed for iPhone (16.4+, installed to the home screen). */
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /^updates\.push\.services\.mozilla\.com$/, /^web\.push\.apple\.com$/, /\.notify\.windows\.com$/, /^push\.services\.mozilla\.com$/];

const ID_RE = /^[A-Za-z0-9_-]{8,64}$/;
const MAX_BODY = 64 * 1024;

/**
 * @param {{ distDir: string, testDistDir?: string, dataDir: string, webpush?: any, contact?: string, now?: () => number, adminKey?: string }} opts
 */
export async function createApp(opts) {
  const devDist = resolve(opts.distDir);
  // The playtest build (no dev menu) is served to the host skargardsbyn.<ip>.sslip.io
  // (and the old spela.<ip>, which Caddy now redirects); dev.skargardsbyn.<ip> gets the dev build.
  const testDist = opts.testDistDir ? resolve(opts.testDistDir) : null;
  /** The playtest site's host names; everything else is the dev site. */
  const isTestHost = (/** @type {string} */ host) => /^(skargardsbyn|spela)\./.test(host);
  const dataDir = resolve(opts.dataDir);
  const now = opts.now ?? Date.now;
  await mkdir(join(dataDir, 'logs'), { recursive: true });

  // ---- persisted JSON ------------------------------------------------------
  /** @param {string} name @param {any} fallback */
  async function readJson(name, fallback) {
    try { return JSON.parse(await readFile(join(dataDir, name), 'utf8')); } catch { return fallback; }
  }
  /** @param {string} name @param {any} value */
  async function writeJson(name, value) {
    const p = join(dataDir, name);
    await writeFile(p + '.tmp', JSON.stringify(value));
    await rename(p + '.tmp', p);
  }

  /** @type {Record<string, any>} playerId -> subscription */
  const subs = await readJson('subscriptions.json', {});
  /** @type {{ playerId: string, id: string, at: number, title: string, body: string, tag?: string }[]} */
  let scheduled = await readJson('scheduled.json', []);

  // ---- VAPID ---------------------------------------------------------------
  const webpush = opts.webpush;
  let vapidPublic = '';
  if (webpush) {
    let keys = await readJson('vapid.json', null);
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      keys = { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
    }
    if (!keys) {
      keys = webpush.generateVAPIDKeys();
      await writeJson('vapid.json', keys);
    }
    webpush.setVapidDetails(opts.contact ?? 'mailto:wormwood@example.invalid', keys.publicKey, keys.privateKey);
    vapidPublic = keys.publicKey;
  }

  /** @param {string} playerId @param {object} payload */
  async function sendPush(playerId, payload) {
    const sub = subs[playerId];
    if (!sub || !webpush) return false;
    try {
      await webpush.sendNotification(sub, JSON.stringify(payload), { TTL: 60 * 60 * 24 });
      return true;
    } catch (err) {
      const code = /** @type {any} */ (err)?.statusCode;
      if (code === 404 || code === 410) {
        delete subs[playerId];
        await writeJson('subscriptions.json', subs);
      } else {
        console.error('push failed', code ?? err);
      }
      return false;
    }
  }

  /** One server-made line in the playtest log, in the shape of the lines the game sends. */
  /** @param {'test' | 'dev'} site @param {string} playerId @param {string} name @param {object} data */
  async function appendEvent(site, playerId, name, data) {
    const received = now();
    const logDir = site === 'test' ? join(dataDir, 'logs') : join(dataDir, 'logs', 'dev');
    await mkdir(logDir, { recursive: true });
    const line = JSON.stringify({ received, site, playerId, session: 'server', seq: null, v: null, t: received, gameT: null, name, ctx: null, data });
    await appendFile(join(logDir, `${new Date(received).toISOString().slice(0, 10)}.ndjson`), line + '\n');
  }
  const reach = await createReach({ readJson, writeJson, now, sendPush, appendEvent, adminKey: opts.adminKey });

  async function flushDue() {
    await reach.expireContacts();
    const t = now();
    const due = scheduled.filter((s) => s.at <= t);
    if (due.length === 0) return 0;
    scheduled = scheduled.filter((s) => s.at > t);
    await writeJson('scheduled.json', scheduled);
    for (const s of due) await sendPush(s.playerId, { title: s.title, body: s.body, tag: s.tag ?? s.id });
    return due.length;
  }

  // ---- rate limit (per IP, per minute) ------------------------------------
  /** @type {Map<string, { n: number, until: number }>} */
  const hits = new Map();
  /** @param {string} ip */
  function limited(ip, max = 120) {
    const t = now();
    if (hits.size > 5000) hits.clear();
    const h = hits.get(ip);
    if (!h || h.until < t) { hits.set(ip, { n: 1, until: t + 60_000 }); return false; }
    h.n++;
    return h.n > max;
  }

  // ---- helpers -------------------------------------------------------------
  /** @param {import('node:http').IncomingMessage} req @returns {Promise<any>} */
  function readBody(req) {
    return new Promise((ok, fail) => {
      let size = 0;
      /** @type {Buffer[]} */
      const chunks = [];
      req.on('data', (c) => {
        size += c.length;
        if (size > MAX_BODY) { fail(Object.assign(new Error('too large'), { status: 413 })); req.destroy(); return; }
        chunks.push(c);
      });
      req.on('end', () => {
        try { ok(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); }
        catch { fail(Object.assign(new Error('bad json'), { status: 400 })); }
      });
      req.on('error', fail);
    });
  }
  /** @param {import('node:http').ServerResponse} res @param {number} status @param {any} body */
  function json(res, status, body) {
    res.writeHead(status, { 'content-type': MIME['.json'], 'cache-control': 'no-store' });
    res.end(JSON.stringify(body));
  }
  /** @param {any} v */
  const validId = (v) => typeof v === 'string' && ID_RE.test(v);
  /** @param {any} v @param {number} n */
  const text = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');

  // ---- the old addresses ---------------------------------------------------
  /**
   * The game moved from spela. and wormwood. to skargardsbyn. and
   * dev.skargardsbyn. (2026-11-18). A game installed from an old address is
   * run by its service worker out of the cache and only ever asks the server
   * for /sw.js; a redirect there is refused by the browser, so that game was
   * stuck on its old version (Jonas, 2026-11-19: the test version does not
   * update itself). The old addresses therefore answer /sw.js with a worker
   * that empties the cache, retires itself and sends the player to the new
   * address; everything else is redirected.
   * @param {string} host
   */
  const movedTo = (host) => {
    const m = /^(spela|wormwood)\.(.+)$/.exec(host);
    return m ? `https://${m[1] === 'spela' ? '' : 'dev.'}skargardsbyn.${m[2]}` : null;
  };
  /** @param {string} to */
  const retireWorker = (to) => `// Skargardsbyn has moved to ${to}
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil((async () => {
  for (const key of await caches.keys()) await caches.delete(key);
  const pages = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const page of pages) { try { await page.navigate(${JSON.stringify(to + '/')}); } catch { /* the page reloads itself and is redirected */ } }
  await self.registration.unregister();
})()));
`;

  // ---- static --------------------------------------------------------------
  /** @param {import('node:http').ServerResponse} res @param {string} urlPath */
  async function serveStatic(res, urlPath, host = '') {
    const distDir = testDist && isTestHost(host) ? testDist : devDist;
    let rel = decodeURIComponent(urlPath.split('?')[0]);
    if (rel.endsWith('/')) rel += 'index.html';
    let file = normalize(join(distDir, rel));
    if (!file.startsWith(distDir)) { res.writeHead(403).end(); return; }
    let info = await stat(file).catch(() => null);
    if (!info || !info.isFile()) {
      if (extname(rel)) { res.writeHead(404).end('Hittades inte'); return; }
      file = join(distDir, 'index.html'); // SPA fallback
      info = await stat(file).catch(() => null);
      if (!info) { res.writeHead(503).end('Spelet är inte byggt ännu'); return; }
    }
    const ext = extname(file);
    const immutable = file.includes(`${distDir}/assets/`);
    const noCache = ext === '.html' || file.endsWith('sw.js') || ext === '.webmanifest' || file.endsWith('registerSW.js') || file.endsWith('version.json');
    res.writeHead(200, {
      'content-type': MIME[/** @type {keyof typeof MIME} */ (ext)] ?? 'application/octet-stream',
      'content-length': info.size,
      'cache-control': immutable ? 'public, max-age=31536000, immutable' : noCache ? 'no-cache' : 'public, max-age=3600',
      'x-content-type-options': 'nosniff',
      'x-robots-tag': 'noindex, nofollow',
      'referrer-policy': 'no-referrer',
    });
    createReadStream(file).pipe(res);
  }

  // ---- routes --------------------------------------------------------------
  /** @param {import('node:http').IncomingMessage} req @param {import('node:http').ServerResponse} res */
  async function handle(req, res) {
    const url = req.url ?? '/';
    const path = url.split('?')[0];
    const ip = String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? '').split(',')[0].trim();

    if (!path.startsWith('/api/')) {
      if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
      const moved = movedTo(String(req.headers.host ?? ''));
      if (moved && path === '/sw.js') {
        res.writeHead(200, { 'content-type': MIME['.js'], 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
        res.end(retireWorker(moved));
        return;
      }
      if (moved) { res.writeHead(301, { location: moved + url, 'cache-control': 'no-store' }).end(); return; }
      return serveStatic(res, path, String(req.headers.host ?? ''));
    }
    if (limited(ip)) return json(res, 429, { error: 'för många anrop' });

    if (path === '/api/health' && req.method === 'GET') {
      return json(res, 200, { ok: true, push: Boolean(webpush), subscribers: Object.keys(subs).length, scheduled: scheduled.length });
    }
    if (path === '/api/push/key' && req.method === 'GET') {
      if (!vapidPublic) return json(res, 503, { error: 'push är inte konfigurerat' });
      return json(res, 200, { key: vapidPublic });
    }
    if (req.method !== 'POST') return json(res, 405, { error: 'fel metod' });

    const body = await readBody(req);

    if (path === '/api/log') {
      // { playerId, session, events: [{ t, name, data }] }
      if (!validId(body.playerId) || !Array.isArray(body.events)) return json(res, 400, { error: 'fel format' });
      const received = now();
      // Dev and test are kept apart (Jonas, 2026-11-18): the playtest site's
      // events are the study's data in logs/, the dev site's go to logs/dev/.
      const testSite = isTestHost(String(req.headers.host ?? ''));
      // Every line stands on its own for the analysis (Jonas, 2026-11-19): the
      // site the server saw, the version, the player's event number and the
      // player's place in the test (ctx).
      const num = (/** @type {unknown} */ x) => (typeof x === 'number' && Number.isFinite(x) ? x : null);
      const lines = body.events.slice(0, 200).map((/** @type {any} */ e) =>
        JSON.stringify({
          received,
          site: testSite ? 'test' : 'dev',
          playerId: body.playerId,
          session: text(body.session, 64),
          seq: num(e?.seq),
          v: text(e?.v, 24) || null,
          t: num(e?.t),
          gameT: num(e?.gameT),
          name: text(e?.name, 64),
          ctx: e?.ctx && typeof e.ctx === 'object' ? { day: num(e.ctx.day), min: num(e.ctx.min), step: num(e.ctx.step), won: num(e.ctx.won) } : null,
          data: e?.data && typeof e.data === 'object' ? e.data : null,
        }),
      );
      const day = new Date(received).toISOString().slice(0, 10);
      const logDir = testSite ? join(dataDir, 'logs') : join(dataDir, 'logs', 'dev');
      await mkdir(logDir, { recursive: true });
      await appendFile(join(logDir, `${day}.ndjson`), lines.join('\n') + '\n');
      return json(res, 200, { ok: true, stored: lines.length });
    }

    if (path.startsWith('/api/messages/') || path.startsWith('/api/contact/') || path.startsWith('/api/admin/')) {
      const out = await reach.handle(path, body, isTestHost(String(req.headers.host ?? '')) ? 'test' : 'dev');
      if (out) return json(res, out.status, out.body);
    }

    if (path === '/api/push/subscribe') {
      const sub = body.subscription;
      if (!validId(body.playerId) || typeof sub?.endpoint !== 'string' || !sub.keys?.p256dh || !sub.keys?.auth) {
        return json(res, 400, { error: 'fel format' });
      }
      let host = '';
      try { host = new URL(sub.endpoint).hostname; } catch { /* invalid */ }
      if (!PUSH_HOSTS.some((re) => re.test(host))) return json(res, 400, { error: 'okänd push-tjänst' });
      subs[body.playerId] = { endpoint: sub.endpoint, keys: { p256dh: String(sub.keys.p256dh), auth: String(sub.keys.auth) } };
      await writeJson('subscriptions.json', subs);
      return json(res, 200, { ok: true });
    }

    if (path === '/api/push/schedule') {
      // { playerId, id, inMs, title, body } - inMs is real milliseconds from now
      if (!validId(body.playerId) || !validId(body.id) || typeof body.inMs !== 'number' || body.inMs < 0) {
        return json(res, 400, { error: 'fel format' });
      }
      const at = now() + Math.min(body.inMs, 1000 * 60 * 60 * 24 * 14);
      scheduled = scheduled.filter((s) => !(s.playerId === body.playerId && s.id === body.id));
      if (scheduled.filter((s) => s.playerId === body.playerId).length >= 50) return json(res, 429, { error: 'för många' });
      scheduled.push({ playerId: body.playerId, id: body.id, at, title: text(body.title, 80), body: text(body.body, 200), tag: text(body.tag, 64) || undefined });
      await writeJson('scheduled.json', scheduled);
      return json(res, 200, { ok: true, at });
    }

    if (path === '/api/push/cancel') {
      if (!validId(body.playerId)) return json(res, 400, { error: 'fel format' });
      const before = scheduled.length;
      scheduled = scheduled.filter((s) => !(s.playerId === body.playerId && (body.id === undefined || s.id === body.id)));
      if (scheduled.length !== before) await writeJson('scheduled.json', scheduled);
      return json(res, 200, { ok: true, removed: before - scheduled.length });
    }

    if (path === '/api/push/test') {
      if (!validId(body.playerId)) return json(res, 400, { error: 'fel format' });
      const ok = await sendPush(body.playerId, { title: 'Skärgårdsbyn', body: 'Notiserna fungerar.', tag: 'test' });
      return json(res, ok ? 200 : 404, { ok });
    }

    return json(res, 404, { error: 'finns inte' });
  }

  const server = createServer((req, res) => {
    handle(req, res).catch((err) => {
      const status = err?.status ?? 500;
      if (status === 500) console.error(err);
      if (!res.headersSent) json(res, status, { error: status === 500 ? 'serverfel' : err.message });
    });
  });

  return { server, flushDue, reach, get scheduled() { return scheduled; }, get subs() { return subs; } };
}
