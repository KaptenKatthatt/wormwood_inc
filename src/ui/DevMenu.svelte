<script lang="ts">
  /** Developer menu: only in builds made without VITE_DEV_MENU=false. */
  import { SPEEDS, clock, daily, dayHooksOn, devAway, devGive, devMissDay, devNewDay, devStep, minutesIn, now, playerId, purse, resetAll, setHook, setSpeed, settings, stairs, toast } from '../lib/state/game';
  import { STEP_NAMES, type Step } from '../lib/staircase';
  import { HOOKS } from '../lib/hooks';
  import { formatKr } from '../lib/economy/wallet';
  import { EXPANSION } from '../lib/config/flags';
  import { challengeNo } from '../lib/state/game';
  import { TOTAL_CHALLENGES, WORLDS, worldOf } from '../lib/match3/levels';
  import { WEEK_STEPS, type WeekStep } from '../lib/expansion/week';
  import { devWeekStep, exp, testDay } from '../lib/state/expansion';
  import { EXPANSION_HOOKS } from '../lib/hooks';
  const tday = $derived.by(() => { void $now; void $daily; return testDay(); });
  /** Dev only (Jonas, 2026-11-18): switch freely between the worlds without moving the week staircase. */
  function jumpTo(n: number) {
    if (!Number.isInteger(n) || n < 1 || n > TOTAL_CHALLENGES) { toast(`Välj en utmaning mellan 1 och ${TOTAL_CHALLENGES}`); return; }
    challengeNo.set(n);
    toast(`Hoppade till utmaning ${n} (${worldOf(n).name})`);
  }
  let pick = $state(1);

  const mins = $derived.by(() => { void $now; return minutesIn(); });
  const dayOn = $derived.by(() => { void $now; void $daily; void $settings; return dayHooksOn(); });
  const speedName = (s: number) => (s === 1 ? 'Verklig tid' : `×${s}`);
  const speedText = (s: number) => (s === 1 ? '30 minuter tar 30 minuter.' : `30 minuter går på ${Math.round((30 / s) * 60)} sekunder.`);
</script>

<section class="dev" aria-labelledby="dev-title">
  <h2 id="dev-title">Utvecklarmeny</h2>
  <p class="fine">Syns inte i versionen som testpersonerna får.</p>

  {#if EXPANSION}
    <fieldset>
      <legend>Världar</legend>
      <p>Nu: utmaning {$challengeNo} i {worldOf($challengeNo).name}. Kartans pilar går till alla fem världarna i den här versionen.</p>
      <div class="buttons">
        {#each WORLDS as w}
          <button class="ghost" aria-pressed={worldOf($challengeNo).id === w.id} onclick={() => jumpTo(w.from)}>{w.id}. {w.name}</button>
        {/each}
      </div>
      <form class="buttons" onsubmit={(e) => { e.preventDefault(); jumpTo(pick); }}>
        <label class="jump">Utmaning <input type="number" min="1" max={TOTAL_CHALLENGES} bind:value={pick} /></label>
        <button class="ghost" type="submit">Hoppa dit</button>
      </form>
    </fieldset>
  {/if}

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
    <label class="row">
      <input type="checkbox" checked={$settings.letters} onchange={(e) => settings.update((s) => ({ ...s, letters: e.currentTarget.checked }))} />
      <span><strong>Farbroderns brev</strong>: pausade under testningen. Versionen till testpersonerna har dem alltid på.</span>
    </label>
    <div class="buttons">
      {#each [2, 3, 4, 5] as k}
        <button class="ghost" disabled={$stairs.step >= k} onclick={() => devStep(k as Step)}>Till steg {k}</button>
      {/each}
    </div>
  </fieldset>

  <fieldset>
    <legend>Dagskrokar (hemveckan)</legend>
    <p>Nu {dayOn ? 'på' : 'av'}. Första dagen {$daily.firstDay}, gåvor {$daily.claimed} av 7, svit {$daily.streak}, svitskydd {$daily.shields ?? 0}, vinster i dag {$daily.winsDay === new Date($now).toLocaleDateString('sv-SE') ? $daily.winsToday : 0}.</p>
    {#each [['auto', 'Från dag 2', 'första passet har bara trappan'], ['on', 'Alltid på', 'för att testa nu'], ['off', 'Av', '']] as [m, name, why]}
      <label class="row">
        <input type="radio" name="daymode" checked={$settings.dayMode === m} onchange={() => settings.update((s) => ({ ...s, dayMode: m as 'auto' | 'on' | 'off' }))} />
        <span><strong>{name}</strong>{why ? `: ${why}` : ''}</span>
      </label>
    {/each}
    <div class="buttons">
      <button class="ghost" onclick={devNewDay}>Ny dag</button>
      <button class="ghost" onclick={devAway}>Borta i 24 h</button>
      <button class="ghost" onclick={devMissDay}>Missa en dag (sviten bryts)</button>
    </div>
  </fieldset>

  {#if EXPANSION}
    <fieldset>
      <legend>Veckotrappan (utbyggnaden)</legend>
      <p>Nu: steg {$exp.step}{$exp.step > 5 ? ` (${WEEK_STEPS.find((d) => d.step === $exp.step)?.name})` : ''}, testdag {tday}, värld {$exp.maxWorld}, utmaning {$challengeNo}.</p>
      <div class="buttons">
        {#each WEEK_STEPS as d}
          <button class="ghost" disabled={$exp.step >= d.step} onclick={() => devWeekStep(d.step as WeekStep)}>Till steg {d.step}</button>
        {/each}
      </div>
    </fieldset>
  {/if}

  <fieldset>
    <legend>Krokar</legend>
    {#each HOOKS.filter((h) => EXPANSION || !EXPANSION_HOOKS.includes(h.id)) as h (h.id)}
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
  .jump { display: flex; align-items: center; gap: 8px; }
  .jump input { width: 5.5em; min-height: 44px; font: inherit; padding: 0 8px; }
  button[aria-pressed='true'] { outline: 3px solid var(--falu); }
  dl { display: grid; grid-template-columns: auto 1fr; gap: 2px 12px; margin: 0; font-size: .9rem; }
  dt { color: var(--muted); }
  dd { margin: 0; overflow-wrap: anywhere; }
</style>
