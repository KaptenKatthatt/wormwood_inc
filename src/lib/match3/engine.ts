/**
 * Match-3 rules, with no drawing: the Phaser scene animates the steps this
 * returns. A swap is legal when it makes a line of three or more. Matched
 * tiles are cleared (and the ice under them breaks), tiles fall, new tiles
 * come in from the top, and cascades repeat until the board is still.
 *
 * Rigged near-win (game design, section 3): when rigging is on, new tiles are
 * not purely random. A director compares the player's progress with how many
 * moves are used. Ahead of the curve, new tiles avoid making matches and the
 * goal tile ("cool"); behind it, they favour both ("warm"). The result is that
 * most games end close to the goal, won or lost by a hair. With rigging off,
 * every new tile is uniformly random.
 */
import type { Goal, Level } from './levels';
import { pick, type Rng } from './rng';

export interface Cell { r: number; c: number }
export interface Fall { from: Cell; to: Cell }
export interface Spawn { cell: Cell; kind: number; /** rows above the board it falls from */ dropFrom: number }
export interface Step { cleared: Cell[]; iceBroken: Cell[]; falls: Fall[]; spawns: Spawn[]; score: number; }
export interface SwapResult { valid: boolean; steps: Step[]; shuffled: boolean }
export type Status = 'playing' | 'won' | 'out-of-moves';
export type Mood = 'warm' | 'cool' | 'neutral';

const EMPTY = -1;

export class Match3 {
  readonly level: Level;
  board: number[][];
  ice: boolean[][];
  movesLeft: number;
  movesUsed = 0;
  extraMoves = 0;
  score = 0;
  collected = 0;
  iceTotal: number;
  rigged: boolean;
  private rng: Rng;

  constructor(level: Level, rng: Rng, rigged: boolean, board?: number[][]) {
    this.level = level;
    this.rng = rng;
    this.rigged = rigged;
    this.movesLeft = level.moves;
    this.ice = Array.from({ length: level.rows }, () => Array(level.cols).fill(false));
    for (const [r, c] of level.ice ?? []) this.ice[r][c] = true;
    this.iceTotal = (level.ice ?? []).length;
    this.board = board ?? this.freshBoard();
  }

  // ---------------------------------------------------------------- queries

  get rows(): number { return this.level.rows; }
  get cols(): number { return this.level.cols; }

  iceLeft(): number {
    return this.ice.reduce((n, row) => n + row.filter(Boolean).length, 0);
  }

  /** 0..1 of the way to the goal. */
  progress(): number {
    const g = this.level.goal;
    if (g.type === 'collect') return Math.min(1, this.collected / g.count);
    if (g.type === 'ice') return this.iceTotal === 0 ? 1 : 1 - this.iceLeft() / this.iceTotal;
    return Math.min(1, this.score / g.score);
  }

  /** What is left, in the goal's own unit (tiles, ice, points). */
  remaining(): number {
    const g = this.level.goal;
    if (g.type === 'collect') return Math.max(0, g.count - this.collected);
    if (g.type === 'ice') return this.iceLeft();
    return Math.max(0, g.score - this.score);
  }

  status(): Status {
    if (this.progress() >= 1) return 'won';
    if (this.movesLeft <= 0) return 'out-of-moves';
    return 'playing';
  }

  addMoves(n: number): void {
    this.movesLeft += n;
    this.extraMoves += n;
  }

  /** How the director wants new tiles to behave right now. */
  mood(): Mood {
    if (!this.rigged) return 'neutral';
    const total = this.level.moves + this.extraMoves;
    // Aim to reach the goal on the very last move.
    const expected = Math.min(1, ((this.movesUsed + 1) / total) * this.level.rigTarget);
    const p = this.progress();
    if (p > expected + 0.04) return 'cool';
    if (p < expected - 0.12) return 'warm';
    return 'neutral';
  }

  // ---------------------------------------------------------------- moves

  isAdjacent(a: Cell, b: Cell): boolean {
    return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
  }

  trySwap(a: Cell, b: Cell): SwapResult {
    if (this.status() !== 'playing' || !this.isAdjacent(a, b) || !this.inside(a) || !this.inside(b)) {
      return { valid: false, steps: [], shuffled: false };
    }
    this.swapCells(a, b);
    if (this.findMatches().length === 0) {
      this.swapCells(a, b);
      return { valid: false, steps: [], shuffled: false };
    }
    this.movesLeft--;
    this.movesUsed++;
    const steps: Step[] = [];
    let chain = 1;
    for (;;) {
      const matched = this.findMatches();
      if (matched.length === 0) break;
      steps.push(this.resolve(matched, chain));
      chain++;
      if (this.status() === 'won') break;
    }
    let shuffled = false;
    if (this.status() === 'playing' && !this.hasMove()) {
      this.shuffle();
      shuffled = true;
    }
    return { valid: true, steps, shuffled };
  }

