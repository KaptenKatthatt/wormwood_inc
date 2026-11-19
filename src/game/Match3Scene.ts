import { play as playSound, playMatch } from '../lib/audio/sound';
import Phaser from 'phaser';
import { BLOCK_HITS, BOMB, HOBAL, KLAPPER, MALM, ROCKET_BOTH_WAYS, STEN, STOCK, TANG, isBlock, isFree, isRocket, type Cell, type Rocket, type Match3, type Special, type Step } from '../lib/match3/engine';
import { REGIONS, regionOf, type Obstacle, type Region } from '../lib/match3/levels';
import { DEEP as DEEP0, FRAME as FRAME0 } from './palette';

/** The obstacle pictures (Jonas approved them 2026-11-18). */
// The skerries' cover is a fishing net (Jonas, 2026-11-18); its obstacle id stays 'is'.
const PICTURE: Record<string, string> = { is: 'fisknat', 'is-sprucken': 'fisknat-trasigt' };
const OBSTACLES = ['is', 'is-sprucken', 'sno', 'sno-tunn', 'mossa', 'tang', 'sten', 'stock', 'lera', 'hobal', 'kol', 'malm', 'nat', 'klapper', 'frost', 'snogubbe', 'sand'] as const;
/**
 * Cracks across a hard block, as lines of points in a -1..1 square: first a
 * crack from top to bottom, then its branches. Ore (two hits) shows them all
 * after its first hit; beach stones (three hits) get the trunk first.
 */
const CRACKS: [number, number][][] = [
  [[-0.12, -0.82], [0.06, -0.42], [-0.2, -0.08], [0.12, 0.3], [-0.04, 0.8]],
  [[0.06, -0.42], [0.42, -0.26], [0.7, -0.44]],
  [[-0.2, -0.08], [-0.52, 0.08], [-0.76, 0.36]],
  [[0.12, 0.3], [0.46, 0.44], [0.62, 0.72]],
  [[-0.52, 0.08], [-0.6, -0.3]],
  [[0.42, -0.26], [0.5, 0.06]],
];
/** Blocks of stone: they crack and break with a sound of their own. */
const HARD = new Set([STEN, MALM, KLAPPER]);
const BLOCK_PICTURE: Record<number, string> = { [TANG]: 'tang', [STEN]: 'sten', [STOCK]: 'stock', [MALM]: 'malm', [KLAPPER]: 'klapper', [HOBAL]: 'hobal' };

type Tile = Phaser.GameObjects.Container;

/**
 * Draws a Match3 board and animates its steps. Svelte puts the engine in the
 * registry as 'match3'; the scene tells Svelte about each finished move with
 * the game event 'match3:moved'. Tap two neighbours or swipe to swap; a tap on
 * a rocket, fireworks or the pearl sets it off.
 */
export class Match3Scene extends Phaser.Scene {
  private engine?: Match3;
  private tiles: (Tile | null)[][] = [];
  private iceGfx: (Phaser.GameObjects.Container | null)[][] = [];
  private mossGfx: (Phaser.GameObjects.Image | null)[][] = [];
  private region: Region = REGIONS[0];
  /** The frame colours of this region's board. */
  private frame = FRAME0;
  private deep = DEEP0;
  private introArrow: Phaser.GameObjects.GameObject[] = [];
  private cell = 48;
  /** Device pixels per CSS pixel; the board is drawn in device pixels. */
  private k = 1;
  private origin = { x: 0, y: 0 };
  private selected: Cell | null = null;
  private selBox?: Phaser.GameObjects.Rectangle;
  private busy = false;
  private down: { cell: Cell; x: number; y: number } | null = null;
  private speed = 1;
  private hintTweens: Phaser.GameObjects.GameObject[] = [];
  private cursor: Cell = { r: 0, c: 0 };
  private cursorBox?: Phaser.GameObjects.Rectangle;
  private usingKeys = false;
  /** Help after a while without a move, as in the big puzzle games (Jonas, 2026-11-17). */
  private idleTimer?: Phaser.Time.TimerEvent;
  private idleTweens: Phaser.Tweens.Tween[] = [];
  private idleTiles: Tile[] = [];
  static readonly IDLE_MS = 5000;

  constructor() {
    super('match3');
  }

  preload(): void {
    for (const region of REGIONS) for (const name of region.tiles) this.load.image(`tile-${name}`, `/art/tiles/${name}.${region.ext}`);
    for (const name of ['raket', 'fyrverkeri', 'parla']) this.load.image(`sp-${name}`, `/art/tiles/${name}.png`);
    for (const name of OBSTACLES) this.load.image(`ob-${name}`, `/art/tiles/${PICTURE[name] ?? name}.webp`);
  }

