<script lang="ts">
  /**
   * The wheel of fortune (step 7), full screen, as Jonas approved it on
   * 2026-11-20: a painted wheel on the market square with fairground music.
   * The wheel winds up, ticks against a leather flap and slows down; the flap
   * bends over each peg, slowly at the end, so nobody knows whether it will
   * slip to the next field. Beside the jackpot the stop is staged (near miss).
   */
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { hubOpen, spin, wheelFree } from '../lib/state/expansion';
  import { lives, purse } from '../lib/state/game';
  import { FIELD_DEG, FLAP_GRIP, SPIN_GEMS, WHEEL, discField, landingAngle, nearJackpot } from '../lib/expansion/luck';
  import { musicNow, play, playTick, setMusic } from '../lib/audio/sound';

  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  /** How far before the pointer a peg starts to push the flap, and how far the flap bends (degrees). */
  const REACH = 12;
  const BEND = 30;
  const BULBS = 20;
  const art = (s: { gold?: number; gems?: number }) => `/art/wheel/${s.gold ? 'coin' : s.gems ? 'gem' : 'heart'}.webp`;
  const amount = (s: { gold?: number; gems?: number; lives?: number }) => s.gold ?? s.gems ?? s.lives ?? 0;
  const word = (s: { gold?: number; gems?: number }) => (s.gold ? 'guld' : s.gems ? 'ädelstenar' : 'liv');
  const fmt = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const mod = (x: number, m: number) => ((x % m) + m) % m;

  // The counters show what the player had until the wheel has stopped.
  let gold = $state(get(purse).gold);
  let gems = $state(get(purse).gems);
  let hearts = $state(get(lives).count);
  let free = $state(wheelFree());
  let spinning = $state(false);
  let result = $state<number | null>(null);
  let lit = $state(0);
  let bumped = $state<'gold' | 'gems' | 'lives' | null>(null);
  let glow = $state(false);
  let flash = $state(false);
  const cost = $derived(free.starter > 0 || free.daily ? 0 : SPIN_GEMS);
  const canPay = $derived(cost === 0 || gems >= cost);

  let wheelEl: HTMLDivElement;
  let flapEl: HTMLDivElement;
  let boxEl: HTMLDivElement;
  let viewEl: HTMLDivElement;
  let canvas: HTMLCanvasElement;
  let R = 0;
  let relT = -1e9;
  let alive = true;

  function setFlap(t: number) {
    const e = mod(R - FLAP_GRIP, FIELD_DEG); // degrees since the last peg slipped under the flap
    let bend: number;
    if (e > FIELD_DEG - REACH) bend = ((e - (FIELD_DEG - REACH)) / REACH) * BEND; // the next peg is pushing the flap
    else { const dt = (t - relT) / 1000; bend = BEND * Math.exp(-dt * 11) * Math.cos(dt * 36); } // it springs back
    flapEl.style.transform = `rotate(${-bend}deg)`;
  }
  function draw(t: number) {
    wheelEl.style.transform = `rotate(${R}deg)`;
    setFlap(t);
  }

  // ---------------------------------------------------------------- particles
  interface Part { img?: HTMLImageElement; col?: string; x: number; y: number; vx: number; vy: number; s: number; rot: number; vr: number; life: number; fade: number; kind: 'img' | 'flat' | 'spark' }
  let parts: Part[] = [];
  let raf = 0;
  const imgs: Record<string, HTMLImageElement> = {};
  for (const n of ['coin', 'gem', 'heart']) { imgs[n] = new Image(); imgs[n].src = `/art/wheel/${n}.webp`; }
  function fit() {
    const r = viewEl.getBoundingClientRect();
    const d = Math.min(2, devicePixelRatio || 1);
    canvas.width = r.width * d; canvas.height = r.height * d;
    canvas.getContext('2d')!.setTransform(d, 0, 0, d, 0, 0);
    return r;
  }
  function centre() {
    const v = viewEl.getBoundingClientRect();
    const b = boxEl.getBoundingClientRect();
    return { x: b.left - v.left + b.width / 2, y: b.top - v.top + b.height / 2, w: v.width, h: v.height };
  }
  function run() { if (!raf) { fit(); raf = requestAnimationFrame(frame); } }
  function burst(name: string, n: number, big: boolean) {
    const c = centre();
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = (big ? 5 : 3.2) + Math.random() * (big ? 7 : 4);
      parts.push({ kind: 'img', img: imgs[name], x: c.x, y: c.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 4, s: c.w * (0.05 + Math.random() * 0.035), rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, life: 1, fade: 0.012 });
    }
    run();
  }
  function confetti(n: number) {
    const c = centre();
    const cols = ['#c8432f', '#f2c230', '#2f5fae', '#fffaf2', '#3f8f3a'];
    for (let i = 0; i < n; i++) parts.push({ kind: 'flat', col: cols[i % 5], x: Math.random() * c.w, y: -20 - Math.random() * c.h * 0.8, vx: (Math.random() - 0.5) * 1.5, vy: 2 + Math.random() * 3, s: 5 + Math.random() * 6, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, life: 1, fade: 0.004 });
    run();
  }
  function firework(x: number, y: number) {
    const col = ['#ffe89a', '#ff8a6b', '#9fd0ff', '#ffffff'][Math.floor(Math.random() * 4)];
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      const v = 3 + Math.random() * 2.5;
      parts.push({ kind: 'spark', col, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, s: 4, rot: 0, vr: 0, life: 1, fade: 0.02 });
    }
    run();
  }
  function frame() {
    if (!alive) return;
    const c = centre();
    const g = canvas.getContext('2d')!;
    g.clearRect(0, 0, c.w, c.h);
    parts = parts.filter((p) => p.life > 0 && p.y < c.h + 40);
    for (const p of parts) {
      p.x += p.vx; p.y += p.vy; p.vy += p.kind === 'spark' ? 0.04 : p.kind === 'flat' ? 0.02 : 0.28; p.life -= p.fade; p.rot += p.vr;
      g.globalAlpha = Math.max(0, Math.min(1, p.life * 2));
      if (p.kind === 'img') { g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.drawImage(p.img!, -p.s / 2, -p.s / 2, p.s, p.s); g.restore(); }
      else if (p.kind === 'flat') { g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.fillStyle = p.col!; g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); g.restore(); }
      else { g.fillStyle = p.col!; g.beginPath(); g.arc(p.x, p.y, Math.max(0.1, p.s * p.life), 0, 7); g.fill(); }
    }
    g.globalAlpha = 1;
    raf = parts.length ? requestAnimationFrame(frame) : 0;
  }

  // ---------------------------------------------------------------- the spin
  function doSpin() {
    if (spinning || !canPay) return;
    const i = spin();
    if (i === null) return;
    spinning = true; result = null; glow = false;
    if (cost > 0) { gems = get(purse).gems - (WHEEL[i].gems ?? 0); bump('gems'); }
    free = wheelFree();
    const near = nearJackpot(i);
    const theta = landingAngle(i, Math.random());
    const R0 = R;
    let R1 = Math.ceil((R0 + 360 * 5 + theta) / 360) * 360 - theta;
    if (R1 - R0 < 360 * 5) R1 += 360;
    const wind = calm ? 0 : 380;
    const dur = calm ? 1200 : near ? 8600 : 7200;
    const back = calm ? 0 : 16;
    const pow = near ? 4.2 : 3.8;
    const t0 = performance.now();
    let last = Math.floor((R0 - FLAP_GRIP) / FIELD_DEG);
    const step = (t: number) => {
      if (!alive) return;
      const e = t - t0;
      if (e < wind) R = R0 - back * Math.sin(((e / wind) * Math.PI) / 2);
      else { const x = Math.min(1, (e - wind) / dur); R = R0 - back + (R1 - R0 + back) * (1 - Math.pow(1 - x, pow)); }
      const rel = Math.floor((R - FLAP_GRIP) / FIELD_DEG);
      if (e >= wind && rel > last) { const fast = rel - last > 1; last = rel; relT = t; lit++; playTick(fast ? 1.25 : 1); }
      else if (rel < last) last = rel;
      draw(t);
      if (e < wind + dur) requestAnimationFrame(step); else settle(i);
    };
    requestAnimationFrame(step);
  }
  /** When the wheel stops with a peg pressing on the flap, the flap pushes the wheel back a little before the result shows. */
  function settle(i: number) {
    const pressed = mod(R - FLAP_GRIP, FIELD_DEG) - (FIELD_DEG - REACH);
    if (pressed <= 0 || calm) { setTimeout(() => done(i), calm ? 0 : 350); return; }
    const give = Math.min(pressed * 0.45, 4);
    const R0 = R;
    const t0 = performance.now();
    const step = (t: number) => {
      if (!alive) return;
      const e = t - t0 - 450;
      if (e > 0) R = R0 - give * (1 - Math.pow(1 - Math.min(1, e / 700), 2));
      draw(t);
      if (e < 700) requestAnimationFrame(step); else done(i);
    };
    requestAnimationFrame(step);
  }
  function bump(which: 'gold' | 'gems' | 'lives') {
    bumped = which;
    setTimeout(() => { if (bumped === which) bumped = null; }, 180);
  }
  function countUp(which: 'gold' | 'gems' | 'lives', to: number) {
    const from = which === 'gold' ? gold : which === 'gems' ? gems : hearts;
    const t0 = performance.now();
    const step = (t: number) => {
      if (!alive) return;
      const x = Math.min(1, (t - t0) / 900);
      const v = Math.round(from + (to - from) * x);
      if (which === 'gold') gold = v; else if (which === 'gems') gems = v; else hearts = v;
      if (x < 1) requestAnimationFrame(step); else bump(which);
    };
    requestAnimationFrame(step);
  }
  function done(i: number) {
    if (!alive) return;
    const s = WHEEL[i];
    spinning = false; result = i;
    if (s.jackpot) {
      flash = true; setTimeout(() => (flash = false), 650);
      glow = true;
      play('fireworks'); setTimeout(() => play('gems'), 350);
      if (!calm) {
        burst('gem', 46, true); confetti(120);
        const c = centre();
        for (let k = 0; k < 6; k++) setTimeout(() => { if (alive) firework(c.w * (0.15 + Math.random() * 0.7), c.h * (0.08 + Math.random() * 0.3)); }, 300 + k * 420);
      }
    } else if (nearJackpot(i)) {
      play('near'); glow = true;
      if (!calm) burst('coin', 8, false);
    } else {
      play(s.gems ? 'gems' : 'coins');
      if (!calm) burst(s.gold ? 'coin' : s.gems ? 'gem' : 'heart', s.gold ? Math.min(34, 8 + s.gold / 20) : 12, (s.gold ?? 0) >= 500);
    }
    if (s.gold) countUp('gold', get(purse).gold);
    else if (s.gems) countUp('gems', get(purse).gems);
    else countUp('lives', get(lives).count);
  }

  function close() {
    if (spinning) return;
    hubOpen.set(null);
  }

  onMount(() => {
    const before = musicNow();
    setMusic('wheel');
    draw(performance.now());
    const idle = setInterval(() => { if (!spinning && !calm) lit++; }, 600);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    const onResize = () => { if (raf) fit(); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      alive = false;
      clearInterval(idle);
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      setMusic(before.name, before.ambience);
    };
  });
