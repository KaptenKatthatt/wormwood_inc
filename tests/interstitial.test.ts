import { describe, expect, it } from 'vitest';
import { freshInter, interDue, interLook, interShown, offerRemoveAds, REMOVE_ADS_AFTER } from '../src/lib/expansion/interstitial';
import { stepOfHook } from '../src/lib/expansion/week';
import { MINUTE } from '../src/lib/time/clock';

const at = (since: number, lastAt = 0) => ({ ...freshInter(), since, lastAt });
const T = 60 * MINUTE;

describe('ads between challenges', () => {
  it('belongs to step 6 of the week staircase', () => {
    expect(stepOfHook('interstitial')).toBe(6);
  });

  it('never comes before step 6', () => {
    expect(interDue(5, at(10), 'win', T)).toBe(false);
  });

  it('step 6: after every third finished challenge, not on a loss alone', () => {
    expect(interDue(6, at(2), 'win', T)).toBe(false);
    expect(interDue(6, at(3), 'win', T)).toBe(true);
    expect(interDue(6, at(1), 'lose', T)).toBe(false);
    expect(interDue(6, at(3), 'lose', T)).toBe(true);
  });

  it('step 6 waits 3 minutes between ads, step 7 two and step 9 one', () => {
    expect(interDue(6, at(3, T - 2 * MINUTE), 'win', T)).toBe(false);
    expect(interDue(6, at(3, T - 3 * MINUTE), 'win', T)).toBe(true);
    expect(interDue(7, at(2, T - 2 * MINUTE), 'win', T)).toBe(true);
    expect(interDue(9, at(2, T - 1 * MINUTE), 'win', T)).toBe(true);
    expect(interDue(8, at(2, T - 1 * MINUTE), 'win', T)).toBe(false);
  });

  it('step 7: every second challenge and every loss', () => {
    expect(interDue(7, at(1), 'win', T)).toBe(false);
    expect(interDue(7, at(2), 'win', T)).toBe(true);
    expect(interDue(7, at(1), 'lose', T)).toBe(true);
  });

  it('coming back and going to the map bring an ad only from step 8', () => {
    expect(interDue(7, at(0), 'resume', T)).toBe(false);
    expect(interDue(7, at(0), 'toMap', T)).toBe(false);
    expect(interDue(8, at(0), 'resume', T)).toBe(true);
    expect(interDue(8, at(0), 'toMap', T)).toBe(true);
    expect(interDue(8, at(0, T - MINUTE), 'toMap', T)).toBe(false);
  });

  it('stops for good once "Ta bort reklam" is bought', () => {
    expect(interDue(9, { ...at(5), removed: true }, 'lose', T)).toBe(false);
  });

  it('the cross: after 5 s, on step 9 after 8 s and small every third time', () => {
    expect(interLook(6, freshInter())).toEqual({ xAfter: 5, smallX: false });
    expect(interLook(8, freshInter())).toEqual({ xAfter: 5, smallX: false });
    const looks = [0, 1, 2, 3, 4, 5].map((shown) => interLook(9, { ...freshInter(), shown }).smallX);
    expect(looks).toEqual([false, false, true, false, false, true]);
    expect(interLook(9, freshInter()).xAfter).toBe(8);
  });

  it('counts the ads of the day and starts the count again on a new day', () => {
    let s = freshInter();
    s = interShown({ ...s, since: 3 }, 1, 'd1');
    expect(s).toMatchObject({ since: 0, lastAt: 1, shown: 1, day: 'd1', today: 1 });
    s = interShown(s, 2, 'd1');
    expect(s.today).toBe(2);
    s = interShown(s, 3, 'd2');
    expect(s).toMatchObject({ today: 1, shown: 3 });
  });

  it('offers "Ta bort reklam" from step 8, after the third ad of the day, until turned down that day', () => {
    const third = { ...freshInter(), day: 'd1', today: REMOVE_ADS_AFTER };
    expect(offerRemoveAds(7, third, 'd1')).toBe(false);
    expect(offerRemoveAds(8, { ...third, today: 2 }, 'd1')).toBe(false);
    expect(offerRemoveAds(8, third, 'd1')).toBe(true);
    expect(offerRemoveAds(9, { ...third, today: 5 }, 'd1')).toBe(true);
    expect(offerRemoveAds(8, { ...third, declinedDay: 'd1' }, 'd1')).toBe(false);
    expect(offerRemoveAds(8, { ...third, removed: true }, 'd1')).toBe(false);
  });
});
