<script lang="ts">
  /**
   * Developer menu: only in builds made without VITE_DEV_MENU=false.
   * Testers' builds leave it out entirely.
   */
  import { addKronor, clock, now, playerId, resetAll, setFastMode, settings, toast, wallet } from '../lib/state/game';
  import { formatKr } from '../lib/economy/wallet';
</script>

<section class="dev" aria-labelledby="dev-title">
  <h2 id="dev-title">Utvecklarmeny</h2>
  <p class="fine">Syns inte i versionen som testpersonerna får.</p>

  <fieldset>
    <legend>Tid</legend>
    <label class="row">
      <input type="radio" name="speed" checked={!$settings.fastMode} onchange={() => setFastMode(false)} />
      <span><strong>Verklig tid</strong>: 30 minuter tar 30 minuter.</span>
    </label>
    <label class="row">
      <input type="radio" name="speed" checked={$settings.fastMode} onchange={() => setFastMode(true)} />
      <span><strong>Snabbläge</strong>: 30 minuter går på 2 minuter.</span>
    </label>
  </fieldset>

  <div class="wallet">
    <span>Testplånbok: <strong>{formatKr($wallet.kronor)}</strong> (spenderat {formatKr($wallet.spent)})</span>
    <button class="ghost" onclick={() => addKronor(100)}>+100 kr</button>
  </div>

  <button class="ghost" onclick={() => { resetAll(); toast('Allt är nollställt'); }}>Nollställ spelet</button>

  <dl>
    <dt>Spelar-id</dt><dd>{playerId}</dd>
    <dt>Speltid</dt><dd>{new Date($now).toLocaleString('sv-SE')}</dd>
    <dt>Hastighet</dt><dd>×{$settings.fastMode ? clock.speed : 1}</dd>
    <dt>Version</dt><dd>{__APP_VERSION__}</dd>
  </dl>
</section>

<style>
  .dev { margin-top: 18px; border: 2px dashed var(--line); border-radius: 8px; padding: 12px; display: grid; gap: 10px; }
  h2 { font-size: 1.15rem; margin: 0; }
  .fine { margin: 0; color: var(--muted); font-size: .9rem; }
  fieldset { border: 0; margin: 0; padding: 0; display: grid; gap: 4px; }
  legend { font-weight: 700; margin-bottom: 4px; }
  .row { display: flex; gap: 10px; align-items: flex-start; min-height: 44px; }
  .row input { width: 22px; height: 22px; margin-top: 2px; accent-color: var(--falu); flex: none; }
  .wallet { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; }
  dl { display: grid; grid-template-columns: auto 1fr; gap: 2px 12px; margin: 0; font-size: .9rem; }
  dt { color: var(--muted); }
  dd { margin: 0; overflow-wrap: anywhere; }
</style>
