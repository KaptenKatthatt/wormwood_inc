/**
 * The phone's back gesture (a swipe in from the edge of the screen) closed the
 * game, because the game had nothing to go back to (Jonas, 2026-11-20). One
 * extra history entry now takes the gesture: inside a challenge it opens the
 * pause menu, anywhere else the game asks before it closes.
 *
 * Only the back gesture can be caught. The home gesture and the app switcher
 * belong to the phone.
 */
import { get, writable } from 'svelte/store';
import { inLevel, levelMenuAsked } from '../state/game';
import { log } from '../log/logger';

/** True while the game asks "close the game?". */
export const closeAsked = writable(false);

let armed = false;
function arm(): void {
  if (armed) return;
  armed = true;
  history.pushState({ guard: true }, '', location.href);
}

export function initBackGuard(): void {
  if (typeof window === 'undefined') return;
  // The browser only lets an entry catch the back gesture when it was added
  // after the player touched the page, so the guard goes in at the first touch.
  const opts = { capture: true, passive: true } as const;
  window.addEventListener('pointerdown', arm, opts);
  window.addEventListener('keydown', arm, opts);
  window.addEventListener('popstate', () => {
    if (!armed) return;
    armed = false;
    if (get(closeAsked)) return; // back again while the question shows: the game closes
    if (get(inLevel)) {
      levelMenuAsked.set(true);
      arm();
      log('back_gesture', { result: 'pause' });
      return;
    }
    closeAsked.set(true);
    log('back_gesture', { result: 'asked' });
  });
}

/** "Stanna kvar": the question goes away and the guard is back. */
export function stay(): void {
  closeAsked.set(false);
  arm();
}

/** "Stäng": lets the back gesture through, which closes an installed game. */
export function closeGame(): void {
  closeAsked.set(false);
  log('back_gesture', { result: 'closed' });
  window.removeEventListener('pointerdown', arm, true);
  window.removeEventListener('keydown', arm, true);
  history.back();
  // In a browser tab with nothing behind it, back does nothing: try to close the tab.
  setTimeout(() => { try { window.close(); } catch { /* not allowed for this tab */ } }, 150);
}
