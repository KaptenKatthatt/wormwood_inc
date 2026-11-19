import Phaser from 'phaser';
import ART from './villageArt.json';

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
type Look = 'summer' | 'a' | 'b' | 'c';

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
    for (const b of Object.values(BUILDINGS)) for (const s of Object.values(b.stages)) this.load.image(`v-${s.file}`, DIR + s.file);
    for (const k of ['hus', 'torn'] as const) this.load.image(`v-bygge-${k}`, DIR + ART.bygge[k].file);
  }

  create(): void {
    this.draw();
    this.scale.on('resize', this.draw, this);
    this.registry.events.on('changedata-plots', this.draw, this);
    this.registry.events.on('changedata-look', this.draw, this);
    this.registry.events.on('changedata-layers', this.draw, this);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.draw, this);
      this.registry.events.off('changedata-plots', this.draw, this);
      this.registry.events.off('changedata-look', this.draw, this);
      this.registry.events.off('changedata-layers', this.draw, this);
    });
  }

  /** The texture of a village picture in a look; summer's until the winter one has loaded. */
  private tex(look: Look, file: string): { key: string; pad: number } {
    const key = `v-${look}-${file}`;
    return look !== 'summer' && this.textures.exists(key) ? { key, pad: WINTER_PAD } : { key: `v-${file}`, pad: 0 };
  }

  /** Loads what the look and the layers need and is not loaded yet; true when something is on its way. */
  private loadMissing(look: Look, layers: string[], damaged: string[]): boolean {
    const want: [string, string][] = layers.map((f) => [`v-xmas-${f}`, `${DIR}xmas/${f}`]);
    if (look === 'summer') for (const f of damaged) want.push([`v-damaged-${f}`, `${DIR}damaged/${f}`]);
    if (look !== 'summer') {
      want.push([`v-${look}-${BG.file}`, `${DIR}winter/${look}/${BG.file}`]);
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
        const st = b.stages[stageOf(p.level)];
        const whole = this.tex(look, st.file);
        const hurt = p.damaged && look === 'summer' && this.textures.exists(`v-damaged-${st.file}`);
        const t = hurt ? { key: `v-damaged-${st.file}`, pad: DAMAGED_PAD } : whole;
        const pic = this.add.image(ox + (st.x - t.pad) * s, oy + (st.y - t.pad) * s, t.key).setOrigin(0).setScale(s).setAlpha(p.building ? 0.55 : 1);
        if (p.damaged) {
          // The damaged picture where there is one; otherwise the building darkened. A red sign over it.
          if (!hurt) pic.setTint(0x8a7f78);
          // Over the damaged picture the sign is smaller and sits above the roof, so it does not hide the damage.
          const r = (hurt ? 10 : 13) * k;
          const cx = pic.x + pic.displayWidth / 2;
          const cy = hurt ? pic.y : pic.y + r;
          this.add.circle(cx, cy, r, 0x9c2a1e).setStrokeStyle(2 * k, 0xffffff);
          this.add.text(cx, cy, '!', { fontFamily: 'sans-serif', fontStyle: 'bold', fontSize: `${(hurt ? 14 : 18) * k}px`, color: '#ffffff' }).setOrigin(0.5);
        }
      }
      if (p.building) {
        const g = b.bygge;
        const pic = this.add.image(ox + g.x * s, oy + g.y * s, `v-bygge-${g.kind}`).setOrigin(0).setScale(s * g.scale);
        // how far the build has come, under the scaffold
        const bw = pic.displayWidth * 0.8;
        const bx = pic.x + (pic.displayWidth - bw) / 2;
        const by = pic.y + pic.displayHeight + 4 * k;
        this.add.rectangle(bx, by, bw, 6 * k, 0x000000, 0.45).setOrigin(0);
        this.add.rectangle(bx, by, bw * p.progress, 6 * k, 0xf2c230).setOrigin(0);
      }
    }
    // The Christmas decorations, in the background's pixels, over the buildings.
    for (const f of layers) if (this.textures.exists(`v-xmas-${f}`)) this.add.image(ox, oy, `v-xmas-${f}`).setOrigin(0).setScale(s);
  }
}
