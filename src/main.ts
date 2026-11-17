import { mount } from 'svelte';
import { registerSW } from 'virtual:pwa-register';
import App from './App.svelte';
import { testCode } from './lib/testCode';
import './app.css';
import { cancelAwayPushes, clock, daily, firstLetter, markSeen, minutesIn, offerCalendar, playerId, restartHookClock, scheduleAwayPushes, settings, tick, welcomeBack } from './lib/state/game';
import { dayKey, daysBetween } from './lib/daily';

import { onTutorialFinish, startTutorial, tutorialDone } from './lib/tutorial';
import { initLogger, log } from './lib/log/logger';
import { listenForInstall, isStandalone } from './lib/pwa/install';
import { get } from 'svelte/store';

// Registered before the logger's own pagehide flush, so this event goes out with it.
window.addEventListener('pagehide', () => log('pagehide', { minutesIn: minutesIn() }));
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
    log('visit_end', { ...visitInfo(), seconds: Math.round((Date.now() - visitStart) / 1000) });
  }
});

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
