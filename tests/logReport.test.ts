import { describe, expect, it } from 'vitest';
import { DROPOUT_DAYS, dropoutRows, eventRows, hookRows, parseLines, playerRows, tidy, toCsv } from '../tools/log-report.mjs';

const T = Date.UTC(2026, 10, 19, 18, 0, 0);
const ev = (seq: number | null, name: string, data: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) =>
  ({ received: T + 5000, site: 'test', playerId: 'p1', session: 's1', seq, v: seq == null ? undefined : '0.26.11', t: T + (seq ?? 0) * 1000, name, ctx: seq == null ? null : { day: 2, min: 12, step: 3, won: 4 }, data, ...extra });

describe('the log report', () => {
  it('reads NDJSON and counts lines that are not JSON', () => {
    const r = parseLines('{"a":1}\nnot json\n\n{"b":2}\n');
    expect(r.events).toHaveLength(2);
    expect(r.bad).toBe(1);
  });

  it('drops doubled events and gives old events the version of their open event', () => {
    const old = { received: T, playerId: 'p0', session: 'old', t: T - 10, name: 'view', data: { tab: 'byn' } };
    const open = { received: T, playerId: 'p0', session: 'old', t: T - 20, name: 'open', data: { version: '0.26.3' } };
    const out = tidy([ev(2, 'level_start'), old, ev(2, 'level_start'), open, old, ev(1, 'visit_start')]);
    expect(out.map((e: { name: string }) => e.name)).toEqual(['open', 'view', 'visit_start', 'level_start']);
    expect(out[1].v).toBe('0.26.3');
  });

  it('sums a player up on one row', () => {
    const events = tidy([
      ev(1, 'open', { code: 'ABC', version: '0.26.11' }), ev(2, 'visit_start'), ev(3, 'level_start', { level: 4 }), ev(4, 'level_won', { level: 4 }),
      ev(5, 'hook', { hook: 'skipWait', response: 'shown' }), ev(6, 'hook', { hook: 'skipWait', response: 'yes', offer: { gems: 3 } }),
      ev(8, 'visit_end', { seconds: 150 }),
    ]);
    const [p] = playerRows(events);
    expect(p).toMatchObject({ player: 'p1', code: 'ABC', site: 'test', test_day: 2, visits: 1, minutes_played: 2.5, levels_started: 1, levels_won: 1, highest_level_won: 4,
      hook_step: 3, hooks_shown: 1, hooks_yes: 1, gems_spent: 3, last_hook: 'skipWait', versions: '0.26.11', events_missing: 1 });
    expect(hookRows(events)).toEqual([expect.objectContaining({ player: 'p1', hook: 'skipWait', shown: 1, yes: 1, no: 0, gems_spent: 3, first_test_day: 2 })]);
  });

  it('counts a tester who has been away for days as dropped out, at the step reached', () => {
    const day = 24 * 60 * 60 * 1000;
    const away = (id: string, extra: Record<string, unknown>[] = []) => [ev(1, 'open', {}, { playerId: id }), ...extra.map((e) => ({ ...e, playerId: id }))];
    const events = tidy([
      ...away('gone'),
      ...away('week', [ev(2, 'week_step', { step: 7 })]),
      ...away('fresh', [ev(3, 'level_start', {}, { t: T + (DROPOUT_DAYS + 1) * day })]),
    ]);
    const now = T + (DROPOUT_DAYS + 1) * day + 60_000;
    const players = playerRows(events, now);
    const by = Object.fromEntries(players.map((p: { player: string }) => [p.player, p]));
    expect(by.gone).toMatchObject({ status: 'dropped out', hook_step: 3 });
    expect(by.week).toMatchObject({ status: 'dropped out', hook_step: 7 });
    expect(by.fresh).toMatchObject({ status: 'playing', hook_step: 3 });
    const steps = dropoutRows(players);
    expect(steps[2]).toMatchObject({ step: 3, reached: 3, dropped_out_here: 1, playing_here: 1 });
    expect(steps[6]).toMatchObject({ step: 7, reached: 1, dropped_out_here: 1, share_dropped_here: '100 %' });
  });

  it('writes flat rows as CSV with semicolons', () => {
    const rows = eventRows(tidy([ev(1, 'hook', { hook: 'ad', response: 'no', text: 'a;b' })]));
    expect(rows[0]).toMatchObject({ event: 'hook', hook: 'ad', response: 'no', version: '0.26.11', seconds_late: 4, test_day: 2 });
    const csv = toCsv(rows);
    expect(csv.split('\n')[0].startsWith('time;player;session;seq;site;version')).toBe(true);
    expect(csv).toContain('"{""hook"":""ad""');
  });
});
