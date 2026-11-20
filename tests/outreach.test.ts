import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import http from 'node:http';
import { createApp } from '../server/app.mjs';
import { fill, swedishHour } from '../server/outreach.mjs';

const TEST = 'skargardsbyn.84.247.143.6.sslip.io';
const DEV = 'dev.skargardsbyn.84.247.143.6.sslip.io';
const KEY = 'the-admin-key';
const INBOX = 'jonas-exjobb@agentmail.to';
let base = '';
let app: any;
let dataDir = '';
let clock = Date.parse('2026-11-21T10:00:00+01:00');
const sent: { url: string; body: any }[] = [];
let refuse = false;

beforeAll(async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ww-out-'));
  dataDir = join(dir, 'data');
  await mkdir(join(dir, 'dist'));
  await writeFile(join(dir, 'dist', 'index.html'), '<h1>spel</h1>');
  const fakeFetch = (async (url: string, init: any) => {
    sent.push({ url, body: JSON.parse(init.body) });
    return refuse ? new Response('nej', { status: 400 }) : new Response('{"message_id":"x"}', { status: 200 });
  }) as unknown as typeof fetch;
  app = await createApp({ distDir: join(dir, 'dist'), dataDir, now: () => clock, adminKey: KEY, mail: { apiKey: 'k', inbox: INBOX, fetch: fakeFetch } });
  await new Promise<void>((ok) => app.server.listen(0, '127.0.0.1', ok));
  base = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`;
});
afterAll(() => app.server.close());

const request = (method: string, host: string, p: string, body?: unknown, headers: Record<string, string> = {}) =>
  new Promise<{ status: number; json: any; text: string }>((ok, fail) => {
    const data = body === undefined ? '' : JSON.stringify(body);
    const r = http.request(base + p, { method, headers: { host, 'content-type': 'application/json', 'content-length': Buffer.byteLength(data), 'x-forwarded-for': headers.ip ?? '10.0.0.9', ...headers } }, (res) => {
      let b = '';
      res.on('data', (c) => (b += c));
      res.on('end', () => { let j = null; try { j = b ? JSON.parse(b) : null; } catch { /* html */ } ok({ status: res.statusCode ?? 0, json: j, text: b }); });
    });
    r.on('error', fail);
    r.end(data);
  });
const admin = (p: string, body: object = {}) => request('POST', DEV, p, { key: KEY, ...body });
const form = (name: string, email: string, kind = 'omgang') => request('POST', TEST, '/api/signup', { name, email, phone: 'android', where: 'distans', age: true, ok: true, kind }, { origin: 'https://www.jonasolson.se', ip: `10.2.${sent.length}.1` });
const mailsTo = (to: string) => sent.filter((s) => s.body.to[0] === to);
const at = (iso: string) => { clock = Date.parse(iso); };
const settle = () => new Promise((r) => setTimeout(r, 20));

describe('Testarnas kontor', () => {
  const codes: Record<string, string> = {};

  it('fills in the words of a template, and knows the Swedish hour', () => {
    expect(fill('Hej {namn}, {okänd}', { namn: 'Eva' })).toBe('Hej Eva, {okänd}');
    expect(swedishHour(Date.parse('2026-11-23T17:30:00Z'))).toBe(18);
  });

  it('thanks people for signing up, from the exjobb inbox with replies to hej@', async () => {
    await form('Eva', 'eva@example.com');
    await form('Bo', 'bo@example.com');
    await form('Cia', 'cia@example.com');
    await settle();
    const m = mailsTo('eva@example.com');
    expect(m).toHaveLength(1);
    expect(sent[0].url).toBe(`https://api.agentmail.to/v0/inboxes/${encodeURIComponent(INBOX)}/messages/send`);
    expect(m[0].body.reply_to).toBe('hej@jonasolson.se');
    expect(m[0].body.text).toContain('Hej Eva!');
  });

  it('mails the invitation with the personal link when Jonas picks a round', async () => {
    await admin('/api/admin/invites/round', { round: '1', opensAt: Date.parse('2026-11-24T00:00:00+01:00') });
    const o = (await admin('/api/admin/invites/overview')).json;
    for (const s of o.signups) {
      const r = await admin('/api/admin/invites/create', { signupId: s.id, round: '1' });
      expect(r.json.mail.mailed).toBe(true);
      codes[s.name] = r.json.code;
    }
    const inv = mailsTo('eva@example.com')[1].body;
    expect(inv.text).toContain(`https://${TEST}/?kod=${codes.Eva}`);
    expect(inv.text).toContain('omgång 1, som börjar tisdag 24 november');
    const j = await admin('/api/admin/invites/create', { name: 'Jonas', round: 'jonas' });
    codes.Jonas = j.json.code;
  });

  it('reminds the evening before and on the morning of the first day, once', async () => {
    at('2026-11-23T17:00:00+01:00');
    await app.flushDue();
    expect(mailsTo('eva@example.com')).toHaveLength(2);
    at('2026-11-23T18:05:00+01:00');
    await app.flushDue();
    await app.flushDue();
    expect(mailsTo('eva@example.com')).toHaveLength(3);
    expect(mailsTo('eva@example.com')[2].body.subject).toBe('I morgon börjar Skärgårdsbyn');
    at('2026-11-24T06:30:00+01:00');
    await app.flushDue();
    expect(mailsTo('eva@example.com')).toHaveLength(3);
    at('2026-11-24T07:10:00+01:00');
    await app.flushDue();
    expect(mailsTo('eva@example.com').map((m) => m.body.subject)).toContain('Nu kan du spela Skärgårdsbyn');
  });

  it('nudges once after three quiet days, and asks for the questions on day 8 until they are answered', async () => {
    at('2026-11-24T09:00:00+01:00');
    await request('POST', TEST, '/api/invite/check', { code: codes.Eva, playerId: 'evaphone1' });
    await request('POST', TEST, '/api/invite/check', { code: codes.Bo, playerId: 'bophone12' });
    await request('POST', TEST, '/api/invite/check', { code: codes.Jonas, playerId: 'jonasphone1' });
    at('2026-11-27T22:30:00+01:00');
    await app.flushDue();
    expect(mailsTo('cia@example.com').some((m) => m.body.subject === 'Har du hunnit börja?')).toBe(false);
    at('2026-11-28T09:00:00+01:00');
    await app.flushDue();
    await app.flushDue();
    expect(mailsTo('cia@example.com').filter((m) => m.body.subject === 'Har du hunnit börja?')).toHaveLength(1);
    expect(mailsTo('eva@example.com').some((m) => m.body.subject === 'Har du hunnit börja?')).toBe(false);
    // Bo answers the questions; Eva does not.
    await request('POST', TEST, '/api/log', { playerId: 'bophone12', session: 's1', events: [{ t: clock, name: 'questionnaire_part1', data: { testDay: 5, answers: { fun: 4 } } }] });
    await request('POST', TEST, '/api/log', { playerId: 'jonasphone1', session: 's2', events: [{ t: clock, name: 'open', data: {} }] });
    at('2026-12-01T09:30:00+01:00');
    await app.flushDue();
    expect(mailsTo('eva@example.com').filter((m) => m.body.subject === 'Några korta frågor om Skärgårdsbyn')).toHaveLength(1);
    expect(mailsTo('bo@example.com').some((m) => m.body.subject === 'Några korta frågor om Skärgårdsbyn')).toBe(false);
  });

  it('lets Jonas switch a mail off, change its text, and stop one', async () => {
    let o = (await admin('/api/admin/kontor/autos', { autos: { thanks: false, quiet: false } })).json;
    expect(o.autos.quiet).toBe(false);
    o = (await admin('/api/admin/kontor/template', { kind: 'thanks', subject: 'Tack!', text: 'Hej {namn}, tack.' })).json;
    expect(o.templates.thanks.subject).toBe('Tack!');
    o = (await admin('/api/admin/kontor/template', { kind: 'thanks', reset: true })).json;
    expect(o.templates.thanks.subject).toBe('Tack för att du testade Skärgårdsbyn');
    await admin('/api/admin/kontor/autos', { autos: { thanks: true } });
    o = (await admin('/api/admin/kontor/stop', { kind: 'thanks', code: codes.Bo })).json;
    at('2026-12-20T09:00:00+01:00');
    await app.flushDue();
    expect(mailsTo('eva@example.com').some((m) => m.body.subject === 'Tack för att du testade Skärgårdsbyn')).toBe(true);
    expect(mailsTo('bo@example.com').some((m) => m.body.subject === 'Tack för att du testade Skärgårdsbyn')).toBe(false);
    expect(o.outbox.length).toBeGreaterThan(5);
  });

  it('keeps a refused mail and tries again an hour later, not at once', async () => {
    const before = sent.length;
    refuse = true;
    const r = await admin('/api/admin/kontor/mail', { code: codes.Cia, subject: 'Hej', text: 'Hej {namn}!' });
    expect(r.json.sent.status).toBe('failed');
    refuse = false;
    expect(sent.length).toBe(before + 1);
    expect(sent.at(-1)!.body.text).toBe('Hej Cia!');
  });

  it('mails a top-up code to the tester', async () => {
    const r = await admin('/api/admin/kontor/topup', { code: codes.Eva });
    expect(r.json.topup).toMatch(/^FYLL-/);
    expect(sent.at(-1)!.body.text).toContain(r.json.topup);
  });

  it('gives the tables without Jonas, and deletes a tester on request', async () => {
    const p = (await admin('/api/admin/kontor/report', { table: 'players' })).json;
    expect(p.rows.map((r: any) => r.code)).toContain(codes.Bo);
    expect(p.rows.map((r: any) => r.code)).not.toContain(codes.Jonas);
    const a = (await admin('/api/admin/kontor/report', { table: 'answers', csv: true })).json;
    expect(a.csv).toContain(codes.Bo);
    expect((await admin('/api/admin/kontor/wipe', { code: codes.Bo, confirm: 'X' })).status).toBe(400);
    const w = (await admin('/api/admin/kontor/wipe', { code: codes.Bo, confirm: codes.Bo })).json;
    expect(w.removed).toBeGreaterThan(0);
    const after = (await admin('/api/admin/kontor/report', { table: 'players' })).json;
    expect(after.rows.map((r: any) => r.code)).not.toContain(codes.Bo);
  });

  it('serves the office on the dev site only, and needs the key', async () => {
    const page = await request('GET', DEV, '/kontor');
    expect(page.text).toContain('<title>Testarnas kontor</title>');
    const onTest = await request('GET', TEST, '/kontor');
    expect(onTest.text).not.toContain('Testarnas kontor');
    expect((await request('POST', DEV, '/api/admin/kontor/overview', { key: 'fel' })).status).toBe(403);
  });
});
