import Phaser from 'phaser';
import ART from './villageArt.json';
import { cast, FENCE, FENCE_BACK, FENCERS_AT, frameOf, newFencing, newSmith, recast, SMITH_AT, SMITH_SPARK, step, stepFencing, stepSmith, type FigureKind, type Walker } from '../lib/villageLife';
import { play as playSound, playBell, warmBell } from '../lib/audio/sound';
import { BELL, quarterOf, sinceQuarter, strikesAt, strokes } from '../lib/churchBell';
import { sunIsDown } from '../lib/season';

export interface PlotView { id: string; name: string; level: number; building: boolean; progress: number; locked?: boolean; damaged?: boolean }

interface Stage { file: string; x: number; y: number; w: number; h: number }
interface ArtBuilding { anchor: [number, number]; bygge: { kind: 'hus' | 'torn'; scale: number; x: number; y: number }; stages: Record<'1' | '2' | '3', Stage> }
const BUILDINGS = ART.buildings as unknown as Record<string, ArtBuilding>;
const BG = ART.background;
const DIR = '/art/village/';
/** The winter pictures have this margin around them: drawn at x-PAD, y-PAD. */
const WINTER_PAD = 10;
/** The damaged pictures (in damaged/, same file names) have this margin for the rubble at the foot. */
const DAMAGED_PAD = 8;
/**
 * Where the damage sign sits on pictures that carry their own ground, so the top of the
 * picture is not the top of the building (the tip of the flagpole), or where a sign over the
 * picture would lie on the building behind (the big house under the mill). In the whole picture's pixels.
 */
const SIGN_AT: Record<string, [number, number]> = {
  'stugan-3.webp': [108, 34],
  'tornet_o-3.webp': [92, 42],
  'tornet_s-3.webp': [93, 38],
  'tornet_v-3.webp': [90, 32],
};
type Look = 'summer' | 'a' | 'b' | 'c';

/** The figures' pictures: four steps seen from the front, four from behind, at four times their size in the village. */
const PEOPLE: FigureKind[] = ['villager', 'soldier', 'priest'];
const CELL = { w: 160, h: 192, foot: 186, scale: 4 };
/** The fencers' sheet has wider cells (the blade reaches far left); the body stands at x 140. */
const FENCER = { w: 240, at: 140 };
/**
 * Kasernen's stage 2 has a yard wall in the south-east that the fencers stand right behind:
 * these parts of the picture (background pixels: x0, x1, from y) are drawn again over their feet.
 */
const YARD_WALL: [number, number, number][] = [[414, 428, 991], [428, 446, 977.5], [446, 495, 974.5]];
/** Drawing order: the background, then buildings and figures back to front, then signs and decorations. */
/**
 * The well in the crossroads (Jonas approved it on 2026-11-20): posts, a shingle roof, a windlass
 * and a bucket. It is smaller than the stone ring painted in the backgrounds, so a piece of
 * ground ('ground', one per look, with the well's shadow) is drawn over the old ring first.
 * In background pixels; the well's picture is four times as large. Figures north of 'front' go behind it.
 */
const WELL = { ground: [416, 758] as [number, number], at: [438.5, 739] as [number, number], scale: 4, front: 812 };
const wellFiles = (look: Look): { ground: string; well: string } => ({
  ground: `well/ground-${look}.webp`,
  well: look === 'summer' ? 'well/well-summer.webp' : look === 'c' ? 'well/well-snow-c.webp' : 'well/well-snow.webp',
});
const DEPTH = { ground: 1000, signs: 9000, decor: 9500 };
const TOWER_IDS = ['vakttornet', 'tornet_o', 'tornet_s', 'tornet_v'];

/** How far down the picture a building's front reaches: what stands lower is in front of it. */
function frontOf(id: string, stage: '1' | '2' | '3'): number {
  // The grandest towers' pictures carry a piece of ground and wall around the tower; the tower's foot is where the middle one's is.
  const st = BUILDINGS[id].stages[TOWER_IDS.includes(id) && stage === '3' ? '2' : stage];
  return st.y + st.h - 8;
}
/** How far in the village zooms. */
const MAX_ZOOM = 3;

