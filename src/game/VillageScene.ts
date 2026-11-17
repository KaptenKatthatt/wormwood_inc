import Phaser from 'phaser';
import { FALU, GRASS, PAPER, ROCK, SEA } from './palette';

export interface PlotView { id: string; name: string; level: number; building: boolean; progress: number; locked?: boolean }

/** Placeholder village on a headland. Svelte puts the plots in the registry as 'plots'. */
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
    const rx = Math.min(width * 0.47, height * 0.75);
    const ry = Math.min(height * 0.42, rx * 0.7);
    this.add.ellipse(cx, cy + ry * 0.12, rx * 2.05, ry * 2.05, ROCK);
    this.add.ellipse(cx, cy, rx * 1.9, ry * 1.85, GRASS);

    const plots: PlotView[] = this.registry.get('plots') ?? [];
    // The first five sit in the middle; the last three on the outer land that is cleared later.
    const spots = [[0, -0.12], [-0.52, 0.08], [0.52, 0.08], [-0.26, 0.52], [0.26, 0.52], [-0.6, -0.52], [0.6, -0.52], [0, -0.7]];
    const s = Math.min(rx * 0.24, ry * 0.42);
    const font = `${Math.max(11, Math.round(s * 0.2))}px`;
    plots.forEach((p, i) => {
      const [dx, dy] = spots[i] ?? [0, 0];
      const x = cx + dx * rx;
      const y = cy + dy * ry;
      const w = s;
      const h = s * 0.62;
      if (p.locked) {
        // forest still standing on the plot
        for (const [tx, ty] of [[-0.3, 0.1], [0.05, -0.15], [0.32, 0.12], [-0.05, 0.3]]) {
          const px = x + tx * w;
          const py = y + ty * h;
          this.add.triangle(px, py, 0, h * 0.7, w * 0.2, 0, w * 0.4, h * 0.7, 0x3f6d3a).setStrokeStyle(1, 0x24451f);
        }
      } else if (p.level === 0 && !p.building) {
        this.add.rectangle(x, y, w, h, 0x000000, 0.15).setStrokeStyle(2, PAPER, 0.6);
      } else {
        const body = p.level > 0 ? FALU : 0x000000;
        this.add.rectangle(x, y, w, h, body, p.level > 0 ? 1 : 0.15).setStrokeStyle(2, p.level > 0 ? 0x000000 : PAPER, p.level > 0 ? 0.3 : 0.8);
        if (p.level > 0) {
          const roof = this.add.graphics();
          roof.fillStyle(0x3a2f2a, 1);
          roof.fillTriangle(x - w * 0.6, y - h / 2, x + w * 0.6, y - h / 2, x, y - h / 2 - w * 0.35);
          this.add.rectangle(x, y + h * 0.18, w * 0.18, h * 0.5, PAPER);
        }
        if (p.building) {
          // scaffold filling up as the build runs
          this.add.rectangle(x - w / 2 - 6, y + h / 2, 6, h * p.progress, 0xd9a441).setOrigin(0, 1);
          this.add.rectangle(x, y, w + 12, h + 8).setStrokeStyle(2, 0xd9a441, 0.9);
        }
      }
      const label = p.locked ? '' : p.level > 0 ? `${p.name} ${p.level}` : p.name;
      this.add.text(x, y + h / 2 + 4, label, { fontFamily: 'system-ui, sans-serif', fontSize: font, color: '#f3ece4', fontStyle: 'bold', stroke: '#5a1d14', strokeThickness: 3 }).setOrigin(0.5, 0);
    });
  }
}
