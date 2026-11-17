/**
 * Match-3 rules, with no drawing: the Phaser scene animates the steps this
 * returns. A swap is legal when it makes a line of three or more. Matched
 * tiles are cleared, tiles fall, new tiles come in from the top, and
 * cascades repeat until the board is still. A frozen tile is locked: it
 * cannot be swapped and does not fall, and it thaws when it is part of a
 * match or something beside it is cleared.
 *
 * Rigged near-win (game design, section 3): when rigging is on, new tiles are
 * not purely random. A director compares the player's progress with how many
 * moves are used. Ahead of the curve, new tiles avoid making matches and the
 * goal tile ("cool"); behind it, they favour both ("warm"). The result is that
 * most games end close to the goal, won or lost by a hair. With rigging off,
 * every new tile is uniformly random.
 *
 * Special tiles (Jonas, 2026-11-17, option A), free and earned by skill. Four
 * in a row leaves a rocket that clears its row or column from itself the
 * way its nose points, an L or T shape
 * leaves fireworks that clear the 3x3 around them; both have no kind (POWER)
 * and never match. Five in a row leaves a shining tile that keeps its kind
 * and clears every tile of that kind. A special goes off when it is tapped
 * (one move), swapped with any neighbour, or cleared by anything else.
 */
import type { Goal, Level } from './levels';
import { pick, type Rng } from './rng';

export interface Cell { r: number; c: number }
export interface Fall { from: Cell; to: Cell }
export interface Spawn { cell: Cell; kind: number; /** rows above the board it falls from */ dropFrom: number }
/** A rocket clears from itself the way its nose points (Jonas, 2026-11-17). */
export type Rocket = 'left' | 'right' | 'up' | 'down';
export type Special = Rocket | 'area' | 'all' | null;
export const isRocket = (s: Special | 'bomb'): s is Rocket => s === 'left' || s === 'right' || s === 'up' || s === 'down';
export interface Made { cell: Cell; kind: number; special: Special }
export interface Step {
  cleared: Cell[];
  iceBroken: Cell[];
  falls: Fall[];
  spawns: Spawn[];
  score: number;
  /** Special tiles made in this step (they stay on the board). */
  made: Made[];
  /** Specials that went off, for the effects. */
  blasts: { cell: Cell; special: Special | 'bomb' }[];
}
export interface SwapResult { valid: boolean; steps: Step[]; shuffled: boolean }
export type Status = 'playing' | 'won' | 'out-of-moves';
export type Mood = 'warm' | 'cool' | 'neutral';

const EMPTY = -1;
/** The compass from five in a row. It has no kind of its own and never matches. */
export const BOMB = 99;
/** A rocket or fireworks tile; which one is in `special`. */
export const POWER = 98;
/** A tile with no kind of its own: it goes off instead of matching. */
export const isFree = (k: number): boolean => k === BOMB || k === POWER;

