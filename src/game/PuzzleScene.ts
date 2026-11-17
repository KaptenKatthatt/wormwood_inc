import Phaser from 'phaser';
import { PAPER, SEA, SEA_LIGHT, TILE_COLORS } from './palette';

const SIZE = 7;

/**
 * Placeholder puzzle board: a 7x7 grid of tiles you can select and swap with a
 * neighbour. No matching rules yet; those come with the game design.
 */
export class PuzzleScene extends Phaser.Scene {
  private grid: number[][] = [];
  private tiles: Phaser.GameObjects.Graphics[][] = [];
  private selected: { r: number; c: number } | null = null;
  private cell = 48;
  private origin = { x: 0, y: 0 };

  constructor() {
    super('puzzle');
  }

  create(): void {
    this.grid = Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => Phaser.Math.Between(0, TILE_COLORS.length - 1)));
    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.layout, this));
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onTap(p.x, p.y));
  }

  private layout(): void {
    const { width, height } = this.scale;
    this.cell = Math.floor(Math.min(width, height) / (SIZE + 0.6));
    this.origin = { x: (width - this.cell * SIZE) / 2, y: (height - this.cell * SIZE) / 2 };
    this.children.removeAll(true);
    this.add.rectangle(0, 0, width, height, SEA).setOrigin(0);
    this.add
      .rectangle(this.origin.x - 6, this.origin.y - 6, this.cell * SIZE + 12, this.cell * SIZE + 12, SEA_LIGHT)
      .setOrigin(0)
      .setStrokeStyle(2, PAPER, 0.25);
    this.tiles = this.grid.map((row, r) => row.map((_, c) => this.drawTile(r, c)));
  }

  private drawTile(r: number, c: number): Phaser.GameObjects.Graphics {
    const g = this.add.graphics();
    this.paint(g, r, c);
    return g;
  }

  private paint(g: Phaser.GameObjects.Graphics, r: number, c: number): void {
    const kind = this.grid[r][c];
    const s = this.cell;
    const x = this.origin.x + c * s + s / 2;
    const y = this.origin.y + r * s + s / 2;
    const rad = s * 0.36;
    const isSel = this.selected?.r === r && this.selected?.c === c;
    g.clear();
    g.fillStyle(TILE_COLORS[kind], 1);
    g.lineStyle(isSel ? 4 : 2, isSel ? 0xffffff : 0x000000, isSel ? 1 : 0.25);
    switch (kind) {
      case 0: g.fillCircle(x, y, rad); g.strokeCircle(x, y, rad); break;
      case 1: g.fillRect(x - rad, y - rad, rad * 2, rad * 2); g.strokeRect(x - rad, y - rad, rad * 2, rad * 2); break;
      case 2: g.fillTriangle(x, y - rad, x + rad, y + rad, x - rad, y + rad); g.strokeTriangle(x, y - rad, x + rad, y + rad, x - rad, y + rad); break;
      case 3: {
        const pts = [new Phaser.Math.Vector2(x, y - rad), new Phaser.Math.Vector2(x + rad, y), new Phaser.Math.Vector2(x, y + rad), new Phaser.Math.Vector2(x - rad, y)];
        g.fillPoints(pts, true); g.strokePoints(pts, true); break;
      }
      default: {
        const pts = Array.from({ length: 6 }, (_, i) => new Phaser.Math.Vector2(x + rad * Math.cos((Math.PI / 3) * i), y + rad * Math.sin((Math.PI / 3) * i)));
        g.fillPoints(pts, true); g.strokePoints(pts, true);
      }
    }
  }

  private onTap(px: number, py: number): void {
    const c = Math.floor((px - this.origin.x) / this.cell);
    const r = Math.floor((py - this.origin.y) / this.cell);
    if (r < 0 || c < 0 || r >= SIZE || c >= SIZE) return;
    const prev = this.selected;
    if (prev && Math.abs(prev.r - r) + Math.abs(prev.c - c) === 1) {
      [this.grid[r][c], this.grid[prev.r][prev.c]] = [this.grid[prev.r][prev.c], this.grid[r][c]];
      this.selected = null;
      this.paint(this.tiles[prev.r][prev.c], prev.r, prev.c);
      this.paint(this.tiles[r][c], r, c);
      this.game.events.emit('puzzle:swap', { from: prev, to: { r, c } });
      return;
    }
    this.selected = prev?.r === r && prev?.c === c ? null : { r, c };
    if (prev) this.paint(this.tiles[prev.r][prev.c], prev.r, prev.c);
    this.paint(this.tiles[r][c], r, c);
  }
}
