<script lang="ts">
  /**
   * The neighbours tab (step 8 and 9): the army, the made-up villages to take
   * over, the storehouses that rot, the loyalty tier, and (step 9) the
   * neighbours who help in return for gifts.
   */
  import Modal from './Modal.svelte';
  import {
    army, attackPower, attackVillage, collect, defenceOf, eras, exp, giftBack, helpersNow, hireMercenaries, invite, storeOf, train, troopUnlocked, weekOn,
  } from '../lib/state/expansion';
  import { now, purse, stairs, village } from '../lib/state/game';
  import { HELPERS_NEEDED, HELPER_MAX, HELPER_PATIENCE, MERCENARIES, TROOPS, VIP_TIERS, scout, visibleNeighbours, vipTier, type BattleResult } from '../lib/expansion/conquest';
  import { championPower } from '../lib/expansion/luck';
  import { formatDuration } from '../lib/time/clock';

  const list = $derived.by(() => { void $exp; return visibleNeighbours($exp.maxWorld); });
  const a = $derived.by(() => { void $exp; void $stairs; return army(); });
  const power = $derived.by(() => { void $exp; void $stairs; return attackPower(); });
  const tier = $derived(vipTier($purse.kronorSpent));
  const helpers = $derived.by(() => { void $now; void $exp; return helpersNow(); });
  const storeView = (o: Parameters<typeof storeOf>[0]) => { void $now; return storeOf(o); };
  let report = $state<null | { name: string; r: BattleResult }>(null);

  function attack(id: string, name: string) {
    const r = attackVillage(id);
    if (r) report = { name, r };
  }
</script>

