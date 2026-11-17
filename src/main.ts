import { mount } from 'svelte';
import { registerSW } from 'virtual:pwa-register';
import App from './App.svelte';
import './app.css';
import { clock, playerId, settings, tick } from './lib/state/game';
import { initLogger, log } from './lib/log/logger';
import { listenForInstall, isStandalone } from './lib/pwa/install';
import { get } from 'svelte/store';

initLogger({ consent: () => get(settings).logging === true, playerId: () => playerId, gameTime: () => clock.now() });
listenForInstall();

// The clock ticks every second while open; when the page comes back after
// being closed or hidden it catches up at once.
tick();
setInterval(tick, 1000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') { tick(); log('resume'); }
  else { clock.persist(); log('pause'); }
});

log('open', { standalone: isStandalone(), version: __APP_VERSION__ });

registerSW({ immediate: true });

export default mount(App, { target: document.getElementById('app')! });
