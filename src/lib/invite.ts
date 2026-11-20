/**
 * The invitation (Jonas, 2026-11-20): the playtest build cannot be played
 * until Jonas has let the player in with a personal link,
 * https://skargardsbyn.<ip>.sslip.io/?kod=K7M2QX . The code is kept on the
 * phone and is the tester's test code from then on. The dev build has no gate.
 * The server's side is server/invites.mjs.
 */
import { DEV_MENU } from './config/flags';
import { load, save } from './state/storage';
import { testCode } from './testCode';

export type Round = 'pilot' | '1' | '2' | 'egen' | 'jonas';
export interface Invite { code: string; round: Round; opensAt: number | null; open: boolean }

export const ROUND_NAMES: Record<Round, string> = { pilot: 'Piloten', 1: 'Omgång 1', 2: 'Omgång 2', egen: 'Egen start', jonas: 'Jonas själv' };

/** Only the playtest build is locked. */
export const GATED: boolean = !DEV_MENU;

export function storedInvite(): Invite | null {
  return load<Invite | null>('invite', null);
}

/** "k7m-2qx " -> "K7M2QX". */
export const cleanCode = (v: string): string => v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
export const looksLikeCode = (v: string): boolean => /^[A-Z2-9]{6}$/.test(cleanCode(v));

/** The code in the link, if the game was opened from one. */
export function codeInUrl(href: string = location.href): string {
  try {
    const c = new URL(href).searchParams.get('kod');
    return c ? cleanCode(c) : '';
  } catch {
    return '';
  }
}

/** True when the game may start: the round has opened (the server said so once, or its day has come). */
export function admitted(inv: Invite | null = storedInvite(), now: number = Date.now()): boolean {
  if (!GATED) return true;
  if (!inv) return false;
  return inv.open || (typeof inv.opensAt === 'number' && inv.opensAt <= now);
}

/** The player's test code: the invitation's, or the old one made from the player id. */
export function myCode(playerId: string): string {
  return storedInvite()?.code ?? testCode(playerId);
}

export type CheckResult = { kind: 'ok'; invite: Invite } | { kind: 'unknown' } | { kind: 'taken' } | { kind: 'offline' };

/** Asks the server about a code and keeps it when it is good. */
export async function checkCode(code: string, playerId: string): Promise<CheckResult> {
  let r: Response;
  try {
    r = await fetch('/api/invite/check', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: cleanCode(code), playerId }) });
  } catch {
    return { kind: 'offline' };
  }
  if (r.status === 404 || r.status === 400) return { kind: 'unknown' };
  if (r.status === 409) return { kind: 'taken' };
  if (!r.ok) return { kind: 'offline' };
  const j = await r.json().catch(() => null);
  if (!j?.ok) return { kind: 'offline' };
  const before = storedInvite();
  // Once in, always in: a round whose day Jonas moves later does not lock out someone already playing.
  const invite: Invite = { code: j.code, round: j.round, opensAt: j.opensAt ?? null, open: Boolean(j.open) || (before?.code === j.code && before?.open === true) };
  save('invite', invite);
  return { kind: 'ok', invite };
}

/** Jonas took the invitation back: the phone forgets it, and the game locks again. */
export function forgetInvite(): void {
  save('invite', null);
}

const DAY = new Intl.DateTimeFormat('sv-SE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Stockholm' });
/** "fredag 27 november" */
export const openDayText = (ms: number): string => DAY.format(new Date(ms));
