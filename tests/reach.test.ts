import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, readdir, mkdir, stat, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import http from 'node:http';
import { createApp } from '../server/app.mjs';
import { CONTACTS_END as SERVER_END, testCode as serverCode, validEmail as serverValid } from '../server/reach.mjs';
import { testCode } from '../src/lib/testCode';
import { CONTACTS_END, dayText, emptyInbox, mergeInbox, nextUnread, validEmail } from '../src/lib/reach';

const TEST = 'skargardsbyn.84.247.143.6.sslip.io';
const DEV = 'dev.skargardsbyn.84.247.143.6.sslip.io';
const KEY = 'the-admin-key';
let base = '';
let app: any;
let dataDir = '';
let clock = Date.parse('2026-11-27T17:00:00Z');
const sent: any[] = [];
const fakePush = {
  generateVAPIDKeys: () => ({ publicKey: 'pub', privateKey: 'priv' }),
  setVapidDetails: () => {},
  sendNotification: async (sub: any, payload: string) => { sent.push({ sub, payload: JSON.parse(payload) }); },
};

beforeAll(async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ww-reach-'));
  dataDir = join(dir, 'data');
  await mkdir(join(dir, 'dist'));
  await writeFile(join(dir, 'dist', 'index.html'), '<h1>spel</h1>');
  app = await createApp({ distDir: join(dir, 'dist'), dataDir, webpush: fakePush, now: () => clock, adminKey: KEY });
  await new Promise<void>((ok) => app.server.listen(0, '127.0.0.1', ok));
  base = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`;
});
afterAll(() => app.server.close());

/** POST with a chosen Host header, since the host decides between the test site and the dev site. */
const post = (host: string, p: string, body: unknown) =>
  new Promise<{ status: number; json: any }>((ok, fail) => {
    const data = JSON.stringify(body);
    const r = http.request(base + p, { method: 'POST', headers: { host, 'content-type': 'application/json', 'content-length': Buffer.byteLength(data) } }, (res) => {
      let b = '';
      res.on('data', (c) => (b += c));
      res.on('end', () => ok({ status: res.statusCode ?? 0, json: b ? JSON.parse(b) : null }));
    });
    r.on('error', fail);
    r.end(data);
  });

const ANNA = 'annaannaanna1';
const MATS = 'matsmatsmats1';
const JONAS = 'jonasdevdev12';

describe('messages from Jonas', () => {
  it('needs the admin key to send or to look', async () => {
    expect((await post(DEV, '/api/admin/overview', { key: 'wrong' })).status).toBe(403);
    expect((await post(DEV, '/api/admin/overview', {})).status).toBe(403);
    expect((await post(DEV, '/api/admin/send', { key: '', title: 'x', body: 'y', to: 'test' })).status).toBe(403);
    expect((await post(DEV, '/api/admin/overview', { key: KEY })).status).toBe(200);
  });

  it('reaches every tester on the test site, and nobody on the dev site', async () => {
    for (const id of [ANNA, MATS]) expect((await post(TEST, '/api/messages/inbox', { playerId: id })).json.messages).toEqual([]);
    await post(DEV, '/api/messages/inbox', { playerId: JONAS });
    await post(TEST, '/api/push/subscribe', { playerId: ANNA, subscription: { endpoint: 'https://fcm.googleapis.com/a', keys: { p256dh: 'p', auth: 'a' } } });
    clock += 1000;
    const r = await post(DEV, '/api/admin/send', { key: KEY, title: 'Ny version ute', body: 'Öppna spelet igen.', to: 'test', push: true });
    expect(r.json).toMatchObject({ ok: true, recipients: 2, pushed: 1 });
    expect(sent.at(-1).payload).toMatchObject({ title: 'Meddelande från Jonas', body: 'Ny version ute' });
    const anna = (await post(TEST, '/api/messages/inbox', { playerId: ANNA })).json.messages;
    expect(anna).toHaveLength(1);
    expect(anna[0]).toMatchObject({ title: 'Ny version ute', body: 'Öppna spelet igen.', sentAt: clock });
    expect(Object.keys(anna[0]).sort()).toEqual(['body', 'id', 'sentAt', 'title']);
    expect((await post(DEV, '/api/messages/inbox', { playerId: JONAS })).json.messages).toEqual([]);
  });

  it('writes one line per receiver in the playtest log', async () => {
    const [file] = (await readdir(join(dataDir, 'logs'))).filter((f) => f.endsWith('.ndjson'));
    const lines = (await readFile(join(dataDir, 'logs', file), 'utf8')).trim().split('\n').map((l) => JSON.parse(l));
    const out = lines.filter((l) => l.name === 'message_sent');
    expect(out.map((l) => l.playerId).sort()).toEqual([ANNA, MATS].sort());
    expect(out.find((l) => l.playerId === ANNA)).toMatchObject({ site: 'test', session: 'server', data: { to: 'alla testare', push: true } });
    expect(out.find((l) => l.playerId === MATS).data.push).toBe(false);
  });

  it('counts who has seen and read it', async () => {
    const id = (await post(TEST, '/api/messages/inbox', { playerId: ANNA })).json.messages[0].id;
    expect((await post(TEST, '/api/messages/seen', { playerId: ANNA, id, kind: 'shown' })).status).toBe(200);
    expect((await post(TEST, '/api/messages/seen', { playerId: MATS, id, kind: 'read' })).status).toBe(200);
    await post(TEST, '/api/messages/seen', { playerId: MATS, id, kind: 'read' });
    expect((await post(TEST, '/api/messages/seen', { playerId: JONAS, id, kind: 'read' })).status).toBe(404);
    expect((await post(TEST, '/api/messages/seen', { playerId: ANNA, id, kind: 'liked' })).status).toBe(400);
    const m = (await post(DEV, '/api/admin/overview', { key: KEY })).json.messages[0];
    expect(m).toMatchObject({ recipients: 2, shown: 2, read: 1 });
  });

  it('can go to one test code only, and says so when the code is unknown', async () => {
    clock += 1000;
    expect((await post(DEV, '/api/admin/send', { key: KEY, title: 'Hej', body: 'Bara till dig.', to: 'ZZZZZZ' })).status).toBe(404);
    const r = await post(DEV, '/api/admin/send', { key: KEY, title: 'Hej', body: 'Bara till dig.', to: testCode(MATS).toLowerCase() });
    expect(r.json).toMatchObject({ recipients: 1, pushed: 0 });
    expect((await post(TEST, '/api/messages/inbox', { playerId: MATS })).json.messages).toHaveLength(2);
    expect((await post(TEST, '/api/messages/inbox', { playerId: ANNA })).json.messages).toHaveLength(1);
  });

  it('does not show a newcomer what was sent to everyone before they came', async () => {
    clock += 60_000;
    expect((await post(TEST, '/api/messages/inbox', { playerId: 'latecomer1234' })).json.messages).toEqual([]);
  });

  it('refuses an empty message and cuts a long one', async () => {
    expect((await post(DEV, '/api/admin/send', { key: KEY, title: ' ', body: 'x', to: 'dev' })).status).toBe(400);
    clock += 1000;
    await post(DEV, '/api/admin/send', { key: KEY, title: 'T'.repeat(80), body: 'B'.repeat(900), to: 'dev' });
    const [m] = (await post(DEV, '/api/messages/inbox', { playerId: JONAS })).json.messages;
    expect(m.title).toHaveLength(40);
    expect(m.body).toHaveLength(300);
  });
});

describe('the e-mail address', () => {
  it('is kept with the test code in its own file, never in the log', async () => {
    expect((await post(TEST, '/api/contact/save', { playerId: ANNA, email: 'not an address' })).status).toBe(400);
    expect((await post(TEST, '/api/contact/save', { playerId: ANNA, email: ' anna@exempel.se ' })).status).toBe(200);
    const list = (await post(DEV, '/api/admin/overview', { key: KEY })).json.contacts;
    expect(list).toEqual([{ code: testCode(ANNA), email: 'anna@exempel.se', site: 'test', savedAt: clock }]);
    expect(JSON.parse(await readFile(join(dataDir, 'contacts.json'), 'utf8'))[ANNA].email).toBe('anna@exempel.se');
    const logs = join(dataDir, 'logs');
    for (const f of (await readdir(logs)).filter((x) => x.endsWith('.ndjson'))) expect(await readFile(join(logs, f), 'utf8')).not.toContain('anna@exempel.se');
  });

  it('lies in a file only the user the server runs as may read', async () => {
    for (const f of ['contacts.json', 'messages.json', 'players.json']) expect((await stat(join(dataDir, f))).mode & 0o777).toBe(0o600);
  });

  it('is removed when the tester asks, and all at once when Jonas does', async () => {
    await post(TEST, '/api/contact/save', { playerId: MATS, email: 'mats@exempel.se' });
    expect((await post(TEST, '/api/contact/remove', { playerId: ANNA })).status).toBe(200);
    expect((await post(DEV, '/api/admin/overview', { key: KEY })).json.contacts.map((c: any) => c.email)).toEqual(['mats@exempel.se']);
    expect((await post(DEV, '/api/admin/wipe-contacts', { key: 'wrong' })).status).toBe(403);
    expect((await post(DEV, '/api/admin/wipe-contacts', { key: KEY })).json).toMatchObject({ removed: 1, contacts: [] });
  });

  it('is deleted by itself when 31 January 2027 has passed, and cannot be left after that', async () => {
    await post(TEST, '/api/contact/save', { playerId: ANNA, email: 'anna@exempel.se' });
    clock = SERVER_END - 1000;
    await app.flushDue();
    expect(Object.keys(JSON.parse(await readFile(join(dataDir, 'contacts.json'), 'utf8')))).toEqual([ANNA]);
    clock = SERVER_END;
    await app.flushDue();
    expect(JSON.parse(await readFile(join(dataDir, 'contacts.json'), 'utf8'))).toEqual({});
    expect((await post(TEST, '/api/contact/save', { playerId: ANNA, email: 'anna@exempel.se' })).status).toBe(410);
  });
});

describe('what the game and the server share', () => {
  it('is the same test code, the same last day and the same idea of an address', () => {
    for (const id of [ANNA, MATS, JONAS, 'x9k2m4p7q1w3e5r8t0y2']) expect(serverCode(id)).toBe(testCode(id));
    expect(SERVER_END).toBe(CONTACTS_END);
    expect(new Date(CONTACTS_END - 1).toLocaleDateString('sv-SE', { timeZone: 'Europe/Stockholm' })).toBe('2027-01-31');
    for (const v of ['a@b.se', 'namn.efternamn+test@exempel.co.uk']) expect([validEmail(v), serverValid(v)]).toEqual([true, true]);
    for (const v of ['', 'a@b', 'a b@c.se', 'a@b.se, c@d.se', '@b.se', 'a@.se', 'x'.repeat(250) + '@b.se']) expect([validEmail(v), serverValid(v)]).toEqual([false, false]);
  });

  it('shows the oldest unread message first and keeps what was read', () => {
    const a = { id: 'a', title: 'A', body: 'a', sentAt: 2 };
    const b = { id: 'b', title: 'B', body: 'b', sentAt: 1 };
    let box = mergeInbox(emptyInbox(), [a, b]);
    expect(box.messages.map((m) => m.id)).toEqual(['b', 'a']);
    expect(nextUnread(box)?.id).toBe('b');
    box = { ...box, read: ['b'] };
    box = mergeInbox(box, [a, { ...b, title: 'B2' }, { id: 7 } as any]);
    expect(box.messages).toHaveLength(2);
    expect(nextUnread(box)?.id).toBe('a');
    expect(nextUnread({ ...box, read: ['a', 'b'] })).toBeNull();
  });

  it('writes the day in Swedish', () => {
    expect(dayText(Date.parse('2026-11-27T17:42:00Z'))).toBe('27 november');
    expect(dayText(Date.parse('2026-12-31T23:30:00Z'))).toBe('1 januari');
  });

  it('promises "no e-mail" only where the game does not ask for one', () => {
    for (const f of ['src/ui/Consent.svelte', 'src/ui/SettingsView.svelte']) {
      const src = readFileSync(f, 'utf8');
      expect(src.match(/ingen e-post/g)).toHaveLength(1);
      expect(src).toContain("contactsOpen() ? 'Inget namn.' : 'Inget namn, ingen e-post.'");
    }
    expect(readFileSync('src/lib/state/reach.ts', 'utf8')).toContain('CONTACT_ASK && Date.now() < CONTACTS_END');
  });
});