/** Which picture a building level uses (Jonas, 2026-11-18): 1-3, 4-7 and 8-10. */
export function stageOf(level: number): '1' | '2' | '3' {
  return level >= 8 ? '3' : level >= 4 ? '2' : '1';
}

/**
 * The painted village on the headland (Jonas approved it 2026-11-18, wall B).
 * The background holds the empty plots; each building is its own picture laid
 * on its plot at the manifest's position, in the background's pixels, and it
 * changes look at levels 4 and 8. Svelte puts the plots in the registry as 'plots'.
 *
 * In December the village has three winter looks ('look' in the registry: a, b
 * or c; the same file names under winter/<look>/) and the Christmas decorations
 * are whole-village layers drawn over the buildings ('layers': file names in xmas/).
 * Those pictures are loaded the first time they are needed.
 *
 * A building damaged by a lost attack shows its damaged picture (Jonas approved
 * all 33 on 2026-11-19). They are painted for the summer village only: in a
 * winter look the building is darkened instead. Either way a red sign marks it.
 */
export class VillageScene extends Phaser.Scene {
  constructor() {
    super('village');
  }

  preload(): void {
    this.load.image('v-bg', DIR + BG.file);
    for (const f of Object.values(wellFiles('summer'))) this.load.image(`v-${f}`, DIR + f);
    for (const b of Object.values(BUILDINGS)) for (const s of Object.values(b.stages)) this.load.image(`v-${s.file}`, DIR + s.file);
    for (const k of ['hus', 'torn'] as const) this.load.image(`v-bygge-${k}`, DIR + ART.bygge[k].file);
    this.load.spritesheet('v-people-fencer', `${DIR}people/fencer.webp`, { frameWidth: FENCER.w, frameHeight: CELL.h });
    this.load.spritesheet('v-people-smith', `${DIR}people/smith.webp`, { frameWidth: CELL.w, frameHeight: CELL.h });
    for (const k of PEOPLE) this.load.spritesheet(`v-people-${k}`, `${DIR}people/${k}.webp`, { frameWidth: CELL.w, frameHeight: CELL.h });
  }

  // Life in the village (Jonas approved the figures 2026-11-20): who walks follows the buildings.
  private walkers: Walker[] = [];
  private figures: { pic: Phaser.GameObjects.Image; shadow: Phaser.GameObjects.Ellipse }[] = [];
  private place = { s: 1, ox: 0, oy: 0 };
  /** Pictures of grand towers with ground around them: a figure beside the tower itself is drawn over the picture. */
  private aprons: { x0: number; x1: number; y0: number; body0: number; body1: number; front: number }[] = [];
  private readonly still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // The smith at the anvil (Jonas approved him 2026-11-20): there while Smedjan stands whole.
  private smith = newSmith();
  private smithPic: Phaser.GameObjects.Image | null = null;
  private smithAt: [number, number] = [0, 0];
  private sparks: { dot: Phaser.GameObjects.Rectangle; x: number; y: number; vx: number; vy: number; life: number }[] = [];

  // The fencers in Kasernen's yard (Jonas approved them 2026-11-20): there while Kasernen stands whole.
  private fencing = newFencing();
  private fencers: { pic: Phaser.GameObjects.Image; shadow: Phaser.GameObjects.Ellipse; at: [number, number]; left: boolean }[] = [];

  private placeFencers(): void {
    const { s, ox, oy } = this.place;
    for (const f of this.fencers) {
      const frame = f.left ? this.fencing.a : this.fencing.b;
      const back = frame === FENCE.parry ? FENCE_BACK : 0;
      const x = f.at[0] + (f.left ? -back : back);
      f.pic.setFrame(frame).setPosition(ox + x * s, oy + f.at[1] * s);
      f.shadow.setPosition(ox + (x + 2) * s, oy + (f.at[1] - 0.5) * s);
    }
  }

