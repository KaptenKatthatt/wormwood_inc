// @ts-check
/**
 * Letting the testers in (Jonas, 2026-11-20): nobody plays the playtest build
 * until Jonas has let them in.
 *
 *  - People sign up on jonasolson.se/exjobb (POST /api/signup, the only route
 *    another site may call). Name, e-mail, phone and a note are kept in
 *    signups.json, apart from the playtest log, and deleted after 31 January 2027
 *    like the e-mail addresses in reach.mjs.
 *  - Jonas makes a personal invitation for each person he picks, in a round
 *    (the pilot, round 1, round 2, "egen" for a tester who starts when it
 *    suits them and has a week of their own, or "Jonas" for himself). The
 *    "egen" testers sign up on a page of their own that Jonas sends them
 *    (kind: 'egen'); the ordinary page never mentions it. The invitation's
 *    code is the tester's test code and goes in the link he mails:
 *    https://skargardsbyn.<ip>.sslip.io/?kod=K7M2QX
 *  - The game asks /api/invite/check with the code and its player id. A code
 *    serves at most two players, because an iPhone's home screen app does not
 *    share its storage with Safari. A round opens on the day Jonas sets; before
 *    that the game only says when it opens.
 *
 * Every invitation code is made here, from the same letters as the old test
 * codes (no 0/O or 1/I), and never equal to an old code in use.
 */
import { randomBytes } from 'node:crypto';
import { CONTACTS_END, testCode, validEmail } from './reach.mjs';

export const ROUNDS = /** @type {const} */ (['pilot', '1', '2', 'egen', 'jonas']);
/** Rounds that are always open: Jonas himself, and testers who start on their own with a week of their own. */
const ALWAYS_OPEN = ['egen', 'jonas'];
/** @typedef {typeof ROUNDS[number]} Round */
/** A code may be used on this many phones: Safari and the home screen app on an iPhone are two. */
export const PHONES_PER_CODE = 2;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_RE = /^[A-Z2-9]{6}$/;
/** Where the signup form may be sent from. */
export const SIGNUP_ORIGINS = ['https://www.jonasolson.se', 'https://jonasolson.se'];

/**
 * @typedef {{ id: string, at: number, name: string, email: string, phone: 'android' | 'iphone', where: 'plats' | 'distans', note: string, kind: 'omgang' | 'egen' }} Signup
 * @typedef {{ round: Round, name: string, signupId: string | null, createdAt: number, players: string[], firstSeen: number | null, lastSeen: number | null, email?: string, answered?: number | null }} Invite
 */

/** Makes a code like the test codes. */
export function newCode() {
  const bytes = randomBytes(6);
  let out = '';
  for (const b of bytes) out += ALPHABET[b & 31];
  return out;
}

/** Tidies what a person typed: "k7m-2qx " -> "K7M2QX". */
export const cleanCode = (/** @type {unknown} */ v) => (typeof v === 'string' ? v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12) : '');

/**
 * @param {{
 *   readJson: (name: string, fallback: any) => Promise<any>,
 *   writeJson: (name: string, value: any) => Promise<void>,
 *   now: () => number,
 *   appendEvent: (site: 'test' | 'dev', playerId: string, name: string, data: object) => Promise<void>,
 *   sendPush?: (playerId: string, payload: object) => Promise<boolean>,
 *   onSignup?: (signup: Signup) => Promise<void>,
 *   onInvite?: (code: string) => Promise<{ mailed: boolean, error?: string }>,
 * }} deps
 */
