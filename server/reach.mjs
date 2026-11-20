// @ts-check
/**
 * Reaching the testers (Jonas, 2026-11-20):
 *  - messages from Jonas, shown in the game the next time it opens and kept
 *    under Settings; one way only, to everyone on a site or to one test code
 *  - an e-mail address a tester may leave after the consent, kept in its own
 *    file (contacts.json) with the test code, apart from the playtest log,
 *    and deleted by itself after 31 January 2027
 *
 *  - top-ups of the test wallet (Jonas, 2026-11-20): a tester asks by e-mail,
 *    Jonas makes a code here for that tester's test code, and the tester
 *    types it in the shop for 100 kr. A code works for one test code, once.
 *
 * The player routes take the pseudonymous player id like the rest of the
 * server. The admin routes take the admin key: ADMIN_KEY from the
 * environment, or else a key made on first start and kept in admin-key.json.
 */
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/** The addresses are deleted when this moment has passed (end of 31 January 2027, Swedish time). */
export const CONTACTS_END = Date.parse('2027-02-01T00:00:00+01:00');

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
/** The same test code as src/lib/testCode.ts; tests/reach.test.ts keeps the two alike. */
export function testCode(/** @type {string} */ playerId) {
  let h = 0x811c9dc5;
  for (let i = 0; i < playerId.length; i++) {
    h ^= playerId.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  let h2 = h ^ 0x9e3779b9;
  let out = '';
  for (let i = 0; i < 6; i++) {
    const src = i < 3 ? h : h2;
    out += ALPHABET[(src >>> ((i % 3) * 5)) & 31];
    if (i === 2) h2 = Math.imul(h2 ^ (h2 >>> 15), 0x2c1b3c6d) >>> 0;
  }
  return out;
}

/** Kronor a top-up code gives. */
export const TOPUP_KRONOR = 100;
/** The letters in a top-up code: no 0/O or 1/I, so it can be read out and typed. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
/** "FYLL-7K3Q" and the like; spaces, dashes and case do not matter. */
export const normTopup = (/** @type {unknown} */ v) => (typeof v === 'string' ? v.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^FYLL/, '') : '');

const EMAIL_RE = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;.]{2,}$/;
export const validEmail = (/** @type {unknown} */ v) => typeof v === 'string' && v.length <= 254 && EMAIL_RE.test(v);

/**
 * @typedef {{ id: string, title: string, body: string, sentAt: number, site: 'test' | 'dev', playerId?: string, playerIds?: string[], to: string, push: boolean, recipients: number, shown: string[], read: string[] }} Message
 * @typedef {{ email: string, site: 'test' | 'dev', savedAt: number }} Contact
 * @typedef {{ site: 'test' | 'dev', first: number, last: number }} Player
 * @typedef {{ code: string, testCode: string, madeAt: number, usedAt?: number, site?: 'test' | 'dev' }} Topup
 */

/**
 * @param {{
 *   readJson: (name: string, fallback: any) => Promise<any>,
 *   writeJson: (name: string, value: any) => Promise<void>,
 *   now: () => number,
 *   sendPush: (playerId: string, payload: object) => Promise<boolean>,
 *   appendEvent: (site: 'test' | 'dev', playerId: string, name: string, data: object) => Promise<void>,
 *   adminKey?: string,
 *   codeOf?: (playerId: string) => string,
 *   playersOf?: (code: string, known: string[]) => string[],
 * }} deps
 */
