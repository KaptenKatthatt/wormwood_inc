/**
 * Music and sound effects (Jonas picked every sound on 2026-11-17, see
 * public/audio/CREDITS.md and docs on the listening page).
 *
 * - Web Audio, one AudioContext. Browsers only allow sound after the player
 *   has touched the page, so nothing is created or played before the first
 *   pointerdown/keydown (autoplay rules). Music that was asked for earlier
 *   starts at that moment.
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
  | 'buildStart' | 'buildDone' | 'attack' | 'defended' | 'notify' | 'click';
export type Music = 'title' | 'village' | 'puzzle-brickor' | 'puzzle-gem-waltz';

const SFX_FILES: Record<Sfx, string> = {
  swap: 'swap', invalid: 'invalid', win: 'win', lose: 'lose', near: 'near', purchase: 'purchase',
  coins: 'coins', gems: 'gems', buildStart: 'build-start', buildDone: 'build-done', attack: 'attack',
  defended: 'defended', notify: 'notify', click: 'click',
};
const MUSIC_FILES: Record<Music, string> = {
  title: 'title-solsken', village: 'village-udden', 'puzzle-brickor': 'puzzle-brickor', 'puzzle-gem-waltz': 'puzzle-gem-waltz',
};
/** Cascade steps: match-0 .. match-7 rise through a pentatonic scale. */
const MATCH_STEPS = 8;

/** Jingles that duck the music while they play (seconds). */
const DUCK: Partial<Record<Sfx, number>> = { win: 4.5, lose: 5.5, buildDone: 3.5, attack: 3, defended: 2.5 };

export interface AudioSettings { music: boolean; ambience: boolean; sfx: boolean }
export const audioSettings = writable<AudioSettings>({ music: true, ambience: true, sfx: true, ...load<Partial<AudioSettings>>('audio', {}) });
audioSettings.subscribe((s) => save('audio', s));

const LEVEL = { music: 0.45, ambience: 0.35, sfx: 0.8 };

let ctx: AudioContext | null = null;
let musicGain: GainNode, ambienceGain: GainNode, sfxGain: GainNode;
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

/** Called from the first touch or key press. */
function unlock(): void {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    ext = pickFormat();
    musicGain = ctx.createGain();
    ambienceGain = ctx.createGain();
    sfxGain = ctx.createGain();
    for (const g of [musicGain, ambienceGain, sfxGain]) g.connect(ctx.destination);
    applyVolumes();
    // Warm the small effects so the first match is not late.
    for (const f of [...Object.values(SFX_FILES), ...Array.from({ length: MATCH_STEPS }, (_, i) => `match-${i}`)]) void buffer(`sfx/${f}`);
  }
  if (ctx.state === 'suspended' && document.visibilityState === 'visible') void ctx.resume();
  void syncMusic();
  void syncAmbience();
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
  gain.gain.setTargetAtTime(1, ctx.currentTime, 0.5);
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

/** The puzzle alternates between its two tunes from level to level (Jonas, 2026-11-17). */
export function puzzleMusicFor(levelId: number): Music {
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
  // A soft click for every button in the menus (the board makes its own sounds).
  window.addEventListener('click', (e) => {
    const el = (e.target as Element | null)?.closest?.('button');
    if (el && !el.closest('[data-no-click-sound]')) play('click');
  }, { capture: true });
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.visibilityState === 'hidden') void ctx.suspend();
    else void ctx.resume();
  });
  audioSettings.subscribe(() => {
    applyVolumes();
    void syncMusic();
    void syncAmbience();
  });
}