</script>

<div class="view" bind:this={viewEl} role="dialog" aria-modal="true" aria-label="Lyckohjulet" data-no-click-sound>
  <div class="hud">
    <span class="pill" class:bump={bumped === 'gold'} aria-label={`${gold} guld`}><img src="/art/wheel/coin.webp" alt="" />{fmt(gold)}</span>
    <span class="pill" class:bump={bumped === 'gems'} aria-label={`${gems} ädelstenar`}><img src="/art/wheel/gem.webp" alt="" />{fmt(gems)}</span>
    <span class="pill" class:bump={bumped === 'lives'} aria-label={`${hearts} liv`}><img src="/art/wheel/heart.webp" alt="" />{hearts}</span>
    <button class="close-x x" onclick={close} disabled={spinning} aria-label="Stäng lyckohjulet">✕</button>
  </div>

  <div class="scene">
    <div class="sign" aria-hidden="true">LYCKOHJULET</div>
    <div class="box" bind:this={boxEl}>
      <div class="shadow"></div>
      {#each Array.from({ length: BULBS }, (_, k) => k) as k}
        {@const a = (k / BULBS) * Math.PI * 2}
        <span class="bulb" class:lit={(k + lit) % 4 === 0} style:left={`${50 + 54.5 * Math.sin(a)}%`} style:top={`${50 - 54.5 * Math.cos(a)}%`}></span>
      {/each}
      <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
      <div class="wheel" bind:this={wheelEl} onclick={doSpin}>
        <img src="/art/wheel/disc.webp" alt="" />
        {#each WHEEL as s, i}
          <div class="prize" class:red={discField(i) % 2 === 1 && !s.jackpot} class:jack={s.jackpot} style:transform={`rotate(${discField(i) * FIELD_DEG + FIELD_DEG / 2}deg)`}>
            <div><img src={art(s)} alt="" /><span>{amount(s)}</span></div>
          </div>
        {/each}
        <div class="glow" class:on={glow} style:transform={`rotate(${discField(WHEEL.findIndex((s) => s.jackpot)) * FIELD_DEG + FIELD_DEG / 2}deg)`}></div>
      </div>
      <div class="flap" bind:this={flapEl} aria-hidden="true">
        <svg viewBox="0 0 40 100">
          <rect x="10" y="0" width="20" height="18" rx="3" fill="#b98a2e" stroke="#5a3a0a" stroke-width="2" />
          <path d="M12 12 L28 12 L23 92 Q20 100 17 92 Z" fill="#c8432f" stroke="#5a1d14" stroke-width="2.5" stroke-linejoin="round" />
          <circle cx="20" cy="14" r="5" fill="#e9c46a" stroke="#5a3a0a" stroke-width="2" />
        </svg>
      </div>
    </div>
    {#if result !== null}
      {@const s = WHEEL[result]}
      <div class="ribbon" class:jack={s.jackpot}>
        <div class="big">{s.jackpot ? 'STORVINST!' : nearJackpot(result) ? 'Så nära storvinsten!' : 'Du vann!'}</div>
        <div class="small">{#if nearJackpot(result)}Du fick{/if} <img src={art(s)} alt="" /> {amount(s)} {word(s)}</div>
      </div>
    {/if}
  </div>

  <div class="panel">
    <button class="spin" class:pulse={result !== null && nearJackpot(result) && !spinning} onclick={doSpin} disabled={spinning || !canPay}>
      {#if cost === 0}Snurra gratis{:else if canPay}Snurra för <img src="/art/wheel/gem.webp" alt="ädelstenar" /> {cost}{:else}För få ädelstenar{/if}
    </button>
    <p class="sub">{free.starter > 0 ? `${free.starter} gratis snurr kvar` : free.daily ? 'Dagens gratissnurr' : 'Nästa gratissnurr i morgon'}</p>
  </div>

  <p class="sr" aria-live="polite">{result === null ? '' : WHEEL[result].jackpot ? `Storvinst! ${amount(WHEEL[result])} ädelstenar` : `${nearJackpot(result) ? 'Så nära storvinsten. Du fick' : 'Du vann'} ${amount(WHEEL[result])} ${word(WHEEL[result])}`}</p>
  {#if flash}<div class="flash"></div>{/if}
  <canvas class="fx" bind:this={canvas}></canvas>
</div>

<style>
  /* The sky of the painting continues above it; the controls sit on a panel below it. */
  .view { position: fixed; inset: 0; z-index: 12; background: #2589de; display: flex; flex-direction: column; align-items: center; overflow: hidden; user-select: none; -webkit-user-select: none; color: #1f1a17; }
  .hud { position: absolute; top: calc(8px + env(safe-area-inset-top)); left: 8px; right: 8px; z-index: 6; display: flex; gap: 6px; align-items: center; }
  .pill { display: flex; align-items: center; gap: 4px; padding: 2px 10px 2px 4px; border-radius: 999px; background: #fffaf2; border: 2px solid var(--deep); font-weight: 800; font-size: 1rem; font-variant-numeric: tabular-nums; transition: transform .15s; }
  .pill img { width: 1.5em; height: 1.5em; object-fit: contain; }
  .pill.bump { transform: scale(1.18); }
  .x { margin-left: auto; background: #fffaf2; color: var(--deep); border: 2px solid var(--deep); }
  .x:disabled { opacity: .5; }

  .scene { position: relative; flex: none; margin-top: auto; width: min(100%, 520px, (100dvh - 150px) * 2 / 3); aspect-ratio: 2 / 3; background: url(/art/wheel/scene.webp) center / cover no-repeat; container-type: inline-size; }
  .sign { position: absolute; left: 16%; right: 16%; top: 18.6%; height: 4%; display: grid; place-items: center; color: #fbf1d8; font-weight: 800; letter-spacing: .14em; font-size: clamp(14px, 5.2cqw, 26px); text-shadow: 0 2px 0 #0e1d3d; }
  .box { position: absolute; left: 15%; width: 70%; top: 28.1%; aspect-ratio: 1; container-type: inline-size; }
  .shadow { position: absolute; inset: 1.5% -2% -3% 2%; border-radius: 50%; background: rgb(60 40 10 / .32); filter: blur(6px); }
  .wheel { position: absolute; inset: 0; border-radius: 50%; will-change: transform; cursor: pointer; }
  .wheel > img { width: 100%; height: 100%; display: block; clip-path: circle(49.7%); pointer-events: none; }
  .prize { position: absolute; left: 50%; top: 50%; width: 0; height: 0; pointer-events: none; }
  .prize > div { position: absolute; left: 0; bottom: 0; transform: translate(-50%, 0); padding-bottom: 20cqw; display: grid; justify-items: center; }
  .prize img { width: 15cqw; height: 15cqw; object-fit: contain; filter: drop-shadow(0 1px 1px rgb(0 0 0 / .35)); }
  .prize span { font-weight: 800; font-size: 9cqw; line-height: .9; color: #3a1a10; text-shadow: 0 1px 0 rgb(255 255 255 / .55); }
  .prize.red span { color: #fff6df; text-shadow: 0 1px 0 #5a1d14, 0 0 4px #5a1d14; }
  .prize.jack span { color: #5a2c00; font-size: 10.5cqw; }
  .glow { position: absolute; left: 50%; top: 50%; width: 46cqw; height: 46cqw; margin: -53cqw 0 0 -23cqw; transform-origin: 23cqw 53cqw; border-radius: 50%; pointer-events: none; opacity: 0; background: radial-gradient(circle, rgb(255 244 170 / .95), rgb(255 220 90 / .5) 40%, transparent 68%); mix-blend-mode: screen; }
  .glow.on { animation: glow .7s ease-in-out 4; }
  @keyframes glow { 50% { opacity: 1; } }
  .bulb { position: absolute; width: 4.2cqw; height: 4.2cqw; margin: -2.1cqw; border-radius: 50%; background: #c9a55a; border: 1px solid #6b4a16; transition: background .12s, box-shadow .12s; }
  .bulb.lit { background: #fff3b0; box-shadow: 0 0 8px 3px rgb(255 226 120 / .9); }
  .flap { position: absolute; left: 50%; top: -13.5%; width: 9%; height: 22%; margin-left: -4.5%; transform-origin: 50% 14%; z-index: 3; pointer-events: none; }
  .flap svg { width: 100%; height: 100%; overflow: visible; }

  .ribbon { position: absolute; left: 4%; right: 4%; top: 49%; z-index: 4; text-align: center; padding: 6px 10px 8px; border-radius: 14px; background: #fffaf2; border: 3px solid var(--deep); box-shadow: 0 6px 0 rgb(90 29 20 / .35); animation: pop .45s cubic-bezier(.2, 1.6, .4, 1) both; pointer-events: none; }
  .ribbon.jack { background: linear-gradient(#ffe89a, #f2c230); }
  @keyframes pop { from { transform: scale(0); opacity: 0; } }
  .ribbon .big { font-weight: 800; font-size: clamp(20px, 7cqw, 34px); line-height: 1.05; }
  .ribbon .small { font-weight: 700; font-size: clamp(15px, 4.6cqw, 22px); display: flex; gap: 6px; justify-content: center; align-items: center; }
  .ribbon img { width: 1.5em; height: 1.5em; object-fit: contain; }

  .panel { flex: none; width: 100%; background: #f3e6cf; border-top: 3px solid var(--deep); padding: 12px 16px calc(12px + env(safe-area-inset-bottom)); display: grid; justify-items: center; gap: 4px; z-index: 5; }
  .spin { width: min(100%, 420px); min-height: 60px; font-weight: 800; font-size: 1.5rem; line-height: 1.1; color: #fffaf2; background: linear-gradient(#c8432f, #9b2a1f); border: 3px solid var(--deep); border-radius: 16px; box-shadow: 0 5px 0 var(--deep); display: flex; gap: 8px; align-items: center; justify-content: center; }
  .spin img { width: 1.25em; height: 1.25em; object-fit: contain; }
  .spin:active:not(:disabled) { transform: translateY(3px); box-shadow: 0 2px 0 var(--deep); }
  .spin:disabled { filter: saturate(.35) brightness(.9); }
  .spin.pulse { animation: pulse 1s ease-in-out infinite; }
  @keyframes pulse { 50% { transform: scale(1.04); } }
  .sub { margin: 0; font-weight: 700; color: var(--deep); }
  .flash { position: absolute; inset: 0; z-index: 7; background: #fff6c4; pointer-events: none; animation: flash .6s ease-out both; }
  @keyframes flash { from { opacity: .85; } to { opacity: 0; } }
  .fx { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 8; }
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
  @media (prefers-reduced-motion: reduce) { .spin.pulse, .glow.on { animation: none; } }
</style>