export async function createReach(deps) {
  const { readJson, writeJson, now, sendPush, appendEvent } = deps;
  // A tester let in with an invitation has its code as test code (server/invites.mjs).
  const codeOf = deps.codeOf ?? testCode;
  const playersOf = deps.playersOf ?? ((/** @type {string} */ code, /** @type {string[]} */ known) => known.filter((id) => testCode(id) === code));
  /** @type {Message[]} */
  const messages = await readJson('messages.json', []);
  /** @type {Record<string, Contact>} */
  let contacts = await readJson('contacts.json', {});
  /** @type {Record<string, Player>} */
  const players = await readJson('players.json', {});
  /** @type {Topup[]} */
  const topups = await readJson('topups.json', []);

  let adminKey = deps.adminKey ?? '';
  if (!adminKey) {
    const stored = await readJson('admin-key.json', null);
    adminKey = typeof stored?.key === 'string' ? stored.key : '';
    if (!adminKey) {
      adminKey = randomBytes(18).toString('base64url');
      await writeJson('admin-key.json', { key: adminKey });
    }
  }
  const digest = (/** @type {string} */ s) => createHash('sha256').update(s).digest();
  const isAdmin = (/** @type {unknown} */ key) => typeof key === 'string' && key.length > 0 && timingSafeEqual(digest(key), digest(adminKey));

  /** Deletes every address once the promised day has passed. */
  async function expireContacts() {
    if (now() < CONTACTS_END || Object.keys(contacts).length === 0) return false;
    contacts = {};
    await writeJson('contacts.json', contacts);
    return true;
  }
  await expireContacts();

  /** @param {string} playerId @param {'test' | 'dev'} site */
  async function meet(playerId, site) {
    const t = now();
    const p = players[playerId];
    if (!p) players[playerId] = { site, first: t, last: t };
    else if (t - p.last > 60 * 60 * 1000 || p.site !== site) { p.last = t; p.site = site; }
    else return players[playerId];
    await writeJson('players.json', players);
    return players[playerId];
  }

  /** @param {Message} m @param {string} playerId @param {Player} p */
  const isFor = (m, playerId, p) => (m.playerIds ? m.playerIds.includes(playerId) : m.playerId ? m.playerId === playerId : m.site === p.site && m.sentAt >= p.first);

  /**
   * @param {string} path
   * @param {any} body
   * @param {'test' | 'dev'} site the site the request came to
   * @returns {Promise<{ status: number, body: any } | null>} null when the path is not ours
   */
  async function handle(path, body, site) {
    const validId = typeof body?.playerId === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(body.playerId);
    const bad = { status: 400, body: { error: 'fel format' } };

    if (path === '/api/messages/inbox') {
      if (!validId) return bad;
      const p = await meet(body.playerId, site);
      const mine = messages.filter((m) => isFor(m, body.playerId, p)).map(({ id, title, body: text, sentAt }) => ({ id, title, body: text, sentAt }));
      return { status: 200, body: { messages: mine } };
    }

    if (path === '/api/messages/seen') {
      // { playerId, id, kind: 'shown' | 'read' }: only sent by a player who said yes to the log.
      if (!validId || (body.kind !== 'shown' && body.kind !== 'read')) return bad;
      const m = messages.find((x) => x.id === body.id);
      const p = players[body.playerId];
      if (!m || !p || !isFor(m, body.playerId, p)) return { status: 404, body: { error: 'finns inte' } };
      const list = body.kind === 'shown' ? m.shown : m.read;
      if (!list.includes(body.playerId)) {
        list.push(body.playerId);
        if (body.kind === 'read' && !m.shown.includes(body.playerId)) m.shown.push(body.playerId);
        await writeJson('messages.json', messages);
      }
      return { status: 200, body: { ok: true } };
    }

    if (path === '/api/contact/save') {
      if (!validId) return bad;
      if (now() >= CONTACTS_END) return { status: 410, body: { error: 'studien är slut' } };
      const email = typeof body.email === 'string' ? body.email.trim() : '';
      if (!validEmail(email)) return { status: 400, body: { error: 'fel adress' } };
      contacts[body.playerId] = { email, site, savedAt: now() };
      await writeJson('contacts.json', contacts);
      return { status: 200, body: { ok: true } };
    }

    if (path === '/api/contact/remove') {
      if (!validId) return bad;
      if (contacts[body.playerId]) {
        delete contacts[body.playerId];
        await writeJson('contacts.json', contacts);
      }
      return { status: 200, body: { ok: true } };
    }

    if (path === '/api/wallet/redeem') {
      // { playerId, code }: the code must be one Jonas made for this player's test code, and unused.
      if (!validId) return bad;
      const want = normTopup(body.code);
      const t = want ? topups.find((x) => normTopup(x.code) === want) : undefined;
      if (!t || t.testCode !== testCode(body.playerId)) return { status: 404, body: { error: 'okänd kod' } };
      if (t.usedAt) return { status: 409, body: { error: 'redan använd' } };
      t.usedAt = now();
      t.site = site;
      await writeJson('topups.json', topups);
      await appendEvent(site, body.playerId, 'topup_redeemed', { code: t.code, testCode: t.testCode, kronor: TOPUP_KRONOR });
      return { status: 200, body: { ok: true, kronor: TOPUP_KRONOR } };
    }

    if (!path.startsWith('/api/admin/')) return null;
    if (!isAdmin(body?.key)) return { status: 403, body: { error: 'fel nyckel' } };
    await expireContacts();

    const overview = () => {
      const count = (/** @type {'test' | 'dev'} */ s) => Object.values(players).filter((p) => p.site === s).length;
      return {
        players: { test: count('test'), dev: count('dev') },
        messages: messages.slice(-50).reverse().map((m) => ({ id: m.id, title: m.title, body: m.body, sentAt: m.sentAt, to: m.to, push: m.push, recipients: m.recipients, shown: m.shown.length, read: m.read.length })),
        contacts: Object.entries(contacts).map(([id, c]) => ({ code: codeOf(id), email: c.email, site: c.site, savedAt: c.savedAt })).sort((a, b) => a.savedAt - b.savedAt),
        contactsEnd: CONTACTS_END,
        topups: topups.slice(-50).reverse().map((t) => ({ code: t.code, testCode: t.testCode, madeAt: t.madeAt, usedAt: t.usedAt ?? null })),
      };
    };

    if (path === '/api/admin/overview') return { status: 200, body: overview() };

    if (path === '/api/admin/send') {
      // { key, title, body, to: 'test' | 'dev' | <test code>, push }
      const title = typeof body.title === 'string' ? body.title.trim().slice(0, 40) : '';
      const text = typeof body.body === 'string' ? body.body.trim().slice(0, 300) : '';
      if (!title || !text || typeof body.to !== 'string') return bad;
      /** @type {string[]} */
      let ids;
      /** @type {Partial<Message>} */
      let target;
      if (body.to === 'test' || body.to === 'dev') {
        ids = Object.keys(players).filter((id) => players[id].site === body.to);
        target = { site: body.to, to: body.to === 'test' ? 'alla testare' : 'dev' };
      } else {
        const code = body.to.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        // An invitation can be on two phones (Safari and the home screen app); both get it.
        ids = playersOf(code, Object.keys(players)).filter((x) => players[x]);
        if (!ids.length) return { status: 404, body: { error: 'okänd testkod' } };
        target = { site: players[ids[0]].site, playerId: ids[0], playerIds: ids, to: code };
      }
      const t = now();
      /** @type {Message} */
      const m = { id: `m${t.toString(36)}${randomBytes(3).toString('hex')}`, title, body: text, sentAt: t, site: /** @type {'test' | 'dev'} */ (target.site), playerId: target.playerId, playerIds: target.playerIds, to: String(target.to), push: body.push === true, recipients: ids.length, shown: [], read: [] };
      messages.push(m);
      await writeJson('messages.json', messages);
      let pushed = 0;
      for (const id of ids) {
        const ok = m.push ? await sendPush(id, { title: 'Meddelande från Jonas', body: title, tag: `msg-${m.id}` }) : false;
        if (ok) pushed++;
        // The log shows that the message went out, so a visit it caused can be told from one the game caused.
        await appendEvent(players[id].site, id, 'message_sent', { id: m.id, to: m.to, push: ok });
      }
      return { status: 200, body: { ok: true, id: m.id, recipients: ids.length, pushed, ...overview() } };
    }

    if (path === '/api/admin/topup') {
      // { key, testCode }: a new one-time code for that tester.
      const code = typeof body.testCode === 'string' ? body.testCode.toUpperCase().replace(/[^A-Z0-9]/g, '') : '';
      if (!/^[A-Z0-9]{6}$/.test(code)) return { status: 400, body: { error: 'fel testkod' } };
      let made = '';
      do {
        const bytes = randomBytes(4);
        made = 'FYLL-' + Array.from(bytes, (b) => CODE_ALPHABET[b & 31]).join('');
      } while (topups.some((t) => t.code === made));
      topups.push({ code: made, testCode: code, madeAt: now() });
      await writeJson('topups.json', topups);
      return { status: 200, body: { ok: true, code: made, ...overview() } };
    }

    if (path === '/api/admin/wipe-contacts') {
      const removed = Object.keys(contacts).length;
      contacts = {};
      await writeJson('contacts.json', contacts);
      return { status: 200, body: { ok: true, removed, ...overview() } };
    }

    return { status: 404, body: { error: 'finns inte' } };
  }

  return { handle, expireContacts, isAdmin, get adminKey() { return adminKey; } };
}
