import Phaser from 'phaser';
import { FALU, GRASS, PAPER, ROCK, SEA } from './palette';

export interface PlotView { plot: number; state: 'empty' | 'building' | 'built'; progress: number }

/**
 * Placeholder village: an island with three plots. Svelte owns the state and
 * puts it in the game registry as 'plots'; this scene only draws it.
 */
export class VillageScene extends Phaser.Scene {
  constructor() {
    super('village');
  }

  create(): void {
    this.draw();
    this.scale.on('resize', this.draw, this);
    this.registry.events.on('changedata-plots', this.draw, this);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.draw, this);
      this.registry.events.off('changedata-plots', this.draw, this);
    });
  }

  private draw(): void {
    const { width, height } = this.scale;
    this.children.removeAll(true);
    this.add.rectangle(0, 0, width, height, SEA).setOrigin(0);
    const cx = width / 2;
    const cy = height / 2;
    const r = Math.min(width, height) * 0.42;
    this.add.ellipse(cx, cy + r * 0.08, r * 2.1, r * 1.3, ROCK);
    this.add.ellipse(cx, cy, r * 1.9, r * 1.1, GRASS);

    const plots: PlotView[] = this.registry.get('plots') ?? [];
    const spots = [[-0.55, -0.1], [0, 0.18], [0.55, -0.1]];
    spots.forEach(([dx, dy], i) => {
      const x = cx + dx * r;
      const y = cy + dy * r;
      const s = r * 0.32;
      const p = plots.find((q) => q.plot === i);
      if (!p || p.state === 'empty') {
        this.add.rectangle(x, y, s, s * 0.7, 0x000000, 0.15).setStrokeStyle(2, PAPER, 0.6);
        this.add.text(x, y, String(i + 1), { fontFamily: 'system-ui', fontSize: `${Math.round(s * 0.3)}px`, color: '#f3ece4' }).setOrigin(0.5);
        return;
      }
      if (p.state === 'building') {
        // scaffold that fills up as the timer runs
        this.add.rectangle(x, y, s, s * 0.7).setStrokeStyle(2, PAPER, 0.9);
        const h = s * 0.7 * p.progress;
        this.add.rectangle(x - s / 2, y + s * 0.35 - h, s, h, FALU, 0.6).setOrigin(0);
        return;
      }
      this.add.rectangle(x, y, s, s * 0.7, FALU).setStrokeStyle(2, 0x000000, 0.3);
      const roof = this.add.graphics();
      roof.fillStyle(0x3a2f2a, 1);
      roof.fillTriangle(x - s * 0.6, y - s * 0.35, x + s * 0.6, y - s * 0.35, x, y - s * 0.75);
      this.add.rectangle(x, y + s * 0.12, s * 0.2, s * 0.3, PAPER);
    });
  }
}
