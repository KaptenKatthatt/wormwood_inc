#!/usr/bin/env node
/**
 * Turns the playtest log into three tables for the analysis (Jonas,
 * 2026-11-19: the analysis should be easy):
 *
 *   node tools/log-report.mjs <log directory> [output directory]
 *
 *   players.csv  one row per player: days, visits, play time, challenges, hooks, money
 *   hooks.csv    one row per player and hook: how often it was shown and what the player did
 *   events.csv   every event on one flat row, oldest first
 *
 * It reads every *.ndjson in the directory, drops doubled events, and gives
 * events from before 0.26.11 (which carried no version) the version of their
 * session's `open` event. Semicolons separate the columns, as Swedish Excel expects.
 */
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

/** Parses NDJSON text; lines that are not JSON are counted, not fatal. */
export function parseLines(text) {
  const events = [];
  let bad = 0;
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try { events.push(JSON.parse(line)); } catch { bad += 1; }
  }
  return { events, bad };
}

/** Oldest first, without doubles, every event with a version where one can be known. */
export function tidy(events) {
  const seen = new Set();
  const out = [];
  for (const e of events) {
    const key = e.seq != null ? `${e.playerId}|${e.seq}` : `${e.playerId}|${e.session}|${e.t}|${e.name}|${JSON.stringify(e.data ?? null)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  out.sort((a, b) => (a.t ?? a.received) - (b.t ?? b.received) || (a.seq ?? 0) - (b.seq ?? 0));
  const versions = new Map();
  for (const e of out) if (e.name === 'open' && e.data?.version) versions.set(`${e.playerId}|${e.session}`, e.data.version);
  return out.map((e) => ({ ...e, v: e.v ?? versions.get(`${e.playerId}|${e.session}`) ?? null }));
}

const dayOf = (ms) => new Date(ms).toISOString().slice(0, 10);
const iso = (ms) => (ms == null ? '' : new Date(ms).toISOString().slice(0, 19).replace('T', ' '));

/**
 * A tester who has not opened the game for this many days counts as dropped
 * out, at the step they had reached. There is no quit button (Jonas,
 * 2026-11-20: nobody presses a button to stop playing a mobile game).
 */
export const DROPOUT_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

/** One row per player. */
export function playerRows(events, now = Date.now()) {
  const by = new Map();
  for (const e of events) {
    let p = by.get(e.playerId);
    if (!p) {
      p = { player: e.playerId, code: '', site: e.site ?? (e.data?.build === 'test' ? 'test' : ''), first: e.t ?? e.received, last: e.t ?? e.received, days: new Set(), sessions: new Set(), versions: new Set(),
        visits: 0, seconds: 0, started: 0, won: 0, lost: 0, left: 0, highest: 0, events: 0,
        hooksShown: 0, hooksYes: 0, hooksNo: 0, cannotAfford: 0, gems: 0, kronor: 0, purchases: 0, ads: 0, quit: 0, step: 0, testDay: 0,
        lastHook: '', lastEvent: '', questionnaire: '', withdrawn: false, missing: 0, maxSeq: 0, seqs: 0 };
      by.set(e.playerId, p);
    }
    const t = e.t ?? e.received;
    p.events += 1;
    p.first = Math.min(p.first, t);
    p.last = Math.max(p.last, t);
    p.days.add(dayOf(t));
    if (e.session) p.sessions.add(e.session);
    if (e.v) p.versions.add(e.v);
    if (e.seq != null) { p.seqs += 1; p.maxSeq = Math.max(p.maxSeq, e.seq); p.minSeq = Math.min(p.minSeq ?? e.seq, e.seq); }
    if (e.ctx?.step != null) p.step = Math.max(p.step, e.ctx.step);
    p.testDay = Math.max(p.testDay, e.ctx?.day ?? e.data?.day ?? e.data?.testDay ?? 0);
    p.lastEvent = e.name;
    const d = e.data ?? {};
    switch (e.name) {
      case 'open': if (d.code) p.code = d.code; break;
      case 'visit_start': p.visits += 1; break;
      case 'visit_end': p.seconds += d.seconds ?? 0; break;
      case 'level_start': p.started += 1; break;
      case 'level_won': p.won += 1; p.highest = Math.max(p.highest, d.level ?? 0); break;
      case 'level_lost': p.lost += 1; break;
      case 'level_left': p.left += 1; break;
      case 'quit_pressed': p.quit += 1; break; // the button that went on 2026-11-20
      case 'week_step': p.step = Math.max(p.step, d.step ?? 0); break;
      case 'ad_watched': p.ads += 1; break;
      case 'purchase': p.purchases += 1; p.kronor += d.kronor ?? 0; break;
      case 'data_withdrawn': p.withdrawn = true; break;
      case 'questionnaire_part1': p.questionnaire = p.questionnaire || 'part 1'; break;
      case 'questionnaire_part2': p.questionnaire = 'done'; break;
      case 'hook':
        p.lastHook = d.hook ?? '';
        if (d.response === 'shown') p.hooksShown += 1;
        else if (d.response === 'yes') { p.hooksYes += 1; p.gems += d.offer?.gems ?? 0; }
        else if (d.response === 'no') p.hooksNo += 1;
        else if (d.response === 'cannot-afford') p.cannotAfford += 1;
        break;
      default:
    }
  }
  return [...by.values()].map((p) => ({
    player: p.player, code: p.code, site: p.site, first_seen: iso(p.first), last_seen: iso(p.last),
    days_since_last: Math.floor(((now - p.last) / DAY_MS) * 10) / 10,
    status: p.withdrawn ? 'withdrawn' : now - p.last >= DROPOUT_DAYS * DAY_MS ? 'dropped out' : 'playing',
    days_played: p.days.size, test_day: p.testDay, sessions: p.sessions.size, visits: p.visits, minutes_played: Math.round(p.seconds / 6) / 10,
    levels_started: p.started, levels_won: p.won, levels_lost: p.lost, levels_left: p.left, highest_level_won: p.highest,
    hook_step: p.step, hooks_shown: p.hooksShown, hooks_yes: p.hooksYes, hooks_no: p.hooksNo, hooks_cannot_afford: p.cannotAfford,
    gems_spent: p.gems, purchases: p.purchases, pretend_kronor: p.kronor, ads_watched: p.ads,
    last_hook: p.lastHook, last_event: p.lastEvent, questionnaire: p.questionnaire, withdrawn: p.withdrawn ? 'yes' : '',
    versions: [...p.versions].join(' '), events: p.events,
    // Events the server never got: holes in the player's own numbering.
    events_missing: p.seqs ? p.maxSeq - p.minSeq + 1 - p.seqs : '',
  }));
}

/** One row per step of the staircase (1-5 in the first session, 6-9 in the week): who reached it, and who stopped there. */
export function dropoutRows(players) {
  const rows = [];
  for (let step = 1; step <= 9; step++) {
    const here = players.filter((p) => p.hook_step === step && p.status !== 'withdrawn');
    const reached = players.filter((p) => p.hook_step >= step && p.status !== 'withdrawn').length;
    const dropped = here.filter((p) => p.status === 'dropped out').length;
    rows.push({ step, reached, dropped_out_here: dropped, playing_here: here.length - dropped, share_dropped_here: reached ? `${Math.round((dropped / reached) * 100)} %` : '' });
  }
  return rows;
}

/** One row per player and hook. */
export function hookRows(events) {
  const by = new Map();
  for (const e of events) {
    if (e.name !== 'hook' || !e.data?.hook) continue;
    const key = `${e.playerId}|${e.data.hook}`;
    let h = by.get(key);
    if (!h) { h = { player: e.playerId, hook: e.data.hook, first: e.t, first_test_day: e.ctx?.day ?? '', first_minutes_in: e.data.minutesIn ?? e.ctx?.min ?? '', shown: 0, yes: 0, no: 0, cannot_afford: 0, waited: 0, expired: 0, gems: 0 }; by.set(key, h); }
    const r = String(e.data.response).replace('-', '_');
    if (r in h) h[r] += 1;
    if (e.data.response === 'yes') h.gems += e.data.offer?.gems ?? 0;
  }
  return [...by.values()].map(({ first, ...h }) => ({ ...h, first_time: iso(first) })).map(({ gems, ...h }) => ({ ...h, gems_spent: gems }));
}

/** Every event on one flat row. */
export function eventRows(events) {
  return events.map((e) => ({
    time: iso(e.t ?? e.received), player: e.playerId, session: e.session ?? '', seq: e.seq ?? '', site: e.site ?? (e.data?.build === 'test' ? 'test' : ''), version: e.v ?? '',
    test_day: e.ctx?.day ?? e.data?.day ?? e.data?.testDay ?? '', minutes_in: e.ctx?.min ?? e.data?.minutesIn ?? '', hook_step: e.ctx?.step ?? '', levels_won: e.ctx?.won ?? '',
    event: e.name, hook: e.name === 'hook' ? e.data?.hook ?? '' : '', response: e.name === 'hook' ? e.data?.response ?? '' : '', level: e.data?.level ?? '',
    seconds_late: e.t != null && e.received != null ? Math.max(0, Math.round((e.received - e.t) / 1000)) : '',
    data: e.data ? JSON.stringify(e.data) : '',
  }));
}

export function toCsv(rows) {
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]);
  const cell = (v) => { const s = String(v ?? ''); return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return [cols.join(';'), ...rows.map((r) => cols.map((c) => cell(r[c])).join(';'))].join('\n') + '\n';
}

async function main() {
  const [dir, out = 'log-report'] = process.argv.slice(2);
  if (!dir) { console.error('Usage: node tools/log-report.mjs <log directory> [output directory]'); process.exit(1); }
  const files = (await readdir(dir)).filter((f) => f.endsWith('.ndjson')).sort();
  let all = [];
  let bad = 0;
  for (const f of files) { const r = parseLines(await readFile(join(dir, f), 'utf8')); all = all.concat(r.events); bad += r.bad; }
  const events = tidy(all);
  await mkdir(out, { recursive: true });
  const players = playerRows(events);
  // The byte order mark makes Excel read the Swedish letters in the data.
  for (const [name, rows] of [['players', players], ['hooks', hookRows(events)], ['events', eventRows(events)]]) await writeFile(join(out, `${name}.csv`), '﻿' + toCsv(rows));
  console.log(`${files.length} files, ${all.length} lines (${bad} unreadable, ${all.length - events.length} doubled), ${events.length} events, ${players.length} players. Tables in ${out}/`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main();
