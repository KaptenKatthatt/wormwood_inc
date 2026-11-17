<script lang="ts">
  import GameCanvas from '../game/GameCanvas.svelte';
  import Modal from './Modal.svelte';
  import { Match3Scene } from '../game/Match3Scene';
  import { Match3, type SwapResult } from '../lib/match3/engine';
  import { KIND_NAMES, LEVELS, TILES, goalText, type Level } from '../lib/match3/levels';
  import { makeRng } from '../lib/match3/rng';
  import { PRICE } from '../lib/economy/shop';
  import { formatDuration } from '../lib/time/clock';
  import { nextLifeIn } from '../lib/time/lives';
  import {
    buyExtraMoves, buyLives, canAffordBooster, canPlay, freeBoosters, hookOn, payBooster, levelLost, levelStats, levelWon, lives, logHook, now, purse, stairEvent, stairs,
  } from '../lib/state/game';
  import { log } from '../lib/log/logger';
  import { DEV_MENU } from '../lib/config/flags';
  import { tutEvent, tutorial, TUT_STEPS } from '../lib/tutorial';

  let { onVillage }: { onVillage: () => void } = $props();

  let game = $state<Match3 | null>(null);
  let rev = $state(0); // bumps after every move so the counters re-read the engine
  let dialog = $state<null | 'outOfMoves' | 'won' | 'lost' | 'noLives'>(null);
  let reward = $state(0);
  let startedReal = 0;
  let tool = $state<null | 'hammer'>(null);
  let mixed = $state(0);
  const hint = $derived($tutorial.index !== null && TUT_STEPS[$tutorial.index]?.hint === true);

  const level = $derived(game?.level);
  const info = $derived.by(() => {
    void rev;
    if (!game) return null;
    return { moves: game.movesLeft, remaining: game.remaining(), progress: game.progress() };
  });
  const next = $derived(nextLifeIn($lives, $now));

  function start(l: Level) {
    if (!canPlay()) {
      dialog = 'noLives';
      if (hookOn('buyLives')) logHook('buyLives', { price: PRICE.oneLife, full: PRICE.fullLives }, 'shown');
      return;
    }
    dialog = null;
    game = new Match3(l, makeRng(Math.floor(Math.random() * 2 ** 31)), hookOn('nearWin'));
    startedReal = Date.now();
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

  function onMoved(_r: SwapResult) {
    rev++;
    tutEvent('moved');
    const g = game;
    if (!g) return;
    const s = g.status();
    if (s === 'won') {
      reward = levelWon(g.level.id, endInfo());
      dialog = 'won';
      tutEvent('levelEnded');
      if (hookOn('autoNext') && $stairs.step >= 2 && $tutorial.index === null) startCountdown();
    } else if (s === 'out-of-moves') {
      stairEvent('loss');
      if (hookOn('extraMoves')) {
        dialog = 'outOfMoves';
        logHook('extraMoves', { remaining: g.remaining(), price: PRICE.extraMoves, level: g.level.id }, 'shown');
      } else lose();
    }
  }

  function onSmashed(_r: SwapResult) {
    const g = game;
    tool = null;
    if (!g) return;
    payBooster('hammer', g.level.id);
    onMoved(_r);
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

  function quitToMenu() {
    if (game && game.status() === 'playing' && game.movesUsed > 0) {
      levelLost(game.level.id, { ...endInfo(), abandoned: true });
    }
    game = null;
    dialog = null;
  }

  // From step 2 the next level starts by itself: no natural stopping point.
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
    const i = LEVELS.findIndex((l) => l.id === game?.level.id);
    start(LEVELS[(i + 1) % LEVELS.length]);
  }

  function buyLife(full: boolean) {
    if (buyLives(full)) dialog = null;
  }

  function closeNoLives() {
    logHook('buyLives', { price: PRICE.oneLife }, 'no');
    dialog = null;
  }

  const unit = (l: Level, n: number) => (l.goal.type === 'score' ? `${n} poäng` : l.goal.type === 'ice' ? `${n} is` : `${n} ${KIND_NAMES[l.goal.kind]}`);
</script>

{#if game && level && info}
  <section class="view">
    <div class="bar top">
      <button class="ghost small" onclick={quitToMenu} aria-label="Lämna banan">←</button>
      <div class="goal" data-tut="goal">
        <strong class="name">{level.name}</strong>
        <span class="what">
          {#if level.goal.type === 'collect'}<img src={`/art/tiles/${TILES[level.goal.kind]}.png`} alt="" />{:else if level.goal.type === 'ice'}<span class="iceicon" aria-hidden="true"></span>{/if}
          {goalText(level.goal)}
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
      <GameCanvas interactive scene={Match3Scene} data={{ match3: game, hint, tool, mixed }} on={{ 'match3:moved': onMoved, 'match3:smashed': onSmashed }} label={`Spelplan. ${goalText(level.goal)}. Tryck på två grannbrickor eller dra för att byta plats. Med tangentbord: piltangenter flyttar, Enter väljer.`} />
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
  <section class="levels">
    <h2>Banor</h2>
    <ul>
      {#each LEVELS as l (l.id)}
        {@const st = $levelStats[l.id]}
        <li>
          <div>
            <strong>{l.name}</strong>
            <span>{goalText(l.goal)} på {l.moves} drag</span>
            {#if st}<span class="fine">Vunnen {st.wins} gånger, förlorad {st.losses}</span>{/if}
          </div>
          <button class="primary" data-tut={`play-${l.id}`} onclick={() => start(l)}>Spela <span class="sr">{l.name}</span></button>
        </li>
      {/each}
    </ul>
    <p class="fine">En förlorad bana kostar ett liv. Vinst ger guld till byn.</p>
  </section>
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
  <Modal title="Banan klar!">
    <p class="big">+{reward} guld 🪙</p>
    {#if countdown > 0}<p aria-live="polite">Nästa bana startar om {countdown} …</p>{/if}
    <div class="buttons">
      <button class="primary" onclick={nextLevel}>Nästa bana</button>
      <button class="ghost" data-tut="to-village" onclick={() => { stopCountdown(); onVillage(); }}>Till byn</button>
    </div>
  </Modal>
{:else if dialog === 'lost' && game}
  <Modal title="Slut på drag">
    <p>Du förlorade ett liv. {$lives.count > 0 ? `${$lives.count} kvar.` : 'Inga liv kvar.'}</p>
    <div class="buttons">
      <button class="primary" onclick={() => start(game!.level)}>Försök igen</button>
      <button class="ghost" data-tut="to-village" onclick={onVillage}>Till byn</button>
      <button class="ghost" onclick={quitToMenu}>Till banorna</button>
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
    <div class="buttons"><button class="ghost" onclick={closeNoLives}>Vänta</button></div>
  </Modal>
{/if}

<style>
  /* The approved puzzle look ("Rödfärg och skärgård", mock in pussel-stil/stil1-v1). */
  .view { display: flex; flex-direction: column; height: 100%; background: #7fb6dc url('/art/bakgrund.jpg') center / cover no-repeat; }
  .canvas { position: relative; flex: 1; min-height: 0; }
  .bar.top { display: flex; align-items: center; gap: 8px; padding: 8px 12px 0; }
  .small { min-height: 44px; min-width: 44px; padding: 4px 10px; background: #fff8ec; border: 2.5px solid var(--frame); color: var(--deep); border-radius: 50%; box-shadow: 0 2px 0 var(--deep); }
  .goal { flex: 1; min-width: 0; display: grid; gap: 0; background: #fff8ec; border: 3px solid #7a2418; border-radius: 14px; padding: 4px 10px 6px; box-shadow: 0 3px 0 var(--deep); color: var(--deep); }
  .goal .name { font-size: 1.1rem; line-height: 1.1; font-weight: 800; }
  .what { display: flex; align-items: center; gap: 6px; font-weight: 800; line-height: 1.2; }
  .what img { width: 28px; height: 28px; flex: none; }
  .iceicon { width: 22px; height: 22px; border-radius: 5px; background: linear-gradient(135deg, #fff, #9fd6f3); border: 2px solid #4b9ac8; flex: none; }
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
  .levels { background: var(--panel); height: 100%; overflow-y: auto; padding: 8px 16px 24px; }
  .levels h2 { margin: 8px 0 12px; }
  .levels ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
  .levels li { display: flex; align-items: center; gap: 12px; border: 2px solid var(--line); border-radius: 8px; padding: 12px; }
  .levels li div { flex: 1; display: grid; }
  .fine { color: var(--muted); font-size: .9rem; }
  .big { font-size: 1.25rem; }
</style>
