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
 *
 * Obstacles (Jonas, 2026-11-18, option C), two for each region. Ice and snow
 * cover a tile in one or two layers and lock it; each match on it or clear
 * beside it takes a layer. Moss lies under a tile and goes when that tile is
 * cleared. Seaweed, stones and logs are blocks in place of a tile: seaweed
 * goes when something beside it is cleared and grows by one cell after each
 * move that clears none; stones break only from specials (and the hammer);
 * logs fall like tiles and are collected when they reach the bottom row.
 */
import type { Goal, Level } from './levels';
import { pick, type Rng } from './rng';

export interface Cell { r: number; c: number }
export interface Fall { from: Cell; to: Cell }
export interface Spawn { cell: Cell; kind: number; /** rows above the board it falls from */ dropFrom: number }
/** A rocket clears from itself the way its nose points (Jonas, 2026-11-17). */
export type Rocket = 'left' | 'right' | 'up' | 'down';
export type Special = Rocket | 'area' | 'all' | null;
/** The flame behind a rocket burns the rest of its line (Jonas, 2026-11-17). */
export const ROCKET_BOTH_WAYS = true;
/** Bonus gold per move left when a challenge is won. */
export const FINALE_GOLD = 5;
export const isRocket = (s: Special | 'bomb'): s is Rocket => s === 'left' || s === 'right' || s === 'up' || s === 'down';
export interface Made { cell: Cell; kind: number; special: Special }
export interface Step {
  cleared: Cell[];
  /** Cells whose ice or snow lost a layer, with the layers left. */
  iceBroken: (Cell & { left: number })[];
  /** Cells whose moss went. */
  mossGone: Cell[];
  /** Hard blocks (ore, beach stones) that took a hit and still stand, with the hits left. */
  blockHit?: (Cell & { left: number })[];
  /** Hay bales that rolled one step; `out` when they rolled off the board. */
  rolled?: { from: Cell; to: Cell; out: boolean }[];
  falls: Fall[];
  spawns: Spawn[];
  score: number;
  /** Special tiles made in this step (they stay on the board). */
  made: Made[];
  /** Specials that went off, for the effects. */
  blasts: { cell: Cell; special: Special | 'bomb' }[];
}
export interface SwapResult { valid: boolean; steps: Step[]; shuffled: boolean; /** Where seaweed grew after the move. */ grew?: Cell }
export type Status = 'playing' | 'won' | 'out-of-moves';
export type Mood = 'warm' | 'cool' | 'neutral';

const EMPTY = -1;
/** The compass from five in a row. It has no kind of its own and never matches. */
export const BOMB = 99;
/** A rocket or fireworks tile; which one is in `special`. */
export const POWER = 98;
/** A tile with no kind of its own: it goes off instead of matching. */
export const isFree = (k: number): boolean => k === BOMB || k === POWER;
/** Blocks that stand in place of a tile. */
export const TANG = 97;
export const STEN = 96;
export const STOCK = 95;
/** The later worlds' blocks (2026-11-18): ore takes two hits, beach stones three, a hay bale rolls. */
export const MALM = 94;
export const KLAPPER = 93;
export const HOBAL = 92;
export const isBlock = (k: number): boolean => k === TANG || k === STEN || k === STOCK || k === MALM || k === KLAPPER || k === HOBAL;
/** Hits a hard block takes before it breaks. */
export const BLOCK_HITS: Record<number, number> = { [MALM]: 2, [KLAPPER]: 3 };
/** The board value of each block a goal can name. */
export const BLOCK_OF = { tang: TANG, sten: STEN, malm: MALM, klapper: KLAPPER, hobal: HOBAL } as const;
/** An ordinary tile of some kind, which can match. */
export const isTile = (k: number): boolean => k >= 0 && k < 90;

export class Match3 {
  readonly level: Level;
  board: number[][];
  special: Special[][];
  /** Layers of ice or snow on each cell (0 for none). */
  ice: number[][];
  moss: boolean[][];
  mossTotal: number;
  /** Hits left on each hard block (0 elsewhere). */
  hp: number[][];
  /** Seaweed or stones cleared, for the block goal. */
  blocksCleared = 0;
  /** Logs that reached the bottom. */
  stocksOut = 0;
  private tangThisMove = 0;
  movesLeft: number;
  movesUsed = 0;
  extraMoves = 0;
  score = 0;
  collected = 0;
  iceTotal: number;
  rigged: boolean;
  /** Moves left when the goal was reached, kept for the stars after the finale spends them. */
  leftAtWin = -1;
  private rng: Rng;

