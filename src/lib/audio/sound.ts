/**
 * Music and sound effects (Jonas picked every sound on 2026-11-17, see
 * public/audio/CREDITS.md and docs on the listening page).
 *
 * - Web Audio, one AudioContext, made when the app opens. Most browsers keep
 *   it silent until the player first touches the page (autoplay rules); then
 *   the music already loaded starts. Where the browser allows autoplay (an app
 *   added to the home screen in Chrome) it plays at once, see tryAutoplay.
 * - Music, the sea ambience and sound effects are switched on and off
 *   separately in Settings (accessibility) and remembered on the device.
 * - Everything pauses when the app is hidden, so it never plays in a pocket.
 * - Files: public/audio/{music,sfx}/<name>.{ogg,mp3}; Ogg Vorbis where the
 *   browser plays it (gapless loops), MP3 elsewhere (Safari).
 */
import { writable, get } from 'svelte/store';
import { load, save } from '../state/storage';

export type Sfx =
  | 'swap' | 'invalid' | 'win' | 'lose' | 'near' | 'purchase' | 'coins' | 'gems'
  | 'buildStart' | 'buildDone' | 'attack' | 'defended' | 'notify' | 'click'
  // the special tiles and the hard blocks (Jonas, 2026-11-19)
  | 'rocket' | 'fireworks' | 'shine' | 'crack' | 'break' | 'hammer';
export type Music = 'title' | 'village' | 'puzzle-brickor' | 'puzzle-gem-waltz' | `world-${number}` | `world-${number}-${string}`;

const SFX_FILES: Record<Sfx, string> = {
  swap: 'swap', invalid: 'invalid', win: 'win', lose: 'lose', near: 'near', purchase: 'purchase',
  coins: 'coins', gems: 'gems', buildStart: 'build-start', buildDone: 'build-done', attack: 'attack',
  defended: 'defended', notify: 'notify', click: 'click',
  rocket: 'rocket', fireworks: 'fireworks', shine: 'shine', crack: 'crack', break: 'break', hammer: 'hammer',
};
const MUSIC_FILES: Record<string, string> = {
  title: 'title-solsken', village: 'village-udden', 'puzzle-brickor': 'puzzle-brickor', 'puzzle-gem-waltz': 'puzzle-gem-waltz',
};
/**
 * Each world has its own puzzle music (Jonas, 2026-11-19). A world listed
 * here plays public/audio/music/world-<n>.{ogg,mp3} on all its challenges;
 * a world that is not listed yet keeps the two tunes of the first world. Add
 * the world's number here when its tune is in place.
 */
export const WORLD_TUNES: readonly number[] = [2, 3, 4, 5];
for (const w of WORLD_TUNES) MUSIC_FILES[`world-${w}`] = `world-${w}`;
/**
 * More tunes for a world, taking turns with its own from challenge to
 * challenge: public/audio/music/world-<n>-<name>.{ogg,mp3}. The winter market
 * plays "Julmarknad" and five classic Christmas melodies (Jonas, 2026-11-19:
 * "include them all and alternate between them").
 */
export const WORLD_EXTRA: Readonly<Record<number, readonly string[]>> = {
  5: ['jingle', 'deck', 'wish', 'staffan', 'ogran'],
};
for (const [w, names] of Object.entries(WORLD_EXTRA)) for (const name of names) MUSIC_FILES[`world-${w}-${name}`] = `world-${w}-${name}`;
/** Cascade steps: match-0 .. match-7 rise through a pentatonic scale. */
const MATCH_STEPS = 8;

/** Jingles that duck the music while they play (seconds). */
const DUCK: Partial<Record<Sfx, number>> = { win: 4.5, lose: 5.5, buildDone: 3.5, attack: 3, defended: 2.5 };

export interface AudioSettings { music: boolean; ambience: boolean; sfx: boolean }
export const audioSettings = writable<AudioSettings>({ music: true, ambience: true, sfx: true, ...load<Partial<AudioSettings>>('audio', {}) });
audioSettings.subscribe((s) => save('audio', s));

