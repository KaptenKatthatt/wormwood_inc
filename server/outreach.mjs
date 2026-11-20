// @ts-check
/**
 * Testarnas kontor (Jonas, 2026-11-20): the e-mails to the testers, most of
 * them sent by themselves, and the tables Jonas used to need a command for.
 *
 *  - Mail goes out through AgentMail (Jonas's account; the key is
 *    AGENTMAIL_API_KEY or AGENTMAIL in the server's environment, the sending
 *    inbox AGENTMAIL_INBOX). Replies go to hej@jonasolson.se. Without a key or
 *    an inbox nothing is sent, and the office says so.
 *  - Every mail, sent or not, is kept in outbox.json with a key such as
 *    "day8:K7M2QX", so no automatic mail reaches the same person twice.
 *  - The automatic mails, each one can be switched off in the office:
 *      confirm  right after someone signs up
 *      invite   when Jonas picks a round for someone (with the personal link)
 *      before   18.00 the evening before the round opens
 *      start    07.00 the day the round opens
 *      quiet    once, three days after the round opened (or the invitation
 *               came) if the game has not been opened
 *      day8     a week after the first day, if the questions are not answered
 *      thanks   from 20 December, to everyone who played (off until Jonas has
 *               written what the study looked at)
 *    Automatic mails go out between 07.00 and 21.00 Swedish time only.
 *  - The texts are templates Jonas can change; {namn}, {lank}, {kod},
 *    {omgang} and {startdag} are filled in.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { CONTACTS_END } from './reach.mjs';
import { parseLines, tidy, playerRows, hookRows, eventRows, toCsv } from '../tools/log-report.mjs';

export const AUTOS = /** @type {const} */ (['confirm', 'invite', 'before', 'start', 'quiet', 'day8', 'thanks']);
/** @typedef {typeof AUTOS[number]} Auto */
const DAY = 86_400_000;
const HOUR = 3_600_000;
/** Automatic mails a day; AgentMail's free plan allows 100 in all. */
export const DAILY_LIMIT = 90;
/** The day the thank-you mail may go, after the study ends on 19 December. */
export const THANKS_FROM = Date.parse('2026-12-20T08:00:00+01:00');
export const REPLY_TO = 'hej@jonasolson.se';

const SIGN = '\n\nHälsningar,\nJonas';
/** @type {Record<Auto, { subject: string, text: string }>} */
export const DEFAULT_TEMPLATES = {
  confirm: { subject: 'Tack för din anmälan till Skärgårdsbyn', text: 'Hej {namn}!\n\nTack för att du vill testa Skärgårdsbyn. Jag hör av mig med en personlig länk till spelet.' + SIGN },
  invite: { subject: 'Din inbjudan till Skärgårdsbyn', text: 'Hej {namn}!\n\nTack för att du vill testa Skärgårdsbyn. {start}\n{lank}\n\nDin kod är {kod}, om spelet frågar efter den. Spela i Chrome på Android eller Safari på iPhone.' + SIGN },
  before: { subject: 'I morgon börjar Skärgårdsbyn', text: 'Hej {namn}!\n\nI morgon, {startdag}, börjar din omgång. Öppna länken på din mobil då:\n{lank}' + SIGN },
  start: { subject: 'Nu kan du spela Skärgårdsbyn', text: 'Hej {namn}!\n\nI dag börjar din omgång, och nu går det att spela. Öppna länken på din mobil:\n{lank}\n\nSpela så mycket eller lite du vill.' + SIGN },
  quiet: { subject: 'Har du hunnit börja?', text: 'Hej {namn}!\n\nJag ser att spelet inte har öppnats än. Ingen fara, men här är länken igen om du vill komma igång:\n{lank}\n\nOm något krånglar kan du svara på det här mejlet.' + SIGN },
  day8: { subject: 'Några korta frågor om Skärgårdsbyn', text: 'Hej {namn}!\n\nNu har du haft spelet en vecka. När du öppnar det nästa gång kommer några korta frågor. De tar ett par minuter och hjälper mig mycket.\n{lank}' + SIGN },
  thanks: { subject: 'Tack för att du testade Skärgårdsbyn', text: 'Hej {namn}!\n\nTestet är slut. Tack för att du var med!\n\n[Här skriver Jonas vad studien undersökte.]' + SIGN },
};
/** @type {Record<Auto, boolean>} */
const DEFAULT_AUTOS = { confirm: true, invite: true, before: true, start: true, quiet: true, day8: true, thanks: false };

