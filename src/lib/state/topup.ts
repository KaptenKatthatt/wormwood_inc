/**
 * Topping up the test wallet by e-mail (Jonas, 2026-11-20): friction on
 * purpose, and a measure of how many bother to ask for more money. The
 * tester asks Jonas by e-mail with the test code filled in, Jonas answers
 * with a code from the dev menu, and the code gives 100 kr in the shop. The
 * server (server/reach.mjs) checks that the code is this tester's and unused.
 */
import { get } from 'svelte/store';
import { log } from '../log/logger';
import { testCode } from '../testCode';
import { playerId, purse, toast } from './game';
import { formatKr } from '../economy/wallet';

/** Where "Be om påfyllning" sends the e-mail (Jonas, 2026-11-20). */
export const TOPUP_ADDRESS = 'hej@jonasolson.se';

/** The ready-made e-mail, with the test code filled in. */
export function topupMailto(code = testCode(playerId)): string {
  const subject = `Påfyllning av testplånboken (${code})`;
  const body = `Hej Jonas!\n\nMin testplånbok i Skärgårdsbyn är tom. Kan jag få en påfyllning?\n\nMin testkod: ${code}\n`;
  return `mailto:${TOPUP_ADDRESS}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** "Be om påfyllning": logged, then the e-mail opens. */
export function askTopup(where: string): void {
  log('topup_asked', { testCode: testCode(playerId), kronor: get(purse).kronor, where });
  location.href = topupMailto();
}

export type RedeemResult = 'ok' | 'unknown' | 'used' | 'offline';

/** The code from Jonas's answer: 100 kr in the wallet if the server says it is this tester's and unused. */
export async function redeemTopup(code: string): Promise<RedeemResult> {
  let status = 0;
  let kronor = 0;
  try {
    const r = await fetch('/api/wallet/redeem', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ playerId, code }) });
    status = r.status;
    kronor = Number((await r.json().catch(() => ({})))?.kronor) || 0;
  } catch {
    status = 0;
  }
  const result: RedeemResult = status === 200 ? 'ok' : status === 404 ? 'unknown' : status === 409 ? 'used' : 'offline';
  log('topup_redeem', { testCode: testCode(playerId), code: code.trim().toUpperCase(), result, kronorBefore: get(purse).kronor });
  if (result === 'ok') {
    purse.update((p) => ({ ...p, kronor: p.kronor + kronor }));
    toast(`${formatKr(kronor)} har lagts i testplånboken.`);
  }
  return result;
}
