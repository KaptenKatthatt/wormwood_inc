import { describe, expect, it } from 'vitest';
import { REPAIR_MAX_GEMS, TIRED_FLOOR, countWin, declineRepair, recordWin, repairOffer, repairStreak, startDaily, tiredFactor, type DailyState } from '../src/lib/daily';

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();

/** A player who won on 17, 18 and 19 November: a three-day streak. */
function threeDays(): DailyState {
  let s = startDaily(at(2026, 11, 17));
  for (const d of [17, 18, 19]) s = recordWin(s, at(2026, 11, d)).state;
  return s;
}

describe('streak protection', () => {
  it('a shield saves the streak over one missed day and is used up', () => {
    const s = { ...threeDays(), shields: 1 };
    const r = recordWin(s, at(2026, 11, 21));
    expect(r.shielded).toBe(true);
    expect(r.state.streak).toBe(4);
    expect(r.state.shields).toBe(0);
  });

  it('a shield does not cover two missed days, nor work with the hook off', () => {
    const s = { ...threeDays(), shields: 1 };
    expect(recordWin(s, at(2026, 11, 22)).state.streak).toBe(1);
    expect(recordWin(s, at(2026, 11, 21), false).state.streak).toBe(1);
  });

  it('offers a repair the day after the missed day, once, at a price that grows with the streak', () => {
    const s = threeDays();
    expect(repairOffer(s, at(2026, 11, 20))).toBeNull(); // nothing missed yet
    const o = repairOffer(s, at(2026, 11, 21));
    expect(o).toEqual({ streak: 3, price: 30 });
    expect(repairOffer(declineRepair(s, at(2026, 11, 21)), at(2026, 11, 21, 18))).toBeNull();
    expect(repairOffer(s, at(2026, 11, 22))).toBeNull(); // two days missed: too late
    expect(repairOffer({ ...s, streak: 20 }, at(2026, 11, 21))!.price).toBe(REPAIR_MAX_GEMS);
  });

  it('a repaired streak continues with the next win', () => {
    const s = repairStreak(threeDays(), at(2026, 11, 21, 9));
    expect(recordWin(s, at(2026, 11, 21, 15)).state.streak).toBe(4);
  });
});

describe('diminishing rewards', () => {
  it('pays full gold for the first eight wins of a day, then less, down to the floor', () => {
    expect(tiredFactor(1)).toBe(1);
    expect(tiredFactor(8)).toBe(1);
    expect(tiredFactor(9)).toBe(0.9);
    expect(tiredFactor(12)).toBe(0.6);
    expect(tiredFactor(40)).toBe(TIRED_FLOOR);
  });

  it('counts wins per day and starts over the next day', () => {
    let s = startDaily(at(2026, 11, 17));
    for (let i = 0; i < 3; i++) s = countWin(s, at(2026, 11, 17)).state;
    expect(countWin(s, at(2026, 11, 17, 20)).n).toBe(4);
    expect(countWin(s, at(2026, 11, 18)).n).toBe(1);
  });
});
