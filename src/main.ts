import { mount } from 'svelte';
import { keepUpdated } from './lib/pwa/update';
import App from './App.svelte';
import Gate from './ui/Gate.svelte';
import { GATED, admitted, checkCode, codeInUrl, forgetInvite, myCode, storedInvite } from './lib/invite';
import './app.css';
import { cancelAwayPushes, clock, daily, levelStats, markSeen, stairs, minutesIn, offerCalendar, playerId, restartHookClock, scheduleAwayPushes, settings, tick, welcomeBack } from './lib/state/game';
import { dayKey, daysBetween } from './lib/daily';

import { onTutorialFinish, startTutorial, tutorialDone } from './lib/tutorial';
import { initLogger, log } from './lib/log/logger';
import { initSoundDirector } from './lib/audio/director';
import { initBackGuard } from './lib/pwa/backGuard';
import { listenForInstall, isStandalone } from './lib/pwa/install';
import { get } from 'svelte/store';
import { permissionNow, subscribe } from './lib/push/push';
import { rescheduleAll, toast } from './lib/state/game';
import { scheduleQuestionnairePush } from './lib/state/questionnaire';

// Looks for a new build and takes it in by itself (src/lib/pwa/update.ts), also behind the gate.
keepUpdated();

/**
 * The playtest build is locked until Jonas has let the player in with a
 * personal link (src/lib/invite.ts, Jonas 2026-11-20). Nothing of the game
 * runs, and nothing is logged, before that.
 */
const urlCode = codeInUrl();
if (GATED && (!admitted() || (urlCode && urlCode !== storedInvite()?.code))) {
  mount(Gate, { target: document.getElementById('app')!, props: { playerId, onIn: () => location.replace(location.pathname) } });
} else {
  if (urlCode) history.replaceState(null, '', location.pathname + location.hash);
  startGame();
  // An invitation Jonas has taken back locks the game again the next time it opens.
  const inv = storedInvite();
  if (GATED && inv) {
    void checkCode(inv.code, playerId).then((r) => {
      if (r.kind === 'unknown') { forgetInvite(); location.reload(); }
    });
  }
}

function startGame(): void {
  // Registered before the logger's own pagehide flush, so this event goes out with it.
  window.addEventListener('pagehide', () => log('pagehide', { minutesIn: minutesIn() }));
  // Sound first, so it hears the events below. It stays silent until the first touch.
  initSoundDirector(location.hash.slice(1) || 'pussel');
  initBackGuard();
  initLogger({
    consent: () => get(settings).logging === true, playerId: () => playerId, gameTime: () => clock.now(),
    context: () => ({
      day: daysBetween(get(daily).firstDay, dayKey(clock.now())) + 1,
      min: minutesIn(),
      step: get(stairs).step,
      won: Object.values(get(levelStats)).filter((l) => l.wins > 0).length,
    }),
  });
  listenForInstall();

  // The clock ticks every second while open; when the page comes back after
  // being closed or hidden it catches up at once.
  welcomeBack();
  tick();
  setInterval(tick, 1000);
  // The hook staircase starts counting when the introduction is over.
  // The welcome letter waits until the player opens the village on their own (Jonas, 2026-11-19; VillageView).
  onTutorialFinish(() => { restartHookClock(); offerCalendar(); });
  if (get(settings).logging !== null) {
    if (!tutorialDone()) startTutorial();
    else offerCalendar();
  }
  /** Which day of the test this is: 1 on the first day the game was opened. */
  const dayIndex = () => daysBetween(get(daily).firstDay, dayKey(clock.now())) + 1;

  // Every visit is logged with its date and length (the week at home).
  let visitStart = Date.now();
  const visitInfo = () => ({ date: dayKey(Date.now()), day: dayIndex(), minutesIn: minutesIn() });
  log('visit_start', visitInfo());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      visitStart = Date.now();
      cancelAwayPushes();
      welcomeBack();
      tick();
      offerCalendar();
      log('visit_start', visitInfo());
    } else {
      clock.persist();
      markSeen();
      scheduleAwayPushes();
      scheduleQuestionnairePush();
      log('visit_end', { ...visitInfo(), seconds: Math.round((Date.now() - visitStart) / 1000) });
    }
  });

  scheduleQuestionnairePush();
  log('open', { standalone: isStandalone(), host: location.host, version: __APP_VERSION__, code: myCode(playerId), round: storedInvite()?.round ?? null });

  mount(App, { target: document.getElementById('app')! });

  // If notifications were allowed outside the game (or the prompt answered
  // late), turn them on without asking again.
  async function syncPush(): Promise<void> {
    if (get(settings).notifications || permissionNow() !== 'granted') return;
    const r = await subscribe(playerId);
    log('push_sync', { result: r });
    if (r !== 'ok') return;
    settings.update((s) => ({ ...s, notifications: true }));
    rescheduleAll();
    toast('Notiser är på.');
  }
  void syncPush();
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void syncPush(); });
  void navigator.permissions?.query({ name: 'notifications' as PermissionName }).then((p) => { p.onchange = () => void syncPush(); }).catch(() => {});
}