  create(): void {
    this.speed = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0.35 : 1;
    if (!this.textures.exists('spark')) {
      // a soft round spark and a four-pointed star for the effects
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      for (let i = 8; i > 0; i--) g.fillStyle(0xffffff, i === 1 ? 1 : 0.12).fillCircle(16, 16, i * 2);
      g.generateTexture('spark', 32, 32);
      g.clear();
      g.fillStyle(0xffffff, 1).fillTriangle(16, 0, 20, 16, 12, 16).fillTriangle(16, 32, 20, 16, 12, 16).fillTriangle(0, 16, 16, 12, 16, 20).fillTriangle(32, 16, 16, 12, 16, 20);
      g.generateTexture('star4', 32, 32);
      g.destroy();
    }
    this.engine = this.registry.get('match3');
    this.build();
    this.scale.on('resize', this.build, this);
    this.registry.events.on('changedata-match3', this.onEngine, this);
    this.registry.events.on('changedata-hint', this.drawHint, this);
    // Svelte sets 'mixed' to a new number after it has shuffled the engine.
    this.registry.events.on('changedata-mixed', this.mixBoard, this);
    this.registry.events.on('changedata-intro', this.drawIntro, this);
    this.events.once('shutdown', () => {
      this.registry.events.off('changedata-intro', this.drawIntro, this);
      this.scale.off('resize', this.build, this);
      this.registry.events.off('changedata-match3', this.onEngine, this);
      this.registry.events.off('changedata-hint', this.drawHint, this);
      this.registry.events.off('changedata-mixed', this.mixBoard, this);
    });
    // A plain DOM listener on the board element: Phaser's keyboard queue can
    // deliver one quick press twice, which moved the frame two cells.
    const host = this.game.canvas.parentElement;
    const onKey = (e: KeyboardEvent) => this.onKey(e);
    host?.addEventListener('keydown', onKey);
    this.events.once('shutdown', () => host?.removeEventListener('keydown', onKey));
    this.resetIdle();
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.resetIdle();
      const cell = this.cellAt(p.x, p.y);
      if (cell) this.down = { cell, x: p.x, y: p.y };
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      const d = this.down;
      this.down = null;
      if (!d) return;
      const dx = p.x - d.x;
      const dy = p.y - d.y;
      if (Math.hypot(dx, dy) > this.cell * 0.35) {
        const to = Math.abs(dx) > Math.abs(dy) ? { r: d.cell.r, c: d.cell.c + Math.sign(dx) } : { r: d.cell.r + Math.sign(dy), c: d.cell.c };
        this.select(null);
        void this.swap(d.cell, to);
      } else {
        this.tap(d.cell);
      }
    });
  }

  private onEngine(_parent: unknown, value: Match3): void {
    this.engine = value;
    this.select(null);
    this.build();
  }

  private cellAt(x: number, y: number): Cell | null {
    const c = Math.floor((x - this.origin.x) / this.cell);
    const r = Math.floor((y - this.origin.y) / this.cell);
    const e = this.engine;
    if (!e || r < 0 || c < 0 || r >= e.rows || c >= e.cols) return null;
    return { r, c };
  }

  private pos(cell: Cell): { x: number; y: number } {
    return { x: this.origin.x + cell.c * this.cell + this.cell / 2, y: this.origin.y + cell.r * this.cell + this.cell / 2 };
  }

  private build(): void {
    this.resetIdle();
    this.children.removeAll(true);
    this.selBox = undefined;
    const { width, height } = this.scale;
    const e = this.engine;
    if (!e) return;
    // The approved look: a wooden frame in the region's colour (falu red at sea),
    // a white list and light wooden cells.
    this.region = regionOf(e.level.id);
    this.frame = this.region.frame;
    this.deep = this.region.dark;
    const FRAME = this.frame;
    const DEEP = this.deep;
    const k = (this.k = this.registry.get('dpr') ?? 1);
    const pad = 16 * k;
    this.cell = Math.floor(Math.min((width - 2 * pad) / e.cols, (height - 2 * pad) / e.rows));
    const bw = this.cell * e.cols;
    const bh = this.cell * e.rows;
    this.origin = { x: Math.round((width - bw) / 2), y: Math.round((height - bh) / 2) };
    const { x: ox, y: oy } = this.origin;
    const g = this.add.graphics();
    g.fillStyle(DEEP, 1).fillRoundedRect(ox - 13 * k, oy - 9 * k, bw + 26 * k, bh + 26 * k, 14 * k);
    g.fillStyle(FRAME, 1).fillRoundedRect(ox - 13 * k, oy - 13 * k, bw + 26 * k, bh + 26 * k, 14 * k);
    g.lineStyle(k, 0x000000, 0.08);
    for (let x = ox - 10 * k; x < ox + bw + 12 * k; x += 9 * k) g.lineBetween(x, oy - 13 * k, x + 3 * k, oy + bh + 13 * k);
    g.fillStyle(0xf6efe2, 1).fillRoundedRect(ox - 3 * k, oy - 3 * k, bw + 6 * k, bh + 6 * k, 6 * k);
    g.fillStyle(0xd9d0c0, 1).fillRect(ox, oy, bw, bh);
    for (let r = 0; r < e.rows; r++) {
      for (let c = 0; c < e.cols; c++) {
        if ((r + c) % 2 === 0) g.fillStyle(0xffffff, 0.18).fillRect(ox + c * this.cell, oy + r * this.cell, this.cell, this.cell);
      }
    }
    g.lineStyle(k, 0x5a4632, 0.18);
    for (let i = 1; i < e.cols; i++) g.lineBetween(ox + i * this.cell, oy, ox + i * this.cell, oy + bh);
    for (let i = 1; i < e.rows; i++) g.lineBetween(ox, oy + i * this.cell, ox + bw, oy + i * this.cell);
    // moss lies under the tiles
    this.mossGfx = e.moss.map((row, r) =>
      row.map((has, c) => {
        if (!has) return null;
        const p = this.pos({ r, c });
        return this.add.image(p.x, p.y, 'ob-mossa').setDisplaySize(this.cell * 1.06, this.cell * 1.06).setDepth(0.5);
      }),
    );
    this.tiles = e.board.map((row, r) => row.map((kind, c) => this.makeTile(kind, this.pos({ r, c }), e.special[r][c])));
    // hard blocks that have already taken a hit show their cracks
    e.hp.forEach((row, r) => row.forEach((n, c) => { if (n > 0 && this.tiles[r][c]) this.crackBlock(this.tiles[r][c]!, n); }));
    // Ice (snow in the fells) lies over the tile it locks.
    this.iceGfx = e.ice.map((row, r) => row.map((n, c) => (n ? this.makeCover({ r, c }, n) : null)));
    this.hintTweens = [];
    this.drawHint();
    this.drawCursor();
    this.drawIntro();
  }

  /**
   * A fishing net (or snow) over a tile. A net that has been hit once is
   * torn, and deep snow that has been hit once is lower (Jonas, 2026-11-18).
   */
  private makeCover(cell: Cell, layers: number): Phaser.GameObjects.Container {
    const p = this.pos(cell);
    const snow = this.region.id === 'fjall';
    const start = this.engine?.level.ice?.find(([r, c]) => r === cell.r && c === cell.c)?.[2] ?? 1;
    const hit = layers < start;
    const cover = this.region.cover;
    // A region's own cover (mud, coal, net, frost) that has lost a layer is
    // smaller and paler, so the hit shows without a number.
    const pic = cover
      ? this.add.image(0, 0, `ob-${cover.picture}`).setDisplaySize(this.cell * (hit ? 0.84 : 1.02), this.cell * (hit ? 0.84 : 1.02)).setAlpha(hit ? cover.alpha * 0.6 : layers > 1 ? 1 : cover.alpha)
      : this.add.image(0, snow ? -this.cell * 0.04 : 0, snow ? (hit ? 'ob-sno-tunn' : 'ob-sno') : hit ? 'ob-is-sprucken' : 'ob-is')
        .setDisplaySize(this.cell * (snow ? 1.08 : 1.02), this.cell * (snow ? 0.92 : 1.02))
        .setAlpha(snow ? (layers > 1 ? 1 : 0.95) : 1);
    const parts: Phaser.GameObjects.GameObject[] = [pic];
    return this.add.container(p.x, p.y, parts).setDepth(2);
  }

  /**
   * The first time an obstacle appears (Jonas, 2026-11-18): an arrow bounces
   * over it while Svelte shows one sentence; it goes with the first move.
   */
  private drawIntro(): void {
    for (const o of this.introArrow) o.destroy();
    this.introArrow = [];
    const e = this.engine;
    const what = this.registry.get('intro') as Obstacle | null;
    if (!e || !what) return;
    const has = (p: Cell): boolean => {
      const k = e.board[p.r][p.c];
      if (what === 'is' || what === 'sno' || what === 'lera' || what === 'kol' || what === 'nat' || what === 'sand' || what === 'frost') return e.ice[p.r][p.c] > 0;
      if (what === 'mossa') return e.moss[p.r][p.c];
      return k === { tang: TANG, sten: STEN, stock: STOCK, snogubbe: STEN, malm: MALM, klapper: KLAPPER, hobal: HOBAL }[what];
    };
    let at: Cell | null = null;
    for (let r = 0; r < e.rows && !at; r++) for (let c = 0; c < e.cols && !at; c++) if (has({ r, c })) at = { r, c };
    if (!at) return;
    const p = this.pos(at);
    // point down at it, or up from below when it sits on the top row
    const up = at.r === 0;
    const y = up ? p.y + this.cell * 0.95 : p.y - this.cell * 0.95;
    const g = this.add.graphics().setDepth(7);
    const s = this.cell * 0.32;
    const dir = up ? -1 : 1;
    // drawn pointing down, with a white edge, and turned round when it points up
    g.fillStyle(0xffffff, 1).fillRect(-0.5 * s, -1.38 * s, s, 1.45 * s).fillTriangle(-1.1 * s, -0.1 * s, 1.1 * s, -0.1 * s, 0, 1.25 * s);
    g.fillStyle(this.frame, 1).fillRect(-0.32 * s, -1.2 * s, 0.64 * s, 1.2 * s).fillTriangle(-0.85 * s, 0, 0.85 * s, 0, 0, s);
    g.setPosition(p.x, y).setAngle(up ? 180 : 0);
    this.tweens.add({ targets: g, y: y + dir * this.cell * 0.18, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.introArrow.push(g);
  }

  /** Two blinking frames around a legal move (used by the introduction). */
  /** Stops the wobble and waits again; called on every touch, key and finished move. */
  private resetIdle(): void {
    this.stopIdleHint();
    this.idleTimer?.remove();
    this.idleTimer = this.time.delayedCall(Match3Scene.IDLE_MS, () => this.showIdleHint());
  }

  private stopIdleHint(): void {
    for (const t of this.idleTweens) t.remove();
    this.idleTweens = [];
    for (const tile of this.idleTiles) if (tile.active) tile.setAngle(0).setScale(1);
    this.idleTiles = [];
  }

  /** The two tiles of a good move rock gently until the player touches the board. */
  private showIdleHint(): void {
    const e = this.engine;
    if (!e || e.status() !== 'playing') return;
    if (this.busy || this.registry.get('hint') || this.registry.get('tool')) { this.resetIdle(); return; }
    const move = e.findMove();
    if (!move) return;
    this.idleTiles = move.map((c) => this.tiles[c.r]?.[c.c]).filter((t): t is Tile => !!t);
    const calm = this.speed < 1;
    for (const tile of this.idleTiles) {
      this.idleTweens.push(this.tweens.add({ targets: tile, angle: { from: -7, to: 7 }, scale: calm ? 1.06 : 1.1, duration: calm ? 900 : 260, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }));
    }
  }

  private drawHint(): void {
    for (const h of this.hintTweens) h.destroy();
    this.hintTweens = [];
    if (!this.registry.get('hint') || !this.engine || this.busy) return;
    const move = this.engine.findMove();
    if (!move) return;
    for (const cell of move) {
      const p = this.pos(cell);
      const box = this.add.rectangle(p.x, p.y, this.cell - 2 * this.k, this.cell - 2 * this.k).setStrokeStyle(4 * this.k, this.frame, 1).setDepth(3);
      this.tweens.add({ targets: box, alpha: 0.2, duration: 600, yoyo: true, repeat: -1 });
      this.hintTweens.push(box);
    }
    // A hand that shows the swipe, as in the big puzzle games.
    const [a, b] = move.map((c) => this.pos(c));
    const hand = this.add.text(a.x, a.y, '👆', { fontSize: `${Math.round(this.cell * 0.7)}px` }).setOrigin(0.3, 0).setDepth(5);
    this.tweens.add({ targets: hand, x: b.x, y: b.y, duration: 900 * (this.speed < 1 ? 2 : 1), ease: 'Sine.easeInOut', yoyo: true, repeat: -1, hold: 200, repeatDelay: 300 });
    this.hintTweens.push(hand);
  }

  /** Keyboard play: arrows move a frame, Enter or Space picks a tile and then its neighbour. */
  private onKey(e: KeyboardEvent): void {
    const host = this.game.canvas.parentElement;
    if (!host || document.activeElement !== host || !this.engine) return;
    this.resetIdle();
    const d: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (d[e.key]) {
      e.preventDefault();
      this.usingKeys = true;
      const [dr, dc] = d[e.key];
      const next = { r: Phaser.Math.Clamp(this.cursor.r + dr, 0, this.engine.rows - 1), c: Phaser.Math.Clamp(this.cursor.c + dc, 0, this.engine.cols - 1) };
      if (this.selected && this.engine.isAdjacent(this.selected, next)) {
        const from = this.selected;
        this.select(null);
        this.cursor = next;
        this.drawCursor();
        void this.swap(from, next);
        return;
      }
      this.cursor = next;
      this.drawCursor();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.usingKeys = true;
      this.tap(this.cursor);
    } else if (e.key === 'Escape') {
      this.select(null);
    }
  }

  private drawCursor(): void {
    this.cursorBox?.destroy();
    this.cursorBox = undefined;
    if (!this.usingKeys || !this.engine) return;
    const p = this.pos(this.cursor);
    this.cursorBox = this.add.rectangle(p.x, p.y, this.cell, this.cell).setStrokeStyle(3 * this.k, this.deep, 1).setDepth(3);
  }

  /**
   * A hard block (ore, beach stones) cracks more with every hit, the way the
   * net tears and the snow sinks: no number on it (Jonas, 2026-11-19). The
   * last hit breaks it.
   */
  private crackBlock(t: Tile, left: number): void {
    t.list.filter((o) => o.name === 'hits').forEach((o) => o.destroy());
    const max = BLOCK_HITS[t.getData('kind') as number] ?? 1;
    const hits = max - left;
    if (hits <= 0) return;
    // How much of the crack pattern shows: all of it just before the block breaks.
    const lines = CRACKS.slice(0, Math.ceil((CRACKS.length * hits) / (max - 1)));
    const u = this.cell * 0.44;
    const g = this.add.graphics().setName('hits');
    for (const [color, alpha, width, dx] of [[0xffffff, 0.5, 2.4, 1.6], [0x1d1712, 0.95, 3.2, 0]] as const) {
      g.lineStyle(width * this.k, color, alpha);
      for (const line of lines) {
        g.beginPath();
        line.forEach(([x, y], i) => (i ? g.lineTo(x * u + dx * this.k, y * u + dx * this.k) : g.moveTo(x * u + dx * this.k, y * u + dx * this.k)));
        g.strokePath();
      }
    }
    t.add(g);
  }

  private makeTile(kind: number, at: { x: number; y: number }, special: Special = null): Tile {
    const size = this.cell * 0.86;
    if (isBlock(kind)) {
      const big = this.cell * (kind === STOCK ? 0.92 : 0.98);
      const name = kind === STEN && this.region.stone ? this.region.stone : BLOCK_PICTURE[kind];
      const img = this.add.image(0, 0, `ob-${name}`).setDisplaySize(big, big);
      return this.add.container(at.x, at.y, [img]).setDepth(1).setData('kind', kind);
    }
    if (!isFree(kind) && special === 'all') return this.shining(kind, at, size);
    if (!isFree(kind)) {
      const shadow = this.add.image(0, 2 * this.k, `tile-${this.region.tiles[kind]}`).setDisplaySize(size, size).setTint(0x000000).setAlpha(0.25);
      const img = this.add.image(0, 0, `tile-${this.region.tiles[kind]}`).setDisplaySize(size, size);
      return this.add.container(at.x, at.y, [shadow, img]).setDepth(1);
    }
    // Option A (Jonas, 2026-11-17): specials are their own pictures, with no kind.
    // A rocket lies along the line it clears; the pearl shows every kind it can take.
    const name = kind === BOMB ? 'parla' : special === 'area' ? 'fyrverkeri' : 'raket';
    const glow = this.add.graphics();
    glow.fillStyle(0xffe7a3, 0.8).fillCircle(0, 0, size * 0.5);
    const big = kind === BOMB ? size * 1.1 : special === 'area' ? size * 0.98 : size * 1.15;
    const shadow = this.add.image(0, 2 * this.k, `sp-${name}`).setDisplaySize(big, big).setTint(0x000000).setAlpha(0.25);
    const img = this.add.image(0, 0, `sp-${name}`).setDisplaySize(big, big);
    const turn = { right: 0, down: 90, left: 180, up: -90 }[special as string] ?? 0;
    shadow.setAngle(turn); img.setAngle(turn);
    const t = this.add.container(at.x, at.y, [glow, shadow, img]).setDepth(1);
    // a slow breath so the player sees it can be used
    this.tweens.add({ targets: glow, alpha: 0.35, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    return t;
  }

  /**
   * Five in a row: the tile keeps its picture inside a gold ring with turning
   * rays, so the player sees which kind it will take (Jonas found the pearl unclear).
   */
  private shining(kind: number, at: { x: number; y: number }, size: number): Tile {
    const R = size * 0.5;
    const rays = this.add.graphics();
    for (let i = 0; i < 16; i++) {
      const a0 = (i * Math.PI) / 8 - 0.1;
      const a1 = (i * Math.PI) / 8 + 0.1;
      rays.fillStyle(i % 2 ? 0xffeb8c : 0xffc832, 1)
        .fillTriangle(0, 0, Math.cos(a0) * R * 1.12, Math.sin(a0) * R * 1.12, Math.cos(a1) * R * 1.12, Math.sin(a1) * R * 1.12);
    }
    const ring = this.add.graphics();
    ring.fillStyle(this.deep, 1).fillCircle(0, 0, R * 0.9);
    ring.fillStyle(0xffce46, 1).fillCircle(0, 0, R * 0.85);
    ring.fillStyle(0xfff8e1, 1).fillCircle(0, 0, R * 0.78);
    const img = this.add.image(0, 0, `tile-${this.region.tiles[kind]}`).setDisplaySize(size * 0.74, size * 0.74);
    this.tweens.add({ targets: rays, angle: 360, duration: 9000, repeat: -1 });
    return this.add.container(at.x, at.y, [rays, ring, img]).setDepth(1);
  }

  /** A quick flash where a special went off. */
  /** What a special does when it goes off: a beam sweeps the line, a ring spreads, the compass shines. */
  private flash(step: Step): number {
    const e = this.engine;
    if (!e || step.blasts.length === 0) return 0;
    const ms = 260 / Math.max(this.speed, 0.6);
    let wait = ms;
    // one sound for each sort of special that goes off in this step
    const heard = new Set<'rocket' | 'fireworks' | 'shine'>();
    for (const b of step.blasts) {
      if (isRocket(b.special)) { heard.add('rocket'); wait = Math.max(wait, this.rocketFlight(b.cell, b.special)); }
      else if (b.special === 'area') { heard.add('fireworks'); wait = Math.max(wait, this.fireworks(b.cell)); }
      else { heard.add('shine'); wait = Math.max(wait, this.shine(b.cell, step.cleared)); }
    }
    for (const name of heard) playSound(name);
    return wait;
  }

  /** Calm mode (reduced motion) keeps the effects but drops the shaking and flashing. */
  private get calm(): boolean { return this.speed < 1; }

  private shake(ms: number, strength: number): void {
    if (!this.calm) this.cameras.main.shake(ms, strength);
  }

  /** A one-off burst of sparks. */
  private sparks(x: number, y: number, o: { count: number; colors: number[]; speed: [number, number]; life: number; gravity?: number; size?: number; texture?: string }): void {
    const n = Math.round(o.count * (this.calm ? 0.4 : 1));
    const em = this.add.particles(x, y, o.texture ?? 'spark', {
      speed: { min: o.speed[0] * this.k, max: o.speed[1] * this.k },
      angle: { min: 0, max: 360 },
      lifespan: { min: o.life * 0.6, max: o.life },
      scale: { start: (o.size ?? 0.5) * this.k, end: 0 },
      alpha: { start: 1, end: 0.2 },
      gravityY: (o.gravity ?? 0) * this.k,
      rotate: { min: 0, max: 360 },
      tint: o.colors,
      emitting: false,
    }).setDepth(8);
    em.explode(n);
    this.time.delayedCall(o.life + 100, () => em.destroy());
  }

  /**
   * Fireworks (Jonas, 2026-11-18: more spectacular): a white flash over the
   * 3x3, two shock rings, a shower of coloured sparks that fall, and three
   * small shells that go off around it a moment later.
   */
  private fireworks(cell: Cell): number {
    const p = this.pos(cell);
    const colors = [0xff2e2e, 0xffc21f, 0x1fa8ff, 0x3ccf2e, 0xff3ccf, 0x8a4dff];
    const box = this.add.rectangle(p.x, p.y, this.cell * 3, this.cell * 3, 0xfff6d0, 0.95).setDepth(7);
    this.tweens.add({ targets: box, alpha: 0, scale: 1.15, duration: 260, onComplete: () => box.destroy() });
    for (const [delay, color] of [[0, 0xffffff], [90, 0xffd34d]] as const) {
      const ring = this.add.circle(p.x, p.y, this.cell * 0.3).setStrokeStyle(this.cell * 0.16, color, 1).setDepth(7);
      this.tweens.add({ targets: ring, radius: this.cell * 2.3, alpha: 0, delay, duration: 420, ease: 'Quad.easeOut', onComplete: () => ring.destroy() });
    }
    this.sparks(p.x, p.y, { count: 80, colors, speed: [150, 480], life: 1000, gravity: 420, size: 0.85 });
    this.sparks(p.x, p.y, { count: 16, colors: [0xffc21f, 0xff2e2e], speed: [60, 220], life: 800, size: 1.3, texture: 'star4' });
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + Math.random();
      const x = p.x + Math.cos(a) * this.cell * 1.6;
      const y = p.y + Math.sin(a) * this.cell * 1.6;
      this.time.delayedCall(180 + i * 110, () => {
        this.sparks(x, y, { count: 30, colors: [colors[(i * 2) % colors.length], colors[(i * 2 + 1) % colors.length]], speed: [80, 260], life: 750, gravity: 250, size: 0.7 });
        playSound('swap');
      });
    }
    this.shake(260, 0.012);
    return 300 / Math.max(this.speed, 0.6);
  }

  /**
   * A shining tile (Jonas, 2026-11-18: more spectacular): the board dims, a
   * beam of light shoots from it to every tile it takes, and each of those
   * flares up in a burst of gold stars.
   */
  private shine(cell: Cell, targets: Cell[]): number {
    const e = this.engine!;
    const p = this.pos(cell);
    const bw = this.cell * e.cols;
    const bh = this.cell * e.rows;
    const dim = this.add.rectangle(this.origin.x + bw / 2, this.origin.y + bh / 2, bw, bh, 0x1a1030, 0.45).setDepth(6);
    this.tweens.add({ targets: dim, alpha: 0, delay: 500, duration: 300, onComplete: () => dim.destroy() });
    const halo = this.add.circle(p.x, p.y, this.cell * 0.6, 0xfff1a8, 1).setDepth(7);
    this.tweens.add({ targets: halo, scale: 2.4, alpha: 0, duration: 650, ease: 'Quad.easeOut', onComplete: () => halo.destroy() });
    const rays = this.add.graphics().setDepth(7).setPosition(p.x, p.y);
    for (let i = 0; i < 12; i++) {
      const a0 = (i * Math.PI) / 6 - 0.07;
      const a1 = (i * Math.PI) / 6 + 0.07;
      const R = this.cell * 2.2;
      rays.fillStyle(0xffe27a, 0.8).fillTriangle(0, 0, Math.cos(a0) * R, Math.sin(a0) * R, Math.cos(a1) * R, Math.sin(a1) * R);
    }
    this.tweens.add({ targets: rays, angle: 90, alpha: 0, scale: 1.6, duration: 700, onComplete: () => rays.destroy() });
    const others = targets.filter((t) => t.r !== cell.r || t.c !== cell.c);
    others.forEach((t, i) => {
      const q = this.pos(t);
      const beam = this.add.graphics().setDepth(7);
      const delay = 60 + i * 35;
      this.time.delayedCall(delay, () => {
        beam.lineStyle(this.cell * 0.22, 0xffd34d, 0.55).lineBetween(p.x, p.y, q.x, q.y);
        beam.lineStyle(this.cell * 0.08, 0xffffff, 1).lineBetween(p.x, p.y, q.x, q.y);
        this.tweens.add({ targets: beam, alpha: 0, duration: 380, onComplete: () => beam.destroy() });
        const glow = this.add.circle(q.x, q.y, this.cell * 0.45, 0xfff1a8, 0.95).setDepth(7);
        this.tweens.add({ targets: glow, scale: 1.8, alpha: 0, duration: 380, onComplete: () => glow.destroy() });
        this.sparks(q.x, q.y, { count: 12, colors: [0xffc21f, 0xff9a1f, 0xffe27a], speed: [70, 230], life: 600, size: 1.1, texture: 'star4' });
      });
    });
    this.sparks(p.x, p.y, { count: 44, colors: [0xffc21f, 0xff9a1f, 0xffe27a], speed: [120, 420], life: 900, size: 1.3, texture: 'star4' });
    this.shake(320, 0.01);
    return (420 + others.length * 35) / Math.max(this.speed, 0.6);
  }

  /**
   * A rocket takes off the way its nose points (Jonas, 2026-11-17): it flies
   * to the edge of the board and each tile in front of it bursts as it passes,
   * with a flame trailing behind. Returns how long it takes.
   */
  private rocketFlight(cell: Cell, nose: Rocket): number {
    const e = this.engine!;
    const across = nose === 'left' || nose === 'right';
    const dir = nose === 'left' || nose === 'up' ? -1 : 1;
    const steps = across ? (dir > 0 ? e.cols - 1 - cell.c : cell.c) : dir > 0 ? e.rows - 1 - cell.r : cell.r;
    const perCell = 55 / Math.max(this.speed, 0.6);
    const ms = Math.max(1, steps + 1) * perCell;
    const from = this.pos(cell);
    const to = { x: from.x + (across ? dir * (steps + 0.8) * this.cell : 0), y: from.y + (across ? 0 : dir * (steps + 0.8) * this.cell) };
    // the rocket leaves its own cell
    const own = this.tiles[cell.r][cell.c];
    if (own) own.setVisible(false);
    const size = this.cell * 0.86 * 1.15;
    const angle = { right: 0, down: 90, left: 180, up: -90 }[nose];
    const rocket = this.add.image(from.x, from.y, 'sp-raket').setDisplaySize(size, size).setAngle(angle).setDepth(6);
    // a launch flash, a shake, and a tail of sparks and smoke that follows it
    const launch = this.add.circle(from.x, from.y, this.cell * 0.7, 0xfff1a8, 1).setDepth(7);
    this.tweens.add({ targets: launch, scale: 2, alpha: 0, duration: 260, onComplete: () => launch.destroy() });
    this.shake(220, 0.008);
    const back = { right: 180, down: 270, left: 0, up: 90 }[nose];
    const trail = this.add.particles(0, 0, 'spark', {
      follow: rocket,
      frequency: this.calm ? 40 : 12,
      speed: { min: 40 * this.k, max: 160 * this.k },
      angle: { min: back - 25, max: back + 25 },
      lifespan: { min: 300, max: 600 },
      scale: { start: 1.0 * this.k, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [0xffc21f, 0xff8a1f, 0xff4d1f, 0xffe27a],
    }).setDepth(5);
    // the flame: a fiery tail from the rocket back along the line; it reaches
    // the far edge behind the rocket and burns those tiles too (whole line)
    const backSteps = across ? (dir > 0 ? cell.c : e.cols - 1 - cell.c) : dir > 0 ? cell.r : e.rows - 1 - cell.r;
    const backReach = ROCKET_BOTH_WAYS ? backSteps + 0.5 : 1.2; // in cells behind the start
    const flame = this.add.graphics().setDepth(5);
    const tail = { len: 0 };
    const drawFlame = () => {
      flame.clear();
      const along = (v: number) => (across ? rocket.x - from.x : rocket.y - from.y) * dir + v; // distance from start, forward positive
      const head = along(-size * 0.35);
      const end = -tail.len * this.cell;
      if (head <= end) return;
      for (const [w, col] of [[0.5, 0xff8a1f], [0.24, 0xffe27a]] as const) {
        const a = Math.min(head, end) * dir;
        const b = Math.max(head, end) * dir;
        const lo = Math.min(a, b);
        const len = Math.abs(b - a);
        flame.fillStyle(col, col === 0xff8a1f ? 0.85 : 1);
        if (across) flame.fillRect(from.x + lo, from.y - (this.cell * w) / 2, len, this.cell * w);
        else flame.fillRect(from.x - (this.cell * w) / 2, from.y + lo, this.cell * w, len);
      }
    };
    this.tweens.add({ targets: tail, len: backReach, duration: ms * 0.7, ease: 'Quad.easeOut' });
    this.tweens.add({ targets: rocket, x: to.x, y: to.y, duration: ms, ease: 'Quad.easeIn', onUpdate: drawFlame });
    if (ROCKET_BOTH_WAYS) {
      for (let i = 1; i <= backSteps; i++) {
        const at = across ? { r: cell.r, c: cell.c - dir * i } : { r: cell.r - dir * i, c: cell.c };
        // Quad.easeOut: the tail reaches cell i when 1-(1-t)^2 = i/backReach
        const f = Math.min(1, i / backReach);
        this.time.delayedCall(ms * 0.7 * (1 - Math.sqrt(1 - f)), () => this.burst(at, true));
      }
    }
    // each tile in front bursts as the rocket reaches it
    for (let i = 1; i <= steps; i++) {
      const at = across ? { r: cell.r, c: cell.c + dir * i } : { r: cell.r + dir * i, c: cell.c };
      // Quad.easeIn: distance grows with t squared
      const t = ms * Math.sqrt(i / (steps + 0.8));
      this.time.delayedCall(t, () => this.burst(at));
    }
    this.time.delayedCall(ms, () => {
      trail.stop();
      this.time.delayedCall(600, () => trail.destroy());
      rocket.destroy();
      this.tweens.add({ targets: flame, alpha: 0, duration: 200, onComplete: () => flame.destroy() });
    });
    return ms + 60;
  }

  /** A tile smashed by a rocket (or burnt by its flame): it hides and throws out splinters and a puff. */
  private burst(at: Cell, burnt = false): void {
    const t = this.tiles[at.r]?.[at.c];
    if (t) t.setVisible(false);
    const p = this.pos(at);
    const puff = this.add.circle(p.x, p.y, this.cell * 0.3, burnt ? 0x5a4a40 : 0xfff3c4, burnt ? 0.6 : 0.9).setDepth(5);
    this.tweens.add({ targets: puff, scale: 1.8, alpha: 0, duration: 220, onComplete: () => puff.destroy() });
    this.sparks(p.x, p.y, { count: burnt ? 10 : 16, colors: burnt ? [0xff8a1f, 0xff4d1f, 0x5a4a40] : [0xffc21f, 0xff8a1f, 0xff4d1f], speed: [80, 280], life: 520, gravity: 360, size: 0.7 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.random() * 0.5;
      const bit = this.add.rectangle(p.x, p.y, this.cell * 0.12, this.cell * 0.12, i % 2 ? 0xff8a1f : 0xffd34d, 1).setDepth(5).setAngle(Math.random() * 90);
      this.tweens.add({ targets: bit, x: p.x + Math.cos(a) * this.cell * 0.7, y: p.y + Math.sin(a) * this.cell * 0.7, angle: bit.angle + 180, alpha: 0, duration: 320, ease: 'Quad.easeOut', onComplete: () => bit.destroy() });
    }
  }

  /** Bits of ice or snow flying off a cell. */
  private chips(at: Cell, color: number): void {
    const p = this.pos(at);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + Math.random() * 0.6;
      const bit = this.add.rectangle(p.x, p.y, this.cell * 0.1, this.cell * 0.1, color, 1).setStrokeStyle(this.k, 0x7fb8d8).setDepth(5).setAngle(45);
      this.tweens.add({ targets: bit, x: p.x + Math.cos(a) * this.cell * 0.6, y: p.y + Math.sin(a) * this.cell * 0.6, alpha: 0, duration: 300, ease: 'Quad.easeOut', onComplete: () => bit.destroy() });
    }
  }

  /** Seaweed takes a tile beside it after a move that cleared none. */
  private async grow(at: Cell | undefined): Promise<void> {
    if (!at || !this.engine) return;
    this.tiles[at.r][at.c]?.destroy();
    const t = this.makeTile(this.engine.board[at.r][at.c], this.pos(at)).setScale(0.2);
    this.tiles[at.r][at.c] = t;
    await this.tween(t, { scale: 1 }, 260);
  }

  private select(cell: Cell | null): void {
    this.selected = cell;
    this.selBox?.destroy();
    this.selBox = undefined;
    if (cell) {
      const p = this.pos(cell);
      this.selBox = this.add.rectangle(p.x, p.y, this.cell - 2 * this.k, this.cell - 2 * this.k).setStrokeStyle(4 * this.k, this.deep, 1).setDepth(3);
    }
  }

  private tap(cell: Cell): void {
    if (this.busy) return;
    if (this.registry.get('tool') === 'hammer') {
      void this.smash(cell);
      return;
    }
    const s = this.selected;
    if (s && this.engine?.isAdjacent(s, cell)) {
      this.select(null);
      void this.swap(s, cell);
      return;
    }
    if (this.engine?.locked(cell)) {
      this.select(null);
      this.frozenNo(cell);
      return;
    }
    if (this.engine?.fires(cell)) {
      this.select(null);
      void this.fire(cell);
      return;
    }
    this.select(s && s.r === cell.r && s.c === cell.c ? null : cell);
  }

  private tween(targets: object | object[], props: Record<string, unknown>, ms: number): Promise<void> {
    return new Promise((done) => {
      const list = Array.isArray(targets) ? targets : [targets];
      if (list.length === 0) return done();
      this.tweens.add({ targets: list, ...props, duration: ms * this.speed, ease: 'Quad.easeOut', onComplete: () => done() });
    });
  }

  private async swap(a: Cell, b: Cell): Promise<void> {
    const e = this.engine;
    if (!e || this.busy || e.status() !== 'playing') return;
    if (b.r < 0 || b.c < 0 || b.r >= e.rows || b.c >= e.cols) return;
    if (e.locked(a) || e.locked(b)) { this.frozenNo(e.locked(a) ? a : b); return; }
    this.busy = true;
    for (const h of this.hintTweens) h.destroy();
    this.hintTweens = [];
    const ta = this.tiles[a.r][a.c]!;
    const tb = this.tiles[b.r][b.c]!;
    const pa = this.pos(a);
    const pb = this.pos(b);
    const result = e.trySwap(a, b);
    // One sound per move: the slide when it makes a line, the wooden tock when it does not.
    playSound(result.valid ? 'swap' : 'invalid');
    await Promise.all([this.tween(ta, { x: pb.x, y: pb.y }, 130), this.tween(tb, { x: pa.x, y: pa.y }, 130)]);
    if (!result.valid) {
      await Promise.all([this.tween(ta, { x: pa.x, y: pa.y }, 130), this.tween(tb, { x: pb.x, y: pb.y }, 130)]);
      this.busy = false;
      this.game.events.emit('match3:invalid');
      return;
    }
    this.tiles[a.r][a.c] = tb;
    this.tiles[b.r][b.c] = ta;
    for (const [i, step] of result.steps.entries()) await this.play(step, i);
    await this.grow(result.grew);
    if (result.shuffled) this.build();
    await this.playFinale();
    this.busy = false;
    this.drawHint();
    this.drawCursor();
    this.game.events.emit('match3:moved', result);
    this.resetIdle();
  }

  /** After a win, the moves left fly off as rockets (the finale). */
  private async playFinale(): Promise<void> {
    const e = this.engine;
    if (!e || e.status() !== 'won' || e.movesLeft <= 0) return;
    await new Promise((done) => this.time.delayedCall(250, done));
    for (const [i, step] of e.finale().entries()) await this.play(step, i + 2);
  }

  /** A frozen tile is locked: it only shivers, with the wooden tock. */
  private frozenNo(cell: Cell): void {
    playSound('invalid');
    const targets = [this.tiles[cell.r]?.[cell.c], this.iceGfx[cell.r]?.[cell.c]].filter(Boolean) as Phaser.GameObjects.Components.Transform[];
    const x = this.pos(cell).x;
    for (const t of targets) {
      this.tweens.add({ targets: t, x: x + 3 * this.k, duration: 45, yoyo: true, repeat: 2, onComplete: () => { t.x = x; } });
    }
  }

  /** A tapped special goes off where it stands; it costs a move like a swap. */
  private async fire(cell: Cell): Promise<void> {
    const e = this.engine;
    if (!e || this.busy || e.status() !== 'playing') return;
    this.busy = true;
    for (const h of this.hintTweens) h.destroy();
    this.hintTweens = [];
    const t = this.tiles[cell.r][cell.c];
    if (t) await this.tween(t, { scale: 1.25 }, 110);
    const result = e.fire(cell);
    if (!result.valid) { if (t) t.setScale(1); this.busy = false; return; }
    playSound('swap');
    for (const [i, step] of result.steps.entries()) await this.play(step, i);
    await this.grow(result.grew);
    if (result.shuffled) this.build();
    await this.playFinale();
    this.busy = false;
    this.drawHint();
    this.drawCursor();
    this.game.events.emit('match3:moved', result);
    this.resetIdle();
  }

  /** The hammer: the Svelte side has already checked the price; it pays on 'match3:smashed'. */
  private async smash(cell: Cell): Promise<void> {
    const e = this.engine;
    if (!e || this.busy || e.status() !== 'playing') return;
    this.busy = true;
    this.select(null);
    for (const h of this.hintTweens) h.destroy();
    this.hintTweens = [];
    const t = this.tiles[cell.r][cell.c];
    if (t) await this.tween(t, { angle: 25, scale: 1.2 }, 90);
    playSound('hammer');
    const result = e.smash(cell);
    for (const [i, step] of result.steps.entries()) await this.play(step, i);
    if (result.shuffled) this.build();
    await this.playFinale();
    this.busy = false;
    this.drawCursor();
    this.game.events.emit('match3:smashed', result);
    this.resetIdle();
  }

  /** The shuffler: tiles fly to their new places. */
  private async mixBoard(): Promise<void> {
    const e = this.engine;
    if (!e || this.busy) return;
    this.busy = true;
    this.select(null);
    const all = this.tiles.flat().filter((t): t is Tile => t !== null);
    await this.tween(all, { scale: 0.2, alpha: 0.4 }, 160);
    this.build();
    const fresh = this.tiles.flat().filter((t): t is Tile => t !== null);
    fresh.forEach((t) => t.setScale(0.2).setAlpha(0.4));
    await this.tween(fresh, { scale: 1, alpha: 1 }, 200);
    this.busy = false;
    this.drawHint();
    this.drawCursor();
  }

  /** cascade: 0 for the player's own move, then 1, 2 … for each chain reaction (each a note higher). */
  private async play(step: Step, cascade = 0): Promise<void> {
    // A special tile made or set off counts as two steps up: it should sound bigger.
    playMatch(cascade + (step.made.length || step.blasts.length ? 2 : 0));
    // let the sweep be seen before the tiles go
    const wait = this.flash(step);
    if (wait) await new Promise((done) => this.time.delayedCall(wait * 0.8, done));
    for (const { r, c, left } of step.iceBroken) {
      const ice = this.iceGfx[r]?.[c];
      if (!ice) continue;
      this.iceGfx[r][c] = null;
      this.chips({ r, c }, this.region.id === 'fjall' ? 0xffffff : 0xcdeefc);
      if (left > 0) {
        // one layer left: the cube is redrawn thinner
        ice.destroy();
        this.iceGfx[r][c] = this.makeCover({ r, c }, left);
      } else {
        void this.tween(ice, { alpha: 0, scale: 1.3 }, 200).then(() => ice.destroy());
      }
    }
    let crackSound = false;
    for (const { r, c, left } of step.blockHit ?? []) {
      // a hard block shakes, sheds chips and cracks a little more
      const t = this.tiles[r][c];
      if (!t) continue;
      this.chips({ r, c }, 0xb8b0a4);
      this.crackBlock(t, left);
      crackSound = true;
      void this.tween(t, { angle: 8 }, 60).then(() => this.tween(t, { angle: 0 }, 80));
    }
    // a hard block or a stone that goes in this step breaks with a crash; one that only cracks, with a knock
    if (step.cleared.some(({ r, c }) => HARD.has(this.tiles[r][c]?.getData('kind') as number))) playSound('break');
    else if (crackSound) playSound('crack');
    const rolls: Promise<void>[] = [];
    for (const { from, to, out } of step.rolled ?? []) {
      const bale = this.tiles[from.r][from.c];
      if (!bale) continue;
      if (out) {
        // off the edge: it rolls out of the frame and is gone (it is in `cleared` too)
        this.tiles[from.r][from.c] = null;
        rolls.push(this.tween(bale, { x: this.pos(to).x, y: this.pos(to).y, angle: 180, alpha: 0 }, 260).then(() => bale.destroy()));
        continue;
      }
      const other = this.tiles[to.r][to.c];
      this.tiles[to.r][to.c] = bale;
      this.tiles[from.r][from.c] = other;
      rolls.push(this.tween(bale, { x: this.pos(to).x, y: this.pos(to).y, angle: bale.angle + 90 }, 220));
      if (other) rolls.push(this.tween(other, { x: this.pos(from).x, y: this.pos(from).y }, 220));
    }
    await Promise.all(rolls);
    const cleared = step.cleared.map(({ r, c }) => this.tiles[r][c]!).filter(Boolean);
    for (const { r, c } of step.mossGone) {
      const moss = this.mossGfx[r]?.[c];
      if (moss) { this.mossGfx[r][c] = null; void this.tween(moss, { alpha: 0, scale: 0.6 }, 220).then(() => moss.destroy()); }
    }
    await this.tween(cleared, { scale: 0, alpha: 0 }, 160);
    cleared.forEach((t) => t.destroy());
    for (const { r, c } of step.cleared) this.tiles[r][c] = null;
    // new special tiles pop up where the line was made
    for (const m of step.made) {
      this.tiles[m.cell.r][m.cell.c]?.destroy();
      const t = this.makeTile(m.kind, this.pos(m.cell), m.special).setScale(0.3);
      this.tiles[m.cell.r][m.cell.c] = t;
      void this.tween(t, { scale: 1 }, 220);
    }

    // falls: process from the bottom so moved tiles do not overwrite each other
    const moves: Promise<void>[] = [];
    const sorted = [...step.falls].sort((x, y) => y.to.r - x.to.r);
    for (const f of sorted) {
      const t = this.tiles[f.from.r][f.from.c]!;
      this.tiles[f.from.r][f.from.c] = null;
      this.tiles[f.to.r][f.to.c] = t;
      moves.push(this.tween(t, { y: this.pos(f.to).y }, 90 + 45 * (f.to.r - f.from.r)));
    }
    for (const s of step.spawns) {
      const target = this.pos(s.cell);
      // New tiles fade in as they drop, so nothing shows above the board.
      const t = this.makeTile(s.kind, { x: target.x, y: target.y - s.dropFrom * this.cell }).setAlpha(0);
      this.tiles[s.cell.r][s.cell.c] = t;
      moves.push(this.tween(t, { y: target.y, alpha: 1 }, 90 + 45 * s.dropFrom));
    }
    await Promise.all(moves);
    if (this.selBox) this.children.bringToTop(this.selBox);
  }
}