/** Hour of the day in Sweden. */
export const swedishHour = (/** @type {number} */ t) => Number(new Intl.DateTimeFormat('sv-SE', { hour: 'numeric', hour12: false, timeZone: 'Europe/Stockholm' }).format(t));
export const swedishDay = (/** @type {number} */ t) => new Date(t).toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Stockholm' });
const ROUND_WORDS = /** @type {Record<string, string>} */ ({ pilot: 'piloten', 1: 'omgång 1', 2: 'omgång 2', egen: 'din egen vecka', jonas: 'Jonas själv' });

/** Fills in {namn} and the like; unknown names are left as they are. */
export function fill(/** @type {string} */ text, /** @type {Record<string, string>} */ v) {
  return text.replace(/\{([a-z]+)\}/g, (m, k) => (k in v ? v[k] : m));
}

/**
 * @typedef {{ id: string, at: number, key: string, kind: Auto | 'manual' | 'topup', to: string, code: string, subject: string, text: string, status: 'sent' | 'failed' | 'off' | 'stopped', error?: string }} Mail
 */

/**
 * @param {{
 *   readJson: (name: string, fallback: any) => Promise<any>,
 *   writeJson: (name: string, value: any) => Promise<void>,
 *   now: () => number,
 *   dataDir: string,
 *   invites: any,
 *   reach: any,
 *   testSite: string,
 *   fetch?: typeof fetch,
 *   apiKey?: string,
 *   inbox?: string,
 * }} deps
 */