export class Match3 {
  readonly level: Level;
  board: number[][];
  special: Special[][];
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
    this.special = Array.from({ length: level.rows }, () => Array(level.cols).fill(null));
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
    if (!this.rigged || this.level.noRig) return 'neutral';
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
    if (this.status() !== 'playing' || !this.isAdjacent(a, b) || !this.inside(a) || !this.inside(b) || this.ice[a.r][a.c] || this.ice[b.r][b.c]) {
      return { valid: false, steps: [], shuffled: false };
    }
    this.swapCells(a, b);
    const ka = this.board[a.r][a.c];
    const kb = this.board[b.r][b.c];
    const free = this.fires(a) || this.fires(b);
    if (!free && this.findMatches().length === 0) {
      this.swapCells(a, b);
      return { valid: false, steps: [], shuffled: false };
    }
    this.movesLeft--;
    this.movesUsed++;
    const steps: Step[] = [];
    let chain = 1;
    if (free) {
      const allAt = this.special[a.r][a.c] === 'all' ? a : this.special[b.r][b.c] === 'all' ? b : null;
      const bombAt = ka === BOMB ? a : kb === BOMB ? b : null;
      if (allAt) {
        // a shining tile takes every tile of its own kind; a special next to it goes off too
        const other = allAt === a ? b : a;
        const hit = [allAt, ...this.cellsOf(this.board[allAt.r][allAt.c])];
        if (this.fires(other)) hit.push(other);
        steps.push(this.resolve(hit, chain++, [], [{ cell: allAt, special: 'bomb' }]));
      } else if (bombAt) {
        const other = bombAt === a ? b : a;
        const kind = this.board[other.r][other.c];
        // two pearls clear the board; a pearl and a rocket or fireworks take
        // the most common kind and set the other one off too
        const hit = kind === BOMB ? this.allCells() : kind === POWER ? [bombAt, other, ...this.cellsOf(this.commonKind())] : [bombAt, ...this.cellsOf(kind)];
        steps.push(this.resolve(hit, chain++, [], [{ cell: bombAt, special: 'bomb' }]));
      } else {
        steps.push(this.resolve([a, b].filter((x) => this.fires(x)), chain++));
      }
    }
    while (this.status() !== 'won') {
      const groups = this.findGroups();
      if (groups.length === 0) break;
      // a special from the player's own swap lands where the tile was moved to
      steps.push(this.resolveGroups(groups, chain, chain === 1 ? [b, a] : []));
      chain++;
    }
    let shuffled = false;
    if (this.status() === 'playing' && !this.hasMove()) {
      this.shuffle();
      shuffled = true;
    }
    return { valid: true, steps, shuffled };
  }

  /** Tapping a special sets it off where it stands, for one move. */
  fire(cell: Cell): SwapResult {
    if (this.status() !== 'playing' || !this.inside(cell) || this.ice[cell.r][cell.c] || !this.fires(cell)) return { valid: false, steps: [], shuffled: false };
    this.movesLeft--;
    this.movesUsed++;
    return this.settle([cell]);
  }

  /** The hammer: removes one tile without using a move, then lets the board settle. */
  smash(cell: Cell): SwapResult {
    if (this.status() !== 'playing' || !this.inside(cell)) return { valid: false, steps: [], shuffled: false };
    return this.settle([cell]);
  }

  private allCells(): Cell[] {
    const out: Cell[] = [];
    for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) out.push({ r, c });
    return out;
  }

  /** A tile that goes off when tapped or swapped: a rocket, fireworks, the pearl or a shining tile. */
  fires(p: Cell): boolean {
    return isFree(this.board[p.r][p.c]) || this.special[p.r][p.c] === 'all';
  }

  /** The kind with the most tiles on the board. */
  private commonKind(): number {
    const counts = new Map<number, number>();
    for (const x of this.allCells()) { const k = this.board[x.r][x.c]; if (k >= 0 && !isFree(k)) counts.set(k, (counts.get(k) ?? 0) + 1); }
    return [...counts.entries()].sort((p, q) => q[1] - p[1])[0]?.[0] ?? -2;
  }

  private cellsOf(kind: number): Cell[] {
    return this.allCells().filter(({ r, c }) => this.board[r][c] === kind);
  }

  /** The shuffler: mixes the tiles without using a move. */
  mix(): void {
    if (this.status() === 'playing') this.shuffle();
  }

  private settle(first: Cell[]): SwapResult {
    const steps: Step[] = [this.resolve(first, 1)];
    let chain = 2;
    while (this.status() !== 'won') {
      const groups = this.findGroups();
      if (groups.length === 0) break;
      steps.push(this.resolveGroups(groups, chain++, []));
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
          if (!this.inside(b) || this.ice[a.r][a.c] || this.ice[b.r][b.c]) continue;
          if (this.fires(a) || this.fires(b)) return [a, b];
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
    const s = this.special[a.r][a.c];
    this.special[a.r][a.c] = this.special[b.r][b.c];
    this.special[b.r][b.c] = s;
  }

  /**
   * The lines of 3+ on the board, joined into groups where lines of the same
   * kind cross or touch (an L or T shape is one group).
   */
  findGroups(): { cells: Cell[]; longest: number; across: boolean; down: boolean }[] {
    const runs: { cells: Cell[]; dir: 'h' | 'v' }[] = [];
    const real = (k: number) => k !== EMPTY && !isFree(k);
    for (let r = 0; r < this.rows; r++) {
      let start = 0;
      for (let c = 1; c <= this.cols; c++) {
        if (c < this.cols && real(this.board[r][c]) && this.board[r][c] === this.board[r][start]) continue;
        if (c - start >= 3 && real(this.board[r][start])) runs.push({ dir: 'h', cells: Array.from({ length: c - start }, (_, i) => ({ r, c: start + i })) });
        start = c;
      }
    }
    for (let c = 0; c < this.cols; c++) {
      let start = 0;
      for (let r = 1; r <= this.rows; r++) {
        if (r < this.rows && real(this.board[r][c]) && this.board[r][c] === this.board[start][c]) continue;
        if (r - start >= 3 && real(this.board[start][c])) runs.push({ dir: 'v', cells: Array.from({ length: r - start }, (_, i) => ({ r: start + i, c })) });
        start = r;
      }
    }
    // union runs that share a cell
    const parent = runs.map((_, i) => i);
    const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
    const owner = new Map<number, number>();
    runs.forEach((run, i) => {
      for (const { r, c } of run.cells) {
        const key = r * this.cols + c;
        const j = owner.get(key);
        if (j === undefined) owner.set(key, i);
        else parent[find(i)] = find(j);
      }
    });
    const groups = new Map<number, { cells: Map<number, Cell>; longest: number; across: boolean; down: boolean }>();
    runs.forEach((run, i) => {
      const root = find(i);
      const g = groups.get(root) ?? { cells: new Map(), longest: 0, across: false, down: false };
      for (const cell of run.cells) g.cells.set(cell.r * this.cols + cell.c, cell);
      g.longest = Math.max(g.longest, run.cells.length);
      if (run.dir === 'h') g.across = true; else g.down = true;
      groups.set(root, g);
    });
    return [...groups.values()].map((g) => ({ ...g, cells: [...g.cells.values()] }));
  }

  /** Clears the groups and leaves a special tile where a group earned one. */
  private resolveGroups(groups: ReturnType<Match3['findGroups']>, chain: number, focus: Cell[]): Step {
    const made: Made[] = [];
    const cleared: Cell[] = [];
    for (const g of groups) {
      let special: Special | 'bomb' = null;
      if (g.longest >= 5) special = 'bomb';
      else if (g.across && g.down) special = 'area';
      else if (g.longest === 4) special = g.across ? 'right' : 'down'; // turned toward the bigger side below
      if (!special) { cleared.push(...g.cells); continue; }
      const at = g.cells.find((x) => focus.some((f) => f.r === x.r && f.c === x.c)) ?? g.cells[Math.floor(g.cells.length / 2)];
      // a rocket's nose points to the side of the board with more tiles to take
      if (special === 'right' && at.c > this.cols - 1 - at.c) special = 'left';
      if (special === 'down' && at.r > this.rows - 1 - at.r) special = 'up';
      for (const x of g.cells) if (x !== at) cleared.push(x);
      const kind = this.board[at.r][at.c];
      // The tile that becomes special counts as collected now.
      const wasSpecial = this.special[at.r][at.c];
      if (wasSpecial) cleared.push({ ...at }); // an old special in the group goes off, and is counted there
      else if (special !== 'bomb') {
        // (a shining tile keeps its kind and is counted when it goes)
        const goal = this.level.goal;
        if (goal.type === 'collect' && kind === goal.kind) this.collected++;
      }
      // five in a row: the tile keeps its kind and shines (Jonas 2026-11-17, the pearl was unclear)
      made.push({ cell: at, kind: special === 'bomb' ? kind : POWER, special: special === 'bomb' ? 'all' : special });
    }
    return this.resolve(cleared, chain, made);
  }

  /** All cells that are part of a horizontal or vertical line of 3+. */
  findMatches(): Cell[] {
    const hit: boolean[][] = Array.from({ length: this.rows }, () => Array(this.cols).fill(false));
    const scan = (len: number, other: number, get: (i: number, j: number) => number, mark: (i: number, j: number) => void) => {
      for (let j = 0; j < other; j++) {
        let run = 1;
        for (let i = 1; i <= len; i++) {
          const same = i < len && get(i, j) !== EMPTY && !isFree(get(i, j)) && get(i, j) === get(i - 1, j);
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

  private resolve(first: Cell[], chain: number, made: Made[] = [], blasts: Step['blasts'] = []): Step {
    const goal = this.level.goal;
    const iceBroken: Cell[] = [];
    // Cleared specials set off their effect, which can set off others.
    const seen = new Set<number>();
    const keep = new Set(made.filter((m) => !first.some((f) => f.r === m.cell.r && f.c === m.cell.c)).map((m) => m.cell.r * this.cols + m.cell.c));
    const matched: Cell[] = [];
    const queue = [...first];
    while (queue.length) {
      const { r, c } = queue.shift()!;
      const key = r * this.cols + c;
      if (seen.has(key) || keep.has(key) || !this.inside({ r, c })) continue;
      seen.add(key);
      matched.push({ r, c });
      const sp = this.special[r][c];
      if (sp === 'right') for (let cc = c + 1; cc < this.cols; cc++) queue.push({ r, c: cc });
      if (sp === 'left') for (let cc = c - 1; cc >= 0; cc--) queue.push({ r, c: cc });
      if (sp === 'down') for (let rr = r + 1; rr < this.rows; rr++) queue.push({ r: rr, c });
      if (sp === 'up') for (let rr = r - 1; rr >= 0; rr--) queue.push({ r: rr, c });
      if (sp === 'area') for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) queue.push({ r: r + dr, c: c + dc });
      if (sp === 'all') {
        queue.push(...this.cellsOf(this.board[r][c]));
        blasts.push({ cell: { r, c }, special: 'bomb' });
      } else if (sp) blasts.push({ cell: { r, c }, special: sp });
      if (this.board[r][c] === BOMB && !blasts.some((b) => b.cell.r === r && b.cell.c === c)) {
        // a pearl tapped or hit by a blast takes the most common kind with it
        queue.push(...this.cellsOf(this.commonKind()));
        blasts.push({ cell: { r, c }, special: 'bomb' });
      }
    }
    // Something cleared beside a frozen tile thaws it; the tile stays (Jonas, 2026-11-17).
    const gone = new Set(matched.map(({ r, c }) => r * this.cols + c));
    for (const { r, c } of matched) {
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = { r: r + dr, c: c + dc };
        if (this.inside(n) && this.ice[n.r][n.c] && !gone.has(n.r * this.cols + n.c)) { this.ice[n.r][n.c] = false; iceBroken.push(n); }
      }
    }
    for (const { r, c } of matched) {
      if (goal.type === 'collect' && this.board[r][c] === goal.kind) this.collected++;
      if (this.ice[r][c]) { this.ice[r][c] = false; iceBroken.push({ r, c }); }
      this.board[r][c] = EMPTY;
      this.special[r][c] = null;
    }
    for (const m of made) {
      const { r, c } = m.cell;
      if (this.ice[r][c]) { this.ice[r][c] = false; iceBroken.push({ r, c }); }
      this.board[m.cell.r][m.cell.c] = m.kind;
      this.special[m.cell.r][m.cell.c] = m.special;
    }
    const score = matched.length * 20 * chain + Math.max(0, matched.length - 3) * 30 + made.length * 60;
    this.score += score;

    // gravity: a frozen tile stays put, so each column falls in stretches
    // between frozen tiles
    const falls: Fall[] = [];
    const frozen = (r: number, c: number) => this.ice[r][c] && this.board[r][c] !== EMPTY;
    for (let c = 0; c < this.cols; c++) {
      let write = this.rows - 1;
      for (let r = this.rows - 1; r >= 0; r--) {
        if (frozen(r, c)) { write = r - 1; continue; }
        if (this.board[r][c] === EMPTY) continue;
        if (r !== write) {
          this.board[write][c] = this.board[r][c];
          this.board[r][c] = EMPTY;
          this.special[write][c] = this.special[r][c];
          this.special[r][c] = null;
          falls.push({ from: { r, c }, to: { r: write, c } });
        }
        write--;
      }
    }

    // refill, bottom-up in each stretch so the director sees the neighbours below
    const spawns: Spawn[] = [];
    const mood = this.mood();
    for (let c = 0; c < this.cols; c++) {
      let bottom = this.rows - 1;
      while (bottom >= 0) {
        let top = bottom;
        while (top > 0 && !frozen(top - 1, c)) top--;
        let empties = 0;
        for (let r = top; r <= bottom; r++) if (this.board[r][c] === EMPTY) empties++;
        for (let r = top + empties - 1; r >= top; r--) {
          const kind = this.chooseKind(r, c, mood);
          this.board[r][c] = kind;
          spawns.push({ cell: { r, c }, kind, dropFrom: empties });
        }
        bottom = top - 2; // skip the frozen tile above this stretch
      }
    }
    return { cleared: matched, iceBroken, falls, spawns, score, made, blasts };
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
    // frozen tiles stay where they are
    const spots = this.allCells().filter(({ r, c }) => !this.ice[r][c]);
    const tiles = spots.map(({ r, c }) => ({ k: this.board[r][c], s: this.special[r][c] }));
    for (let attempt = 0; attempt < 100; attempt++) {
      for (let i = tiles.length - 1; i > 0; i--) {
        const j = Math.floor(this.rng() * (i + 1));
        [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
      }
      spots.forEach(({ r, c }, i) => {
        this.board[r][c] = tiles[i].k;
        this.special[r][c] = tiles[i].s;
      });
      if (this.findMatches().length === 0 && this.hasMove()) return;
    }
    this.board = this.freshBoard();
    this.special = Array.from({ length: this.rows }, () => Array(this.cols).fill(null));
  }
}