/**
 * Levels into the master chain. Jonas found everything quiet on the phone
 * (2026-11-19): the music played 20 dB under full level, and the effects
 * could not go higher without clipping when several sounded at once. The
 * master chain below (boost, compressor, soft clip) lets the whole mix sit
 * about 10 dB higher and never clip.
 */
const LEVEL = { music: 0.6, ambience: 0.45, sfx: 1.2 };
// out: the level of the finished mix. 0.26.3 was too loud on the phone, so Jonas
// asked for the top volume 20 % down (2026-11-19).
const MASTER = { boost: 3, headroom: 1.25, drive: 2, out: 0.8 };
const LATENCY = 'balanced' as const;
/**
 * Tracks that play louder than the common music level. The title tune plays
 * alone, with no game sounds around it, and Jonas found it very quiet in the
 * test app (2026-11-19), so it sits a little above the rest. "Julmarknad" is lifted to
 * sit level with the Christmas melodies it takes turns with.
 */
const TRACK_GAIN: Partial<Record<string, number>> = { title: 1.3, 'world-5': 1.3 };

let ctx: AudioContext | null = null;
let musicGain: GainNode, ambienceGain: GainNode, sfxGain: GainNode;
let master: AudioNode;
const buffers = new Map<string, Promise<AudioBuffer | null>>();
let ext = 'mp3';

let wantMusic: Music | null = null;
let wantAmbience = false;
let current: { name: Music; src: AudioBufferSourceNode; gain: GainNode } | null = null;
let ambienceSrc: AudioBufferSourceNode | null = null;

function pickFormat(): string {
  try {
    const a = document.createElement('audio');
    return a.canPlayType('audio/ogg; codecs="vorbis"') ? 'ogg' : 'mp3';
  } catch {
    return 'mp3';
  }
}

function buffer(path: string): Promise<AudioBuffer | null> {
  if (!ctx) return Promise.resolve(null);
  const url = `/audio/${path}.${ext}`;
  let p = buffers.get(url);
  if (!p) {
    const c = ctx;
    p = fetch(url)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then((b) => c.decodeAudioData(b))
      .catch(() => null); // missing file or offline: the game stays silent, never breaks
    buffers.set(url, p);
  }
  return p;
}

/**
 * Everything the game plays goes through here: a boost, a compressor that holds
 * the loud moments down, and a soft clip that keeps the sum under full level
 * however many sounds play at once (hard clipping crackles).
 */
function buildMaster(c: AudioContext): AudioNode {
  const boost = c.createGain();
  boost.gain.value = MASTER.boost;
  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -20;
  comp.knee.value = 8;
  comp.ratio.value = 10;
  comp.attack.value = 0.004;
  comp.release.value = 0.15;
  const pre = c.createGain();
  pre.gain.value = 1 / MASTER.headroom;
  const clip = c.createWaveShaper();
  const n = 2049;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) curve[i] = Math.tanh(((i / (n - 1)) * 2 - 1) * MASTER.drive) / Math.tanh(MASTER.drive);
  clip.curve = curve;
  clip.oversample = '4x';
  boost.connect(comp);
  comp.connect(pre);
  pre.connect(clip);
  const out = c.createGain();
  out.gain.value = MASTER.out;
  clip.connect(out);
  out.connect(c.destination);
  return boost;
}

/** Creates the audio graph once. A context made before any touch starts suspended
 * unless the browser allows autoplay for the site. */
function ensureContext(): AudioContext | null {
  if (ctx) return ctx;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  // 'balanced' gives the phone a larger audio buffer than the default, so a busy
  // moment on screen (a rocket going off) does not make the sound stutter.
  try {
    ctx = new AC({ latencyHint: LATENCY });
  } catch {
    ctx = new AC();
  }
  ext = pickFormat();
  master = buildMaster(ctx);
  musicGain = ctx.createGain();
  ambienceGain = ctx.createGain();
  sfxGain = ctx.createGain();
  for (const g of [musicGain, ambienceGain, sfxGain]) g.connect(master);
  applyVolumes();
  // Warm the small effects so the first match is not late.
  for (const f of [...Object.values(SFX_FILES), ...Array.from({ length: MATCH_STEPS }, (_, i) => `match-${i}`)]) void buffer(`sfx/${f}`);
  return ctx;
}

