/**
 * The chapel bell (Jonas approved the sound and the pace on 2026-11-20): it
 * strikes every quarter by the real clock, heard only in the village. One
 * stroke at a quarter past, two at half past, three at a quarter to; on the
 * hour four, a pause, and then the hour by the twelve-hour clock on a deeper
 * bell. Duller and quieter while the sun is down. Pure logic; the scene rings.
 */
export const QUARTER_MS = 15 * 60_000;

/** Seconds between strokes, and how the one recorded stroke is played for each bell. */
export const BELL = {
  quarterGap: 2.0, pause: 3.2, hourGap: 2.8,
  quarter: { rate: 1.68, level: 0.75 },
  hour: { rate: 1.26, level: 0.9 },
};

/** Which quarter of all time a moment lies in; it changes exactly when the bell is due. */
export function quarterOf(ms: number): number {
  return Math.floor(ms / QUARTER_MS);
}

/** How long ago the latest quarter began. */
export function sinceQuarter(ms: number): number {
  return ms - quarterOf(ms) * QUARTER_MS;
}

/** What the bell strikes for the quarter that a local time lies in. */
export function strikesAt(ms: number): { quarters: number; hours: number } {
  const d = new Date(ms);
  const q = Math.floor(d.getMinutes() / 15);
  return q === 0 ? { quarters: 4, hours: d.getHours() % 12 || 12 } : { quarters: q, hours: 0 };
}

/** When each stroke comes, in seconds from the first one. */
export function strokes(quarters: number, hours: number): { at: number; hour: boolean }[] {
  const out: { at: number; hour: boolean }[] = [];
  let t = 0;
  for (let n = 0; n < quarters; n++) { out.push({ at: t, hour: false }); t += BELL.quarterGap; }
  if (hours > 0) t += BELL.pause - BELL.quarterGap;
  for (let n = 0; n < hours; n++) { out.push({ at: t, hour: true }); t += BELL.hourGap; }
  return out;
}