  constructor(level: Level, rng: Rng, rigged: boolean, board?: number[][]) {
    this.level = level;
    this.rng = rng;
    this.rigged = rigged;
    this.movesLeft = level.moves;
    this.ice = Array.from({ length: level.rows }, () => Array(level.cols).fill(0));
    for (const [r, c, n] of level.ice ?? []) this.ice[r][c] = n ?? 1;
    this.iceTotal = this.iceLeft();
    this.moss = Array.from({ length: level.rows }, () => Array(level.cols).fill(false));
    for (const [r, c] of level.moss ?? []) this.moss[r][c] = true;
    this.mossTotal = (level.moss ?? []).length;
    this.special = Array.from({ length: level.rows }, () => Array(level.cols).fill(null));
    this.board = board ?? this.freshBoard();
    this.hp = this.board.map((row) => row.map((k) => BLOCK_HITS[k] ?? 0));
  }

  // ---------------------------------------------------------------- queries

  get rows(): number { return this.level.rows; }
  get cols(): number { return this.level.cols; }

  iceLeft(): number {
    return this.ice.reduce((n, row) => n + row.reduce((a, b) => a + b, 0), 0);
  }

  mossLeft(): number {
    return this.moss.reduce((n, row) => n + row.filter(Boolean).length, 0);
  }

  /** How many cells hold this block. */
  countOf(block: number): number {
    return this.board.reduce((n, row) => n + row.filter((k) => k === block).length, 0);
  }

  /** 0..1 of the way to the goal. */
  progress(): number {
    const g = this.level.goal;
    if (g.type === 'collect') return Math.min(1, this.collected / g.count);
    if (g.type === 'ice') return this.iceTotal === 0 ? 1 : 1 - this.iceLeft() / this.iceTotal;
    if (g.type === 'moss') return this.mossTotal === 0 ? 1 : 1 - this.mossLeft() / this.mossTotal;
    if (g.type === 'block') return this.countOf(BLOCK_OF[g.block]) === 0 ? 1 : Math.min(1, this.blocksCleared / g.count);
    if (g.type === 'stock') return Math.min(1, this.stocksOut / g.count);
    return Math.min(1, this.score / g.score);
  }

  /** What is left, in the goal's own unit (tiles, ice, points). */
  remaining(): number {
    const g = this.level.goal;
    if (g.type === 'collect') return Math.max(0, g.count - this.collected);
    if (g.type === 'ice') return this.iceLeft();
    if (g.type === 'moss') return this.mossLeft();
    if (g.type === 'block') return this.countOf(BLOCK_OF[g.block]) === 0 ? 0 : Math.max(0, g.count - this.blocksCleared);
    if (g.type === 'stock') return Math.max(0, g.count - this.stocksOut);
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
    if (this.status() !== 'playing' || !this.isAdjacent(a, b) || !this.inside(a) || !this.inside(b) || this.locked(a) || this.locked(b)) {
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
    this.tangThisMove = 0;
    const steps: Step[] = [];
    let chain = 1;
    if (this.fires(a) && this.fires(b)) {
      steps.push(this.combo(a, b, chain++));
    } else if (free) {
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
      if (groups.length === 0) {
        const logs = this.logsAtBottom();
        if (logs.length === 0) break;
        steps.push(this.resolve(logs, chain++, [], [], true));
        continue;
      }
      // a special from the player's own swap lands where the tile was moved to
      steps.push(this.resolveGroups(groups, chain, chain === 1 ? [b, a] : []));
      chain++;
    }
    return { valid: true, steps, ...this.afterMove() };
  }

  /** A frozen, snowed-in or block cell cannot be moved. */
  locked(p: Cell): boolean {
    return this.ice[p.r][p.c] > 0 || isBlock(this.board[p.r][p.c]);
  }

  /** Logs standing on the bottom row, ready to be collected. */
  private logsAtBottom(): Cell[] {
    const r = this.rows - 1;
    return this.allCells().filter((p) => p.r === r && this.board[p.r][p.c] === STOCK);
  }

  /** After a move: seaweed grows if none was cleared, and a stuck board is shuffled. */
  private afterMove(): { shuffled: boolean; grew?: Cell } {
    let grew: Cell | undefined;
    if (this.status() === 'playing' && this.tangThisMove === 0) grew = this.growTang();
    let shuffled = false;
    if (this.status() === 'playing' && !this.hasMove()) {
      this.shuffle();
      shuffled = true;
    }
    return grew ? { shuffled, grew } : { shuffled };
  }

  /** Seaweed takes one ordinary tile beside it. */
  private growTang(): Cell | undefined {
    const options: Cell[] = [];
    for (const p of this.cellsOf(TANG)) {
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = { r: p.r + dr, c: p.c + dc };
        if (this.inside(n) && isTile(this.board[n.r][n.c]) && !this.special[n.r][n.c] && !this.ice[n.r][n.c] && !options.some((o) => o.r === n.r && o.c === n.c)) options.push(n);
      }
    }
    if (options.length === 0) return undefined;
    const at = options[Math.floor(this.rng() * options.length)];
    this.board[at.r][at.c] = TANG;
    return at;
  }