/** Called from the first touch or key press anywhere on the page. */
function unlock(): void {
  const c = ensureContext();
  if (!c) return;
  if (c.state === 'suspended' && document.visibilityState === 'visible') void c.resume();
  void syncMusic();
  void syncAmbience();
}

/**
 * Tries to start the music the moment the app opens, before any touch (Jonas,
 * 2026-11-18: the title music starts as soon as the title screen shows). Chrome
 * allows that for a site added to the home screen and for sites the player often
 * listens on; otherwise the context stays suspended with the music loaded and
 * ready, and the first touch anywhere starts it.
 */
function tryAutoplay(): void {
  if (document.visibilityState !== 'visible') return;
  const c = ensureContext();
  if (!c) return;
  void syncMusic();
  void syncAmbience();
  if (c.state === 'suspended') void c.resume().catch(() => undefined);
}

function applyVolumes(): void {
  if (!ctx) return;
  const s = get(audioSettings);
  const t = ctx.currentTime;
  musicGain.gain.setTargetAtTime(s.music ? LEVEL.music : 0, t, 0.15);
  ambienceGain.gain.setTargetAtTime(s.ambience ? LEVEL.ambience : 0, t, 0.15);
  sfxGain.gain.setTargetAtTime(s.sfx ? LEVEL.sfx : 0, t, 0.05);
}

function loop(buf: AudioBuffer, out: AudioNode): AudioBufferSourceNode {
  const src = ctx!.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  src.connect(out);
  src.start();
  return src;
}

async function syncMusic(): Promise<void> {
  if (!ctx || current?.name === wantMusic) return;
  const name = wantMusic;
  // Fade the old track out.
  if (current) {
    const old = current;
    current = null;
    old.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
    old.src.stop(ctx.currentTime + 2);
  }
  if (!name || !get(audioSettings).music) return;
  const buf = await buffer(`music/${MUSIC_FILES[name]}`);
  if (!buf || !ctx || wantMusic !== name || current) return;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(musicGain);
  gain.gain.setTargetAtTime(TRACK_GAIN[name] ?? 1, ctx.currentTime, 0.5);
  current = { name, src: loop(buf, gain), gain };
}

async function syncAmbience(): Promise<void> {
  if (!ctx) return;
  const want = wantAmbience && get(audioSettings).ambience;
  if (!want) {
    ambienceSrc?.stop();
    ambienceSrc = null;
    return;
  }
  if (ambienceSrc) return;
  const buf = await buffer('music/ambience-sea');
  if (!buf || ambienceSrc || !(wantAmbience && get(audioSettings).ambience)) return;
  ambienceSrc = loop(buf, ambienceGain);
}

/** Which music should play. null is silence. Safe to call before the first touch. */
export function setMusic(name: Music | null, ambience = false): void {
  wantMusic = name;
  wantAmbience = ambience;
  void syncMusic();
  void syncAmbience();
}

/**
 * The first world alternates between its two tunes from level to level
 * (Jonas, 2026-11-17); the later worlds each have their own (2026-11-19),
 * and a world with more than one takes them in turn.
 */
export function puzzleMusicFor(
  levelId: number,
  tunes: readonly number[] = WORLD_TUNES,
  extra: Readonly<Record<number, readonly string[]>> = WORLD_EXTRA,
): Music {
  const onRoad = (((levelId - 1) % 200) + 200) % 200;
  const world = Math.floor(onRoad / 40) + 1;
  if (tunes.includes(world)) {
    // The world's own tune on its first challenge, then its other tunes in turn.
    const more = extra[world] ?? [];
    const turn = (onRoad % 40) % (more.length + 1);
    return turn === 0 ? `world-${world}` : `world-${world}-${more[turn - 1]}`;
  }
  return levelId % 2 === 1 ? 'puzzle-brickor' : 'puzzle-gem-waltz';
}

