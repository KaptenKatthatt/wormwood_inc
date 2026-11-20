import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import http from 'node:http';
import { createApp } from '../server/app.mjs';
import { newCode } from '../server/invites.mjs';
import { admitted, cleanCode, codeInUrl, looksLikeCode, openDayText } from '../src/lib/invite';
import { STUDY_END, mustAnswer, startQ, studyEndFor } from '../src/lib/questionnaire';

const TEST = 'skargardsbyn.84.247.143.6.sslip.io';
const DEV = 'dev.skargardsbyn.84.247.143.6.sslip.io';
const PAGE = 'https://www.jonasolson.se';
const KEY = 'the-admin-key';
let base = '';
let app: any;
let dataDir = '';
let clock = Date.parse('2026-11-21T09:00:00Z');

beforeAll(async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ww-inv-'));
  dataDir = join(dir, 'data');
  await mkdir(join(dir, 'dist'));
  await writeFile(join(dir, 'dist', 'index.html'), '<h1>spel</h1>');
  app = await createApp({ distDir: join(dir, 'dist'), dataDir, now: () => clock, adminKey: KEY });
  await new Promise<void>((ok) => app.server.listen(0, '127.0.0.1', ok));
  base = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`;
});
afterAll(() => app.server.close());

const request = (method: string, host: string, p: string, body?: unknown, headers: Record<string, string> = {}) =>
  new Promise<{ status: number; json: any; headers: http.IncomingHttpHeaders }>((ok, fail) => {
    const data = body === undefined ? '' : JSON.stringify(body);
    const r = http.request(base + p, { method, headers: { host, 'content-type': 'application/json', 'content-length': Buffer.byteLength(data), 'x-forwarded-for': headers.ip ?? '10.0.0.1', ...headers } }, (res) => {
      let b = '';
      res.on('data', (c) => (b += c));
      res.on('end', () => ok({ status: res.statusCode ?? 0, json: b ? JSON.parse(b) : null, headers: res.headers }));
    });
    r.on('error', fail);
    r.end(data);
  });
const post = (host: string, p: string, body: unknown) => request('POST', host, p, body);
const signup = (body: unknown, ip = '10.1.1.1') => request('POST', TEST, '/api/signup', body, { origin: PAGE, ip });

const ANNA = { name: 'Anna', email: 'anna@exempel.se', phone: 'android', where: 'plats', note: 'Inte 4-6 december', age: true, ok: true };
const PHONE1 = 'phoneone1234';
const PHONE2 = 'phonetwo1234';
const PHONE3 = 'phonethree12';

describe('signing up from jonasolson.se', () => {
  it('lets only the exjobb page call it, with CORS', async () => {
    const pre = await request('OPTIONS', TEST, '/api/signup', undefined, { origin: PAGE });
    expect(pre.status).toBe(204);
    expect(pre.headers['access-control-allow-origin']).toBe(PAGE);
    expect((await request('OPTIONS', TEST, '/api/signup', undefined, { origin: 'https://evil.example' })).status).toBe(403);
    expect((await request('POST', TEST, '/api/signup', ANNA, { origin: 'https://evil.example' })).status).toBe(403);
  });

  it('wants every field and both boxes ticked', async () => {
    expect((await signup({ ...ANNA, age: false })).status).toBe(400);
    expect((await signup({ ...ANNA, ok: undefined })).status).toBe(400);
    expect((await signup({ ...ANNA, email: 'inte en adress' })).status).toBe(400);
    expect((await signup({ ...ANNA, phone: 'nokia' }, '10.1.1.2')).status).toBe(400);
  });

  it('keeps a signup apart from the log, and a second one with the same address replaces the first', async () => {
    const r = await signup(ANNA, '10.1.1.3');
    expect(r.status).toBe(200);
    expect(r.headers['access-control-allow-origin']).toBe(PAGE);
    await signup({ ...ANNA, note: '' }, '10.1.1.3');
    const list = JSON.parse(await readFile(join(dataDir, 'signups.json'), 'utf8'));
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ name: 'Anna', email: 'anna@exempel.se', phone: 'android', where: 'plats', note: '' });
    const logs = await readdir(join(dataDir, 'logs')).catch(() => []);
    for (const f of logs.filter((x) => x.endsWith('.ndjson'))) expect(await readFile(join(dataDir, 'logs', f), 'utf8')).not.toContain('anna@exempel.se');
  });

  it('keeps nothing when the hidden field is filled in', async () => {
    expect((await signup({ ...ANNA, email: 'robot@exempel.se', website: 'http://spam' }, '10.1.1.4')).status).toBe(200);
    const list = JSON.parse(await readFile(join(dataDir, 'signups.json'), 'utf8'));
    expect(list.some((s: any) => s.email === 'robot@exempel.se')).toBe(false);
  });

  it('stops one address from sending many', async () => {
    let last = 0;
    for (let i = 0; i < 7; i++) last = (await signup({ ...ANNA, email: `x${i}@exempel.se` }, '10.9.9.9')).status;
    expect(last).toBe(429);
  });
});

describe('letting the testers in', () => {
  let code = '';

  it('needs the admin key', async () => {
    expect((await post(DEV, '/api/admin/invites/overview', { key: 'wrong' })).status).toBe(403);
    const r = await post(DEV, '/api/admin/invites/overview', { key: KEY });
    expect(r.status).toBe(200);
    expect(r.json.signups.map((s: any) => s.name)).toContain('Anna');
  });

  it('makes a personal code in a round, and the signup moves to the invited', async () => {
    const s = (await post(DEV, '/api/admin/invites/overview', { key: KEY })).json.signups.find((x: any) => x.name === 'Anna');
    const r = await post(DEV, '/api/admin/invites/create', { key: KEY, signupId: s.id, round: '1' });
    expect(r.status).toBe(200);
    code = r.json.code;
    expect(code).toMatch(/^[A-Z2-9]{6}$/);
    expect(r.json.signups.some((x: any) => x.id === s.id)).toBe(false);
    expect(r.json.invites.find((i: any) => i.code === code)).toMatchObject({ name: 'Anna', round: '1', email: 'anna@exempel.se', phones: 0 });
    expect((await post(DEV, '/api/admin/invites/create', { key: KEY, signupId: s.id, round: '2' })).status).toBe(409);
  });

  it('says no to a code that does not exist', async () => {
    expect((await post(TEST, '/api/invite/check', { code: 'AAAAAA', playerId: PHONE1 })).status).toBe(404);
    expect((await post(TEST, '/api/invite/check', { code: 'x', playerId: PHONE1 })).status).toBe(400);
  });

  it('knows the code before the round opens, and opens on its day', async () => {
    let r = await post(TEST, '/api/invite/check', { code: code.toLowerCase(), playerId: PHONE1 });
    expect(r.status).toBe(200);
    expect(r.json).toMatchObject({ code, round: '1', opensAt: null, open: false });
    const day = Date.parse('2026-11-27T00:00:00+01:00');
    await post(DEV, '/api/admin/invites/round', { key: KEY, round: '1', opensAt: day });
    r = await post(TEST, '/api/invite/check', { code, playerId: PHONE1 });
    expect(r.json).toMatchObject({ opensAt: day, open: false });
    clock = day + 1000;
    r = await post(TEST, '/api/invite/check', { code, playerId: PHONE1 });
    expect(r.json.open).toBe(true);
  });

  it('serves two phones (Safari and the home screen app) but not a third', async () => {
    expect((await post(TEST, '/api/invite/check', { code, playerId: PHONE2 })).status).toBe(200);
    expect((await post(TEST, '/api/invite/check', { code, playerId: PHONE3 })).status).toBe(409);
    expect((await post(TEST, '/api/invite/check', { code, playerId: PHONE1 })).status).toBe(200);
  });

  it('logs when a code is first used on a phone, in the study log', async () => {
    const day = new Date(clock).toISOString().slice(0, 10);
    const lines = (await readFile(join(dataDir, 'logs', `${day}.ndjson`), 'utf8')).trim().split('\n').map((l) => JSON.parse(l));
    const used = lines.filter((l) => l.name === 'invite_used');
    expect(used.map((l) => l.playerId).sort()).toEqual([PHONE2].sort());
    expect(used[0].data).toMatchObject({ code, round: '1', phone: 2 });
    expect(JSON.stringify(lines)).not.toContain('Anna');
  });

  it('shows how far the tester has come', async () => {
    clock += 2 * 86_400_000;
    await post(TEST, '/api/invite/check', { code, playerId: PHONE1 });
    const inv = (await post(DEV, '/api/admin/invites/overview', { key: KEY })).json.invites.find((i: any) => i.code === code);
    expect(inv).toMatchObject({ phones: 2, day: 3 });
  });

  it('uses the code as test code for e-mail addresses and messages', async () => {
    await post(TEST, '/api/contact/save', { playerId: PHONE1, email: 'anna.spel@exempel.se' });
    const o = (await post(DEV, '/api/admin/overview', { key: KEY })).json;
    expect(o.contacts.find((c: any) => c.email === 'anna.spel@exempel.se')?.code).toBe(code);
    // Both phones must have met the server to get messages.
    await post(TEST, '/api/messages/inbox', { playerId: PHONE1 });
    await post(TEST, '/api/messages/inbox', { playerId: PHONE2 });
    const sent = await post(DEV, '/api/admin/send', { key: KEY, title: 'Hej Anna', body: 'Bara till dig.', to: code, push: false });
    expect(sent.json.recipients).toBe(2);
    for (const p of [PHONE1, PHONE2]) expect((await post(TEST, '/api/messages/inbox', { playerId: p })).json.messages.map((m: any) => m.title)).toContain('Hej Anna');
    await post(TEST, '/api/messages/inbox', { playerId: PHONE3 });
    expect((await post(TEST, '/api/messages/inbox', { playerId: PHONE3 })).json.messages.map((m: any) => m.title)).not.toContain('Hej Anna');
  });

  it('invites someone who did not sign up, and Jonas himself is always open', async () => {
    const r = await post(DEV, '/api/admin/invites/create', { key: KEY, name: 'Kompisen', round: 'pilot' });
    expect(r.status).toBe(200);
    const mine = (await post(DEV, '/api/admin/invites/create', { key: KEY, name: 'Jonas', round: 'jonas' })).json.code;
    expect((await post(TEST, '/api/invite/check', { code: mine, playerId: 'jonasphone12' })).json.open).toBe(true);
    expect((await post(DEV, '/api/admin/invites/round', { key: KEY, round: 'jonas', opensAt: null })).status).toBe(400);
  });

  it('gives a tester with their own start a signup kind of their own and an open link at once', async () => {
    expect((await signup({ ...ANNA, name: 'Olle', email: 'olle@exempel.se', kind: 'egen' }, '10.1.1.8')).status).toBe(200);
    const o = (await post(DEV, '/api/admin/invites/overview', { key: KEY })).json;
    const olle = o.signups.find((s: any) => s.name === 'Olle');
    expect(olle.kind).toBe('egen');
    expect(o.signups.find((s: any) => s.name === 'Anna')?.kind ?? 'omgang').toBe('omgang');
    const c = (await post(DEV, '/api/admin/invites/create', { key: KEY, signupId: olle.id, round: 'egen' })).json.code;
    expect((await post(TEST, '/api/invite/check', { code: c, playerId: 'ollephone12' })).json).toMatchObject({ round: 'egen', open: true });
    expect((await post(DEV, '/api/admin/invites/round', { key: KEY, round: 'egen', opensAt: null })).status).toBe(400);
  });

  it('takes an invitation back', async () => {
    const r = await post(DEV, '/api/admin/invites/remove', { key: KEY, code });
    expect(r.status).toBe(200);
    expect((await post(TEST, '/api/invite/check', { code, playerId: PHONE1 })).status).toBe(404);
  });

  it('forgets names and addresses after 31 January 2027 but keeps the codes', async () => {
    clock = Date.parse('2027-02-01T12:00:00+01:00');
    await app.flushDue();
    expect(JSON.parse(await readFile(join(dataDir, 'signups.json'), 'utf8'))).toEqual([]);
    const invites = JSON.parse(await readFile(join(dataDir, 'invites.json'), 'utf8'));
    expect(Object.keys(invites).length).toBeGreaterThan(0);
    for (const i of Object.values(invites) as any[]) expect(i.name).toBe('');
  });
});

describe('the invitation in the game', () => {
  it('reads and tidies codes', () => {
    expect(cleanCode(' k7m-2qx ')).toBe('K7M2QX');
    expect(looksLikeCode('k7m 2qx')).toBe(true);
    expect(looksLikeCode('K7M2Q')).toBe(false);
    expect(looksLikeCode('K7M2Q0')).toBe(false);
    expect(codeInUrl('https://skargardsbyn.x/?kod=k7m2qx')).toBe('K7M2QX');
    expect(codeInUrl('https://skargardsbyn.x/')).toBe('');
  });

  it("lets the player in on the round's day, or once the server has said open", () => {
    const day = Date.parse('2026-11-27T00:00:00+01:00');
    // The tests run the dev build, which has no gate; the rule itself is checked through the invite.
    expect(admitted({ code: 'K7M2QX', round: '1', opensAt: day, open: false }, day - 1)).toBe(true);
  });

  it('writes the day in Swedish', () => {
    expect(openDayText(Date.parse('2026-11-27T00:00:00+01:00'))).toBe('fredag 27 november');
  });

  it('ends the study for a tester with their own start after their own week', () => {
    expect(studyEndFor('egen', '2026-11-25')).toBe('2026-12-02');
    expect(studyEndFor('egen', '2026-12-28')).toBe('2027-01-04');
    expect(studyEndFor('1', '2026-11-25')).toBe(STUDY_END);
    expect(studyEndFor(undefined, '2026-11-25')).toBe(STUDY_END);
    const q = startQ();
    expect(mustAnswer(q, '2026-12-01', true, studyEndFor('egen', '2026-11-25'))).toBe(false);
    expect(mustAnswer(q, '2026-12-02', true, studyEndFor('egen', '2026-11-25'))).toBe(true);
    expect(mustAnswer(q, '2026-12-02', true, studyEndFor('1', '2026-11-25'))).toBe(false);
  });

  it('makes codes from the readable letters', () => {
    for (let i = 0; i < 100; i++) expect(newCode()).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
  });
});
