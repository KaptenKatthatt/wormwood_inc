import { mount } from 'svelte';
import { registerSW } from 'virtual:pwa-register';
import App from './App.svelte';
import { testCode } from './lib/testCode';
import './app.css';
import { cancelAwayPushes, clock, daily, firstLetter, markSeen, minutesIn, offerCalendar, playerId, restartHookClock, scheduleAwayPushes, settings, tick, welcomeBack } from './lib/state/game';
import { dayKey, daysBetween } from './lib/daily';

import { onTutorialFinish, startTutorial, tutorialDone } from './lib/tutorial';
import { initLogger, log } from './lib/log/logger';
import { initSoundDirector } from './lib/audio/director';
import { listenForInstall, isStandalone } from './lib/pwa/install';
import { get } from 'svelte/store';
import { permissionNow, subscribe } from './lib/push/push';
import { rescheduleAll, toast } from './lib/state/game';
import { scheduleQuestionnairePush } from './lib/state/questionnaire';

// Registered before the logger's own pagehide flush, so this event goes out with it.
window.addEventListener('pagehide', () => log('pagehide', { minutesIn: minutesIn() }));
// Sound first, so it hears the events below. It stays silent until the first touch.
initSoundDirector(location.hash.slice(1) || 'pussel');
initLogger({ consent: () => get(settings).logging === true, playerId: () => playerId, gameTime: () => clock.now() });
listenForInstall();

// The clock ticks every second while open; when the page comes back after
// being closed or hidden it catches up at once.
welcomeBack();
tick();
setInterval(tick, 1000);
// The hook staircase starts counting when the introduction is over.
onTutorialFinish(() => { restartHookClock(); firstLetter(); offerCalendar(); });
if (get(settings).logging !== null) {
  if (!tutorialDone()) startTutorial();
  else { firstLetter(); offerCalendar(); }
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
log('open', { standalone: isStandalone(), version: __APP_VERSION__, code: testCode(playerId) });

// Look for a new version on start, every 15 minutes, and whenever the game
// comes back to the foreground (the home screen app is rarely restarted).
registerSW({
  immediate: true,
  onRegisteredSW(_url, reg) {
    if (!reg) return;
    const check = () => { if (navigator.onLine) void reg.update().catch(() => {}); };
    setInterval(check, 15 * 60 * 1000);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
  },
});
if ('serviceWorker' in navigator) {
  // Reload once when a new version takes control, so the player sees it.
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloaded) return;
    reloaded = true;
    location.reload();
  });
}

export default mount(App, { target: document.getElementById('app')! });

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
