<script lang="ts">
  import { millMoves } from '../lib/economy/village';
  import { effectiveVillage, firstTime, tipOnce } from '../lib/state/game';
  import GameCanvas from '../game/GameCanvas.svelte';
  import Modal from './Modal.svelte';
  import MapView from './MapView.svelte';
  import { Match3Scene } from '../game/Match3Scene';
  import { Match3, isRocket, type SwapResult } from '../lib/match3/engine';
  import { OBSTACLE_TIPS, goalText, levelAt, regionOf, tileUrl, type Level, type Obstacle } from '../lib/match3/levels';
  import { EXPANSION } from '../lib/config/flags';
  import { adsLeft, askHelp, canAskHelp, gateBlocks, gateOpenDialog, helpersNow, invite, offerAd, skipGate, weekOn } from '../lib/state/expansion';
  import { GATE_SKIP_GEMS, HELPERS_NEEDED } from '../lib/expansion/conquest';
  import { makeRng } from '../lib/match3/rng';
  import { PRICE } from '../lib/economy/shop';
  import { formatDuration } from '../lib/time/clock';
  import { nextLifeIn } from '../lib/time/lives';
  import {
    buyExtraMoves, buyLives, canAffordBooster, challengeNo, canPlay, freeBoosters, hookOn, payBooster, levelLost, levelStats, levelWon, lives, logHook, now, purse, stairEvent, stairs,
    type WinPay,
  } from '../lib/state/game';
  import { log } from '../lib/log/logger';
  import { DEV_MENU } from '../lib/config/flags';
  import { tutEvent, tutorial, TUT_STEPS } from '../lib/tutorial';

  let { onVillage }: { onVillage: () => void } = $props();

  let game = $state<Match3 | null>(null);
  let rev = $state(0); // bumps after every move so the counters re-read the engine
  let dialog = $state<null | 'outOfMoves' | 'won' | 'lost' | 'noLives'>(null);
  let reward = $state<WinPay | null>(null);
  let startedReal = 0;
  let tool = $state<null | 'hammer'>(null);
  let mixed = $state(0);
  let doubled = $state(false);
  /** The obstacle shown with an arrow and a sentence, the first time it appears. */
  let intro = $state<Obstacle | null>(null);
  const hint = $derived($tutorial.index !== null && TUT_STEPS[$tutorial.index]?.hint === true);

  const level = $derived(game?.level);
  const region = $derived(regionOf(level?.id ?? 1));
  const info = $derived.by(() => {
    void rev;
    if (!game) return null;
    return { moves: game.movesLeft, remaining: game.remaining(), progress: game.progress() };
  });
  const next = $derived(nextLifeIn($lives, $now));

  // No free level select (Jonas, 2026-11-17): the map shows the road, only the next challenge can be played.
  const current = $derived(levelAt($challengeNo));

  // The first challenge starts by itself for a new player: no map, no menu first.
  $effect(() => {
    if (!game && dialog === null && $tutorial.index !== null && TUT_STEPS[$tutorial.index]?.id === 'swap') start(current);
  });

  function start(l: Level) {
    if (gateBlocks(l.id)) { gateOpenDialog.set(true); return; }
    if (!canPlay()) {
      dialog = 'noLives';
      if (hookOn('buyLives')) logHook('buyLives', { price: PRICE.oneLife, full: PRICE.fullLives }, 'shown');
      return;
    }
    dialog = null;
    // Kvarnen (the mill) gives an extra move for every second level.
    game = new Match3({ ...l, moves: l.moves + millMoves(effectiveVillage()) }, makeRng(Math.floor(Math.random() * 2 ** 31)), hookOn('nearWin'));
    startedReal = Date.now();
    intro = l.intro && firstTime(`obstacle-${l.intro}`) ? l.intro : null;
    rev++;
    tutEvent('levelStarted');
    // Lets automated screenshot runs find a legal move; not in tester builds.
    if (DEV_MENU) (window as unknown as { __match3?: Match3 }).__match3 = game;
    log('level_start', { level: l.id, rigged: game.rigged });
  }

  /** What is logged when a level ends: time, moves, and how close the player came. */
  function endInfo() {
    const g = game!;
    return {
      seconds: Math.round((Date.now() - startedReal) / 1000),
      movesUsed: g.movesUsed,
      movesGiven: g.level.moves,
      extraMoves: g.extraMoves,
      progress: Math.round(g.progress() * 100) / 100,
      remaining: g.remaining(),
      score: g.score,
      rigged: g.rigged,
    };
  }

  /** The first time each special tile is made, a short tip says what it does. */
  const SPECIAL_TIPS: Record<string, string> = {
    rocket: 'Fyra i rad gav en raket. Tryck på den eller byt den med en granne, så tar den allt åt det håll nosen pekar.',
    area: 'Ett L eller T gav fyrverkerier. Tryck på dem eller byt dem med en granne, så smäller allt runt omkring.',
    all: 'Fem i rad gav en lysande bricka. Tryck på den, så försvinner alla brickor av samma sort.',
  };
  function noteSpecials(r: SwapResult) {
    const made = r.steps.flatMap((s) => s.made.map((m) => m.special ?? 'bomb'));
    if (made.length) log('specials_made', { level: game?.level.id, made });
    for (const m of new Set(made.map((m) => (isRocket(m) ? 'rocket' : m)))) if (SPECIAL_TIPS[m]) tipOnce(`special-${m}`, SPECIAL_TIPS[m]);
  }

  function onMoved(r: SwapResult) {
    intro = null;
    noteSpecials(r);
    rev++;
    tutEvent('moved');
    const g = game;
    if (!g) return;
    const s = g.status();
    if (s === 'won') {
      reward = levelWon(g.level.id, endInfo(), g.stars(), g.leftAtWin > 0 ? g.leftAtWin : 0);
      dialog = 'won';
      tutEvent('levelEnded');
      
    } else if (s === 'out-of-moves') {
      stairEvent('loss');
      if (hookOn('extraMoves')) {
        dialog = 'outOfMoves';
        logHook('extraMoves', { remaining: g.remaining(), price: PRICE.extraMoves, level: g.level.id }, 'shown');
      } else lose();
    }
  }

  function onSmashed(r: SwapResult) {
    const g = game;
    tool = null;
    if (!g) return;
    payBooster('hammer', g.level.id);
    onMoved(r);
  }

  /** The hammer waits for a tap on a tile; tapping the button again puts it away. */
  function useHammer() {
    if (!game || game.status() !== 'playing') return;
    if (tool === 'hammer') { tool = null; return; }
    if (!canAffordBooster('hammer')) { payBooster('hammer', game.level.id); return; } // opens the shop
    tool = 'hammer';
  }

  function useShuffle() {
    const g = game;
    if (!g || g.status() !== 'playing') return;
    if (!payBooster('shuffle', g.level.id)) return;
    g.mix();
    mixed++;
    log('booster', { booster: 'shuffle', level: g.level.id });
  }

  function useExtraMoves() {
    const g = game;
    if (!g || g.status() !== 'playing') return;
    if (buyExtraMoves({ remaining: g.remaining(), level: g.level.id, during: true })) {
      g.addMoves(PRICE.extraMovesCount);
      rev++;
    }
  }

  function buyMoves() {
    const g = game!;
    if (buyExtraMoves({ remaining: g.remaining(), level: g.level.id })) {
      g.addMoves(PRICE.extraMovesCount);
      rev++;
      dialog = null;
    }
  }

  function giveUp() {
    logHook('extraMoves', { remaining: game!.remaining(), price: PRICE.extraMoves, level: game!.level.id }, 'no');
    lose();
  }

  function lose() {
    levelLost(game!.level.id, endInfo());
    dialog = 'lost';
    tutEvent('levelEnded');
  }

  // The next challenge starts by itself: no natural stopping point.
  let countdown = $state(0);
  let cdTimer: ReturnType<typeof setInterval> | undefined;
  function startCountdown() {
    countdown = 3;
    logHook('autoNext', { level: game?.level.id }, 'shown');
    clearInterval(cdTimer);
    cdTimer = setInterval(() => {
      countdown--;
      if (countdown <= 0) { clearInterval(cdTimer); logHook('autoNext', {}, 'waited'); nextLevel(); }
    }, 1000);
  }
  function stopCountdown() {
    if (countdown > 0) logHook('autoNext', {}, 'no');
    clearInterval(cdTimer);
    countdown = 0;
  }
  $effect(() => () => clearInterval(cdTimer));

  function nextLevel() {
    clearInterval(cdTimer);
    countdown = 0;
    start(current);
  }

  /** Back to the map after a win; from step 2 the next challenge starts by itself after 3 s. */
  function toMap(afterWin = false) {
    doubled = false;
    game = null;
    dialog = null;
    if (afterWin && hookOn('autoNext') && $stairs.step >= 2 && $tutorial.index === null) startCountdown();
  }

  function buyLife(full: boolean) {
    if (buyLives(full)) dialog = null;
  }

  function closeNoLives() {
    logHook('buyLives', { price: PRICE.oneLife }, 'no');
    dialog = null;
  }

  function unit(l: Level, n: number): string {
    const g = l.goal;
    switch (g.type) {
      case 'score': return `${n} poäng`;
      case 'ice': {
        const cover = regionOf(l.id).cover?.picture;
        if (cover) return `${n} ${{ lera: 'lera', kol: 'kol', nat: 'nät', frost: 'frostlager' }[cover as string] ?? 'is'}`;
        return regionOf(l.id).id === 'fjall' ? `${n} snölager` : `${n} is`;
      }
      case 'moss': return `${n} mossa`;
      case 'block': {
        if (g.block === 'tang') return `${n} tång`;
        const snow = g.block === 'sten' && regionOf(l.id).stone === 'snogubbe';
        const [one, many] = snow ? ['snögubbe', 'snögubbar'] : { sten: ['sten', 'stenar'], malm: ['malmblock', 'malmblock'], klapper: ['klappersten', 'klapperstenar'], hobal: ['höbal', 'höbalar'] }[g.block];
        return `${n} ${n === 1 ? one : many}`;
      }
      case 'stock': return `${n} ${n === 1 ? 'stock' : 'stockar'}`;
      case 'collect': return `${n} ${regionOf(l.id).names[g.kind]}`;
    }
  }

  /** The picture beside the goal. */
  function goalIcon(l: Level): string | null {
    const g = l.goal;
    if (g.type === 'collect') return tileUrl(regionOf(l.id), g.kind);
    if (g.type === 'ice') return `/art/tiles/${regionOf(l.id).cover?.picture ?? (regionOf(l.id).id === 'fjall' ? 'sno' : 'is')}.webp`;
    if (g.type === 'moss') return '/art/tiles/mossa.webp';
    if (g.type === 'block') return `/art/tiles/${g.block === 'sten' ? (regionOf(l.id).stone ?? 'sten') : g.block}.webp`;
    if (g.type === 'stock') return '/art/tiles/stock.webp';
    return null;
  }