export async function createInvites(deps) {
  const { readJson, writeJson, now, appendEvent, sendPush } = deps;
  /** Set by server/outreach.mjs, which is made after this module. */
  const hooks = { onSignup: deps.onSignup, onInvite: deps.onInvite };
  /** @type {Signup[]} */
  let signups = await readJson('signups.json', []);
  /** @type {Record<string, Invite>} */
  const invites = await readJson('invites.json', {});
  /** @type {Record<Round, { opensAt: number | null }>} */
  const rounds = { pilot: { opensAt: null }, 1: { opensAt: null }, 2: { opensAt: null }, egen: { opensAt: 0 }, jonas: { opensAt: 0 }, ...(await readJson('rounds.json', {})) };
  for (const r of ALWAYS_OPEN) rounds[/** @type {Round} */ (r)] = { opensAt: 0 };
  /** Jonas's own phones (dev player ids) that get a notification when someone signs up. */
  /** @type {string[]} */
  let watchers = await readJson('signup-watchers.json', []);

  /** Tells Jonas's phones about a new signup; never holds up or fails the signup. */
  async function announce(/** @type {Signup} */ s) {
    if (!sendPush || !watchers.length) return;
    const what = s.kind === 'egen' ? 'egen start' : 'omgång 1 eller 2';
    const body = `${s.name} vill testa (${what}), ${s.phone === 'iphone' ? 'iPhone' : 'Android'}, ${s.where === 'plats' ? 'kan ses i Skåne' : 'på distans'}.`;
    await Promise.all(watchers.map((id) => sendPush(id, { title: 'Ny anmälan', body, tag: `signup-${s.id}` }).catch(() => false)));
  }

  /** The names and addresses go when the promised day has passed; the codes and rounds stay for the analysis. */
  async function expire() {
    if (now() < CONTACTS_END) return false;
    let changed = false;
    if (signups.length) { signups = []; changed = true; await writeJson('signups.json', signups); }
    for (const inv of Object.values(invites)) if (inv.name || inv.email) { inv.name = ''; inv.email = ''; changed = true; }
    if (changed) await writeJson('invites.json', invites);
    return changed;
  }
  await expire();

  /** The test code of a player: the invitation's code when the player came in with one. */
  function codeOf(/** @type {string} */ playerId) {
    for (const [code, inv] of Object.entries(invites)) if (inv.players.includes(playerId)) return code;
    return testCode(playerId);
  }
  /** The player ids behind a test code, old or new. */
  function playersOf(/** @type {string} */ code, /** @type {string[]} */ known) {
    const inv = invites[code];
    if (inv) return inv.players.slice();
    return known.filter((id) => testCode(id) === code);
  }

  const isOpen = (/** @type {Round} */ r) => {
    const at = rounds[r]?.opensAt;
    return typeof at === 'number' && at <= now();
  };

  function overview(/** @type {string} */ playerId = '') {
    const t = now();
    const byId = new Map(signups.map((s) => [s.id, s]));
    const invited = new Set(Object.values(invites).map((i) => i.signupId).filter(Boolean));
    return {
      rounds: ROUNDS.map((r) => ({ round: r, opensAt: rounds[r].opensAt, open: isOpen(r), invited: Object.values(invites).filter((i) => i.round === r).length })),
      signups: signups.filter((s) => !invited.has(s.id)).map((s) => ({ ...s, kind: s.kind ?? 'omgang' })),
      invites: Object.entries(invites)
        .map(([code, i]) => {
          const s = i.signupId ? byId.get(i.signupId) : undefined;
          return {
            code, round: i.round, name: i.name, createdAt: i.createdAt, phones: i.players.length, firstSeen: i.firstSeen, lastSeen: i.lastSeen,
            day: i.firstSeen ? Math.floor((t - i.firstSeen) / 86_400_000) + 1 : null,
            email: i.email || s?.email || '', phone: s?.phone ?? '', where: s?.where ?? '', note: s?.note ?? '', answered: i.answered ?? null, players: i.players.slice(),
          };
        })
        .sort((a, b) => a.createdAt - b.createdAt),
      signupsEnd: CONTACTS_END,
      notifyHere: Boolean(playerId) && watchers.includes(playerId),
    };
  }

  /**
   * The signup form on jonasolson.se.
   * @param {any} body
   */
  async function signup(body) {
    // A field people never see: a robot that fills it gets a thank-you and nothing is kept.
    if (typeof body?.website === 'string' && body.website) return { status: 200, body: { ok: true } };
    const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 60) : '';
    const email = typeof body?.email === 'string' ? body.email.trim().slice(0, 254) : '';
    const phone = body?.phone === 'android' || body?.phone === 'iphone' ? body.phone : null;
    const where = body?.where === 'plats' || body?.where === 'distans' ? body.where : null;
    const note = typeof body?.note === 'string' ? body.note.trim().slice(0, 300) : '';
    const kind = body?.kind === 'egen' ? 'egen' : 'omgang';
    if (!name || !validEmail(email) || !phone || !where || body?.age !== true || body?.ok !== true) return { status: 400, body: { error: 'fel format' } };
    if (now() >= CONTACTS_END) return { status: 410, body: { error: 'testet är slut' } };
    if (signups.length >= 500) return { status: 429, body: { error: 'för många anmälningar' } };
    // Signing up twice with the same address replaces the first.
    signups = signups.filter((s) => s.email.toLowerCase() !== email.toLowerCase());
    const added = { id: `s${now().toString(36)}${randomBytes(3).toString('hex')}`, at: now(), name, email, phone, where, note, kind: /** @type {'omgang' | 'egen'} */ (kind) };
    signups.push(added);
    await writeJson('signups.json', signups);
    void announce(added);
    if (hooks.onSignup) void hooks.onSignup(added).catch((e) => console.error('onSignup', e));
    return { status: 200, body: { ok: true } };
  }

  /**
   * The game asks with its code. 404: no such code; 409: already on two other phones.
   * @param {any} body
   * @param {'test' | 'dev'} site
   */
  async function check(body, site) {
    const code = cleanCode(body?.code);
    const playerId = typeof body?.playerId === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(body.playerId) ? body.playerId : '';
    if (!CODE_RE.test(code) || !playerId) return { status: 400, body: { error: 'fel format' } };
    const inv = invites[code];
    if (!inv) return { status: 404, body: { error: 'okänd kod' } };
    const t = now();
    const open = isOpen(inv.round);
    // The tester's first day is the first time the game opened for them, not the day the link came.
    const started = open && !inv.firstSeen;
    if (started) inv.firstSeen = t;
    if (!inv.players.includes(playerId)) {
      if (inv.players.length >= PHONES_PER_CODE) return { status: 409, body: { error: 'koden används redan' } };
      inv.players.push(playerId);
      inv.lastSeen = t;
      await writeJson('invites.json', invites);
      await appendEvent(site, playerId, 'invite_used', { code, round: inv.round, phone: inv.players.length });
    } else if (started || !inv.lastSeen || t - inv.lastSeen > 10 * 60 * 1000) {
      inv.lastSeen = t;
      await writeJson('invites.json', invites);
    }
    return { status: 200, body: { ok: true, code, round: inv.round, opensAt: rounds[inv.round].opensAt, open } };
  }

  /**
   * Jonas's side (the caller has checked the admin key).
   * @param {string} path
   * @param {any} body
   * @returns {Promise<{ status: number, body: any } | null>}
   */
  async function admin(path, body) {
    await expire();
    const round = /** @type {Round} */ (ROUNDS.includes(body?.round) ? body.round : '');
    const me = typeof body?.playerId === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(body.playerId) ? body.playerId : '';
    const view = () => overview(me);
    if (path === '/api/admin/invites/overview') return { status: 200, body: view() };

    if (path === '/api/admin/invites/notify') {
      // { playerId, on }: this phone gets (or stops getting) a notification for each new signup.
      if (!me || typeof body.on !== 'boolean') return { status: 400, body: { error: 'fel format' } };
      watchers = watchers.filter((id) => id !== me);
      if (body.on) watchers = [...watchers, me].slice(-5);
      await writeJson('signup-watchers.json', watchers);
      return { status: 200, body: { ok: true, ...view() } };
    }

    if (path === '/api/admin/invites/create') {
      // { signupId } or { name } for someone who did not sign up (the pilot friend), and a round.
      if (!round) return { status: 400, body: { error: 'välj omgång' } };
      const s = typeof body.signupId === 'string' ? signups.find((x) => x.id === body.signupId) : undefined;
      if (body.signupId && !s) return { status: 404, body: { error: 'anmälan finns inte' } };
      if (s && Object.values(invites).some((i) => i.signupId === s.id)) return { status: 409, body: { error: 'redan inbjuden' } };
      const name = s ? s.name : typeof body.name === 'string' ? body.name.trim().slice(0, 60) : '';
      if (!name) return { status: 400, body: { error: 'skriv ett namn' } };
      const typed = typeof body.email === 'string' ? body.email.trim().slice(0, 254) : '';
      if (typed && !validEmail(typed)) return { status: 400, body: { error: 'e-postadressen ser fel ut' } };
      const email = s ? s.email : typed;
      let code = newCode();
      while (invites[code]) code = newCode();
      invites[code] = { round, name, signupId: s?.id ?? null, createdAt: now(), players: [], firstSeen: null, lastSeen: null, email, answered: null };
      await writeJson('invites.json', invites);
      // The invitation mail goes by itself when there is an address (server/outreach.mjs).
      const mail = body.mail !== false && email && hooks.onInvite ? await hooks.onInvite(code).catch((e) => ({ mailed: false, error: String(e?.message ?? e) })) : { mailed: false };
      return { status: 200, body: { ok: true, code, mail, ...view() } };
    }

    if (path === '/api/admin/invites/round') {
      // { round, opensAt: ms | null }
      if (!round || ALWAYS_OPEN.includes(round)) return { status: 400, body: { error: 'fel omgång' } };
      const at = body.opensAt === null ? null : typeof body.opensAt === 'number' && Number.isFinite(body.opensAt) ? body.opensAt : undefined;
      if (at === undefined) return { status: 400, body: { error: 'fel datum' } };
      rounds[round] = { opensAt: at };
      const { jonas, egen, ...stored } = rounds;
      await writeJson('rounds.json', stored);
      return { status: 200, body: { ok: true, ...view() } };
    }

    if (path === '/api/admin/invites/remove') {
      // { code } takes an invitation back (the game then locks again); { signupId } removes a signup.
      const code = cleanCode(body.code);
      if (code && invites[code]) {
        delete invites[code];
        await writeJson('invites.json', invites);
        return { status: 200, body: { ok: true, ...view() } };
      }
      if (typeof body.signupId === 'string' && signups.some((s) => s.id === body.signupId)) {
        signups = signups.filter((s) => s.id !== body.signupId);
        await writeJson('signups.json', signups);
        return { status: 200, body: { ok: true, ...view() } };
      }
      return { status: 404, body: { error: 'finns inte' } };
    }
    return null;
  }

  /** The tester behind a player has answered the questions (the game logged questionnaire_part1). */
  async function markAnswered(/** @type {string} */ playerId) {
    for (const inv of Object.values(invites)) {
      if (inv.players.includes(playerId) && !inv.answered) { inv.answered = now(); await writeJson('invites.json', invites); }
    }
  }
  /** For server/outreach.mjs: the live records (read only) and the round days. */
  const raw = () => ({ invites, signups, rounds });

  return { signup, check, admin, codeOf, playersOf, expire, overview, markAnswered, raw, hooks };
}
