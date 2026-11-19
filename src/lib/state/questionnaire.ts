/**
 * The questionnaire's state: when the game asks, what is answered so far (kept
 * on the device, so a tester can stop and come back), and the log events.
 * Each part is logged when it is finished, so part 1 is saved even if the
 * tester stops at the debriefing.
 */
import { get, writable } from 'svelte/store';
import { dayKey } from '../daily';
import { EXPANSION } from '../config/flags';
import { flush, log } from '../log/logger';
import { cancelPush, schedulePush } from '../push/push';
import { PART1, forLog, part2, pushDelay, shouldAsk, startQ, testDayOf, type Answer, type QState, type Reached } from '../questionnaire';
import { exp } from './expansion';
import { clock, daily, playerId, resetListeners, settings, stairs } from './game';
import { load, save } from './storage';

const PUSH_ID = 'questionnaire';

export const qState = writable<QState>({ ...startQ(), ...load<Partial<QState>>('questionnaire', {}) });
qState.subscribe((s) => save('questionnaire', s));

/** null = closed, 'ask' = the game's own invitation, 'form' = the form itself. */
export const qOpen = writable<null | 'ask' | 'form'>(null);

const testDay = (): number => testDayOf(get(daily).firstDay, dayKey(clock.now()));

export function reached(): Reached {
  return {
    steps: Object.keys(get(stairs).reached).map(Number),
    weekStep: EXPANSION ? get(exp).step : 5,
    secondDay: testDay() >= 2,
  };
}

/** Called when the game opens or comes back to the foreground. */
export function offerQuestionnaire(): void {
  if (get(qOpen)) return;
  const s = get(qState);
  const day = testDay();
  if (!shouldAsk(s, day, get(settings).logging === true)) return;
  qState.set({ ...s, askedDay: day, asks: s.asks + 1 });
  qOpen.set('ask');
  log('questionnaire_asked', { testDay: day, ask: s.asks + 1 });
}

export function answerAsk(now: boolean): void {
  log('questionnaire_ask_answer', { now });
  qOpen.set(now ? 'form' : null);
  if (now) log('questionnaire_open', { from: 'ask', stage: get(qState).stage, testDay: testDay() });
}

/** The button under Settings. */
export function openQuestionnaire(): void {
  qOpen.set('form');
  log('questionnaire_open', { from: 'settings', stage: get(qState).stage, testDay: testDay() });
}

export function closeQuestionnaire(): void {
  log('questionnaire_close', { stage: get(qState).stage });
  qOpen.set(null);
}

export function setAnswer(id: string, value: Answer): void {
  qState.update((s) => ({ ...s, answers: { ...s.answers, [id]: value } }));
}

export function finishPart1(): void {
  const s = get(qState);
  log('questionnaire_part1', { testDay: testDay(), answers: forLog(PART1, s.answers) });
  log('debrief_shown', { from: 'questionnaire' });
  flush(false);
  qState.set({ ...s, stage: 'debrief' });
}

export function finishDebrief(): void {
  qState.update((s) => ({ ...s, stage: 'part2' }));
}

/** The last step: part 2 and whether the data may be used. A no also stops the logging. */
export function finishPart2(mayUse: boolean): void {
  const s = get(qState);
  log('questionnaire_part2', { testDay: testDay(), answers: forLog(part2(reached()), s.answers), mayUse });
  if (!mayUse) log('data_withdrawn', { from: 'questionnaire' });
  flush(false);
  qState.set({ ...s, stage: 'done', mayUse });
  if (!mayUse) settings.update((x) => ({ ...x, logging: false }));
  void cancelPush(playerId, PUSH_ID);
}

/**
 * One notification at noon on the due day, for the tester who has stopped
 * opening the game. Scheduled again on every visit; the server keeps one per id.
 */
export function scheduleQuestionnairePush(): void {
  const s = get(settings);
  if (!s.notifications || s.logging !== true || get(qState).stage === 'done') return;
  const inMs = pushDelay(get(daily).firstDay, Date.now());
  if (inMs === null) return;
  void schedulePush(playerId, PUSH_ID, inMs, 'Tack för att du testar Skärgårdsbyn!', 'Vill du svara på några korta frågor i spelet? Det tar fem minuter.');
}

/** Dev menu: ask now, as if the free week were over. */
export function devAskQuestionnaire(): void {
  if (get(qState).stage === 'done') qState.set(startQ());
  qOpen.set('ask');
}

export function devResetQuestionnaire(): void {
  qState.set(startQ());
  qOpen.set(null);
}

resetListeners.push(() => { qState.set(startQ()); qOpen.set(null); });