function duck(seconds: number): void {
  if (!ctx || !get(audioSettings).music) return;
  const g = musicGain.gain;
  const t = ctx.currentTime;
  g.cancelScheduledValues(t);
  g.setTargetAtTime(LEVEL.music * 0.25, t, 0.05);
  g.setTargetAtTime(LEVEL.music, t + seconds, 0.4);
}

async function playFile(path: string, rate = 1): Promise<void> {
  if (!ctx || !get(audioSettings).sfx) return;
  const buf = await buffer(path);
  if (!buf || !ctx) return;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = rate;
  src.connect(sfxGain);
  src.start();
}

/**
 * The sound track of an ad film: its music, announcer and effects in one file.
 * The game's own music steps aside while it plays, as when a real ad takes
 * over the phone. Silent only when the player has turned off both music and
 * sound effects. Returns the function that stops it.
 */
export function playAd(id: string): () => void {
  const s = get(audioSettings);
  if (!ctx || (!s.sfx && !s.music)) return () => {};
  const audio = ctx;
  let src: AudioBufferSourceNode | null = null;
  let stopped = false;
  const g = musicGain.gain;
  g.cancelScheduledValues(audio.currentTime);
  g.setTargetAtTime(0, audio.currentTime, 0.08);
  void buffer(`ads/${id}`).then((buf) => {
    if (!buf || stopped) return;
    src = audio.createBufferSource();
    src.buffer = buf;
    // Its own gain: the track plays even when only one of music and effects is on.
    const out = audio.createGain();
    out.gain.value = LEVEL.sfx;
    out.connect(master);
    src.connect(out);
    src.start();
  });
  return () => {
    if (stopped) return;
    stopped = true;
    try { src?.stop(); } catch { /* already ended */ }
    g.cancelScheduledValues(audio.currentTime);
    g.setTargetAtTime(get(audioSettings).music ? LEVEL.music : 0, audio.currentTime, 0.4);
  };
}

const lastPlayed = new Map<Sfx, number>();
export function play(name: Sfx): void {
  if (!ctx || !get(audioSettings).sfx) return;
  // Two events for the same moment (a purchase logged twice) give one sound.
  const t = performance.now();
  if (t - (lastPlayed.get(name) ?? -1e9) < 150) return;
  lastPlayed.set(name, t);
  const d = DUCK[name];
  if (d) duck(d);
  void playFile(`sfx/${SFX_FILES[name]}`);
}

/** One line cleared. step counts the cascade (0 = the player's own move); each step is a note higher. */
export function playMatch(step: number): void {
  const i = Math.max(0, Math.min(MATCH_STEPS - 1, step));
  // Past the top of the scale, keep rising a little by playing faster.
  const rate = step >= MATCH_STEPS ? 1 + 0.06 * (step - MATCH_STEPS + 1) : 1;
  void playFile(`sfx/match-${i}`, Math.min(rate, 1.5));
}

let started = false;
/** Wires the autoplay unlock, button clicks and pause-when-hidden. Call once at start. */
export function initSound(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  const opts = { capture: true, passive: true } as const;
  window.addEventListener('pointerdown', unlock, opts);
  window.addEventListener('keydown', unlock, opts);
  tryAutoplay();
  // A soft click for every button in the menus (the board makes its own sounds).
  window.addEventListener('click', (e) => {
    const el = (e.target as Element | null)?.closest?.('button');
    if (el && !el.closest('[data-no-click-sound]')) play('click');
  }, { capture: true });
  document.addEventListener('visibilitychange', () => {
    if (!ctx) {
      tryAutoplay();
      return;
    }
    if (document.visibilityState === 'hidden') void ctx.suspend();
    else void ctx.resume();
  });
  audioSettings.subscribe(() => {
    applyVolumes();
    void syncMusic();
    void syncAmbience();
  });
}
