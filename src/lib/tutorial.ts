/**
 * The built-in introduction (Jonas 2026-11-17: hand the phone to anyone and
 * explain nothing). A short guided first round: each step points at one thing
 * on screen and either waits for the player to do it or has a Next button.
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
  /** Show the move hint on the board. */
  hint?: boolean;
}

export const TUT_STEPS: TutStep[] = [
  { id: 'welcome', tab: 'any', title: 'Välkommen!', text: 'Här bygger du upp en liten by vid havet genom att lösa pussel. Jag visar dig hur, det tar bara en minut.' },
  { id: 'levels', tab: 'pussel', target: 'map-current', title: 'Kartan', text: 'Vägen går genom skärgården, skogen och fjällen. Varje punkt är en utmaning. Tryck Spela för att börja.', waitFor: 'levelStarted' },
  { id: 'swap', tab: 'pussel', target: 'board', title: 'Byt plats på två brickor', text: 'Få tre likadana i rad. Tryck på en bricka och sedan på den bredvid, eller dra. De två som blinkar passar bra.', waitFor: 'moved', hint: true },
  { id: 'goal', tab: 'pussel', target: 'goal', title: 'Målet', text: 'Här står vad utmaningen går ut på och hur nära du är. Siffran till höger är hur många drag du har kvar.' },
  { id: 'lives', tab: 'pussel', target: 'lives', title: 'Liv', text: 'Hjärtat är dina liv. Klarar du inte en utmaning går ett liv åt, och ett nytt kommer av sig självt efter en stund.' },
  { id: 'finish', tab: 'pussel', target: 'board', title: 'Spela klart', text: 'Fortsätt byta brickor tills utmaningen är klar eller dragen är slut. Klarar du den får du guld.', waitFor: 'levelEnded' },
  { id: 'village', tab: 'byn', target: 'to-village|tab-byn', selfNav: true, title: 'Byn', text: 'Gå till byn. Där använder du guldet.', waitFor: 'inVillage' },
  { id: 'build', tab: 'byn', target: 'build-stugan', title: 'Bygg ditt första hus', text: 'Tryck Bygg vid Stugan. Ett bygge tar en liten stund, och sedan står huset där.', waitFor: 'built' },
  { id: 'gems', tab: 'byn', target: 'gems', title: 'Ädelstenar', text: 'Ädelstenarna kan användas till genvägar, som extra drag. Tryck här för att se butiken. Pengarna är på låtsas.' },
  { id: 'quit', tab: 'byn', target: 'quit', title: 'När du vill sluta', text: 'Tryck Avsluta längst ner i byn. Då får du svara på några korta frågor.' },
  { id: 'home', tab: 'any', target: 'tab-installningar', title: 'Spara på hemskärmen', text: 'Under Inställningar visas hur du lägger spelet på hemskärmen och slår på notiser. Det behövs inte för att spela. Nu är det din tur!' },
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
