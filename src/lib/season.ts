/**
 * The village's look by date and daylight (Jonas, 2026-11-19): summer up to
 * and including 30 November, A (light snow) 1-7 December, B (deep winter) from
 * 8 December, and C (the blue hour) instead of A or B while the sun is down in
 * Skane. Pure logic.
 */
export type Look = 'summer' | 'a' | 'b' | 'c';
export const LOOKS: { id: Look; name: string }[] = [
  { id: 'summer', name: 'Sommar' },
  { id: 'a', name: 'A: lätt snö' },
  { id: 'b', name: 'B: djup vinter' },
  { id: 'c', name: 'C: blå timmen' },
];

/** Eslov, where Jonas lives; the sun there decides for every player. */
export const ESLOV = { lat: 55.84, lon: 13.3 };

const RAD = Math.PI / 180;
const DAY = 86_400_000;

/**
 * Sunrise and sunset (ms since 1970) for the solar noon nearest to `ms`, by
 * the sunrise equation; good to a couple of minutes. Null in polar night or day.
 */
export function sunTimes(ms: number, lat = ESLOV.lat, lon = ESLOV.lon): { rise: number; set: number } | null {
  const d = ms / DAY + 2440587.5 - 2451545;
  const lw = -lon;
  const n = Math.round(d - 0.0009 - lw / 360);
  const js = 0.0009 + lw / 360 + n;
  const m = (357.5291 + 0.98560028 * js) % 360;
  const c = 1.9148 * Math.sin(m * RAD) + 0.02 * Math.sin(2 * m * RAD) + 0.0003 * Math.sin(3 * m * RAD);
  const l = (m + c + 180 + 102.9372) % 360;
  const transit = js + 0.0053 * Math.sin(m * RAD) - 0.0069 * Math.sin(2 * l * RAD);
  const dec = Math.asin(Math.sin(l * RAD) * Math.sin(23.4397 * RAD));
  const cosW = (Math.sin(-0.833 * RAD) - Math.sin(lat * RAD) * Math.sin(dec)) / (Math.cos(lat * RAD) * Math.cos(dec));
  if (cosW < -1 || cosW > 1) return null;
  const w = Math.acos(cosW) / RAD / 360;
  const toMs = (j: number) => (j + 2451545 - 2440587.5) * DAY;
  return { rise: toMs(transit - w), set: toMs(transit + w) };
}

export function sunIsDown(ms: number): boolean {
  const t = sunTimes(ms);
  return !!t && (ms < t.rise || ms > t.set);
}

/**
 * The look at a time. Winter is December to February: Jonas only set its
 * start, and the playtest ends in December.
 */
export function lookAt(ms: number): Look {
  const d = new Date(ms);
  const month = d.getMonth();
  if (month !== 11 && month > 1) return 'summer';
  if (sunIsDown(ms)) return 'c';
  return month === 11 && d.getDate() <= 7 ? 'a' : 'b';
}
