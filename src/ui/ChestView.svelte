<script lang="ts">
  /**
   * The chests (week step 7), full screen: four places for chests found after
   * won challenges, the royal chest for gems, and the opening.
   *
   * The opening is the one Jonas approved in the mockup on 2026-11-20: two taps
   * shake the chest, the third makes it leap, turn once in the air and slam
   * down. Then the lid flies open, and only after that does anything come out
   * of it ("nothing can spray out before the chest has been opened"). A royal
   * chest charges up first and gets the bigger show. "Hämta" flies the gold
   * and the gems up to the counters.
   */
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { now, purse } from '../lib/state/game';
  import { buyRoyalChest, exp, hubOpen, openChestNow } from '../lib/state/expansion';
  import { CHEST_SLOTS, ROYAL_CHEST_GEMS, chestSkipGems, type ChestKind, type ChestLoot } from '../lib/expansion/luck';
  import { formatDuration } from '../lib/time/clock';
  import { play, playAt } from '../lib/audio/sound';
  import { silently } from '../lib/audio/director';
  import { countAt, flyReward, pieces } from '../lib/ui/flyReward';

  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmt = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const ART = { coin: '/art/wheel/coin.webp', gem: '/art/wheel/gem.webp' };
  const chestArt = (kind: ChestKind, open = false) => `/art/chests/${kind}-${open ? 'open' : 'closed'}.webp`;

  // The counters show what the player has seen arrive, not what the purse already holds.
  let gold = $state(get(purse).gold);
  let gems = $state(get(purse).gems);
  let bumped = $state<'gold' | 'gems' | null>(null);
  const pills: { gold?: HTMLElement; gems?: HTMLElement } = $state({});
  function bump(which: 'gold' | 'gems') {
    bumped = which;
    setTimeout(() => { if (bumped === which) bumped = null; }, 130);
  }

  // ---------------------------------------------------------------- the opening
  type Item = { kind: 'gold' | 'gems'; amount: number };
  let opening = $state<{ kind: ChestKind; loot: ChestLoot } | null>(null);
  let taps = $state(0);
  let busy = $state(false);
  let lidOpen = $state(false);
  let pose = $state<'wait' | 's1' | 's2' | 'jump' | 'charge' | 'boom' | ''>('wait');
  let poseKey = $state(0);
  let rays = $state<'' | 'weak' | 'on'>('');
  let rays2 = $state(false);
  let beam = $state(false);
  let shout = $state(false);
  let hint = $state('');
  let items = $state<Item[]>([]);
  let canCollect = $state(false);
  let flash = $state(0);
  let collected = $state(false);
  let stageEl: HTMLElement;
  function doQuake() {
    if (calm) return;
    stageEl.classList.remove('quake'); void stageEl.offsetWidth; stageEl.classList.add('quake');
  }
  const royal = $derived(opening?.kind === 'royal');

  let alive = true;
  /** True from the moment a chest pays the purse until what it held has been collected. */
  let holding = false;
  let gen = 0;
  /** Runs fn later, unless the view has closed or another opening has begun. */
  function after(ms: number, fn: () => void) {
    const g = gen;
    setTimeout(() => { if (alive && g === gen) fn(); }, ms);
  }
  function setPose(p: typeof pose) { pose = p; poseKey++; }

  function begin(id: string, kind: ChestKind) {
    if (opening) return;
    // The purse is paid at once; the reward sounds wait for the show.
    holding = true;
    const loot = silently(() => openChestNow(id));
    if (!loot) { holding = false; return; }
    gen++;
    // What the opening cost is gone at once; what the chest holds arrives when it is collected.
    gems = get(purse).gems - loot.gems;
    opening = { kind, loot };
    taps = 0; busy = false; lidOpen = false; rays = ''; rays2 = false; beam = false; shout = false;
    items = []; collected = false; canCollect = false; hint = 'Tryck på kistan!';
    setPose('wait');
  }
  function buy() {
    if (opening || !buyRoyalChest()) return;
    gems = get(purse).gems; bump('gems');
    const c = get(exp).chests.at(-1);
    if (c) begin(c.id, c.kind);
  }

  function tap() {
    if (!opening || busy) return;
    taps++;
    if (taps < 3) {
      setPose(taps === 1 ? 's1' : 's2');
      playAt('hammer', taps === 1 ? 0.8 : 1);
      rays = 'weak';
      hint = taps === 1 ? 'En gång till!' : 'Den ger med sig!';
      return;
    }
    busy = true; hint = '';
    leap();
  }
  /** The chest leaps, turns once and slams down; then the lid opens. */
  function leap() {
    if (calm) { burst(); return; }
    setPose('jump'); playAt('click', 0.7);
    after(930, () => { doQuake(); playAt('hammer', 0.6); dust(26); });
    after(1150, burst);
  }
  /** The lid flies open, and only then does the gold come out. A royal chest charges up first. */
  function burst() {
    const go = () => {
      lidOpen = true; setPose('boom'); rays = 'on';
      play('shine');
      const out = calm ? 0 : 450;
      after(out, () => {
        flash++; play('fireworks'); play('coins');
        if (!calm) fountain(ART.coin, royal ? 44 : 26);
      });
      if (royal) {
        rays2 = true; doQuake();
        after(out, () => { shout = true; play('purchase'); });
        if (!calm) after(out, () => {
          confetti(150);
          after(500, () => fountain(ART.coin, 40, 1.25));
          after(900, () => fountain(ART.gem, 10, 1.1));
          for (let i = 0; i < 6; i++) after(250 + i * 380, () => { firework(cv.width / dpr * rnd(0.12, 0.88), cv.height / dpr * rnd(0.08, 0.34)); playAt('fireworks', rnd(0.9, 1.3)); });
        });
      }
      after((royal ? 1500 : 650) + out, () => { beam = !calm; cards(); });
    };
    if (!royal || calm) { go(); return; }
    setPose('charge'); rays = 'weak';
    for (let i = 0; i < 6; i++) after(i * 200, () => playAt('hammer', 0.9 + i * 0.12));
    after(1300, go);
  }
  /** What the chest held comes up one card at a time. */
  function cards() {
    if (!opening) return;
    const l = opening.loot;
    const all: Item[] = [{ kind: 'gold', amount: l.gold }];
    if (l.gems) all.push({ kind: 'gems', amount: l.gems });
    all.forEach((it, i) => after(i * 700, () => {
      items = [...items, it];
      if (it.kind === 'gems') { play('gems'); if (!calm) fountain(ART.gem, 14); } else playAt('click', 1 + i * 0.12);
      if (!calm) after(380, () => firework(cv.width / dpr * (0.25 + 0.5 * i), cv.height / dpr * 0.14));
      if (i === all.length - 1) after(450, () => { canCollect = true; });
    }));
  }
  /** The gold and the gems fly from their cards up to the counters; then back to the chests. */
  function collect() {
    if (!opening || !canCollect) return;
    canCollect = false;
    play('coins');
    const total = { gold: get(purse).gold, gems: get(purse).gems };
    let left = items.length;
    const landed = () => { if (--left <= 0) after(250, finish); };
    items.forEach((it, i) => {
      const from = gold_gems(it.kind);
      const origin = document.querySelector<HTMLElement>(`.chests-view .card[data-kind="${it.kind}"] img`);
      const target = pills[it.kind];
      const to = total[it.kind];
      const set = (v: number) => { if (it.kind === 'gold') gold = v; else gems = v; };
      if (calm || !origin || !target) { set(to); bump(it.kind); landed(); return; }
      setTimeout(() => {
        if (!alive) return;
        flyReward({
          src: it.kind === 'gold' ? ART.coin : ART.gem, n: pieces(it.kind, to - from), from: origin, to: target,
          onLand: (k, n) => { if (alive) { set(countAt(from, to, k, n)); bump(it.kind); } },
          onDone: landed,
        });
      }, i * 400);
    });
    // The cards fade but keep their places, so a later flight still knows where it starts.
    collected = true;
  }
  const gold_gems = (k: 'gold' | 'gems') => (k === 'gold' ? gold : gems);
  function finish() {
    gen++;
    gold = get(purse).gold; gems = get(purse).gems;
    holding = false;
    opening = null; items = []; parts = [];
  }

  // ---------------------------------------------------------------- particles
  interface Part { img?: HTMLImageElement; col?: string; x: number; y: number; vx: number; vy: number; s: number; rot: number; vr: number; life: number; fade: number; g: number; flat?: boolean }
  let cv: HTMLCanvasElement;
  let big = $state<HTMLElement | null>(null);
  let parts: Part[] = [];
  let raf = 0;
  let dpr = 1;
  const rnd = (a: number, b: number) => a + Math.random() * (b - a);
  const imgs: Record<string, HTMLImageElement> = {};
  for (const src of Object.values(ART)) { const im = new Image(); im.src = src; imgs[src] = im; }
  function fit() {
    const r = cv.getBoundingClientRect();
    dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = r.width * dpr; cv.height = r.height * dpr;
  }
  /** Where the chest stands, in the canvas's own pixels. */
  function chestAt() {
    const c = cv.getBoundingClientRect();
    const b = big?.getBoundingClientRect() ?? c;
    return { x: b.left - c.left + b.width / 2, y: b.top - c.top + b.height / 2, w: b.width, h: b.height };
  }
  function fountain(src: string, n: number, power = 1) {
    const c = chestAt();
    for (let i = 0; i < n; i++) parts.push({ img: imgs[src], x: c.x + rnd(-0.16, 0.16) * c.w, y: c.y - c.h * 0.04, vx: rnd(-4.5, 4.5) * power, vy: (-7 - Math.random() * 8) * power, s: c.w * rnd(0.08, 0.14), rot: rnd(0, 6), vr: rnd(-0.15, 0.15), life: 1, fade: 0.009, g: 0.3 });
    run();
  }
  /** Dust from the ground where the chest lands. Nothing comes out of a chest before its lid is open. */
  function dust(n: number) {
    const c = chestAt();
    for (let i = 0; i < n; i++) { const side = i % 2 ? 1 : -1; parts.push({ col: 'rgba(216,205,184,.8)', x: c.x + side * rnd(0.3, 0.48) * c.w, y: c.y + c.h * 0.36, vx: side * rnd(1, 3.5), vy: rnd(-1.6, -0.2), s: rnd(5, 9), rot: 0, vr: 0, life: 1, fade: 0.035, g: 0.08 }); }
    run();
  }
  function confetti(n: number) {
    const w = cv.width / dpr, h = cv.height / dpr, cols = ['#c8432f', '#f2c230', '#2f5fae', '#fffaf2', '#3f8f3a'];
    for (let i = 0; i < n; i++) parts.push({ col: cols[i % 5], x: Math.random() * w, y: -20 - Math.random() * h * 0.7, vx: rnd(-0.8, 0.8), vy: rnd(2, 5), s: rnd(5, 11), rot: rnd(0, 6), vr: rnd(-0.2, 0.2), life: 1, fade: 0.004, g: 0.02, flat: true });
    run();
  }
  function firework(x: number, y: number) {
    const col = ['#ffe89a', '#ff8a6b', '#9fd0ff', '#fff'][Math.floor(Math.random() * 4)];
    for (let i = 0; i < 36; i++) { const a = (i / 36) * Math.PI * 2, v = rnd(3, 5.5); parts.push({ col, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, s: 4, rot: 0, vr: 0, life: 1, fade: 0.02, g: 0.04 }); }
    run();
  }
  function run() { if (raf || !alive) return; fit(); raf = requestAnimationFrame(frame); }
  function frame() {
    const g = cv.getContext('2d');
    if (!g || !alive) { raf = 0; return; }
    const w = cv.width / dpr, h = cv.height / dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    parts = parts.filter((p) => p.life > 0 && p.y < h + 40);
    for (const p of parts) {
      p.x += p.vx; p.y += p.vy; p.vy += p.g; p.rot += p.vr; p.life -= p.fade;
      g.globalAlpha = Math.max(0, Math.min(1, p.life * 2));
      if (p.img) { g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.drawImage(p.img, -p.s / 2, -p.s / 2, p.s, p.s); g.restore(); }
      else if (p.flat) { g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.fillStyle = p.col!; g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); g.restore(); }
      else { g.fillStyle = p.col!; g.beginPath(); g.arc(p.x, p.y, Math.max(0.1, p.s * p.life), 0, 7); g.fill(); }
    }
    g.globalAlpha = 1;
    raf = parts.length ? requestAnimationFrame(frame) : 0;
  }

  function close() {
    if (opening) return;
    hubOpen.set(null);
  }
  onMount(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    const onResize = () => { if (raf) fit(); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    // The counters follow the purse while nothing is being opened (a purchase in the shop, say).
    const off = purse.subscribe((p) => { if (!holding) { gold = p.gold; gems = p.gems; } });
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      off();
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  });
</script>

