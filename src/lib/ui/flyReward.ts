/**
 * The standard reward animation (Jonas, 2026-11-20): wherever the player is
 * given gold, gems or lives, the pieces pop out where the reward is shown,
 * hang for a moment and fly in an arc up to their counter in the menu bar,
 * which counts up as they land. Used by the wheel of fortune first; every
 * dialog that hands out gold or gems is meant to use it.
 */
import { writable } from 'svelte/store';

export type RewardKind = 'gold' | 'gems' | 'lives';

/** How many pieces fly for a reward: enough to read as a stream, never a swarm. */
export function pieces(kind: RewardKind, amount: number): number {
  if (amount <= 0) return 0;
  if (kind === 'lives') return Math.min(5, Math.round(amount));
  return Math.max(6, Math.min(14, Math.round(amount / (kind === 'gold' ? 40 : 4))));
}

/** What the counter shows when `landed` of `n` pieces have landed. */
export function countAt(from: number, to: number, landed: number, n: number): number {
  return n <= 0 || landed >= n ? to : Math.round(from + ((to - from) * landed) / n);
}

export interface Flight {
  /** The picture of one piece. */
  src: string;
  n: number;
  /** Where the pieces pop out, and the counter they fly to. */
  from: Element;
  to: Element;
  /** Called for each piece that lands, with how many have landed so far. */
  onLand: (landed: number, n: number) => void;
  onDone?: () => void;
}

const FLIGHT_MS = 1050;
const STAGGER_MS = 55;

/** Flies the pieces. With reduced motion, or without the Web Animations API, they land at once. */
export function flyReward(f: Flight): void {
  const calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (f.n <= 0 || calm || typeof document === 'undefined' || !('animate' in Element.prototype)) {
    f.onLand(f.n, f.n);
    f.onDone?.();
    return;
  }
  const a = f.from.getBoundingClientRect();
  const b = f.to.getBoundingClientRect();
  const x0 = a.left + a.width / 2;
  const y0 = a.top + a.height / 2;
  const x1 = b.left + b.height / 2; // the counter's icon sits at its left end
  const y1 = b.top + b.height / 2;
  const spread = Math.min(innerWidth, 480);
  const size = Math.round(spread * 0.085);
  const at = (x: number, y: number, s: number) => `translate(${x}px, ${y}px) scale(${s})`;
  let landed = 0;
  for (let i = 0; i < f.n; i++) {
    const el = document.createElement('img');
    el.src = f.src;
    el.alt = '';
    el.style.cssText = `position:fixed;left:0;top:0;width:${size}px;height:${size}px;margin:${-size / 2}px;object-fit:contain;pointer-events:none;z-index:60;will-change:transform`;
    document.body.appendChild(el);
    const sx = x0 + (Math.random() - 0.5) * spread * 0.3;
    const sy = y0 + (Math.random() - 0.5) * spread * 0.14;
    const mx = (sx + x1) / 2 + (Math.random() - 0.5) * spread * 0.3;
    const my = y1 + (sy - y1) * 0.35;
    const anim = el.animate(
      [
        { transform: at(x0, y0, 0.2), opacity: 0 },
        { transform: at(sx, sy, 1.15), opacity: 1, offset: 0.22 },
        { transform: at(sx, sy + 4, 1), opacity: 1, offset: 0.4 },
        { transform: at(mx, my, 0.95), opacity: 1, offset: 0.72 },
        { transform: at(x1, y1, 0.55), opacity: 1 },
      ],
      { duration: FLIGHT_MS, delay: i * STAGGER_MS, easing: 'cubic-bezier(.45, 0, .55, 1)', fill: 'both' },
    );
    const land = () => {
      el.remove();
      landed++;
      f.onLand(landed, f.n);
      if (landed === f.n) f.onDone?.();
    };
    anim.onfinish = land;
    anim.oncancel = land;
  }
}

// ---------------------------------------------------------------- to the menu bar
/**
 * Gold and gems that are still in the air: the purse already holds them, but
 * the menu bar's counters hold them back until the pieces have landed.
 */
export const inFlight = writable<{ gold: number; gems: number }>({ gold: 0, gems: 0 });

const ART: Record<'gold' | 'gems', string> = { gold: '/art/wheel/coin.webp', gems: '/art/wheel/gem.webp' };
let flights = 0;

/**
 * A dialog that has just paid gold or gems into the purse calls this in the
 * same tick: the menu bar keeps showing the old amount, is lifted above the
 * dialog's dark backdrop, and counts up as the pieces fly in from `from()`
 * (asked for on the next frame, when the dialog has drawn its "you got" line).
 */
export function rewardToMenuBar(kind: 'gold' | 'gems', amount: number, from: () => Element | null, delay = 0): void {
  if (amount <= 0 || typeof document === 'undefined') return;
  inFlight.update((f) => ({ ...f, [kind]: f[kind] + amount }));
  let left = amount;
  const settle = (now: number) => {
    inFlight.update((f) => ({ ...f, [kind]: Math.max(0, f[kind] - (left - now)) }));
    left = now;
  };
  const end = () => {
    settle(0);
    if (--flights <= 0) { flights = 0; document.body.classList.remove('reward-flying'); }
  };
  flights++;
  document.body.classList.add('reward-flying');
  setTimeout(() => requestAnimationFrame(() => {
    const origin = from();
    const target = document.querySelector(`[data-counter="${kind}"]`);
    if (!origin || !target) { end(); return; }
    flyReward({
      src: ART[kind], n: pieces(kind, amount), from: origin, to: target,
      onLand: (k, n) => {
        settle(amount - countAt(0, amount, k, n));
        target.classList.remove('landed');
        void (target as HTMLElement).offsetWidth;
        target.classList.add('landed');
      },
      onDone: end,
    });
  }), delay);
}