export async function createOutreach(deps) {
  const { readJson, writeJson, now, invites, reach } = deps;
  const doFetch = deps.fetch ?? globalThis.fetch;
  const apiKey = deps.apiKey ?? '';
  const inbox = deps.inbox ?? '';
  /** @type {Mail[]} */
  let outbox = await readJson('outbox.json', []);
  /** @type {Record<Auto, boolean>} */
  const autos = { ...DEFAULT_AUTOS, ...(await readJson('autos.json', {})) };
  /** @type {Partial<Record<Auto, { subject: string, text: string }>>} */
  const templates = await readJson('templates.json', {});
  const template = (/** @type {Auto} */ k) => ({ ...DEFAULT_TEMPLATES[k], ...(templates[k] ?? {}) });
  const ready = () => Boolean(apiKey && inbox);
  const done = (/** @type {string} */ key) => outbox.some((m) => m.key === key && (m.status === 'sent' || m.status === 'stopped'));
  const linkFor = (/** @type {string} */ code) => `https://${deps.testSite}/?kod=${code}`;
  /** The address of an invitation: its own, or the one from the signup (invitations made before 0.31.0 kept none). */
  const emailOf = (/** @type {any} */ inv) => inv?.email || (inv?.signupId ? invites.raw().signups.find((/** @type {any} */ s) => s.id === inv.signupId)?.email : '') || '';

  /** Sends one mail and keeps it in the outbox. */
  async function send(/** @type {{ key: string, kind: Mail['kind'], to: string, code: string, subject: string, text: string }} */ m) {
    /** @type {Mail} */
    const rec = { id: `e${now().toString(36)}${randomBytes(3).toString('hex')}`, at: now(), ...m, status: 'off' };
    const today = new Date(now()).toLocaleDateString('sv-SE', { timeZone: 'Europe/Stockholm' });
    const sentToday = outbox.filter((x) => x.status === 'sent' && new Date(x.at).toLocaleDateString('sv-SE', { timeZone: 'Europe/Stockholm' }) === today).length;
    if (!ready()) rec.error = 'mejlen är inte inkopplade på servern';
    // AgentMail's free plan sends 100 a day; the last few are kept for Jonas's own mails.
    else if (sentToday >= DAILY_LIMIT && m.kind !== 'manual' && m.kind !== 'invite' && m.kind !== 'topup') rec.error = 'dagens gräns för automatiska mejl är nådd, försöker i morgon';
    else if (sentToday >= DAILY_LIMIT + 8) rec.error = 'dagens gräns för mejl är nådd';
    else {
      try {
        const r = await doFetch(`https://api.agentmail.to/v0/inboxes/${encodeURIComponent(inbox)}/messages/send`, {
          method: 'POST',
          headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
          body: JSON.stringify({ to: [m.to], reply_to: REPLY_TO, subject: m.subject, text: m.text }),
        });
        if (r.ok) rec.status = 'sent';
        else { rec.status = 'failed'; rec.error = `AgentMail svarade ${r.status}: ${(await r.text()).slice(0, 200)}`; }
      } catch (e) {
        rec.status = 'failed';
        rec.error = String(/** @type {any} */ (e)?.message ?? e).slice(0, 200);
      }
    }
    outbox.push(rec);
    if (outbox.length > 2000) outbox = outbox.slice(-2000);
    await writeJson('outbox.json', outbox);
    return rec;
  }

  /** The words filled into a template for one invitation. */
  function wordsFor(/** @type {string} */ code) {
    const { invites: all, rounds } = invites.raw();
    const inv = all[code];
    const opensAt = rounds[inv.round]?.opensAt;
    const startdag = opensAt ? swedishDay(opensAt) : '';
    const omgang = ROUND_WORDS[inv.round] ?? inv.round;
    const start = inv.round === 'egen'
      ? 'Du börjar när det passar dig. Testet varar en vecka från den dag du öppnar spelet första gången, och sedan får du spela vidare så mycket du vill. Öppna den här länken på din mobil:'
      : inv.round === 'jonas' ? 'Öppna den här länken på din mobil:'
      : opensAt ? `Du är med i ${omgang}, som börjar ${startdag}. Öppna den här länken på din mobil då:` : `Du är med i ${omgang}. Öppna den här länken på din mobil:`;
    return { namn: inv.name, kod: code, lank: linkFor(code), omgang, startdag, start };
  }

  /** One automatic mail to one invitation, unless it went already. */
  async function auto(/** @type {Auto} */ kind, /** @type {string} */ code, force = false) {
    const inv = invites.raw().invites[code];
    const key = `${kind}:${code}`;
    const to = emailOf(inv);
    if (!to || (!force && (!autos[kind] || done(key)))) return null;
    const t = template(kind);
    const w = wordsFor(code);
    return send({ key, kind, to, code, subject: fill(t.subject, w), text: fill(t.text, w) });
  }

  invites.hooks.onSignup = async (/** @type {any} */ s) => {
    if (!autos.confirm || now() >= CONTACTS_END) return;
    const key = `confirm:${s.id}`;
    if (done(key)) return;
    const t = template('confirm');
    await send({ key, kind: 'confirm', to: s.email, code: '', subject: fill(t.subject, { namn: s.name }), text: fill(t.text, { namn: s.name }) });
  };
  invites.hooks.onInvite = async (/** @type {string} */ code) => {
    if (!autos.invite) return { mailed: false, error: 'inbjudningsmejlet är avstängt' };
    const r = await auto('invite', code);
    return r ? { mailed: r.status === 'sent', error: r.error } : { mailed: false };
  };

  /**
   * What is due between from and to: [{ kind, code, at }]. The office shows the
   * next day of it; tick() sends what is due now.
   */
  function plan(/** @type {number} */ from, /** @type {number} */ to) {
    const { invites: all, rounds } = invites.raw();
    /** @type {{ kind: Auto, code: string, name: string, at: number }[]} */
    const out = [];
    const add = (/** @type {Auto} */ kind, /** @type {string} */ code, /** @type {number} */ at, /** @type {number} */ until) => {
      if (!autos[kind] || done(`${kind}:${code}`)) return;
      if (at < to && until > from) out.push({ kind, code, name: all[code].name, at: Math.max(at, from) });
    };
    for (const [code, inv] of Object.entries(all)) {
      if (!emailOf(inv) || inv.round === 'jonas') continue;
      const opensAt = rounds[inv.round]?.opensAt;
      const timed = inv.round !== 'egen' && typeof opensAt === 'number' && opensAt > 0;
      if (timed && inv.createdAt < opensAt - 6 * HOUR) add('before', code, opensAt - 6 * HOUR, opensAt);
      if (timed && inv.createdAt < opensAt + 7 * HOUR) add('start', code, opensAt + 7 * HOUR, opensAt + DAY);
      const openFrom = inv.round === 'egen' ? inv.createdAt : timed ? Math.max(opensAt, inv.createdAt) : null;
      if (openFrom !== null && !inv.firstSeen) add('quiet', code, openFrom + 3 * DAY, Infinity);
      if (inv.firstSeen && !inv.answered) add('day8', code, inv.firstSeen + 7 * DAY, Infinity);
      if (inv.firstSeen) add('thanks', code, THANKS_FROM, CONTACTS_END);
    }
    return out.sort((a, b) => a.at - b.at);
  }

  /** Sends what is due; called every few seconds by the server. */
  async function tick() {
    const t = now();
    if (!ready() || t >= CONTACTS_END) return 0;
    const h = swedishHour(t);
    if (h < 7 || h >= 21) return 0;
    let n = 0;
    for (const p of plan(t - 400 * DAY, t + 1)) {
      if (p.at > t) continue;
      // A mail AgentMail refused is tried again an hour later, not every few seconds.
      const key = `${p.kind}:${p.code}`;
      if (outbox.some((m) => m.key === key && (m.status === 'failed' || m.status === 'off') && t - m.at < HOUR)) continue;
      const r = await auto(p.kind, p.code);
      if (r) n++;
    }
    return n;
  }

  // ---- the tables (tools/log-report.mjs, on the playtest log only) ---------
  async function logEvents() {
    const dir = join(deps.dataDir, 'logs');
    const files = (await readdir(dir).catch(() => [])).filter((f) => f.endsWith('.ndjson')).sort();
    const events = [];
    for (const f of files) events.push(...parseLines(await readFile(join(dir, f), 'utf8')).events);
    // Jonas's own play is not data (round "jonas").
    const mine = new Set(Object.values(invites.raw().invites).filter((/** @type {any} */ i) => i.round === 'jonas').flatMap((/** @type {any} */ i) => i.players));
    return tidy(events.filter((e) => !mine.has(e.playerId)));
  }
  function answerRows(/** @type {any[]} */ events) {
    return events
      .filter((e) => e.name === 'questionnaire_part1' || e.name === 'questionnaire_part2')
      .map((e) => ({ testkod: invites.codeOf(e.playerId), del: e.name.endsWith('1') ? 1 : 2, testdag: e.data?.testDay ?? '', tid: new Date(e.received ?? e.t).toISOString(), svar: JSON.stringify(e.data?.answers ?? {}) }));
  }

  /** Removes one tester's lines from the playtest log, as the consent promises. */
  async function wipe(/** @type {string} */ code) {
    const ids = new Set(invites.playersOf(code, Object.keys(await readJson('players.json', {}))));
    if (!ids.size) return 0;
    const dir = join(deps.dataDir, 'logs');
    let removed = 0;
    for (const f of (await readdir(dir).catch(() => [])).filter((x) => x.endsWith('.ndjson'))) {
      const text = await readFile(join(dir, f), 'utf8');
      const keep = text.split('\n').filter((line) => {
        if (!line.trim()) return false;
        try { if (ids.has(JSON.parse(line).playerId)) { removed++; return false; } } catch { /* keep odd lines */ }
        return true;
      });
      await writeFile(join(dir, f), keep.length ? keep.join('\n') + '\n' : '');
    }
    return removed;
  }

  function overview() {
    const t = now();
    return {
      mail: { ready: ready(), from: inbox, replyTo: REPLY_TO },
      autos,
      templates: Object.fromEntries(AUTOS.map((k) => [k, template(k)])),
      outbox: outbox.slice(-150).reverse(),
      upcoming: plan(t, t + DAY),
    };
  }

  /**
   * /api/admin/kontor/* (the caller has checked the admin key).
   * @param {string} path @param {any} body
   * @returns {Promise<{ status: number, body: any } | null>}
   */
  async function admin(path, body) {
    const bad = (/** @type {string} */ error) => ({ status: 400, body: { error } });
    if (path === '/api/admin/kontor/overview') return { status: 200, body: overview() };

    if (path === '/api/admin/kontor/autos') {
      // { autos: { day8: false, ... } }
      for (const k of AUTOS) if (typeof body.autos?.[k] === 'boolean') autos[k] = body.autos[k];
      await writeJson('autos.json', autos);
      return { status: 200, body: overview() };
    }
    if (path === '/api/admin/kontor/template') {
      // { kind, subject, text } or { kind, reset: true }
      const kind = /** @type {Auto} */ (body.kind);
      if (!AUTOS.includes(kind)) return bad('okänt mejl');
      if (body.reset === true) delete templates[kind];
      else {
        const subject = typeof body.subject === 'string' ? body.subject.trim().slice(0, 120) : '';
        const text = typeof body.text === 'string' ? body.text.trim().slice(0, 4000) : '';
        if (!subject || !text) return bad('ämne och text behövs');
        templates[kind] = { subject, text };
      }
      await writeJson('templates.json', templates);
      return { status: 200, body: overview() };
    }
    if (path === '/api/admin/kontor/stop') {
      // { kind, code }: that automatic mail never goes.
      if (!AUTOS.includes(body.kind) || typeof body.code !== 'string') return bad('fel format');
      outbox.push({ id: `e${now().toString(36)}${randomBytes(3).toString('hex')}`, at: now(), key: `${body.kind}:${body.code}`, kind: body.kind, to: '', code: body.code, subject: '', text: '', status: 'stopped' });
      await writeJson('outbox.json', outbox);
      return { status: 200, body: overview() };
    }
    if (path === '/api/admin/kontor/resend') {
      // { kind, code }: send that mail again now, e.g. the invitation.
      if (!AUTOS.includes(body.kind) || typeof body.code !== 'string') return bad('fel format');
      const r = await auto(body.kind, body.code, true);
      if (!r) return bad('ingen e-postadress för den testaren');
      return { status: 200, body: { ...overview(), sent: r } };
    }
    if (path === '/api/admin/kontor/mail') {
      // { code, subject, text }: Jonas writes to one tester.
      const inv = invites.raw().invites[String(body.code)];
      if (!emailOf(inv)) return bad('ingen e-postadress för den testaren');
      const subject = typeof body.subject === 'string' ? body.subject.trim().slice(0, 120) : '';
      const text = typeof body.text === 'string' ? body.text.trim().slice(0, 4000) : '';
      if (!subject || !text) return bad('ämne och text behövs');
      const w = wordsFor(String(body.code));
      const r = await send({ key: `manual:${body.code}:${now()}`, kind: 'manual', to: emailOf(inv), code: String(body.code), subject: fill(subject, w), text: fill(text, w) });
      return { status: 200, body: { ...overview(), sent: r } };
    }
    if (path === '/api/admin/kontor/topup') {
      // { code }: a top-up code for the tester, mailed to them when there is an address.
      const code = String(body.code ?? '');
      const made = await reach.handle('/api/admin/topup', { key: reach.adminKey, testCode: code }, 'test');
      if (made?.status !== 200) return made ?? bad('det gick inte');
      const inv = invites.raw().invites[code];
      let mail = null;
      if (emailOf(inv)) {
        const w = wordsFor(code);
        mail = await send({ key: `topup:${code}:${made.body.code}`, kind: 'topup', to: emailOf(inv), code, subject: 'Mer låtsaspengar i Skärgårdsbyn', text: `Hej ${w.namn}!\n\nHär är en kod för 100 kr till i spelets butik: ${made.body.code}\n\nSkriv in den i butiken, under testplånboken.${SIGN}` });
      }
      return { status: 200, body: { ...overview(), topup: made.body.code, sent: mail } };
    }
    if (path === '/api/admin/kontor/report') {
      // { table: 'players' | 'hooks' | 'events' | 'answers', csv?: true }
      const events = await logEvents();
      const make = { players: playerRows, hooks: hookRows, events: eventRows, answers: answerRows }[/** @type {'players'} */ (body.table)];
      if (!make) return bad('okänd tabell');
      const rows = make(events);
      if (body.table === 'players') for (const r of rows) r.code = invites.codeOf(r.player);
      return { status: 200, body: body.csv === true ? { csv: toCsv(rows) } : { rows: rows.slice(0, 500), total: rows.length } };
    }
    if (path === '/api/admin/kontor/wipe') {
      // { code, confirm: code }: deletes that tester's lines in the playtest log.
      const code = String(body.code ?? '');
      if (!code || body.confirm !== code) return bad('skriv testkoden igen för att bekräfta');
      return { status: 200, body: { removed: await wipe(code) } };
    }
    return null;
  }

  return { admin, tick, plan, overview, send, auto };
}
