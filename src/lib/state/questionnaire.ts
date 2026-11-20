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
import { storedInvite } from '../invite';
import { MAX_ASKS, PART1, afterPart1, mustAnswer, endPushDelay, forLog, part2, pushDelay, shouldAsk, startQ, studyEndFor, testDayOf, type Answer, type QState, type Reached } from '../questionnaire';
import { exp } from './expansion';
import { clock, daily, playerId, resetListeners, settings, stairs } from './game';
import { load, save } from './storage';

const PUSH_ID = 'questionnaire';
const END_PUSH_ID = 'questionnaire-end';

export const qState = writable<QState>({ ...startQ(), ...load<Partial<QState>>('questionnaire', {}) });
qState.subscribe((s) => save('questionnaire', s));

/** null = closed, 'ask' = the game's own invitation, 'form' = the form itself. */
export const qOpen = writable<null | 'ask' | 'form'>(null);

const today = (): string => dayKey(Date.now());
const testDay = (): number => testDayOf(get(daily).firstDay, dayKey(clock.now()));
/** This tester's last day: 19 December, or the end of their own week for a tester with their own start. */
const endDay = (): string => studyEndFor(storedInvite()?.round, get(daily).firstDay);

export function reached(): Reached {
  return {
    steps: Object.keys(get(stairs).reached).map(Number),
    weekStep: EXPANSION ? get(exp).step : 5,
    secondDay: testDay() >= 2,
  };
}

/** Must the form be answered now, before the game goes on? */
export const mandatory = (): boolean => (devEnded ? get(qState).stage !== 'done' : mustAnswer(get(qState), today(), get(settings).logging === true, endDay()));
/** Dev menu: behave as if the study had ended. */
let devEnded = false;

/** Called when the game opens or comes back to the foreground. */
export function offerQuestionnaire(): void {
  if (get(qOpen) === 'form') return;
  if (mandatory()) {
    resume();
    qOpen.set('form');
    log('questionnaire_open', { from: 'study_end', stage: get(qState).stage, testDay: testDay() });
    return;
  }
  if (get(qOpen)) return;
  const s = get(qState);
  const day = testDay();
  if (!shouldAsk(s, day, today(), get(settings).logging === true, endDay())) return;
  qState.set({ ...s, askedDay: day, asks: s.asks + 1 });
  qOpen.set('ask');
  log('questionnaire_asked', { testDay: day, ask: s.asks + 1, stage: s.stage });
}

/** The answer to the game's own question: now, later, or never (the game then stops asking; the form stays under Settings). */
export function answerAsk(answer: 'now' | 'later' | 'never'): void {
  log('questionnaire_ask_answer', { answer });
  if (answer === 'never') qState.update((s) => ({ ...s, asks: MAX_ASKS }));
  if (answer === 'now') resume();
  qOpen.set(answer === 'now' ? 'form' : null);
  if (answer === 'now') log('questionnaire_open', { from: 'ask', stage: get(qState).stage, testDay: testDay() });
}

/** The button under Settings. */
export function openQuestionnaire(): void {
  qOpen.set('form');
  log('questionnaire_open', { from: 'settings', stage: get(qState).stage, testDay: testDay() });
}

export function closeQuestionnaire(): void {
  if (get(qState).stage === 'done') devEnded = false;
  log('questionnaire_close', { stage: get(qState).stage });
  qOpen.set(null);
}

export function setAnswer(id: string, value: Answer): void {
  qState.update((s) => ({ ...s, answers: { ...s.answers, [id]: value } }));
}

export function finishPart1(): void {
  const s = get(qState);
  log('questionnaire_part1', { testDay: testDay(), answers: forLog(PART1, s.answers) });
  flush(false);
  enter({ ...s, stage: mandatory() ? 'debrief' : afterPart1(today(), endDay()) }, 'study_end');
}

/** The tester's own answer after part 1: play on, or done testing. */
export function chooseContinue(on: boolean): void {
  log('questionnaire_continue', { on, testDay: testDay() });
  // The count starts over, so the game can ask again when the study ends.
  if (on) qState.update((s) => ({ ...s, stage: 'waiting', asks: 0 }));
  else enter({ ...get(qState), stage: 'debrief' }, 'tester_done');
}

/** The button under Settings for a tester who played on and now is done. */
export function doneTesting(): void {
  enter({ ...get(qState), stage: 'debrief' }, 'tester_done');
  qOpen.set('form');
}

/** Sets the stage; the debriefing is logged with why it was shown. */
function enter(s: QState, why: 'study_end' | 'tester_done'): void {
  if (s.stage === 'debrief') {
    log('debrief_shown', { from: 'questionnaire', why, testDay: testDay() });
    flush(false);
  }
  qState.set(s);
}

/** Opens what is left when the game's own question is answered with yes. */
export function resume(): void {
  const s = get(qState);
  if (s.stage === 'waiting') enter({ ...s, stage: 'debrief' }, 'study_end');
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
  void cancelPush(playerId, END_PUSH_ID);
}

/**
 * Notifications for the tester who has stopped opening the game: one at noon
 * on the due day for part 1, and one at noon the day the study ends for the
 * rest. Scheduled again on every visit; the server keeps one per id.
 */
export function scheduleQuestionnairePush(): void {
  const s = get(settings);
  const stage = get(qState).stage;
  if (!s.notifications || s.logging !== true || stage === 'done') return;
  const body = 'Vill du svara på några korta frågor i spelet? Det tar några minuter.';
  const inMs = pushDelay(get(daily).firstDay, Date.now());
  if (stage === 'part1' && inMs !== null) void schedulePush(playerId, PUSH_ID, inMs, 'Tack för att du testar Skärgårdsbyn!', body);
  if (stage !== 'part1') void cancelPush(playerId, PUSH_ID);
  const endMs = endPushDelay(Date.now(), endDay());
  if (endMs !== null) void schedulePush(playerId, END_PUSH_ID, endMs, 'Tack för att du testade Skärgårdsbyn!', 'Det finns några sista frågor i spelet. Det tar några minuter.');
}

/** Dev menu: ask now, as if the free week were over. */
export function devAskQuestionnaire(): void {
  if (get(qState).stage === 'done') qState.set(startQ());
  qOpen.set('ask');
}

/** Dev menu: as if the study had ended for a tester who played on. */
export function devStudyEnd(): void {
  if (get(qState).stage === 'done') qState.set(startQ());
  devEnded = true;
  qOpen.set(null);
  offerQuestionnaire();
}

export function devResetQuestionnaire(): void {
  devEnded = false;
  qState.set(startQ());
  qOpen.set(null);
}

resetListeners.push(() => { qState.set(startQ()); qOpen.set(null); });
