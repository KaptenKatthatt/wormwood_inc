import { mount } from 'svelte';
import { registerSW } from 'virtual:pwa-register';
import App from './App.svelte';
import './app.css';
import { clock, minutesIn, playerId, settings, tick } from './lib/state/game';
import { initLogger, log } from './lib/log/logger';
import { listenForInstall, isStandalone } from './lib/pwa/install';
import { get } from 'svelte/store';

// Registered before the logger's own pagehide flush, so this event goes out with it.
window.addEventListener('pagehide', () => log('pagehide', { minutesIn: minutesIn() }));
initLogger({ consent: () => get(settings).logging === true, playerId: () => playerId, gameTime: () => clock.now() });
listenForInstall();

// The clock ticks every second while open; when the page comes back after
// being closed or hidden it catches up at once.
tick();
setInterval(tick, 1000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') { tick(); log('resume', { minutesIn: minutesIn() }); }
  else { clock.persist(); log('pause', { minutesIn: minutesIn() }); }
});

log('open', { standalone: isStandalone(), version: __APP_VERSION__ });

registerSW({ immediate: true });

export default mount(App, { target: document.getElementById('app')! });
