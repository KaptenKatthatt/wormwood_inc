<script lang="ts">
  /** Developer menu: only in builds made without VITE_DEV_MENU=false. */
  import { SPEEDS, clock, devGive, devStep, minutesIn, now, playerId, purse, resetAll, setHook, setSpeed, settings, stairs, toast } from '../lib/state/game';
  import { STEP_NAMES, type Step } from '../lib/staircase';
  import { HOOKS } from '../lib/hooks';
  import { formatKr } from '../lib/economy/wallet';

  const mins = $derived.by(() => { void $now; return minutesIn(); });
  const speedName = (s: number) => (s === 1 ? 'Verklig tid' : `×${s}`);
  const speedText = (s: number) => (s === 1 ? '30 minuter tar 30 minuter.' : `30 minuter går på ${Math.round((30 / s) * 60)} sekunder.`);
</script>

<section class="dev" aria-labelledby="dev-title">
  <h2 id="dev-title">Utvecklarmeny</h2>
  <p class="fine">Syns inte i versionen som testpersonerna får.</p>

  <fieldset>
    <legend>Tid</legend>
    {#each SPEEDS as s}
      <label class="row">
        <input type="radio" name="speed" checked={$settings.speed === s} onchange={() => setSpeed(s)} />
        <span><strong>{speedName(s)}</strong>: {speedText(s)}</span>
      </label>
    {/each}
  </fieldset>

  <fieldset>
    <legend>Kroktrappan</legend>
    <p>Nu: steg {$stairs.step} ({STEP_NAMES[$stairs.step]}), {mins} minuter in. Trivsel {$stairs.mood}.</p>
    <div class="buttons">
      {#each [2, 3, 4, 5] as k}
        <button class="ghost" disabled={$stairs.step >= k} onclick={() => devStep(k as Step)}>Till steg {k}</button>
      {/each}
    </div>
  </fieldset>

  <fieldset>
    <legend>Krokar</legend>
    {#each HOOKS as h (h.id)}
      <label class="row">
        <input type="checkbox" checked={$settings.hooks[h.id]} onchange={(e) => setHook(h.id, e.currentTarget.checked)} />
        <span><strong>{h.name}</strong>{h.step ? ` (steg ${h.step})` : ''}: {h.what}</span>
      </label>
    {/each}
  </fieldset>

  <fieldset>
    <legend>Plånbok och valutor</legend>
    <p>{formatKr($purse.kronor)} kvar, {formatKr($purse.kronorSpent)} spenderat. 🪙 {$purse.gold}, 💎 {$purse.gems}.</p>
    <div class="buttons">
      <button class="ghost" onclick={() => devGive('kronor', 100)}>+100 kr</button>
      <button class="ghost" onclick={() => devGive('gold', 500)}>+500 guld</button>
      <button class="ghost" onclick={() => devGive('gems', 100)}>+100 💎</button>
    </div>
  </fieldset>

  <button class="ghost" onclick={() => { resetAll(); toast('Allt är nollställt'); }}>Nollställ spelet</button>

  <dl>
    <dt>Spelar-id</dt><dd>{playerId}</dd>
    <dt>Speltid</dt><dd>{new Date($now).toLocaleString('sv-SE')}</dd>
    <dt>Minuter in</dt><dd>{mins}</dd>
    <dt>Hastighet</dt><dd>×{clock.speed}</dd>
    <dt>Version</dt><dd>{__APP_VERSION__}</dd>
  </dl>
</section>

<style>
  .dev { margin-top: 18px; border: 2px dashed var(--line); border-radius: 8px; padding: 12px; display: grid; gap: 12px; }
  h2 { font-size: 1.15rem; margin: 0; }
  p { margin: 0; }
  .fine { color: var(--muted); font-size: .9rem; }
  fieldset { border: 0; margin: 0; padding: 0; display: grid; gap: 4px; }
  legend { font-weight: 700; margin-bottom: 4px; }
  .row { display: flex; gap: 10px; align-items: flex-start; min-height: 44px; }
  .row input { width: 22px; height: 22px; margin-top: 2px; accent-color: var(--falu); flex: none; }
  .buttons { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; }
  dl { display: grid; grid-template-columns: auto 1fr; gap: 2px 12px; margin: 0; font-size: .9rem; }
  dt { color: var(--muted); }
  dd { margin: 0; overflow-wrap: anywhere; }
</style>
