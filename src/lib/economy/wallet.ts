/**
 * Test wallet with pretend kronor. No real money moves anywhere; purchases are
 * logged so the playtest shows what the player would have paid.
 * Amounts are whole öre-free kronor.
 */
import { MINUTE } from '../time/clock';

export interface Wallet { kronor: number; spent: number }

export const START_WALLET: Wallet = { kronor: 100, spent: 0 };

/** Price to finish a timer now: 1 kr per started 5 game minutes, at least 1 kr. */
export function skipPrice(remainingMs: number): number {
  if (remainingMs <= 0) return 0;
  return Math.max(1, Math.ceil(remainingMs / (5 * MINUTE)));
}

export function pay(w: Wallet, price: number): Wallet | null {
  if (price < 0 || w.kronor < price) return null;
  return { kronor: w.kronor - price, spent: w.spent + price };
}

export function topUp(w: Wallet, amount: number): Wallet {
  return { ...w, kronor: w.kronor + Math.max(0, Math.round(amount)) };
}

export const formatKr = (n: number): string => `${n.toLocaleString('sv-SE')} kr`;