</script>

{#if game && level && info}
  <section class="view" style:background-image={`url('${region.background}')`}>
    <div class="bar top">
      <div class="goal" data-tut="goal">
        <strong class="name">{level.name}</strong>
        <span class="what">
          {#if goalIcon(level)}<img src={goalIcon(level)} alt="" />{/if}
          {goalText(level.goal, level.id)}
        </span>
        <div class="meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(info.progress * 100)} aria-label="Hur nära målet">
          <span style:width={`${info.progress * 100}%`}></span>
        </div>
        <span class="left">{unit(level, info.remaining)} kvar</span>
      </div>
      <div class="moves" aria-label={`${info.moves} drag kvar`}><strong>{info.moves}</strong><span>drag</span></div>
    </div>
    <p class="sr" aria-live="polite">{unit(level, info.remaining)} kvar, {info.moves} drag kvar.</p>
    <div class="canvas" data-tut="board">
      {#if intro}<p class="introtip" class:low={intro === "sno" || intro === "stock"} role="status">{OBSTACLE_TIPS[intro]}</p>{/if}
      <GameCanvas interactive scene={Match3Scene} data={{ match3: game, hint, tool, mixed, intro }} on={{ 'match3:moved': onMoved, 'match3:smashed': onSmashed }} label={`Spelplan. ${goalText(level.goal, level.id)}. Tryck på två grannbrickor eller dra för att byta plats. Med tangentbord: piltangenter flyttar, Enter väljer.`} />
    </div>
    {#if hookOn('boosters')}
      <div class="boosters">
        <div class="bw">
          <button class="b" class:armed={tool === 'hammer'} aria-pressed={tool === 'hammer'} onclick={useHammer} aria-label={`Hammare: ta bort en bricka, ${$freeBoosters.hammer > 0 ? "gratis" : `${PRICE.hammer} ädelstenar`}`}>
            <svg viewBox="0 0 40 40" aria-hidden="true"><rect x="17" y="14" width="6" height="24" rx="2" fill="#a8743c" stroke="#5a1d14" stroke-width="2"/><rect x="6" y="4" width="28" height="12" rx="3" fill="#8a96a3" stroke="#3a3f45" stroke-width="2"/></svg>
            <span class="price">{$freeBoosters.hammer > 0 ? 'Gratis' : `💎 ${PRICE.hammer}`}</span>
          </button>
          <span class="lbl" aria-hidden="true">{tool === 'hammer' ? 'Tryck på' : 'Ta bort'}<br />en bricka</span>
        </div>
        <div class="bw">
          <button class="b" onclick={useShuffle} aria-label={`Blanda brädet, ${$freeBoosters.shuffle > 0 ? "gratis" : `${PRICE.shuffle} ädelstenar`}`}>
            <svg viewBox="0 0 40 40" fill="none" stroke="#3f8f3a" stroke-width="4" stroke-linecap="round" aria-hidden="true"><path d="M8 14h18l-4-5M32 26H14l4 5"/></svg>
            <span class="price">{$freeBoosters.shuffle > 0 ? 'Gratis' : `💎 ${PRICE.shuffle}`}</span>
          </button>
          <span class="lbl" aria-hidden="true">Blanda<br />brädet</span>
        </div>
        <div class="bw">
          <button class="b" onclick={useExtraMoves} aria-label={`${PRICE.extraMovesCount} extra drag, ${PRICE.extraMoves} ädelstenar`}>
            <span class="plus" aria-hidden="true">+{PRICE.extraMovesCount}</span>
            <span class="price">💎 {PRICE.extraMoves}</span>
          </button>
          <span class="lbl" aria-hidden="true">{PRICE.extraMovesCount} extra<br />drag</span>
        </div>
      </div>
    {/if}
  </section>
{:else}
  <MapView current={current.id} {countdown} onPlay={() => { stopCountdown(); start(current); }} />
{/if}

{#if dialog === 'outOfMoves' && game}
  <Modal title="Så nära!">
    <p class="big">Bara <strong>{unit(game.level, game.remaining())}</strong> kvar.</p>
    <p>Fortsätt med {PRICE.extraMovesCount} extra drag?</p>
    <div class="buttons">
      <button class="primary" onclick={buyMoves}>+{PRICE.extraMovesCount} drag för 💎 {PRICE.extraMoves}</button>
      <button class="ghost" onclick={giveUp}>Ge upp</button>
    </div>
    <p class="fine">Du har 💎 {$purse.gems}.</p>
  </Modal>
{:else if dialog === 'won' && game}
  <Modal title="Utmaningen klarad!">
    <p class="stars" aria-label={`${reward?.stars ?? 1} av 3 stjärnor`}>{#each [1, 2, 3] as i}<span class:on={i <= (reward?.stars ?? 1)}>★</span>{/each}</p>
    <p class="big">+{reward?.total ?? 0} guld 🪙</p>
    {#if reward && (reward.finale || reward.starBonus)}
      <p class="fine">{reward.base} för utmaningen{#if reward.finale}, {reward.finale} för dragen som blev över{/if}{#if reward.starBonus}, {reward.starBonus} för tre stjärnor{/if}.</p>
    {/if}
    {#if reward && weekOn('ads') && adsLeft() > 0 && !doubled}
      <button class="ghost" onclick={() => { doubled = true; offerAd('double', reward!.total); }}>▶ Titta på en kort film: dubbelt guld</button>
    {/if}
    <div class="buttons">
      <button class="primary" onclick={() => toMap(true)}>Vidare</button>
      <button class="ghost" data-tut="to-village" onclick={onVillage}>Till byn</button>
    </div>
  </Modal>
{:else if dialog === 'lost' && game}
  <Modal title="Slut på drag">
    <p>Du förlorade ett liv. {$lives.count > 0 ? `${$lives.count} kvar.` : 'Inga liv kvar.'}</p>
    <div class="buttons">
      <button class="primary" onclick={() => start(game!.level)}>Försök igen</button>
      <button class="ghost" onclick={() => toMap()}>Till kartan</button>
      <button class="ghost" data-tut="to-village" onclick={onVillage}>Till byn</button>
    </div>
  </Modal>
{:else if dialog === 'noLives'}
  <Modal title="Slut på liv">
    <p>Nästa liv kommer om <strong>{next === null ? 'nu' : formatDuration(next)}</strong>.</p>
    {#if hookOn('buyLives')}
      <div class="buttons">
        <button class="primary" onclick={() => buyLife(false)}>Ett liv för 💎 {PRICE.oneLife}</button>
        <button class="primary" onclick={() => buyLife(true)}>Fulla liv för 💎 {PRICE.fullLives}</button>
      </div>
    {/if}
    {#if weekOn('ads') && adsLeft() > 0}
      <button class="ghost" onclick={() => { dialog = null; offerAd('life'); }}>▶ Titta på en kort film: ett liv</button>
    {/if}
    {#if canAskHelp()}
      <button class="ghost" onclick={() => { askHelp(); dialog = null; }}>Be grannarna om liv</button>
    {/if}
    <div class="buttons"><button class="ghost" onclick={closeNoLives}>Vänta</button></div>
  </Modal>
{/if}

{#if $gateOpenDialog}
  <Modal title="Vintermarknaden är stängd">
    <p>Marknaden öppnar när du har {HELPERS_NEEDED} grannar som hjälper till. Nu har du {helpersNow().length}.</p>
    <div class="buttons">
      <button class="primary" onclick={() => { invite(); }}>Bjud in en granne</button>
      <button class="primary" onclick={() => { if (skipGate()) start(current); }}>Öppna nu för 💎 {GATE_SKIP_GEMS}</button>
    </div>
    <div class="buttons"><button class="ghost" onclick={() => gateOpenDialog.set(false)}>Stäng</button></div>
  </Modal>
{/if}

<style>
  /* The approved puzzle look ("Rödfärg och skärgård", mock in pussel-stil/stil1-v1). */
  .view { display: flex; flex-direction: column; height: 100%; background-color: #7fb6dc; background-image: url('/art/bakgrund.jpg'); background-position: center; background-size: cover; background-repeat: no-repeat; }
  .canvas { position: relative; flex: 1; min-height: 0; }
  .bar.top { display: flex; align-items: center; gap: 8px; padding: 8px 12px 0; }
  .goal { flex: 1; min-width: 0; display: grid; gap: 0; background: #fff8ec; border: 3px solid #7a2418; border-radius: 14px; padding: 4px 10px 6px; box-shadow: 0 3px 0 var(--deep); color: var(--deep); }
  .goal .name { font-size: 1.1rem; line-height: 1.1; font-weight: 800; }
  .what { display: flex; align-items: center; gap: 6px; font-weight: 800; line-height: 1.2; }
  .what img { width: 28px; height: 28px; flex: none; }
  .introtip { position: absolute; z-index: 2; left: 50%; top: 6px; transform: translateX(-50%); width: min(92%, 360px); margin: 0; background: #fff8ec; border: 3px solid #7a2418; border-radius: 14px; padding: 8px 12px; box-shadow: 0 3px 0 var(--deep); color: var(--deep); font-weight: 800; font-size: 15px; line-height: 1.3; text-align: center; pointer-events: none; animation: pop .3s ease-out; }
  .introtip.low { top: auto; bottom: 6px; }
  @keyframes pop { from { transform: translateX(-50%) scale(.85); opacity: 0; } }
  @media (prefers-reduced-motion: reduce) { .introtip { animation: none; } }
  .meter { height: 8px; background: #e6d8c2; border-radius: 4px; overflow: hidden; margin-top: 3px; }
  .meter span { display: block; height: 100%; background: #3f8f3a; transition: width .3s; }
  .left { font-size: .85rem; color: #6b3a2e; font-weight: 600; }
  .moves { width: 74px; height: 74px; flex: none; border-radius: 50%; display: grid; place-content: center; text-align: center; line-height: .9;
    background: radial-gradient(circle at 40% 35%, #c9473a, #8b2a1e); border: 4px solid #fff; box-shadow: 0 0 0 3px var(--deep), 0 4px 0 3px var(--deep); color: #fff; }
  .moves strong { font-size: 1.9rem; }
  .moves span { font-size: .8rem; }
  .boosters { display: flex; justify-content: center; gap: 18px; padding: 4px 8px calc(10px + env(safe-area-inset-bottom)); }
  .bw { display: flex; flex-direction: column; align-items: center; gap: 14px; width: 92px; }
  .b { position: relative; width: 70px; height: 70px; min-height: 0; padding: 0; border-radius: 50%; display: grid; place-items: center;
    background: radial-gradient(circle at 40% 35%, #fff8ec, #e9d9bd); border: 4px solid #8b2a1e; box-shadow: 0 4px 0 var(--deep); }
  .b.armed { background: radial-gradient(circle at 40% 35%, #fff3b0, #f0c75a); transform: translateY(2px); box-shadow: 0 2px 0 var(--deep); }
  .b svg { width: 36px; height: 36px; }
  .plus { font-size: 1.4rem; font-weight: 800; color: #8b2a1e; }
  .price { position: absolute; bottom: -12px; background: #2c6fa6; color: #fff; border: 2px solid #fff; border-radius: 10px; padding: 0 7px; font-weight: 800; font-size: .8rem; white-space: nowrap; }
  .lbl { background: rgb(255 248 236 / .95); border: 2px solid #7a2418; border-radius: 10px; padding: 1px 6px 0; color: var(--deep); font-weight: 800; font-size: 13px; line-height: 1.15; text-align: center; box-shadow: 0 2px 0 var(--deep); }
  .fine { color: var(--muted); font-size: .9rem; }
  .big { font-size: 1.25rem; }
  .stars { margin: 0; font-size: 2.6rem; line-height: 1; letter-spacing: .08em; color: #d8ccc0; -webkit-text-stroke: 1.5px #7a2418; }
  .stars .on { color: #f2c230; }
</style>
