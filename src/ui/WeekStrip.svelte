<script lang="ts">
  /**
   * The row of buttons under the map (moved there by Jonas, 2026-11-20) for the week's hooks (steps 6 and 7).
   * A button shows up when its hook's step is reached, with a badge when
   * something waits (a chest that is ready, today's free spin).
   */
  import { exp, freeSpinReady, hubOpen, leagueRows, passWaiting, renewPass, weekOn } from '../lib/state/expansion';
  import { now } from '../lib/state/game';
  import { leagueRank, passTier, ALBUM_SIZE, PASS_TIERS } from '../lib/expansion/social';
  import { logHook } from '../lib/state/game';

  // A pass that has run out gives way to a new one.
  $effect(() => { void $now; renewPass(); });

  type Id = 'liga' | 'pass' | 'album' | 'kistor' | 'hjul' | 'kampar';
  const items = $derived.by(() => {
    void $now; void $exp;
    const out: { id: Id; icon: string; art?: string; label: string; badge?: string }[] = [];
    if (weekOn('league') && $exp.league) out.push({ id: 'liga', icon: '🏆', label: `Plats ${leagueRank(leagueRows())}` });
    if (weekOn('pass') && $exp.pass) {
      const waiting = passWaiting();
      out.push({ id: 'pass', icon: '🎟️', art: '/art/pass/ticket.webp', label: `Pass ${passTier($exp.pass.xp)}/${PASS_TIERS}`, badge: waiting ? String(waiting) : undefined });
    }
    if (weekOn('album')) out.push({ id: 'album', icon: '📔', label: `${$exp.album.length}/${ALBUM_SIZE}` });
    if (weekOn('chests')) {
      const ready = $exp.chests.filter((c) => c.readyAt <= $now).length;
      out.push({ id: 'kistor', icon: '🧰', art: '/art/chests/wood-closed.webp', label: `Kistor ${$exp.chests.length}`, badge: ready ? String(ready) : undefined });
    }
    if (weekOn('wheel')) out.push({ id: 'hjul', icon: '🎡', art: '/art/wheel/disc.webp', label: 'Hjulet', badge: freeSpinReady() ? 'Gratis' : undefined });
    if (weekOn('heroes')) out.push({ id: 'kampar', icon: '⚔️', label: 'Kämpar', badge: $exp.freeDraws ? String($exp.freeDraws) : undefined });
    return out;
  });

  function open(id: Id) {
    hubOpen.set(id);
    const hook = { liga: 'league', pass: 'pass', album: 'album', kistor: 'chests', hjul: 'wheel', kampar: 'heroes' } as const;
    logHook(hook[id], { opened: id }, 'shown');
  }
</script>

{#if items.length}
  <div class="strip" role="toolbar" aria-label="Veckans händelser">
    {#each items as it (it.id)}
      <button class="it" onclick={() => open(it.id)}>
        {#if it.art}<img class="art" src={it.art} alt="" />{:else}<span class="ic" aria-hidden="true">{it.icon}</span>{/if}
        <span class="lb">{it.label}</span>
        {#if it.badge}<span class="badge">{it.badge}</span>{/if}
      </button>
    {/each}
  </div>
{/if}

<style>
  .strip { display: flex; gap: 6px; overflow-x: auto; padding: 8px 8px 6px; background: #fff8ec; border-top: 3px solid #7a2418; }
  .it { position: relative; flex: none; display: grid; justify-items: center; min-width: 64px; min-height: 56px; padding: 4px 6px; background: #fff8ec; border: 2px solid #7a2418; border-radius: 12px; box-shadow: 0 2px 0 var(--deep); color: var(--deep); }
  .ic { font-size: 1.3rem; line-height: 1.1; }
  .art { width: 30px; height: 30px; object-fit: contain; }
  .lb { font-size: .75rem; font-weight: 700; white-space: nowrap; }
  .badge { position: absolute; top: -6px; right: -6px; background: #b8382a; color: #fff; border: 2px solid #fff; border-radius: 999px; padding: 0 6px; font-size: .7rem; font-weight: 800; }
</style>
