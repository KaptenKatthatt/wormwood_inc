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
  import { adGroupChoice, devWeekStep, exp, testDay } from '../lib/state/expansion';
  import { adGroupFor } from '../lib/expansion/social';
  import { EXPANSION_HOOKS } from '../lib/hooks';
  const tday = $derived.by(() => { void $now; void $daily; return testDay(); });
  /** Dev only (Jonas, 2026-11-18): switch freely between the worlds without moving the week staircase. */
  function jumpTo(n: number) {
    if (!Number.isInteger(n) || n < 1 || n > TOTAL_CHALLENGES) { toast(`Välj en utmaning mellan 1 och ${TOTAL_CHALLENGES}`); return; }
    challengeNo.set(n);
    toast(`Hoppade till utmaning ${n} (${worldOf(n).name})`);
  }
  let pick = $state(1);
  import { CHRISTMAS } from '../lib/config/flags';
  import { devAskQuestionnaire, devResetQuestionnaire, devStudyEnd, qState } from '../lib/state/questionnaire';
  import { DUE_DAY, STUDY_END } from '../lib/questionnaire';
  import { devXmasDate, forcedLook, villageLook, xmas, xmasDate, xmasDay } from '../lib/state/christmas';
  import { LOOKS } from '../lib/season';
  const look = $derived.by(() => { void $now; void $xmasDate; void $forcedLook; return villageLook(); });
  const xday = $derived.by(() => { void $now; void $daily; void $settings; void $xmasDate; return xmasDay(); });

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
      <span><strong>Breven</strong>: pausade under testningen. Versionen till testpersonerna har dem alltid på.</span>
    </label>
    <div class="buttons">
      {#each [2, 3, 4, 5] as k}
        <button class="ghost" disabled={$stairs.step >= k} onclick={() => devStep(k as Step)}>Till steg {k}</button>
      {/each}
    </div>
  </fieldset>

  <fieldset>
    <legend>Frågeformuläret (ersätter intervjun)</legend>
    <p>Spelet frågar själv från dag {DUE_DAY}. Berättelsen om studien visas först när testaren är klar eller från {STUDY_END}. Nu: {({ part1: 'del 1', choice: 'valet', waiting: 'spelar vidare', debrief: 'berättelsen', part2: 'sista frågorna', done: 'klart' })[$qState.stage]}, frågat {$qState.asks} gånger. Kräver att testdata skickas.</p>
    <div class="row">
      <button class="ghost" onclick={devAskQuestionnaire}>Fråga nu</button>
      <button class="ghost" onclick={devStudyEnd}>Som när studien är slut</button>
      <button class="ghost" onclick={devResetQuestionnaire}>Nollställ formuläret</button>
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
    <legend>Reklamfilmer</legend>
    <p>Det här spelar-id:t hör till gruppen {adGroupFor(playerId) === 'calm' ? 'lugna' : 'skrikiga'}. Testpersoner får alltid sin grupp.</p>
    {#each [[null, 'Min grupp'], ['calm', 'Bara de lugna'], ['loud', 'Bara de skrikiga'], ['all', 'Alla åtta']] as [g, name]}
      <label class="row">
        <input type="radio" name="adgroup" checked={$adGroupChoice === g} onchange={() => adGroupChoice.set(g as 'calm' | 'loud' | 'all' | null)} />
        <span><strong>{name}</strong></span>
      </label>
    {/each}
  </fieldset>
  {/if}

  {#if CHRISTMAS}
    <fieldset>
      <legend>Julen (1-24 december)</legend>
      <p>Nu {xday > 0 ? `på, lucka ${xday}` : 'av'}. Pepparkakor {$xmas.cookies}, öppnade luckor {$xmas.opened.length}, pynt {$xmas.decor.length} av 6. Följer dagskrokarna (från dag 2 eller Alltid på). Syns inte i testversionen än.</p>
      <label class="row">
        <input type="checkbox" checked={$settings.hooks.christmas} onchange={(e) => setHook('christmas', e.currentTarget.checked)} />
        <span><strong>Julhändelsen</strong>: adventskalender, pepparkakor, julpynt och nedräkning.</span>
      </label>
      <label class="jump">Låtsasdatum <input class="date" type="date" value={$xmasDate ?? ''} onchange={(e) => devXmasDate(e.currentTarget.value)} /></label>
      <div class="buttons">
        {#each [['1 dec', '12-01'], ['10 dec', '12-10'], ['24 dec', '12-24'], ['27 dec', '12-27']] as [name, md]}
          <button class="ghost" onclick={() => devXmasDate(`${new Date($now).getFullYear()}-${md}`)}>{name}</button>
        {/each}
        <button class="ghost" disabled={!$xmasDate} onclick={() => devXmasDate(null)}>Riktigt datum</button>
        <button class="ghost" onclick={() => xmas.update((s) => ({ ...s, cookies: s.cookies + 100 }))}>+100 🍪</button>
      </div>
      <p>Byns utseende nu: {LOOKS.find((l) => l.id === look)?.name}. Sommar till 30/11, A 1-7/12, B från 8/12, C när solen är nere i Eslöv.</p>
      <div class="buttons">
        <button class="ghost" aria-pressed={$forcedLook === 'auto'} onclick={() => forcedLook.set('auto')}>Efter datum och sol</button>
        {#each LOOKS as l}
          <button class="ghost" aria-pressed={$forcedLook === l.id} onclick={() => forcedLook.set(l.id)}>{l.name}</button>
        {/each}
      </div>
    </fieldset>
  {/if}

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
  .jump input.date { width: 11em; }
  .jump input { width: 5.5em; min-height: 44px; font: inherit; padding: 0 8px; }
  button[aria-pressed='true'] { outline: 3px solid var(--falu); }
  dl { display: grid; grid-template-columns: auto 1fr; gap: 2px 12px; margin: 0; font-size: .9rem; }
  dt { color: var(--muted); }
  dd { margin: 0; overflow-wrap: anywhere; }
</style>
