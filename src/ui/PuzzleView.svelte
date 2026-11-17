<script lang="ts">
  import GameCanvas from '../game/GameCanvas.svelte';
  import Modal from './Modal.svelte';
  import { Match3Scene } from '../game/Match3Scene';
  import { Match3, type SwapResult } from '../lib/match3/engine';
  import { LEVELS, goalText, type Level } from '../lib/match3/levels';
  import { makeRng } from '../lib/match3/rng';
  import { PRICE } from '../lib/economy/shop';
  import { formatDuration } from '../lib/time/clock';
  import { nextLifeIn } from '../lib/time/lives';
  import {
    buyExtraMoves, buyLives, canPlay, hookOn, levelLost, levelStats, levelWon, lives, logHook, now, purse, stairEvent, stairs,
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

  const unit = (l: Level, n: number) => (l.goal.type === 'score' ? `${n} poäng` : l.goal.type === 'ice' ? `${n} is` : `${n} brickor`);
</script>

{#if game && level && info}
  <section class="view">
    <div class="bar top">
      <button class="ghost small" onclick={quitToMenu} aria-label="Lämna banan">←</button>
      <div class="goal" data-tut="goal">
        <strong>{level.name}: {goalText(level.goal)}</strong>
        <div class="meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(info.progress * 100)} aria-label="Hur nära målet">
          <span style:width={`${info.progress * 100}%`}></span>
        </div>
        <span class="left">{unit(level, info.remaining)} kvar</span>
      </div>
      <div class="moves" aria-label={`${info.moves} drag kvar`}><strong>{info.moves}</strong><span>drag</span></div>
    </div>
    <p class="sr" aria-live="polite">{unit(level, info.remaining)} kvar, {info.moves} drag kvar.</p>
    <div class="canvas" data-tut="board">
      <GameCanvas interactive scene={Match3Scene} data={{ match3: game, hint }} on={{ 'match3:moved': onMoved }} label={`Spelplan. ${goalText(level.goal)}. Tryck på två grannbrickor eller dra för att byta plats. Med tangentbord: piltangenter flyttar, Enter väljer.`} />
    </div>
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
  .view { display: flex; flex-direction: column; height: 100%; }
  .canvas { position: relative; flex: 1; min-height: 0; }
  .bar.top { display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: var(--panel); border-bottom: 1px solid var(--line); }
  .small { min-height: 44px; min-width: 44px; padding: 4px 10px; }
  .goal { flex: 1; min-width: 0; display: grid; gap: 4px; }
  .goal strong { font-size: .95rem; }
  .meter { height: 8px; background: var(--line); border-radius: 4px; overflow: hidden; }
  .meter span { display: block; height: 100%; background: var(--falu); transition: width .3s; }
  .left { font-size: .85rem; color: var(--muted); }
  .moves { display: grid; justify-items: center; background: var(--falu); color: #fff6ee; border-radius: 8px; padding: 4px 10px; min-width: 56px; }
  .moves strong { font-size: 1.5rem; line-height: 1.1; }
  .moves span { font-size: .75rem; }
  .levels { background: var(--panel); height: 100%; overflow-y: auto; padding: 8px 16px 24px; }
  .levels h2 { margin: 8px 0 12px; }
  .levels ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
  .levels li { display: flex; align-items: center; gap: 12px; border: 2px solid var(--line); border-radius: 8px; padding: 12px; }
  .levels li div { flex: 1; display: grid; }
  .fine { color: var(--muted); font-size: .9rem; }
  .big { font-size: 1.25rem; }
</style>