<section class="view">
  <div class="panel">
    <h2>Armén</h2>
    <p>Anfallsstyrka <strong>{power}</strong>{championPower($exp.champions) ? ` (varav kämpar ${championPower($exp.champions)})` : ''}{$exp.mercs ? `, ${$exp.mercs} legosoldater redo` : ''}.</p>
    {#if $village.levels.kasernen < 1}<p class="fine">Bygg Kasernen i byn för att kunna träna soldater.</p>{/if}
    <ul class="troops">
      {#each TROOPS as t}
        {#if troopUnlocked(t.id)}
          <li>
            <span><strong>{a[t.id]}</strong> {t.plural} <span class="fine">(styrka {t.power})</span></span>
            <button class="primary small" disabled={$village.levels.kasernen < 1 || $purse.gold < t.gold} onclick={() => train(t.id)}>Träna för 🪙 {t.gold}</button>
          </li>
        {/if}
      {/each}
    </ul>
    {#if weekOn('troops')}
      <button class="primary" onclick={hireMercenaries}>Hyr {MERCENARIES.count} legosoldater (styrka {MERCENARIES.power}) för 💎 {MERCENARIES.gems}</button>
    {/if}
    {#if weekOn('powerCreep') && eras() > 1}<p class="fine">Grannbyarna rustar upp när nya soldattyper kommer. Gamla soldater räcker kortare.</p>{/if}
  </div>

  <div class="panel">
    <h2>Grannbyar</h2>
    <ul class="villages">
      {#each list as n (n.id)}
        {@const owned = $exp.owned.find((o) => o.id === n.id)}
        <li class:owned={!!owned}>
          <img class="thumb" src={n.world === 2 ? `/art/neighbours/${n.id}.webp` : `/art/neighbours/world${n.world}.webp`} width="64" height="48" alt="" loading="lazy" />
          {#if owned}
            {@const st = storeView(owned)}
            <div>
              <strong>{n.name}</strong> <span class="tag">din</span>
              <span class="fine">🪙 {st.ready} i förrådet{st.rotted ? `, ${st.rotted} har ruttnat` : ''}. Förrådet rymmer {8 + ($village.levels.ladan ?? 0)} timmar.</span>
            </div>
            <button class="primary small" disabled={st.ready <= 0} onclick={() => collect(n.id)}>Hämta</button>
          {:else}
            {@const [lo, hi] = scout(defenceOf(n.id))}
            <div>
              <strong>{n.name}</strong>
              <span class="fine">Försvar ca {lo}–{hi}. Ger {n.goldPerHour} guld i timmen.</span>
            </div>
            <button class="primary small" disabled={power <= 0} onclick={() => attack(n.id, n.name)}>Anfall</button>
          {/if}
        </li>
      {/each}
    </ul>
    {#if $exp.maxWorld < 5}<p class="fine">Fler byar syns när du når nästa värld.</p>{/if}
  </div>

  {#if weekOn('vip')}
    <div class="panel">
      <h2>Lojalitet</h2>
      <p>{tier ? `Du är ${VIP_TIERS[tier - 1].name}kund: +${Math.round(VIP_TIERS[tier - 1].bonus * 100)} % guld per utmaning.` : 'Handla i butiken för att bli bronskund och få mer guld.'}</p>
      {#if tier < VIP_TIERS.length}
        {@const nextT = VIP_TIERS[tier]}
        <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax={nextT.kronor} aria-valuenow={$purse.kronorSpent} aria-label={`Mot ${nextT.name}`}><span style:width={`${Math.min(100, ($purse.kronorSpent / nextT.kronor) * 100)}%`}></span></div>
        <p class="fine">Handla för {nextT.kronor - $purse.kronorSpent} kr till för att bli {nextT.name.toLowerCase()}kund (+{Math.round(nextT.bonus * 100)} %).</p>
      {/if}
    </div>
  {/if}

  {#if weekOn('neighboursNeeded')}
    <div class="panel">
      <h2>Grannar som hjälper</h2>
      <p>Varje granne ger +5 % guld. Vintermarknaden öppnar med {HELPERS_NEEDED}. En granne som inte får en gåva på ett dygn flyttar.</p>
      <ul class="helpers">
        {#each $exp.helpers as h (h.name)}
          {@const here = h.arrivesAt <= $now}
          {@const left = Math.max(h.arrivesAt, h.lastThanked) + HELPER_PATIENCE - $now}
          {#if left > 0 || !here}
            <li><span>{h.name}</span><span class="fine">{here ? `vill ha en gåva inom ${formatDuration(left)}` : `kommer om ${formatDuration(h.arrivesAt - $now)}`}</span></li>
          {/if}
        {/each}
      </ul>
      <div class="buttons">
        <button class="primary" disabled={$exp.helpers.length >= HELPER_MAX && helpers.length >= HELPER_MAX} onclick={invite}>Bjud in en granne</button>
        <button class="primary" disabled={!helpers.length} onclick={giftBack}>Skicka gåvor till alla</button>
      </div>
    </div>
  {/if}
</section>

{#if report}
  <Modal title={report.r.won ? `${report.name} är din!` : 'Anfallet misslyckades'}>
    <p>Din styrka {report.r.attack} mot försvaret {report.r.defence}.</p>
    <p>{report.r.won ? 'Byn ger guld varje timme. Hämta det innan förrådet blir fullt, annars ruttnar det.' : 'Du förlorade de flesta av soldaterna. Träna fler, eller hyr legosoldater.'}</p>
    <div class="buttons"><button class="primary" onclick={() => (report = null)}>OK</button></div>
  </Modal>
{/if}

<style>
  .view { height: 100%; overflow-y: auto; background: var(--panel); padding: 8px 16px 24px; display: grid; gap: 12px; align-content: start; }
  .panel { display: grid; gap: 6px; }
  h2 { margin: 6px 0 0; font-size: 1.15rem; }
  p { margin: 0; }
  ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
  li { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 4px 10px; border-bottom: 1px solid var(--line); padding: 6px 0; }
  li div { display: grid; }
  .troops li span { font-variant-numeric: tabular-nums; }
  .villages li { grid-template-columns: 64px 1fr auto; }
  .thumb { width: 64px; height: 48px; object-fit: contain; }
  .owned { background: #eef6e8; border-radius: 8px; padding: 6px 8px; }
  .tag { background: #3f8f3a; color: #fff; border-radius: 6px; padding: 0 6px; font-size: .75rem; font-weight: 700; }
  .fine { color: var(--muted); font-size: .85rem; }
  .small { min-height: 40px; padding: 4px 10px; }
  .bar { height: 10px; background: #e6d8c2; border-radius: 5px; overflow: hidden; }
  .bar span { display: block; height: 100%; background: #e0b04a; }
  .buttons { display: flex; flex-wrap: wrap; gap: 8px; }
  .buttons button { flex: 1 1 140px; }
</style>
