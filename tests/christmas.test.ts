import { describe, expect, it } from 'vitest';
import { DECOR, DOOR_COOKIES, LATE_DOOR_GEMS, buyDecor, cookiesForWin, countdownText, decorBlock, doorGift, doorPrice, doorStatus, eventDay, forYear, openDoor, refill, startXmas } from '../src/lib/christmas';

const at = (m: number, d: number, y = 2026) => new Date(y, m - 1, d, 12).getTime();

describe('Christmas in Skargardsbyn', () => {
  it('runs from 1 to 24 December', () => {
    expect(eventDay(at(11, 30))).toBe(0);
    expect(eventDay(at(12, 1))).toBe(1);
    expect(eventDay(at(12, 24))).toBe(24);
    expect(eventDay(at(12, 25))).toBe(0);
  });

  it('gives gems in doors 6, 13 and 20, the star in 24, and gold or a life otherwise', () => {
    for (let d = 1; d <= 24; d++) {
      const g = doorGift(d);
      if ([6, 13, 20].includes(d)) expect(g).toEqual({ gems: 1 });
      else if (d === 24) expect(g).toEqual({ star: true });
      else if (g.gold) expect(g.gold >= 100 && g.gold <= 300).toBe(true);
      else expect(g.life).toBe(true);
    }
  });

  it('opens today for free, missed doors for gems, and no later doors', () => {
    const s = startXmas(2026);
    expect(doorStatus(s, 3, 5)).toBe('missed'); // also days before the player started
    expect(doorPrice(s, 5, 5)).toBe(0);
    expect(doorPrice(s, 3, 5)).toBe(LATE_DOOR_GEMS);
    expect(doorPrice(s, 6, 5)).toBeNull();
    const r = openDoor(s, 5, 5)!;
    expect(r.late).toBe(false);
    expect(r.state.cookies).toBe(DOOR_COOKIES);
    expect(doorPrice(r.state, 5, 5)).toBeNull();
    expect(openDoor(r.state, 3, 5)!.late).toBe(true);
    expect(openDoor(s, 6, 5)).toBeNull();
  });

  it('door 24 gives the star, and nothing opens after the 24th', () => {
    const r = openDoor(startXmas(2026), 24, 24)!;
    expect(r.state.star).toBe(true);
    expect(doorPrice(startXmas(2026), 24, 0)).toBeNull();
    expect(doorPrice(startXmas(2026), 3, 0)).toBeNull();
  });

  it('pays gingerbread for wins and prices the top-up at 10 per gem', () => {
    expect(cookiesForWin(1)).toBe(6);
    expect(cookiesForWin(3)).toBe(8);
    expect(refill(1)).toEqual({ gems: 1, cookies: 10 });
    expect(refill(25)).toEqual({ gems: 3, cookies: 30 });
  });

  it('sells decorations for gingerbread until the market closes, and keeps them', () => {
    expect(DECOR.map((d) => d.cookies)).toEqual([40, 80, 150, 250, 400]);
    let s = { ...startXmas(2026), cookies: 100 };
    expect(decorBlock(s, 'tree', 10)).toBe('cookies');
    expect(buyDecor(s, 'tree', 10)).toBeNull();
    s = buyDecor(s, 'lights', 10)!;
    expect(s.cookies).toBe(60);
    expect(decorBlock(s, 'lights', 10)).toBe('owned');
    expect(decorBlock(s, 'sheaves', 0)).toBe('closed');
    expect(buyDecor(s, 'sheaves', 0)).toBeNull();
    expect(s.decor).toEqual(['lights']);
  });

  it('counts down to the 24th', () => {
    expect(countdownText(1)).toBe('Julmarknaden stänger om 23 dagar');
    expect(countdownText(23)).toBe('Julmarknaden stänger om 1 dag');
    expect(countdownText(24)).toBe('Julmarknaden stänger i kväll');
  });

  it('starts a new calendar the next December but keeps the decorations', () => {
    const s = { ...startXmas(2026), opened: [1, 2], cookies: 30, decor: ['lights' as const], star: true };
    expect(forYear(s, at(12, 26, 2026))).toBe(s);
    const n = forYear(s, at(12, 2, 2027));
    expect(n.opened).toEqual([]);
    expect(n.decor).toEqual(['lights']);
    expect(n.star).toBe(true);
  });
});
