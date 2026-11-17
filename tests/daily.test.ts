import { describe, expect, it } from 'vitest';
import { CALENDAR, canClaim, claim, dayHooksActive, dayKey, daysBetween, liveStreak, nextReminder, recordWin, startDaily, weekendEvent } from '../src/lib/daily';

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();

describe('daily', () => {
  it('counts local days', () => {
    expect(dayKey(at(2026, 11, 17))).toBe('2026-11-17');
    expect(daysBetween('2026-11-30', '2026-12-01')).toBe(1);
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2);
  });

  it('turns day hooks on from the second day in auto mode', () => {
    const s = startDaily(at(2026, 11, 17));
    expect(dayHooksActive(s, at(2026, 11, 17, 23), 'auto')).toBe(false);
    expect(dayHooksActive(s, at(2026, 11, 18, 1), 'auto')).toBe(true);
    expect(dayHooksActive(s, at(2026, 11, 17), 'on')).toBe(true);
    expect(dayHooksActive(s, at(2026, 11, 20), 'off')).toBe(false);
  });

  it('gives one calendar gift a day, seven in all', () => {
    let s = startDaily(at(2026, 11, 17));
    const first = claim(s, at(2026, 11, 18))!;
    expect(first.gift).toEqual(CALENDAR[0]);
    s = first.state;
    expect(canClaim(s, at(2026, 11, 18, 20))).toBe(false);
    for (let d = 19; d <= 24; d++) s = claim(s, at(2026, 11, d))!.state;
    expect(s.claimed).toBe(7);
    expect(canClaim(s, at(2026, 11, 25))).toBe(false);
  });

  it('builds a streak of days with a win and breaks it after a missed day', () => {
    let s = startDaily(at(2026, 11, 17));
    let r = recordWin(s, at(2026, 11, 17));
    expect(r.bonus).toBe(50);
    s = r.state;
    expect(recordWin(s, at(2026, 11, 17, 18)).bonus).toBe(0);
    r = recordWin(s, at(2026, 11, 18));
    expect(r.state.streak).toBe(2);
    expect(r.bonus).toBe(100);
    s = r.state;
    expect(liveStreak(s, at(2026, 11, 19))).toBe(2);
    expect(liveStreak(s, at(2026, 11, 20))).toBe(0);
    expect(recordWin(s, at(2026, 11, 20)).state.streak).toBe(1);
  });

  it('finds the weekend and the reminder time', () => {
    expect(weekendEvent(at(2026, 11, 21)).on).toBe(true); // Saturday
    expect(weekendEvent(at(2026, 11, 20, 19)).on).toBe(true); // Friday evening
    expect(weekendEvent(at(2026, 11, 18)).on).toBe(false);
    expect(new Date(weekendEvent(at(2026, 11, 22)).endsAt).getDate()).toBe(23);
    expect(new Date(nextReminder(at(2026, 11, 17, 9))).getHours()).toBe(18);
  });
});