  /** A legal move, if any (used for hints and the no-moves shuffle). */
  findMove(): [Cell, Cell] | null {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        for (const [dr, dc] of [[0, 1], [1, 0]]) {
          const a = { r, c };
          const b = { r: r + dr, c: c + dc };
          if (!this.inside(b)) continue;
          this.swapCells(a, b);
          const ok = this.findMatches().length > 0;
          this.swapCells(a, b);
          if (ok) return [a, b];
        }
      }
    }
    return null;
  }

  hasMove(): boolean { return this.findMove() !== null; }

  // ---------------------------------------------------------------- internals

  private inside(p: Cell): boolean {
    return p.r >= 0 && p.c >= 0 && p.r < this.rows && p.c < this.cols;
  }

  private swapCells(a: Cell, b: Cell): void {
    const t = this.board[a.r][a.c];
    this.board[a.r][a.c] = this.board[b.r][b.c];
    this.board[b.r][b.c] = t;
  }

  /** All cells that are part of a horizontal or vertical line of 3+. */
  findMatches(): Cell[] {
    const hit: boolean[][] = Array.from({ length: this.rows }, () => Array(this.cols).fill(false));
    const scan = (len: number, other: number, get: (i: number, j: number) => number, mark: (i: number, j: number) => void) => {
      for (let j = 0; j < other; j++) {
        let run = 1;
        for (let i = 1; i <= len; i++) {
          const same = i < len && get(i, j) !== EMPTY && get(i, j) === get(i - 1, j);
          if (same) { run++; continue; }
          if (run >= 3) for (let k = i - run; k < i; k++) mark(k, j);
          run = 1;
        }
      }
    };
    scan(this.cols, this.rows, (i, j) => this.board[j][i], (i, j) => (hit[j][i] = true));
    scan(this.rows, this.cols, (i, j) => this.board[i][j], (i, j) => (hit[i][j] = true));
    const out: Cell[] = [];
    for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) if (hit[r][c]) out.push({ r, c });
    return out;
  }

  private resolve(matched: Cell[], chain: number): Step {
    const goal = this.level.goal;
    const iceBroken: Cell[] = [];
    for (const { r, c } of matched) {
      if (goal.type === 'collect' && this.board[r][c] === goal.kind) this.collected++;
      if (this.ice[r][c]) { this.ice[r][c] = false; iceBroken.push({ r, c }); }
      this.board[r][c] = EMPTY;
    }
    const score = matched.length * 20 * chain + Math.max(0, matched.length - 3) * 30;
    this.score += score;

    // gravity
    const falls: Fall[] = [];
    for (let c = 0; c < this.cols; c++) {
      let write = this.rows - 1;
      for (let r = this.rows - 1; r >= 0; r--) {
        if (this.board[r][c] === EMPTY) continue;
        if (r !== write) {
          this.board[write][c] = this.board[r][c];
          this.board[r][c] = EMPTY;
          falls.push({ from: { r, c }, to: { r: write, c } });
        }
        write--;
      }
    }

    // refill, bottom-up in each column so the director sees the neighbours below
    const spawns: Spawn[] = [];
    const mood = this.mood();
    for (let c = 0; c < this.cols; c++) {
      let empties = 0;
      for (let r = 0; r < this.rows; r++) if (this.board[r][c] === EMPTY) empties++;
      for (let r = empties - 1; r >= 0; r--) {
        const kind = this.chooseKind(r, c, mood);
        this.board[r][c] = kind;
        spawns.push({ cell: { r, c }, kind, dropFrom: empties });
      }
    }
    return { cleared: matched, iceBroken, falls, spawns, score };
  }

  /** Would `kind` at (r, c) complete a line of three with tiles already placed? */
  private makesLine(r: number, c: number, kind: number): boolean {
    const at = (rr: number, cc: number) => (rr >= 0 && cc >= 0 && rr < this.rows && cc < this.cols ? this.board[rr][cc] : -2);
    const h = (at(r, c - 1) === kind && at(r, c - 2) === kind) || (at(r, c + 1) === kind && at(r, c + 2) === kind) || (at(r, c - 1) === kind && at(r, c + 1) === kind);
    const v = (at(r + 1, c) === kind && at(r + 2, c) === kind) || (at(r - 1, c) === kind && at(r + 1, c) === kind) || (at(r - 1, c) === kind && at(r - 2, c) === kind);
    return h || v;
  }

  private chooseKind(r: number, c: number, mood: Mood): number {
    const k = this.level.kinds;
    if (mood === 'neutral') return Math.floor(this.rng() * k);
    const goal: Goal = this.level.goal;
    const goalKind = goal.type === 'collect' ? goal.kind : -1;
    const weights = Array.from({ length: k }, (_, kind) => {
      const line = this.makesLine(r, c, kind);
      if (mood === 'cool') return (line ? 0.05 : 1) * (kind === goalKind ? 0.3 : 1);
      return (line ? 4 : 1) * (kind === goalKind ? 3 : 1);
    });
    return pick(this.rng, weights);
  }

  private freshBoard(): number[][] {
    for (let attempt = 0; attempt < 100; attempt++) {
      const b: number[][] = Array.from({ length: this.rows }, () => Array(this.cols).fill(EMPTY));
      this.board = b;
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          const options = Array.from({ length: this.level.kinds }, (_, k) => k).filter((k) => !this.makesLine(r, c, k));
          b[r][c] = options[Math.floor(this.rng() * options.length)];
        }
      }
      if (this.findMatches().length === 0 && this.hasMove()) return b;
    }
    return this.board;
  }

  private shuffle(): void {
    const tiles = this.board.flat();
    for (let attempt = 0; attempt < 100; attempt++) {
      for (let i = tiles.length - 1; i > 0; i--) {
        const j = Math.floor(this.rng() * (i + 1));
        [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
      }
      for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) this.board[r][c] = tiles[r * this.cols + c];
      if (this.findMatches().length === 0 && this.hasMove()) return;
    }
    this.board = this.freshBoard();
  }
}
