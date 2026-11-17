/**
 * The built-in introduction (Jonas 2026-11-17: hand the phone to anyone and
 * explain nothing). Each step points at one thing on screen and waits for the
 * player to do it.
 * Warm and safe in tone. It can be replayed from the settings.
 */
import { writable, get } from 'svelte/store';
import { load, save } from './state/storage';
import { log } from './log/logger';

export type TutEvent = 'levelStarted' | 'moved' | 'levelEnded' | 'inVillage' | 'built';

export interface TutStep {
  id: string;
  /** Which tab the step lives on. */
  tab: 'pussel' | 'byn' | 'installningar' | 'any';
  /** The player goes there themselves (the step teaches the way); otherwise the game takes them. */
  selfNav?: boolean;
  /** data-tut attribute of the element to point at, if any; "a|b" points at the first that exists. */
  target?: string;
  title: string;
  text: string;
  /** Wait for this event instead of showing a Next button. */
  waitFor?: TutEvent;
  /** No bubble at all: the player just plays (Jonas: the sign covered the goal). */
  silent?: boolean;
  /** Show the move hint on the board. */
  hint?: boolean;
}

/**
 * Four steps, played rather than read (Jonas, 2026-11-17: at most 3 to 5
 * steps, straight into the game). As in the big puzzle games, the first
 * challenge starts at once with a hand showing the first move; everything
 * else (lives, gems, quitting) gets a single tip the first time it matters.
 */
export const TUT_STEPS: TutStep[] = [
  { id: 'swap', tab: 'pussel', target: 'board', title: 'Byt plats på två brickor', text: 'Få tre likadana i rad. Följ handen.', waitFor: 'moved', hint: true },
  { id: 'play', tab: 'pussel', silent: true, title: 'Spela', text: '', waitFor: 'levelEnded' },
  { id: 'village', tab: 'byn', target: 'to-village|tab-byn', selfNav: true, title: 'Till byn', text: 'Använd guldet i byn.', waitFor: 'inVillage' },
  { id: 'build', tab: 'byn', target: 'build-stugan', title: 'Bygg ditt första hus', text: 'Tryck Bygg vid Stugan.', waitFor: 'built' },
];

interface TutState { index: number | null; startedAt: number }

export const tutorial = writable<TutState>(load('tutorial', { index: null, startedAt: 0 }));
tutorial.subscribe((t) => save('tutorial', t));

export const tutorialDone = (): boolean => load('tutorialDone', false);

export function currentTutStep(): TutStep | null {
  const i = get(tutorial).index;
  return i === null ? null : TUT_STEPS[i] ?? null;
}

let onFinish: (() => void) | null = null;
/** Called once when the introduction ends (finished or skipped). */
export function onTutorialFinish(fn: () => void): void {
  onFinish = fn;
}

export function startTutorial(replay = false): void {
  tutorial.set({ index: 0, startedAt: Date.now() });
  log('tutorial_start', { replay });
}

export function nextTutStep(): void {
  const t = get(tutorial);
  if (t.index === null) return;
  const next = t.index + 1;
  if (next >= TUT_STEPS.length) return endTutorial(false);
  log('tutorial_step', { step: TUT_STEPS[next].id, seconds: Math.round((Date.now() - t.startedAt) / 1000) });
  tutorial.set({ ...t, index: next });
}

export function tutEvent(ev: TutEvent): void {
  const step = currentTutStep();
  if (step?.waitFor === ev) nextTutStep();
}

export function endTutorial(skipped: boolean): void {
  const t = get(tutorial);
  if (t.index === null) return;
  log('tutorial_end', { skipped, atStep: TUT_STEPS[t.index]?.id, seconds: Math.round((Date.now() - t.startedAt) / 1000) });
  tutorial.set({ index: null, startedAt: 0 });
  const first = !tutorialDone();
  save('tutorialDone', true);
  if (first) onFinish?.();
}

export const tutorialActive = (): boolean => get(tutorial).index !== null;
