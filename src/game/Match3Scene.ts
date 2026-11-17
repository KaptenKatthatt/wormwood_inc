import Phaser from 'phaser';
import type { Cell, Match3, Step } from '../lib/match3/engine';
import { TILES } from '../lib/match3/levels';
import { DEEP, FRAME } from './palette';

type Tile = Phaser.GameObjects.Container;

/**
 * Draws a Match3 board and animates its steps. Svelte puts the engine in the
 * registry as 'match3'; the scene tells Svelte about each finished move with
 * the game event 'match3:moved'. Tap two neighbours or swipe to swap.
 */
export class Match3Scene extends Phaser.Scene {
  private engine?: Match3;
  private tiles: (Tile | null)[][] = [];
  private iceGfx: (Phaser.GameObjects.Rectangle | null)[][] = [];
  private cell = 48;
  private origin = { x: 0, y: 0 };
  private selected: Cell | null = null;
  private selBox?: Phaser.GameObjects.Rectangle;
  private busy = false;
  private down: { cell: Cell; x: number; y: number } | null = null;
  private speed = 1;
  private hintTweens: Phaser.GameObjects.Rectangle[] = [];
  private cursor: Cell = { r: 0, c: 0 };
  private cursorBox?: Phaser.GameObjects.Rectangle;
  private usingKeys = false;

  constructor() {
    super('match3');
  }

  preload(): void {
    for (const name of TILES) this.load.image(`tile-${name}`, `/art/tiles/${name}.png`);
  }