<div class="view chests-view" class:dark={!!opening} class:royal role="dialog" aria-modal="true" aria-label="Kistor" data-no-click-sound>
  <div class="hud">
    <span class="pill" bind:this={pills.gold} class:bump={bumped === 'gold'} aria-label={`${gold} guld`}><img src={ART.coin} alt="" />{fmt(gold)}</span>
    <span class="pill" bind:this={pills.gems} class:bump={bumped === 'gems'} aria-label={`${gems} ädelstenar`}><img src={ART.gem} alt="" />{fmt(gems)}</span>
    {#if !opening}<button class="close-x x" onclick={close} aria-label="Stäng kistorna">✕</button>{/if}
  </div>

    <div class="stage" bind:this={stageEl}>
      {#if !opening}
        <div class="list">
          <h2 class="title">Kistor</h2>
          <ul class="slots">
            {#each Array.from({ length: CHEST_SLOTS }, (_, i) => $exp.chests[i]) as c, i (c?.id ?? `empty-${i}`)}
              {#if c}
                {@const left = c.readyAt - $now}
                <li class="slot" class:ready={left <= 0}>
                  <img class="chest" src={chestArt(c.kind)} alt={c.kind === 'royal' ? 'Kunglig kista' : 'Träkista'} />
                  <span class="when">{left <= 0 ? 'Klar att öppna!' : `Klar om ${formatDuration(left)}`}</span>
                  {#if left <= 0}
                    <button class="btn green" onclick={() => begin(c.id, c.kind)}>Öppna</button>
                  {:else}
                    <button class="btn small" disabled={gems < chestSkipGems(left)} onclick={() => begin(c.id, c.kind)}>Öppna nu <img src={ART.gem} alt="ädelstenar" /> {chestSkipGems(left)}</button>
                  {/if}
                </li>
              {:else}
                <li class="slot empty">Tom plats. Vinn en utmaning för att hitta en kista.</li>
              {/if}
            {/each}
          </ul>
          <div class="royalrow">
            <img class="chest" src={chestArt('royal')} alt="" />
            <div>Kunglig kista<small>Mer guld, och ibland ädelstenar</small></div>
            <button class="btn" disabled={gems < ROYAL_CHEST_GEMS || $exp.chests.length >= CHEST_SLOTS} onclick={buy} aria-label={`Köp en kunglig kista för ${ROYAL_CHEST_GEMS} ädelstenar`}><img src={ART.gem} alt="" /> {ROYAL_CHEST_GEMS}</button>
          </div>
        </div>
      {:else}
        <div class="rays" class:weak={rays === 'weak'} class:on={rays === 'on'}></div>
        <div class="rays two" class:on={rays2}></div>
        <div class="beam" class:on={beam}></div>
        {#key poseKey}
          <button class="bigchest {pose}" bind:this={big} onclick={tap} disabled={busy} aria-label="Kistan, tryck för att öppna">
            <img src={chestArt(opening.kind, lidOpen)} alt="" draggable="false" />
          </button>
        {/key}
        <p class="hint" aria-live="polite">{hint}</p>
        {#if !busy}<div class="taps" aria-hidden="true">{#each [1, 2, 3] as k}<i class:on={taps >= k}></i>{/each}</div>{/if}
        {#if shout}<div class="shout" aria-hidden="true">KUNGLIG KISTA!</div>{/if}
        <div class="loot" class:collected aria-live="polite">
          {#each items as it (it.kind)}
            <div class="card" class:rare={it.kind === 'gems'} data-kind={it.kind}>
              <img src={it.kind === 'gold' ? ART.coin : ART.gem} alt="" />
              <span>{fmt(it.amount)}</span>
              <small>{it.kind === 'gold' ? 'guld' : 'ädelstenar'}</small>
            </div>
          {/each}
        </div>
        {#if canCollect}<button class="btn green collect" onclick={collect}>Hämta</button>{/if}
      {/if}
    </div>
  {#key flash}{#if flash}<div class="flash"></div>{/if}{/key}
  <canvas class="fx" bind:this={cv}></canvas>
</div>

<style>
  .view { position: fixed; inset: 0; z-index: 12; background: #7fb6e6 url(/art/chests/scene.webp) center / cover no-repeat; display: grid; place-items: center; overflow: hidden; user-select: none; -webkit-user-select: none; color: #1f1a17; }
  .view::before { content: ''; position: absolute; inset: 0; opacity: 0; transition: opacity .3s; pointer-events: none; background: radial-gradient(circle at 50% 54%, rgb(20 30 60 / .55), rgb(10 12 28 / .94) 70%); }
  .view.dark::before { opacity: 1; }
  .view.dark.royal::before { background: radial-gradient(circle at 50% 54%, rgb(120 80 10 / .5), rgb(22 12 40 / .95) 72%); }
  .hud { position: absolute; top: calc(8px + env(safe-area-inset-top)); left: 8px; right: 8px; z-index: 9; display: flex; gap: 6px; align-items: center; min-height: 44px; }
  .pill { display: flex; align-items: center; gap: 4px; padding: 2px 10px 2px 4px; border-radius: 999px; background: #fffaf2; border: 2px solid var(--deep); font-weight: 800; font-size: 1rem; font-variant-numeric: tabular-nums; transition: transform .12s; }
  .pill img { width: 1.5em; height: 1.5em; object-fit: contain; }
  .pill.bump { transform: scale(1.2); }
  .x { margin-left: auto; background: #fffaf2; color: var(--deep); border: 2px solid var(--deep); }

  /* The stage keeps the mockup's 2:3 shape, so its measures (cqw) carry over. */
  .stage { position: relative; width: min(100%, 520px, 100dvh * 2 / 3); aspect-ratio: 2 / 3; container-type: inline-size; }
  .stage.quake { animation: quake .45s; }
  @keyframes quake { 15% { transform: translate(-6px, 4px); } 30% { transform: translate(6px, -4px); } 45% { transform: translate(-5px, -3px); } 60% { transform: translate(4px, 3px); } 80% { transform: translate(-2px, 1px); } }

  .list { position: absolute; inset: 11% 4% 3% 4%; display: grid; grid-template-rows: auto 1fr auto; gap: 2.5cqw; }
  .title { justify-self: center; margin: 0; background: var(--falu); color: #fffaf2; border: 3px solid var(--deep); border-radius: 12px; padding: 0 22px; font-weight: 800; font-size: clamp(18px, 6cqw, 27px); box-shadow: 0 4px 0 var(--deep); }
  .slots { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 2.5cqw; align-content: center; }
  .slot { background: rgb(255 250 242 / .93); border: 3px solid var(--deep); border-radius: 14px; padding: 2cqw; display: grid; justify-items: center; gap: 1cqw; min-height: 38cqw; align-content: center; text-align: center; }
  .slot img.chest { width: 20cqw; height: 20cqw; object-fit: contain; }
  .slot.ready img.chest { animation: hop 1.6s ease-in-out infinite; }
  @keyframes hop { 0%, 60%, 100% { transform: translateY(0) rotate(0); } 70% { transform: translateY(-6%) rotate(-4deg); } 80% { transform: translateY(0) rotate(3deg); } 90% { transform: rotate(-2deg); } }
  .when { font-weight: 700; font-size: clamp(13px, 4.2cqw, 18px); line-height: 1.1; font-variant-numeric: tabular-nums; }
  .slot.empty { background: rgb(255 250 242 / .6); border-style: dashed; color: #5c524b; font-weight: 700; font-size: clamp(13px, 4cqw, 17px); }
  .btn { font: inherit; font-weight: 800; font-size: clamp(15px, 4.8cqw, 21px); line-height: 1.1; color: #fffaf2; background: linear-gradient(#c8432f, #9b2a1f); border: 3px solid var(--deep); border-radius: 12px; padding: 6px 12px; min-height: 44px; cursor: pointer; box-shadow: 0 4px 0 var(--deep); display: inline-flex; gap: 5px; align-items: center; justify-content: center; }
  .btn.small { font-size: clamp(13px, 4.1cqw, 18px); }
  .btn img { width: 1.2em; height: 1.2em; object-fit: contain; }
  .btn.green { background: linear-gradient(#57a84f, #3f6d3a); }
  .btn:active:not(:disabled) { transform: translateY(3px); box-shadow: 0 1px 0 var(--deep); }
  .btn:disabled { filter: saturate(.3) brightness(.9); cursor: default; }
  .royalrow { background: linear-gradient(#fff3c4, #f2d27a); border: 3px solid var(--deep); border-radius: 14px; padding: 1.5cqw 3cqw; display: flex; align-items: center; gap: 2cqw; }
  .royalrow img.chest { width: 20cqw; height: 20cqw; object-fit: contain; }
  .royalrow div { flex: 1; min-width: 0; font-weight: 800; font-size: clamp(15px, 4.8cqw, 21px); line-height: 1.1; }
  .royalrow small { display: block; font-weight: 700; font-size: .78em; color: #5c3a10; }

  /* ---- the opening ---- */
  .rays { position: absolute; left: 50%; top: 54%; width: 200cqw; height: 200cqw; margin: -100cqw; border-radius: 50%; opacity: 0; transition: opacity .5s; pointer-events: none;
    background: repeating-conic-gradient(rgb(255 232 150 / 0) 0deg, rgb(255 232 150 / .34) 8deg, rgb(255 232 150 / 0) 16deg, rgb(255 232 150 / 0) 30deg);
    -webkit-mask-image: radial-gradient(circle, #000 12%, transparent 62%); mask-image: radial-gradient(circle, #000 12%, transparent 62%); animation: turn 14s linear infinite; }
  .rays.two { animation-duration: 9s; animation-direction: reverse; background: repeating-conic-gradient(rgb(255 255 255 / 0) 0deg, rgb(255 250 220 / .3) 5deg, rgb(255 255 255 / 0) 10deg, rgb(255 255 255 / 0) 22deg); }
  .rays.on { opacity: 1; }
  .rays.weak { opacity: .35; }
  @keyframes turn { to { transform: rotate(360deg); } }
  .beam { position: absolute; left: 50%; bottom: 44%; width: 34cqw; margin-left: -17cqw; height: 0; opacity: 0; pointer-events: none;
    background: linear-gradient(to top, rgb(255 244 180 / .95), rgb(255 232 140 / .35) 60%, rgb(255 232 140 / 0)); filter: blur(2px); clip-path: polygon(30% 100%, 70% 100%, 100% 0, 0 0); }
  .beam.on { animation: beam 2.6s ease-out forwards; }
  @keyframes beam { 0% { height: 0; opacity: 1; } 18% { height: 60%; opacity: 1; } 75% { height: 60%; opacity: .8; } 100% { height: 60%; opacity: .25; } }
  .bigchest { position: absolute; left: 50%; top: 54%; width: 62cqw; height: 62cqw; min-height: 0; margin: -31cqw; cursor: pointer; background: none; border: 0; padding: 0; box-shadow: none; }
  .bigchest:disabled { cursor: default; opacity: 1; }
  .bigchest img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; }
  .bigchest.wait { animation: breathe 1.2s ease-in-out infinite; }
  .bigchest.s1 { animation: shake1 .45s; }
  .bigchest.s2 { animation: shake2 .55s; }
  .bigchest.boom { animation: boom .5s; }
  .bigchest.jump { animation: jump 1s cubic-bezier(.3, 0, .5, 1); }
  .bigchest.charge { animation: charge 1.3s ease-in forwards; }
  @keyframes breathe { 50% { transform: scale(1.04); } }
  @keyframes shake1 { 20% { transform: rotate(-5deg) translateY(-3%); } 40% { transform: rotate(5deg); } 60% { transform: rotate(-3deg); } 80% { transform: rotate(2deg); } }
  @keyframes shake2 { 10% { transform: rotate(-9deg) translateY(-7%) scale(1.06); } 30% { transform: rotate(9deg) scale(1.06); } 50% { transform: rotate(-7deg) translateY(-4%); } 70% { transform: rotate(6deg); } 90% { transform: rotate(-3deg); } }
  @keyframes boom { 0% { transform: scale(.8, 1.15); } 40% { transform: scale(1.18, .9) translateY(-5%); } 100% { transform: scale(1); } }
  @keyframes jump { 0% { transform: translateY(0) scale(1.1, .85); } 45% { transform: translateY(-95%) rotate(360deg) scale(1); } 55% { transform: translateY(-95%) rotate(360deg); } 92% { transform: translateY(0) rotate(360deg) scale(1.2, .8); } 100% { transform: translateY(0) rotate(360deg); } }
  @keyframes charge { 0% { transform: translateY(0); } 100% { transform: translateY(-14%) scale(1.12); filter: brightness(1.7) drop-shadow(0 0 22px #ffe89a); }
    10%, 30%, 50%, 70%, 90% { margin-left: -31.8cqw; } 20%, 40%, 60%, 80% { margin-left: -30.2cqw; } }
  .hint { position: absolute; left: 0; right: 0; top: 76%; margin: 0; text-align: center; color: #fffaf2; font-weight: 800; font-size: clamp(20px, 7cqw, 32px); text-shadow: 0 2px 0 #2a1408; pointer-events: none; }
  .taps { position: absolute; left: 0; right: 0; top: 84%; display: flex; justify-content: center; gap: 2cqw; pointer-events: none; }
  .taps i { width: 5cqw; height: 5cqw; border-radius: 50%; border: 2px solid #fffaf2; }
  .taps i.on { background: #f2c230; border-color: #f2c230; box-shadow: 0 0 8px #f2c230; }
  .shout { position: absolute; left: 0; right: 0; top: 30%; text-align: center; z-index: 8; font-weight: 800; font-size: clamp(26px, 10cqw, 46px); color: #ffe89a; -webkit-text-stroke: 2px var(--deep); paint-order: stroke fill; text-shadow: 0 4px 0 var(--deep); pointer-events: none; animation: shout 1.6s cubic-bezier(.2, 1.6, .4, 1) forwards; }
  @keyframes shout { 0% { transform: scale(0) rotate(-8deg); } 25% { transform: scale(1.1) rotate(2deg); } 80% { transform: scale(1); opacity: 1; } 100% { transform: scale(1.2); opacity: 0; } }
  .flash { position: absolute; inset: 0; background: #fff6c4; opacity: 0; pointer-events: none; z-index: 7; animation: flash .7s ease-out; }
  @keyframes flash { 0% { opacity: .95; } 100% { opacity: 0; } }
  canvas.fx { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 10; }

  .loot { position: absolute; left: 3%; right: 3%; top: 10%; display: flex; flex-wrap: wrap; justify-content: center; gap: 2cqw; z-index: 8; }
  .card { width: 28cqw; height: 31cqw; background: #fffaf2; border: 3px solid var(--deep); border-radius: 12px; padding: 1cqw; display: grid; justify-items: center; align-content: center; text-align: center; box-shadow: 0 4px 0 rgb(0 0 0 / .35); font-weight: 800; font-size: clamp(14px, 4.6cqw, 20px); line-height: 1.05; animation: shoot .8s cubic-bezier(.2, 1.2, .4, 1) both; }
  .loot.collected { opacity: 0; transition: opacity .3s; }
  .card.rare { background: linear-gradient(#ffe89a, #f2c230); }
  .card img { width: 15cqw; height: 15cqw; object-fit: contain; }
  .card small { font-weight: 700; font-size: .72em; color: #5c524b; }
  @keyframes shoot { 0% { transform: translateY(60cqw) scale(.15); opacity: 0; } 55% { transform: translateY(-14cqw) scale(1.15); opacity: 1; } 100% { transform: none; } }
  .collect { position: absolute; left: 14%; right: 14%; bottom: 4%; z-index: 8; font-size: clamp(19px, 6.4cqw, 28px); min-height: 56px; }
  @media (prefers-reduced-motion: reduce) { .rays, .slot.ready img.chest, .bigchest, .card, .shout, .stage.quake { animation: none; } }
</style>