  private stepSparks(dt: number): void {
    const { s, ox, oy } = this.place;
    for (const p of this.sparks) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 60 * dt; p.life -= dt;
      p.dot.setPosition(ox + p.x * s, oy + p.y * s).setAlpha(Math.min(1, Math.max(0, p.life * 5)));
      if (p.life <= 0) p.dot.destroy();
    }
    this.sparks = this.sparks.filter((p) => p.life > 0);
  }

  private stepSmithy(dt: number): void {
    this.stepSparks(dt);
    const pic = this.smithPic;
    if (!pic) return;
    const hit = stepSmith(this.smith, dt);
    pic.setFrame(this.smith.frame);
    if (!hit) return;
    playSound('anvil');
    const { s } = this.place;
    const size = Math.max(1, 0.9 * s);
    for (let k = 0; k < 7; k++) {
      const dot = this.add.rectangle(0, 0, size, size, Phaser.Display.Color.GetColor(255, 170 + Math.floor(Math.random() * 70), 60)).setOrigin(0).setDepth(pic.depth + 0.1);
      this.sparks.push({ dot, x: this.smithAt[0] + SMITH_SPARK[0], y: this.smithAt[1] + SMITH_SPARK[1], vx: -22 + Math.random() * 30, vy: -34 + Math.random() * 22, life: 0.18 + Math.random() * 0.2 });
    }
    this.stepSparks(0);
  }

  private levels(): Record<string, number> {
    const plots: PlotView[] = this.registry.get('plots') ?? [];
    return Object.fromEntries(plots.map((p) => [p.id, p.locked ? 0 : p.level]));
  }

  private placeFigure(n: number): void {
    const w = this.walkers[n];
    const f = this.figures[n];
    if (!w || !f) return;
    const { s, ox, oy } = this.place;
    let depth = w.y;
    for (const a of this.aprons) {
      const beside = w.x < a.body0 - 4 || w.x > a.body1 + 4;
      if (beside && w.x >= a.x0 && w.x <= a.x1 && w.y >= a.y0 && w.y < a.front) depth = Math.max(depth, a.front + 1);
    }
    f.pic.setPosition(ox + w.x * s, oy + w.y * s).setFrame((w.front ? 0 : 4) + frameOf(w)).setFlipX(w.flip).setDepth(DEPTH.ground + depth);
    f.shadow.setPosition(ox + (w.x + 3) * s, oy + (w.y - 0.5) * s).setDepth(DEPTH.ground + depth - 0.01);
  }

  /**
   * Where the speech bubble points (Jonas chose bubble A on 2026-11-20): just
   * over the head of the first villager, in CSS pixels of the canvas, or null
   * when no villager is there. Sent while a villager is saying something.
   */
  private lastSpeaker = '';
  private tellSpeaker(): void {
    let at: { x: number; y: number } | null = null;
    const n = this.registry.get('speaking') ? this.walkers.findIndex((w) => w.kind === 'villager') : -1;
    if (n >= 0) {
      const w = this.walkers[n];
      const { s, ox, oy } = this.place;
      const cam = this.cameras.main;
      const k = this.registry.get('dpr') ?? 1;
      const sx = (ox + w.x * s - cam.scrollX - cam.width / 2) * cam.zoom + cam.width / 2;
      const sy = (oy + (w.y - 30) * s - cam.scrollY - cam.height / 2) * cam.zoom + cam.height / 2;
      at = { x: Math.round(sx / k), y: Math.round(sy / k) };
    }
    const key = at ? `${at.x},${at.y}` : '';
    if (key === this.lastSpeaker) return;
    this.lastSpeaker = key;
    this.game.events.emit('village-speaker', at);
  }

  // The chapel bell (Jonas approved it 2026-11-20): every quarter by the real clock, while Kapellet stands.
  private bellQuarter = quarterOf(Date.now());
  private bellTimers: ReturnType<typeof setTimeout>[] = [];
  private ringBell(): void {
    const now = Date.now();
    const q = quarterOf(now);
    if (q === this.bellQuarter) return;
    this.bellQuarter = q;
    // Only at the quarter itself: coming back to the game later does not ring late.
    if (sinceQuarter(now) > 5000 || !(this.levels().kapellet > 0)) return;
    const { quarters, hours } = strikesAt(now);
    const night = sunIsDown(now);
    for (const st of strokes(quarters, hours)) {
      const bell = st.hour ? BELL.hour : BELL.quarter;
      this.bellTimers.push(setTimeout(() => playBell(bell.rate, bell.level, night), st.at * 1000));
    }
  }

  update(_time: number, delta: number): void {
    this.tellSpeaker();
    this.ringBell();
    if (this.still) return; // reduced motion: the figures stand where they are
    const dt = Math.min(0.1, delta / 1000);
    const levels = this.levels();
    for (let n = 0; n < this.walkers.length; n++) { step(this.walkers[n], dt, levels); this.placeFigure(n); }
    this.stepSmithy(dt);
    if (this.fencers.length) { stepFencing(this.fencing, dt); this.placeFencers(); }
  }

  /**
   * Pinch to zoom, one finger to move the zoomed picture, the mouse wheel on a
   * computer (Jonas, 2026-11-20). The camera does the zooming, so everything
   * drawn keeps its place. The scene says 'village-zoomed' the first time.
   */
  private zoomTo(z: number, px: number, py: number): void {
    const cam = this.cameras.main;
    const before = cam.zoom;
    const next = Math.min(MAX_ZOOM, Math.max(1, z));
    if (next === before) return;
    // The point under the fingers stays under the fingers.
    const wx = cam.scrollX + cam.width / 2 + (px - cam.width / 2) / before;
    const wy = cam.scrollY + cam.height / 2 + (py - cam.height / 2) / before;
    cam.setZoom(next);
    cam.setScroll(wx - cam.width / 2 - (px - cam.width / 2) / next, wy - cam.height / 2 - (py - cam.height / 2) / next);
    if (next > 1) this.game.events.emit('village-zoomed');
  }

  private wireZoom(): void {
    const canvas = this.game.canvas;
    const cam = this.cameras.main;
    const k = (): number => canvas.width / Math.max(1, canvas.getBoundingClientRect().width); // CSS pixels to canvas pixels
    const at = (e: { clientX: number; clientY: number }): [number, number] => {
      const r = canvas.getBoundingClientRect();
      return [(e.clientX - r.left) * k(), (e.clientY - r.top) * k()];
    };
    const fingers = new Map<number, [number, number]>();
    let gap = 0;
    let startZoom = 1;
    const spread = (): number => { const [a, b] = [...fingers.values()]; return Math.hypot(a[0] - b[0], a[1] - b[1]); };
    const down = (e: PointerEvent): void => {
      fingers.set(e.pointerId, at(e));
      if (fingers.size === 2) { gap = spread(); startZoom = cam.zoom; }
    };
    const move = (e: PointerEvent): void => {
      const was = fingers.get(e.pointerId);
      if (!was) return;
      const now = at(e);
      fingers.set(e.pointerId, now);
      if (fingers.size === 2 && gap > 0) {
        const [a, b] = [...fingers.values()];
        this.zoomTo(startZoom * (spread() / gap), (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
      } else if (fingers.size === 1 && cam.zoom > 1) {
        cam.setScroll(cam.scrollX - (now[0] - was[0]) / cam.zoom, cam.scrollY - (now[1] - was[1]) / cam.zoom);
      }
    };
    const up = (e: PointerEvent): void => { fingers.delete(e.pointerId); gap = 0; };
    const wheel = (e: WheelEvent): void => {
      e.preventDefault();
      const [x, y] = at(e);
      this.zoomTo(cam.zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15), x, y);
    };
    const touch = canvas.style.touchAction;
    canvas.style.touchAction = 'none'; // the pinch is ours, not the browser's
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('pointerleave', up);
    canvas.addEventListener('wheel', wheel, { passive: false });
    this.events.once('shutdown', () => {
      canvas.style.touchAction = touch;
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', up);
      canvas.removeEventListener('pointerleave', up);
      canvas.removeEventListener('wheel', wheel);
    });
  }

  create(): void {
    warmBell();
    // Leaving the village silences the strokes that have not come yet.
    const hush = () => { for (const t of this.bellTimers) clearTimeout(t); this.bellTimers = []; };
    this.events.once('shutdown', hush);
    this.events.once('destroy', hush);
    this.wireZoom();
    this.draw();
    this.scale.on('resize', this.draw, this);
    this.registry.events.on('changedata-plots', this.draw, this);
    this.registry.events.on('changedata-look', this.draw, this);
    this.registry.events.on('changedata-layers', this.draw, this);
    this.registry.events.on('changedata-soldiers', this.draw, this);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.draw, this);
      this.registry.events.off('changedata-plots', this.draw, this);
      this.registry.events.off('changedata-look', this.draw, this);
      this.registry.events.off('changedata-layers', this.draw, this);
      this.registry.events.off('changedata-soldiers', this.draw, this);
    });
  }

  /** The texture of a village picture in a look; summer's until the winter one has loaded. */
  private tex(look: Look, file: string): { key: string; pad: number } {
    const key = `v-${look}-${file}`;
    return look !== 'summer' && this.textures.exists(key) ? { key, pad: WINTER_PAD } : { key: `v-${file}`, pad: 0 };
  }

  /** The damaged picture of a building in a look (damaged/ for summer, damaged/winter/<look>/ for winter) */
  private damagedTex(look: Look, file: string): { key: string; url: string; pad: number } {
    if (look === 'summer') return { key: `v-damaged-${file}`, url: `${DIR}damaged/${file}`, pad: DAMAGED_PAD };
    return { key: `v-damaged-${look}-${file}`, url: `${DIR}damaged/winter/${look}/${file}`, pad: WINTER_PAD };
  }

  /** Loads what the look and the layers need and is not loaded yet; true when something is on its way. */
  private loadMissing(look: Look, layers: string[], damaged: string[]): boolean {
    const want: [string, string][] = layers.map((f) => [`v-xmas-${f}`, `${DIR}xmas/${f}`]);
    for (const f of damaged) {
      const d = this.damagedTex(look, f);
      if (d) want.push([d.key, d.url]);
    }
    if (look !== 'summer') {
      want.push([`v-${look}-${BG.file}`, `${DIR}winter/${look}/${BG.file}`]);
      for (const f of Object.values(wellFiles(look))) want.push([`v-${f}`, DIR + f]);
      for (const b of Object.values(BUILDINGS)) for (const st of Object.values(b.stages)) want.push([`v-${look}-${st.file}`, `${DIR}winter/${look}/${st.file}`]);
    }
    const missing = want.filter(([key]) => !this.textures.exists(key) && !this.asked.has(key));
    if (missing.length === 0) return false;
    for (const [key, url] of missing) { this.asked.add(key); this.load.image(key, url); }
    this.load.once('complete', this.draw, this);
    this.load.start();
    return true;
  }
  private asked = new Set<string>();

  private draw(): void {
    const { width, height } = this.scale;
    this.children.removeAll(true);
    // The zoomed camera never shows anything outside the picture.
    this.cameras.main.setBounds(0, 0, width, height);
    // The whole width, so the towers at the edges show; vertically centred on
    // the village (it lies between y 380 and 1100) and always covering the canvas.
    const s = Math.max(width / BG.w, height / BG.h);
    const ox = (width - BG.w * s) / 2;
    const centre = 740;
    const oy = Math.min(0, Math.max(height - BG.h * s, height / 2 - centre * s));
    const look: Look = this.registry.get('look') ?? 'summer';
    const layers: string[] = this.registry.get('layers') ?? [];
    const bg = look !== 'summer' && this.textures.exists(`v-${look}-${BG.file}`) ? `v-${look}-${BG.file}` : 'v-bg';
    this.add.image(ox, oy, bg).setOrigin(0).setScale(s);
    // The well, in the look the background is drawn in (summer's until the winter pictures have loaded).
    const wf = wellFiles(bg === 'v-bg' ? 'summer' : look);
    const well = [wf.ground, wf.well].every((f) => this.textures.exists(`v-${f}`)) ? wf : wellFiles('summer');
    this.add.image(ox + WELL.ground[0] * s, oy + WELL.ground[1] * s, `v-${well.ground}`).setOrigin(0).setScale(s).setDepth(1);
    this.add.image(ox + WELL.at[0] * s, oy + WELL.at[1] * s, `v-${well.well}`).setOrigin(0).setScale(s / WELL.scale).setDepth(DEPTH.ground + WELL.front);
    this.place = { s, ox, oy };
    this.aprons = [];
    this.smithPic = null;
    this.fencers = [];
    this.sparks = []; // removeAll took the dots

    const plots: PlotView[] = this.registry.get('plots') ?? [];
    const byId = new Map(plots.map((p) => [p.id, p]));
    const broken = plots.filter((p) => p.damaged && !p.locked && p.level > 0 && BUILDINGS[p.id]).map((p) => BUILDINGS[p.id].stages[stageOf(p.level)].file);
    this.loadMissing(look, layers, broken);
    // Back to front, so nearer buildings cover the ones behind.
    const order = Object.keys(BUILDINGS).sort((a, b) => BUILDINGS[a].anchor[1] - BUILDINGS[b].anchor[1]);
    const k = this.registry.get('dpr') ?? 1;
    for (const id of order) {
      const p = byId.get(id);
      if (!p || p.locked) continue; // a locked or unknown plot is just the background
      const b = BUILDINGS[id];
      if (p.level > 0) {
        const stage = stageOf(p.level);
        const st = b.stages[stage];
        const front = DEPTH.ground + frontOf(id, stage);
        if (stage === '3' && TOWER_IDS.includes(id)) {
          const body = b.stages['2'];
          this.aprons.push({ x0: st.x, x1: st.x + st.w, y0: st.y, body0: body.x, body1: body.x + body.w, front: front - DEPTH.ground });
        }
        const whole = this.tex(look, st.file);
        const d = p.damaged ? this.damagedTex(look, st.file) : null;
        const hurt = !!d && this.textures.exists(d.key);
        const t = d && hurt ? { key: d.key, pad: d.pad } : whole;
        const pic = this.add.image(ox + (st.x - t.pad) * s, oy + (st.y - t.pad) * s, t.key).setOrigin(0).setScale(s).setAlpha(p.building ? 0.55 : 1).setDepth(front);
        if (id === 'smedjan' && !p.damaged && !p.building) {
          // The smith stands inside the open front, over the picture; a walker in front still covers him.
          this.smithAt = SMITH_AT[stage];
          this.smithPic = this.add.image(ox + this.smithAt[0] * s, oy + this.smithAt[1] * s, 'v-people-smith', this.smith.frame)
            .setOrigin(0.5, CELL.foot / CELL.h).setScale(s / CELL.scale).setDepth(front + 0.5);
        }
        if (id === 'kasernen' && !p.damaged && !p.building) {
          // The fencers stand in the yard, over the picture; the left one is the same sheet mirrored.
          const at = FENCERS_AT[stage];
          for (const left of [true, false]) {
            const shadow = this.add.ellipse(0, 0, 12 * s, 4.4 * s, 0x14190a, 0.3).setDepth(front + 0.4);
            const fp = this.add.image(0, 0, 'v-people-fencer', FENCE.low).setFlipX(left)
              .setOrigin((left ? FENCER.w - FENCER.at : FENCER.at) / FENCER.w, CELL.foot / CELL.h).setScale(s / CELL.scale).setDepth(front + 0.5);
            this.fencers.push({ pic: fp, shadow, at: left ? at.a : at.b, left });
          }
          this.placeFencers();
          if (stage === '2') {
            // The yard wall in front of them covers their feet.
            const kx = pic.width / (st.w + 2 * t.pad);
            const ky = pic.height / (st.h + 2 * t.pad);
            for (const [x0, x1, y0] of YARD_WALL) {
              const cx = (x0 - st.x + t.pad) * kx;
              const cy = (y0 - st.y + t.pad) * ky;
              this.add.image(pic.x, pic.y, t.key).setOrigin(0).setScale(s).setCrop(cx, cy, (x1 - x0) * kx, pic.height - cy).setDepth(front + 0.6);
            }
          }
        }
        if (p.damaged) {
          // The damaged picture where there is one; otherwise the building darkened. A red sign over it.
          if (!hurt) pic.setTint(0x8a7f78);
          // Over the damaged picture the sign is smaller and sits above the roof, so it does not hide the damage.
          const r = (hurt ? 10 : 13) * k;
          const at = SIGN_AT[st.file];
          // Kept inside the screen, so a tower at the edge does not get half a sign.
          const cx = Math.min(width - r - 3 * k, Math.max(r + 3 * k, at ? ox + (st.x + at[0]) * s : pic.x + pic.displayWidth / 2));
          const cy = at ? oy + (st.y + at[1]) * s - r : hurt ? pic.y : pic.y + r;
          this.add.circle(cx, cy, r, 0x9c2a1e).setStrokeStyle(2 * k, 0xffffff).setDepth(DEPTH.signs);
          this.add.text(cx, cy, '!', { fontFamily: 'sans-serif', fontStyle: 'bold', fontSize: `${(hurt ? 14 : 18) * k}px`, color: '#ffffff' }).setOrigin(0.5).setDepth(DEPTH.signs);
        }
      }
      if (p.building) {
        const g = b.bygge;
        const pic = this.add.image(ox + g.x * s, oy + g.y * s, `v-bygge-${g.kind}`).setOrigin(0).setScale(s * g.scale).setDepth(DEPTH.signs);
        // how far the build has come, under the scaffold
        const bw = pic.displayWidth * 0.8;
        const bx = pic.x + (pic.displayWidth - bw) / 2;
        const by = pic.y + pic.displayHeight + 4 * k;
        this.add.rectangle(bx, by, bw, 6 * k, 0x000000, 0.45).setOrigin(0).setDepth(DEPTH.signs);
        this.add.rectangle(bx, by, bw * p.progress, 6 * k, 0xf2c230).setOrigin(0).setDepth(DEPTH.signs);
      }
    }
    // The Christmas decorations, in the background's pixels, over the buildings.
    for (const f of layers) if (this.textures.exists(`v-xmas-${f}`)) this.add.image(ox, oy, `v-xmas-${f}`).setOrigin(0).setScale(s).setDepth(DEPTH.decor);

    // The figures: the same walkers go on where they were; new ones come when something is built.
    const levels = this.levels();
    this.walkers = recast(this.walkers, cast(levels, this.registry.get('soldiers') ?? 0), levels);
    this.figures = this.walkers.map((w) => ({
      shadow: this.add.ellipse(0, 0, 12 * s, 4.8 * s, 0x14190a, 0.3),
      pic: this.add.image(0, 0, `v-people-${w.kind}`, 1).setOrigin(0.5, CELL.foot / CELL.h).setScale(s / CELL.scale),
    }));
    for (let n = 0; n < this.walkers.length; n++) this.placeFigure(n);
  }
}
