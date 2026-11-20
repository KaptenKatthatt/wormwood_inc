import { ON_HOLD } from '../src/lib/hooks';
import { describe, expect, it } from 'vitest';
import { DUE_DAY, MAX_ASKS, MAX_TEXT, PART1, STUDY_END, afterPart1, mustAnswer, endPushDelay, answered, debrief, forLog, part2, pick, pushDelay, shouldAsk, startQ, testDayOf, type Reached } from '../src/lib/questionnaire';

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();
const early: Reached = { steps: [1, 2], weekStep: 5, secondDay: false };
const far: Reached = { steps: [1, 2, 3, 4, 5], weekStep: 9, secondDay: true };

describe('questionnaire', () => {
  it('asks by itself once a day from the due day, a few times, and only with consent', () => {
    const day = '2026-11-28';
    let s = startQ();
    expect(shouldAsk(s, DUE_DAY - 1, day, true)).toBe(false);
    expect(shouldAsk(s, DUE_DAY, day, false)).toBe(false);
    expect(shouldAsk(s, DUE_DAY, day, true)).toBe(true);
    s = { ...s, askedDay: DUE_DAY, asks: 1 };
    expect(shouldAsk(s, DUE_DAY, day, true)).toBe(false);
    expect(shouldAsk(s, DUE_DAY + 1, day, true)).toBe(true);
    expect(shouldAsk({ ...s, asks: MAX_ASKS }, DUE_DAY + 5, day, true)).toBe(false);
    expect(shouldAsk({ ...s, stage: 'done' }, DUE_DAY + 1, day, true)).toBe(false);
  });

  it('keeps the debriefing from a tester who plays on until the study is over', () => {
    expect(afterPart1('2026-11-28')).toBe('choice');
    expect(afterPart1(STUDY_END)).toBe('debrief');
    const waiting = { ...startQ(), stage: 'waiting' as const };
    expect(shouldAsk(waiting, 20, '2026-12-10', true)).toBe(false);
    expect(shouldAsk(waiting, 29, STUDY_END, true)).toBe(true);
    // A late tester is asked for part 1 when the study ends, even before day 8.
    expect(shouldAsk(startQ(), 3, STUDY_END, true)).toBe(true);
  });

  it('makes the form a must from the day the study ends, for testers in the study, until it is done', () => {
    expect(STUDY_END).toBe('2026-12-19');
    expect(mustAnswer(startQ(), '2026-12-18', true)).toBe(false);
    expect(mustAnswer(startQ(), STUDY_END, true)).toBe(true);
    expect(mustAnswer({ ...startQ(), stage: 'waiting', asks: 3 }, '2026-12-25', true)).toBe(true);
    expect(mustAnswer(startQ(), STUDY_END, false)).toBe(false);
    expect(mustAnswer({ ...startQ(), stage: 'done' }, STUDY_END, true)).toBe(false);
  });

  it('times the last notification to noon the day the study ends, at most 14 days ahead', () => {
    expect(endPushDelay(at(2026, 12, 18, 12))).toBe(24 * 60 * 60 * 1000);
    expect(endPushDelay(at(2026, 11, 21, 12))).toBeNull();
    expect(endPushDelay(at(2026, 12, 19, 13))).toBeNull();
  });

  it('counts test days from the first day', () => {
    expect(testDayOf('2026-11-21', '2026-11-21')).toBe(1);
    expect(testDayOf('2026-11-21', '2026-11-28')).toBe(8);
  });

  it('times the notification to noon on the due day, and not after it', () => {
    expect(pushDelay('2026-11-21', at(2026, 11, 21, 12))).toBe(7 * 24 * 60 * 60 * 1000);
    expect(pushDelay('2026-11-21', at(2026, 11, 28, 11))).toBe(60 * 60 * 1000);
    expect(pushDelay('2026-11-21', at(2026, 11, 28, 13))).toBeNull();
  });

  it('says nothing about what the study measures before the debriefing', () => {
    const before = JSON.stringify(PART1).toLowerCase();
    for (const word of ['manipul', 'krok', 'knep', 'press', 'rigg', 'trappa', 'beroende', 'lura']) expect(before).not.toContain(word);
  });

  it('only mentions what the player has met', () => {
    const league = !ON_HOLD.includes('league');
    const games = league && !ON_HOLD.includes('album') && !ON_HOLD.includes('heroes');
    const neighbours = !ON_HOLD.includes('conquest');
    const wheel = !ON_HOLD.includes('wheel');
    expect(debrief(early).join(' ')).not.toMatch(/grann|lyckohjul/i);
    if (neighbours) expect(debrief(far).join(' ')).toMatch(/påhittade/);
    else expect(debrief(far).join(' ')).not.toMatch(/grann/i);
    // The row of games is on hold (hooks.ts ON_HOLD), so nobody is told or asked about it.
    if (games || wheel) expect(debrief(far).join(' ')).toMatch(/lyckohjulet/i);
    else expect(debrief(far).join(' ')).not.toMatch(/lyckohjul/i);
    const chests = !ON_HOLD.includes('chests');
    if (league) expect(debrief(far).join(' ')).toMatch(/veckoligan var påhittade/);
    else expect(debrief(far).join(' ')).not.toMatch(/ligan/i);
    if (chests) expect(debrief(far).join(' ')).toMatch(/kistorna/i);
    else if (!games) expect(debrief(far).join(' ')).not.toMatch(/kistorna/i);
    const ids = (r: Reached) => part2(r).map((q) => q.id);
    expect(ids(early)).toEqual(['noticed', 'strongest', 'after']);
    expect(ids(far)).toEqual(neighbours ? ['noticed', 'strongest', 'realPlayers', 'after'] : ['noticed', 'strongest', 'after']);
    const strongest = (r: Reached) => { const q = part2(r)[1]; return q.kind === 'multi' ? q.options.map((o) => o.id) : []; };
    expect(strongest(early)).toEqual(['s1', 's2', 'none']);
    expect(strongest(far)).toHaveLength(11 - (games || wheel || !ON_HOLD.includes('chests') ? 0 : 1) - (neighbours ? 0 : 1));
  });

  it('requires every question but never the text boxes', () => {
    const [fun, opened] = PART1;
    expect(answered(fun, {})).toBe(false);
    expect(answered(fun, { fun: 3 })).toBe(true);
    expect(answered(opened, { opened: [] })).toBe(false);
    expect(answered(opened, { opened: ['push'], openedMore: '' })).toBe(true);
  });

  it('gives every question ready-made options, so nothing has to be typed', () => {
    for (const q of [...PART1, ...part2(far)]) expect(q.kind === 'scale' || q.options.length >= 3).toBe(true);
  });

  it('keeps an option like "nothing" alone', () => {
    const q = PART1.find((x) => x.id === 'annoying')!;
    const options = q.kind === 'multi' ? q.options : [];
    expect(pick(options, ['wait', 'push'], 'none', true)).toEqual(['none']);
    expect(pick(options, ['none'], 'wait', true)).toEqual(['wait']);
    expect(pick(options, ['wait'], 'push', true)).toEqual(['wait', 'push']);
    expect(pick(options, ['wait', 'push'], 'wait', false)).toEqual(['push']);
  });

  it('logs one part at a time, with trimmed and cut free text', () => {
    const answers = { fun: 4, opened: ['spare'], stopped: ['time'], stoppedMore: '  tog slut på liv  ', likedMore: '   ', realMoney: 'no', realMoneyMore: 'x'.repeat(MAX_TEXT + 50), noticed: 'some' };
    const out = forLog(PART1, answers);
    expect(out).toMatchObject({ fun: 4, opened: ['spare'], stopped: ['time'], stoppedMore: 'tog slut på liv', realMoney: 'no' });
    expect(out.likedMore).toBeUndefined();
    expect(out.noticed).toBeUndefined();
    expect((out.realMoneyMore as string).length).toBe(MAX_TEXT);
  });
});