  private sortOf(p: Cell): 'rocket' | 'area' | 'all' | null {
    const sp = this.special[p.r][p.c];
    if (this.board[p.r][p.c] === BOMB || sp === 'all') return 'all';
    if (sp === 'area') return 'area';
    if (isRocket(sp)) return 'rocket';
    return null;
  }

  /**
   * Two specials swapped together (Jonas, 2026-11-18, no explanation in the
   * game): rocket + rocket clears a cross, rocket + fireworks three rows and
   * three columns, two fireworks a 5x5 square, a shining tile turns every
   * tile of its kind into the other special and sets them all off, and two
   * shining tiles clear the whole board. The combo goes off where the moved
   * tile landed (b).
   */
  private combo(a: Cell, b: Cell, chain: number): Step {
    const sa = this.sortOf(a);
    const sb = this.sortOf(b);
    const pair = (x: string, y: string) => (sa === x && sb === y) || (sa === y && sb === x);
    const kindOfAll = (p: Cell) => (this.board[p.r][p.c] === BOMB ? this.commonKind() : this.board[p.r][p.c]);
    const blasts: Step['blasts'] = [];
    const hit: Cell[] = [a, b];
    // the two specials are used up by the combo, not by their own effects
    this.special[a.r][a.c] = null;
    this.special[b.r][b.c] = null;
    const row = (r: number) => { if (r >= 0 && r < this.rows) { for (let c = 0; c < this.cols; c++) hit.push({ r, c }); blasts.push({ cell: { r, c: b.c }, special: 'right' }); } };
    const col = (c: number) => { if (c >= 0 && c < this.cols) { for (let r = 0; r < this.rows; r++) hit.push({ r, c }); blasts.push({ cell: { r: b.r, c }, special: 'down' }); } };
    if (sa === 'all' && sb === 'all') {
      hit.push(...this.allCells());
      blasts.push({ cell: b, special: 'bomb' });
    } else if (sa === 'all' || sb === 'all') {
      const allAt = sa === 'all' ? a : b;
      const other = allAt === a ? sb : sa;
      const kind = kindOfAll(allAt);
      const cells = this.cellsOf(kind);
      // every tile of the kind becomes the other special, then they all go off
      cells.forEach((x, i) => { this.special[x.r][x.c] = other === 'area' ? 'area' : i % 2 ? 'down' : 'right'; });
      hit.push(...cells);
      blasts.push({ cell: allAt, special: 'bomb' });
    } else if (pair('rocket', 'rocket')) {
      row(b.r); col(b.c);
    } else if (pair('rocket', 'area')) {
      for (const d of [-1, 0, 1]) { row(b.r + d); col(b.c + d); }
    } else {
      for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) hit.push({ r: b.r + dr, c: b.c + dc });
      blasts.push({ cell: b, special: 'area' });
    }
    return this.resolve(hit, chain, [], blasts);
  }

  /**
   * Stars for a won challenge (Jonas, 2026-11-18): one for winning, two with
   * at least 15 % of the moves left, three with at least 30 %.
   */
  stars(): number {
    const left = this.leftAtWin >= 0 ? this.leftAtWin : this.movesLeft;
    const f = left / this.level.moves;
    return f >= 0.3 ? 3 : f >= 0.15 ? 2 : 1;
  }

  /**
   * The finale after a win: each move left becomes a rocket on a random tile,
   * and they all go off (bonus gold is paid per move, see FINALE_GOLD).
   */
  finale(): Step[] {
    if (this.status() !== 'won' || this.leftAtWin >= 0) return [];
    this.leftAtWin = this.movesLeft;
    const spots = this.allCells().filter(({ r, c }) => !this.ice[r][c] && isTile(this.board[r][c]) && !this.fires({ r, c }));
    const picked: Cell[] = [];
    for (let i = 0; i < Math.min(this.movesLeft, 12, spots.length); i++) {
      const j = Math.floor(this.rng() * spots.length);
      const p = spots.splice(j, 1)[0];
      this.special[p.r][p.c] = this.rng() < 0.5 ? 'right' : 'down';
      picked.push(p);
    }
    this.movesLeft = 0;
    return picked.length ? [this.resolve(picked, 1)] : [];
  }

  /** Tapping a special sets it off where it stands, for one move. */
  fire(cell: Cell): SwapResult {
    if (this.status() !== 'playing' || !this.inside(cell) || this.ice[cell.r][cell.c] || !this.fires(cell)) return { valid: false, steps: [], shuffled: false };
    this.movesLeft--;
    this.movesUsed++;
    this.tangThisMove = 0;
    const result = this.settle([cell]);
    return { ...result, ...this.afterMove() };
  }

  /** The hammer: removes one tile without using a move, then lets the board settle. */
  smash(cell: Cell): SwapResult {
    if (this.status() !== 'playing' || !this.inside(cell)) return { valid: false, steps: [], shuffled: false };
    const result = this.settle([cell]);
    let shuffled = false;
    if (this.status() === 'playing' && !this.hasMove()) {
      this.shuffle();
      shuffled = true;
    }
    return { ...result, shuffled };
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
    for (const x of this.allCells()) { const k = this.board[x.r][x.c]; if (isTile(k)) counts.set(k, (counts.get(k) ?? 0) + 1); }
    return [...counts.entries()].sort((p, q) => q[1] - p[1])[0]?.[0] ?? -2;
  }

  private cellsOf(kind: number): Cell[] {
    return this.allCells().filter(({ r, c }) => this.board[r][c] === kind);
  }

  /** The shuffler: mixes the tiles without using a move. */
  mix(): void {
    if (this.status() === 'playing') this.shuffle();
  }

  /** Resolves the first cells and the cascades after them (the caller shuffles if needed). */
  private settle(first: Cell[]): SwapResult {
    const steps: Step[] = [this.resolve(first, 1)];
    let chain = 2;
    while (this.status() !== 'won') {
      const groups = this.findGroups();
      if (groups.length === 0) {
        const logs = this.logsAtBottom();
        if (logs.length === 0) break;
        steps.push(this.resolve(logs, chain++, [], [], true));
        continue;
      }
      steps.push(this.resolveGroups(groups, chain++, []));
    }
    return { valid: true, steps, shuffled: false };
  }

  /** A legal move, if any (used for hints and the no-moves shuffle). */
  findMove(): [Cell, Cell] | null {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        for (const [dr, dc] of [[0, 1], [1, 0]]) {
          const a = { r, c };
          const b = { r: r + dr, c: c + dc };
          if (!this.inside(b) || this.locked(a) || this.locked(b)) continue;
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
    const real = isTile;
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
          const same = i < len && isTile(get(i, j)) && get(i, j) === get(i - 1, j);
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

  private resolve(first: Cell[], chain: number, made: Made[] = [], blasts: Step['blasts'] = [], collectLogs = false): Step {
    const goal = this.level.goal;
    const iceBroken: Step['iceBroken'] = [];
    const mossGone: Cell[] = [];
    // Cleared specials set off their effect, which can set off others.
    const seen = new Set<number>();
    const keep = new Set(made.filter((m) => !first.some((f) => f.r === m.cell.r && f.c === m.cell.c)).map((m) => m.cell.r * this.cols + m.cell.c));
    const matched: Cell[] = [];
    /** Cells whose ice already lost a layer in this step (one layer per step). */
    const hitIce = new Set<number>();
    const chip = (p: Cell): number => {
      const key = p.r * this.cols + p.c;
      if (hitIce.has(key) || !this.ice[p.r][p.c]) return this.ice[p.r][p.c];
      hitIce.add(key);
      this.ice[p.r][p.c]--;
      iceBroken.push({ ...p, left: this.ice[p.r][p.c] });
      return this.ice[p.r][p.c];
    };
    const blockHit: NonNullable<Step['blockHit']> = [];
    const rolled: NonNullable<Step['rolled']> = [];
    /** Hard blocks already hit in this step (one hit per step). Returns true while the block still stands. */
    const hitOnce = new Set<number>();
    const hitBlock = (r: number, c: number): boolean => {
      const key = r * this.cols + c;
      if (hitOnce.has(key)) return this.hp[r][c] > 0;
      hitOnce.add(key);
      this.hp[r][c] = Math.max(0, this.hp[r][c] - 1);
      if (this.hp[r][c] > 0) { blockHit.push({ r, c, left: this.hp[r][c] }); return true; }
      return false;
    };
    const queue = [...first];
    while (queue.length) {
      const { r, c } = queue.shift()!;
      const key = r * this.cols + c;
      if (seen.has(key) || keep.has(key) || !this.inside({ r, c })) continue;
      seen.add(key);
      const k = this.board[r][c];
      // a log is never broken, only collected at the bottom
      if (k === STOCK && !(collectLogs && r === this.rows - 1)) continue;
      // a tile under two layers stays; the hit only takes a layer
      if (this.ice[r][c] > 1) { chip({ r, c }); continue; }
      // a hard block hit by a special loses one hit and stays until the last
      if (BLOCK_HITS[k] && hitBlock(r, c)) continue;
      matched.push({ r, c });
      const sp = this.special[r][c];
      if (sp === 'right') for (let cc = c + 1; cc < this.cols; cc++) queue.push({ r, c: cc });
      if (sp === 'left') for (let cc = c - 1; cc >= 0; cc--) queue.push({ r, c: cc });
      if (sp === 'down') for (let rr = r + 1; rr < this.rows; rr++) queue.push({ r: rr, c });
      if (sp === 'up') for (let rr = r - 1; rr >= 0; rr--) queue.push({ r: rr, c });
      if (ROCKET_BOTH_WAYS && isRocket(sp)) {
        // the flame behind it burns the rest of the line
        if (sp === 'right') for (let cc = c - 1; cc >= 0; cc--) queue.push({ r, c: cc });
        if (sp === 'left') for (let cc = c + 1; cc < this.cols; cc++) queue.push({ r, c: cc });
        if (sp === 'down') for (let rr = r - 1; rr >= 0; rr--) queue.push({ r: rr, c });
        if (sp === 'up') for (let rr = r + 1; rr < this.rows; rr++) queue.push({ r: rr, c });
      }
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
    // A tile cleared beside ice, snow or seaweed takes a layer of it; the
    // frozen tile itself stays (Jonas, 2026-11-17).
    const gone = new Set(matched.map(({ r, c }) => r * this.cols + c));
    const tang: Cell[] = [];
    const rolledFrom = new Set<number>();
    for (const { r, c } of matched) {
      if (!isTile(this.board[r][c]) && !isFree(this.board[r][c])) continue;
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = { r: r + dr, c: c + dc };
        if (!this.inside(n) || gone.has(n.r * this.cols + n.c)) continue;
        const nk = this.board[n.r][n.c];
        if (this.ice[n.r][n.c]) chip(n);
        else if (nk === TANG) { gone.add(n.r * this.cols + n.c); tang.push(n); }
        else if (BLOCK_HITS[nk] && !hitBlock(n.r, n.c)) { gone.add(n.r * this.cols + n.c); tang.push(n); }
        else if (nk === HOBAL && !rolledFrom.has(n.r * this.cols + n.c)) {
          // the bale rolls one step away from the match; off the edge it is gone
          const to = { r: n.r + dr, c: n.c + dc };
          if (!this.inside(to)) {
            rolledFrom.add(n.r * this.cols + n.c);
            gone.add(n.r * this.cols + n.c);
            tang.push(n);
            rolled.push({ from: n, to, out: true });
          } else {
            const tk = this.board[to.r][to.c];
            const free = (isTile(tk) || isFree(tk)) && !this.ice[to.r][to.c] && !gone.has(to.r * this.cols + to.c);
            if (free) {
              this.board[n.r][n.c] = tk;
              this.special[n.r][n.c] = this.special[to.r][to.c];
              this.board[to.r][to.c] = HOBAL;
              this.special[to.r][to.c] = null;
              rolledFrom.add(to.r * this.cols + to.c);
              rolled.push({ from: n, to, out: false });
            }
          }
        }
      }
    }
    matched.push(...tang);
    for (const { r, c } of matched) {
      const k = this.board[r][c];
      if (goal.type === 'collect' && k === goal.kind) this.collected++;
      if (k === TANG || k === STEN || k === MALM || k === KLAPPER || k === HOBAL) {
        if (goal.type === 'block' && k === BLOCK_OF[goal.block]) this.blocksCleared++;
        if (k === TANG) this.tangThisMove++;
      }
      if (k === STOCK) this.stocksOut++;
      if (this.ice[r][c]) chip({ r, c });
      if (this.moss[r][c]) { this.moss[r][c] = false; mossGone.push({ r, c }); }
      this.board[r][c] = EMPTY;
      this.special[r][c] = null;
    }
    for (const m of made) {
      const { r, c } = m.cell;
      if (this.ice[r][c]) chip({ r, c });
      if (this.moss[r][c]) { this.moss[r][c] = false; mossGone.push({ r, c }); }
      this.board[m.cell.r][m.cell.c] = m.kind;
      this.special[m.cell.r][m.cell.c] = m.special;
    }
    const score = matched.length * 20 * chain + Math.max(0, matched.length - 3) * 30 + made.length * 60;
    this.score += score;

    // gravity: a frozen tile stays put, so each column falls in stretches
    // between frozen tiles
    const falls: Fall[] = [];
    const frozen = (r: number, c: number) => (this.ice[r][c] > 0 && this.board[r][c] !== EMPTY) || (isBlock(this.board[r][c]) && this.board[r][c] !== STOCK);
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
    for (const { r, c } of matched) this.hp[r][c] = 0;
    return { cleared: matched, iceBroken, mossGone, falls, spawns, score, made, blasts, blockHit, rolled };
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

  /** New random tiles everywhere except on blocks (the level's, or the ones on the board now). */
  private freshBoard(blocks?: number[][]): number[][] {
    for (let attempt = 0; attempt < 100; attempt++) {
      const b: number[][] = Array.from({ length: this.rows }, () => Array(this.cols).fill(EMPTY));
      if (blocks) {
        for (const p of this.allCells()) if (isBlock(blocks[p.r][p.c])) b[p.r][p.c] = blocks[p.r][p.c];
      } else {
        for (const [r, c] of this.level.tang ?? []) b[r][c] = TANG;
        for (const [r, c] of this.level.sten ?? []) b[r][c] = STEN;
        for (const [r, c] of this.level.stock ?? []) b[r][c] = STOCK;
        for (const [r, c] of this.level.malm ?? []) b[r][c] = MALM;
        for (const [r, c] of this.level.klapper ?? []) b[r][c] = KLAPPER;
        for (const [r, c] of this.level.hobal ?? []) b[r][c] = HOBAL;
      }
      this.board = b;
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          if (b[r][c] !== EMPTY) continue;
          const options = Array.from({ length: this.level.kinds }, (_, k) => k).filter((k) => !this.makesLine(r, c, k));
          b[r][c] = options[Math.floor(this.rng() * options.length)];
        }
      }
      if (this.findMatches().length === 0 && this.hasMove()) return b;
    }
    return this.board;
  }

  private shuffle(): void {
    // frozen tiles and blocks stay where they are
    const spots = this.allCells().filter(({ r, c }) => !this.ice[r][c] && !isBlock(this.board[r][c]));
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
    this.board = this.freshBoard(this.board.map((row) => [...row]));
    this.special = Array.from({ length: this.rows }, () => Array(this.cols).fill(null));
  }
}