  create(): void {
    this.speed = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0.35 : 1;
    this.engine = this.registry.get('match3');
    this.build();
    this.scale.on('resize', this.build, this);
    this.registry.events.on('changedata-match3', this.onEngine, this);
    this.registry.events.on('changedata-hint', this.drawHint, this);
    // Svelte sets 'mixed' to a new number after it has shuffled the engine.
    this.registry.events.on('changedata-mixed', this.mixBoard, this);
    this.events.once('shutdown', () => {
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
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
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
    this.children.removeAll(true);
    this.selBox = undefined;
    const { width, height } = this.scale;
    const e = this.engine;
    if (!e) return;
    // The approved look: a falu red wooden frame, a white list and light wooden cells.
    const pad = 16;
    this.cell = Math.floor(Math.min((width - 2 * pad) / e.cols, (height - 2 * pad) / e.rows));
    const bw = this.cell * e.cols;
    const bh = this.cell * e.rows;
    this.origin = { x: Math.round((width - bw) / 2), y: Math.round((height - bh) / 2) };
    const { x: ox, y: oy } = this.origin;
    const g = this.add.graphics();
    g.fillStyle(DEEP, 1).fillRoundedRect(ox - 13, oy - 9, bw + 26, bh + 26, 14);
    g.fillStyle(FRAME, 1).fillRoundedRect(ox - 13, oy - 13, bw + 26, bh + 26, 14);
    g.lineStyle(1, 0x000000, 0.08);
    for (let x = ox - 10; x < ox + bw + 12; x += 9) g.lineBetween(x, oy - 13, x + 3, oy + bh + 13);
    g.fillStyle(0xf6efe2, 1).fillRoundedRect(ox - 3, oy - 3, bw + 6, bh + 6, 6);
    g.fillStyle(0xd9d0c0, 1).fillRect(ox, oy, bw, bh);
    for (let r = 0; r < e.rows; r++) {
      for (let c = 0; c < e.cols; c++) {
        if ((r + c) % 2 === 0) g.fillStyle(0xffffff, 0.18).fillRect(ox + c * this.cell, oy + r * this.cell, this.cell, this.cell);
      }
    }
    g.lineStyle(1, 0x5a4632, 0.18);
    for (let i = 1; i < e.cols; i++) g.lineBetween(ox + i * this.cell, oy, ox + i * this.cell, oy + bh);
    for (let i = 1; i < e.rows; i++) g.lineBetween(ox, oy + i * this.cell, ox + bw, oy + i * this.cell);
    this.tiles = e.board.map((row, r) => row.map((kind, c) => this.makeTile(kind, this.pos({ r, c }))));
    // Ice is a pale blue see-through layer over the tile.
    this.iceGfx = e.ice.map((row, r) =>
      row.map((has, c) => {
        if (!has) return null;
        const p = this.pos({ r, c });
        return this.add.rectangle(p.x, p.y, this.cell - 4, this.cell - 4, 0xbfe6fa, 0.55).setStrokeStyle(2, 0xffffff, 0.95).setDepth(2);
      }),
    );
    this.hintTweens = [];
    this.drawHint();
    this.drawCursor();
  }

  /** Two blinking frames around a legal move (used by the introduction). */
  private drawHint(): void {
    for (const h of this.hintTweens) h.destroy();
    this.hintTweens = [];
    if (!this.registry.get('hint') || !this.engine || this.busy) return;
    const move = this.engine.findMove();
    if (!move) return;
    for (const cell of move) {
      const p = this.pos(cell);
      const box = this.add.rectangle(p.x, p.y, this.cell - 2, this.cell - 2).setStrokeStyle(4, FRAME, 1).setDepth(3);
      this.tweens.add({ targets: box, alpha: 0.2, duration: 600, yoyo: true, repeat: -1 });
      this.hintTweens.push(box);
    }
  }

  /** Keyboard play: arrows move a frame, Enter or Space picks a tile and then its neighbour. */
  private onKey(e: KeyboardEvent): void {
    const host = this.game.canvas.parentElement;
    if (!host || document.activeElement !== host || !this.engine) return;
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
    this.cursorBox = this.add.rectangle(p.x, p.y, this.cell, this.cell).setStrokeStyle(3, DEEP, 1).setDepth(3);
  }

  private makeTile(kind: number, at: { x: number; y: number }): Tile {
    const size = this.cell * 0.86;
    const shadow = this.add.image(0, 2, `tile-${TILES[kind]}`).setDisplaySize(size, size).setTint(0x000000).setAlpha(0.25);
    const img = this.add.image(0, 0, `tile-${TILES[kind]}`).setDisplaySize(size, size);
    return this.add.container(at.x, at.y, [shadow, img]).setDepth(1);
  }

  private select(cell: Cell | null): void {
    this.selected = cell;
    this.selBox?.destroy();
    this.selBox = undefined;
    if (cell) {
      const p = this.pos(cell);
      this.selBox = this.add.rectangle(p.x, p.y, this.cell - 2, this.cell - 2).setStrokeStyle(4, DEEP, 1).setDepth(3);
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
    this.busy = true;
    for (const h of this.hintTweens) h.destroy();
    this.hintTweens = [];
    const ta = this.tiles[a.r][a.c]!;
    const tb = this.tiles[b.r][b.c]!;
    const pa = this.pos(a);
    const pb = this.pos(b);
    const result = e.trySwap(a, b);
    await Promise.all([this.tween(ta, { x: pb.x, y: pb.y }, 130), this.tween(tb, { x: pa.x, y: pa.y }, 130)]);
    if (!result.valid) {
      await Promise.all([this.tween(ta, { x: pa.x, y: pa.y }, 130), this.tween(tb, { x: pb.x, y: pb.y }, 130)]);
      this.busy = false;
      this.game.events.emit('match3:invalid');
      return;
    }
    this.tiles[a.r][a.c] = tb;
    this.tiles[b.r][b.c] = ta;
    for (const step of result.steps) await this.play(step);
    if (result.shuffled) this.build();
    this.busy = false;
    this.drawHint();
    this.drawCursor();
    this.game.events.emit('match3:moved', result);
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
    const result = e.smash(cell);
    for (const step of result.steps) await this.play(step);
    if (result.shuffled) this.build();
    this.busy = false;
    this.drawCursor();
    this.game.events.emit('match3:smashed', result);
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

  private async play(step: Step): Promise<void> {
    const cleared = step.cleared.map(({ r, c }) => this.tiles[r][c]!).filter(Boolean);
    for (const { r, c } of step.iceBroken) {
      const ice = this.iceGfx[r]?.[c];
      if (ice) { void this.tween(ice, { alpha: 0, scale: 1.3 }, 200); this.iceGfx[r][c] = null; }
    }
    await this.tween(cleared, { scale: 0, alpha: 0 }, 160);
    cleared.forEach((t) => t.destroy());
    for (const { r, c } of step.cleared) this.tiles[r][c] = null;

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
