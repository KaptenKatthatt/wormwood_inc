import { describe, expect, it } from 'vitest';
import { DUE_DAY, MAX_ASKS, MAX_TEXT, PART1, answered, debrief, forLog, part2, pushDelay, shouldAsk, startQ, testDayOf, type Reached } from '../src/lib/questionnaire';

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();
const early: Reached = { steps: [1, 2], weekStep: 5, secondDay: false };
const far: Reached = { steps: [1, 2, 3, 4, 5], weekStep: 9, secondDay: true };

describe('questionnaire', () => {
  it('asks by itself once a day from the due day, a few times, and only with consent', () => {
    let s = startQ();
    expect(shouldAsk(s, DUE_DAY - 1, true)).toBe(false);
    expect(shouldAsk(s, DUE_DAY, false)).toBe(false);
    expect(shouldAsk(s, DUE_DAY, true)).toBe(true);
    s = { ...s, askedDay: DUE_DAY, asks: 1 };
    expect(shouldAsk(s, DUE_DAY, true)).toBe(false);
    expect(shouldAsk(s, DUE_DAY + 1, true)).toBe(true);
    expect(shouldAsk({ ...s, asks: MAX_ASKS }, DUE_DAY + 5, true)).toBe(false);
    expect(shouldAsk({ ...s, stage: 'done' }, DUE_DAY + 1, true)).toBe(false);
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
    expect(debrief(early).join(' ')).not.toMatch(/grann|lyckohjul/i);
    expect(debrief(far).join(' ')).toMatch(/påhittade/);
    expect(debrief(far).join(' ')).toMatch(/lyckohjulet/);
    const ids = (r: Reached) => part2(r).map((q) => q.id);
    expect(ids(early)).toEqual(['noticed', 'strongest', 'after']);
    expect(ids(far)).toEqual(['noticed', 'strongest', 'realPlayers', 'after']);
    const strongest = (r: Reached) => { const q = part2(r)[1]; return q.kind === 'multi' ? q.options.map((o) => o.id) : []; };
    expect(strongest(early)).toEqual(['s1', 's2', 'none']);
    expect(strongest(far)).toHaveLength(11);
  });

  it('requires the choices but not the free text', () => {
    const [fun, opened, stopped] = PART1;
    expect(answered(fun, {})).toBe(false);
    expect(answered(fun, { fun: 3 })).toBe(true);
    expect(answered(opened, { opened: [] })).toBe(false);
    expect(answered(opened, { opened: ['push'] })).toBe(true);
    expect(answered(stopped, {})).toBe(true);
  });

  it('logs one part at a time, with trimmed and cut free text', () => {
    const answers = { fun: 4, opened: ['spare'], stopped: '  tog slut på liv  ', feel: '   ', realMoney: 'no', realMoneyMore: 'x'.repeat(MAX_TEXT + 50), noticed: 'some' };
    const out = forLog(PART1, answers);
    expect(out).toMatchObject({ fun: 4, opened: ['spare'], stopped: 'tog slut på liv', realMoney: 'no' });
    expect(out.feel).toBeUndefined();
    expect(out.noticed).toBeUndefined();
    expect((out.realMoneyMore as string).length).toBe(MAX_TEXT);
  });
});
