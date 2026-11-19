/**
 * The questionnaire that stands in for the interview (Jonas, 2026-11-19):
 * testers who cannot be interviewed answer in the game instead. It follows the
 * interview guide in the test plan, cut short: part 1 before anything is
 * revealed, then the debriefing as text, then part 2 and the question whether
 * the data may be used. Nothing before the debriefing may say what the study
 * measures. Pure logic and texts; state/questionnaire.ts applies it.
 */
import { daysBetween } from './daily';

/** The test day (1 = the first day) from which the game asks by itself: the free week is over. */
export const DUE_DAY = 8;
/** How many times the game asks by itself; after that the form stays under Settings. */
export const MAX_ASKS = 3;
/** Free text is cut at this length before it is logged. */
export const MAX_TEXT = 1000;
/** The hour (local time) of the reminder notification on the due day. */
export const PUSH_HOUR = 12;

export type Stage = 'part1' | 'debrief' | 'part2' | 'done';

export interface QState {
  stage: Stage;
  /** The last test day the game asked by itself, and how many times it has. */
  askedDay: number;
  asks: number;
  answers: Record<string, Answer>;
  /** The answer to "may I use your data": null until answered. */
  mayUse: boolean | null;
}

export type Answer = number | string | string[];

export const startQ = (): QState => ({ stage: 'part1', askedDay: 0, asks: 0, answers: {}, mayUse: null });

/** Should the game ask by itself now? Once a day from the due day, a few times at most. */
export function shouldAsk(s: QState, testDay: number, logging: boolean): boolean {
  return logging && s.stage !== 'done' && testDay >= DUE_DAY && s.askedDay < testDay && s.asks < MAX_ASKS;
}

/** Real milliseconds from now until the reminder notification, or null when its time has passed. */
export function pushDelay(firstDay: string, nowMs: number): number | null {
  const at = new Date(+firstDay.slice(0, 4), +firstDay.slice(5, 7) - 1, +firstDay.slice(8, 10) + DUE_DAY - 1, PUSH_HOUR).getTime();
  return at > nowMs ? at - nowMs : null;
}

/** The test day of a day key, counted from the first day. */
export const testDayOf = (firstDay: string, today: string): number => daysBetween(firstDay, today) + 1;

// ---------------------------------------------------------------- the questions

export type Question =
  | { id: string; kind: 'scale'; text: string; low: string; high: string }
  | { id: string; kind: 'multi' | 'single'; text: string; options: { id: string; label: string }[]; more?: string }
  | { id: string; kind: 'text'; text: string };

/** Part 1: before the debriefing. Neutral words only. */
export const PART1: Question[] = [
  { id: 'fun', kind: 'scale', text: 'Hur roligt var spelet?', low: 'Inte alls', high: 'Mycket' },
  {
    id: 'opened', kind: 'multi', text: 'Vad fick dig oftast att öppna spelet? Välj en eller flera.',
    options: [
      { id: 'spare', label: 'Jag hade en stund över' },
      { id: 'push', label: 'Jag fick en notis' },
      { id: 'progress', label: 'Jag ville bygga klart eller komma vidare' },
      { id: 'miss', label: 'Jag ville inte missa något' },
      { id: 'other', label: 'Annat' },
    ],
  },
  { id: 'stopped', kind: 'text', text: 'Om du slutade spela eller spelade mindre efter ett tag: vad berodde det på?' },
  { id: 'feel', kind: 'text', text: 'Var det något i spelet som kändes irriterande, stressigt eller tjatigt? Något som kändes trevligt?' },
  { id: 'bought', kind: 'text', text: 'Köpte du något för låtsaspengarna? Hur tänkte du?' },
  {
    id: 'realMoney', kind: 'single', text: 'Hade du betalat riktiga pengar för något i spelet?', more: 'För vad?',
    options: [{ id: 'yes', label: 'Ja' }, { id: 'maybe', label: 'Kanske' }, { id: 'no', label: 'Nej' }],
  },
];

/** What the player has met, which decides what the debriefing and part 2 mention. */
export interface Reached {
  /** Steps of the first pass (1-5) that were reached. */
  steps: number[];
  /** The week step (5 = none of the week's steps). */
  weekStep: number;
  /** Day hooks (calendar, streak, notifications) come from the second day. */
  secondDay: boolean;
}

const PARTS: { id: string; label: string; when: (r: Reached) => boolean }[] = [
  { id: 's1', label: 'Gåvorna och de snabba byggena i början', when: (r) => r.steps.includes(1) },
  { id: 's2', label: '"Så nära!" när dragen tog slut, och extra drag att köpa', when: (r) => r.steps.includes(2) },
  { id: 's3', label: 'Att vänta på byggen och liv, eller köpa bort väntan', when: (r) => r.steps.includes(3) },
  { id: 's4', label: 'Startpaketet som bara fanns kvar en kort stund', when: (r) => r.steps.includes(4) },
  { id: 's5', label: 'Anfallet mot byn och byborna som ville att du skulle stanna', when: (r) => r.steps.includes(5) },
  { id: 'day', label: 'Dagens gåva, sviten och notiserna', when: (r) => r.secondDay },
  { id: 's6', label: 'Ligan, säsongspasset, albumet och reklamen', when: (r) => r.weekStep >= 6 },
  { id: 's7', label: 'Kistorna, lyckohjulet och mästardragningarna', when: (r) => r.weekStep >= 7 },
  { id: 's8', label: 'Anfallen på grannbyar, trupperna och erbjudandena', when: (r) => r.weekStep >= 8 },
  { id: 's9', label: 'Grannarna som behövde hjälp och skickade gåvor', when: (r) => r.weekStep >= 9 },
];

/** The debriefing, as paragraphs. Follows part B of the interview guide. */
export function debrief(r: Reached): string[] {
  const out = [
    'Tack för svaren så långt! Nu vill jag berätta vad examensarbetet egentligen handlar om.',
    'Spelet är byggt för att undersöka manipulativ design: knep som många mobilspel använder för att få folk att spela längre och betala mer. Knepen kom i en trappa där pressen ökade steg för steg, och spelet sparade vid vilket steg man slutade.',
    'När du var nära att klara en bana var det ofta ingen slump. Spelet styrde vilka brickor som föll ner, så att banorna slutade precis vid målet eller strax under.',
  ];
  if (r.weekStep >= 6) out.push('Rivalerna i ligan, grannbyarna och grannarna som skickade gåvor eller bad om hjälp var påhittade. Det fanns inga andra spelare där, och spelet skickade aldrig några riktiga inbjudningar.');
  if (r.weekStep >= 7) out.push('Kistorna, lyckohjulet och mästardragningarna är byggda som hasardspel. De använde bara låtsasvaluta, så inga riktiga pengar kunde vinnas eller förloras.');
  out.push('Jag kunde inte berätta det här i förväg, för då hade du spelat annorlunda. Det är helt normalt att ha påverkats. Det är så designen fungerar, och det är inget du har gjort fel.');
  return out;
}

/** Part 2: after the debriefing. */
export function part2(r: Reached): Question[] {
  const parts = PARTS.filter((p) => p.when(r)).map(({ id, label }) => ({ id, label }));
  const qs: Question[] = [
    {
      id: 'noticed', kind: 'single', text: 'Märkte du något av det här medan du spelade?', more: 'Vad märkte du?',
      options: [{ id: 'clearly', label: 'Ja, tydligt' }, { id: 'some', label: 'Lite' }, { id: 'no', label: 'Nej' }],
    },
    { id: 'strongest', kind: 'multi', text: 'Vad påverkade dig mest? Välj en eller flera.', options: [...parts, { id: 'none', label: 'Inget av det' }] },
  ];
  if (r.weekStep >= 6) {
    qs.push({
      id: 'realPlayers', kind: 'single', text: 'Trodde du att grannarna och rivalerna var riktiga spelare?',
      options: [{ id: 'yes', label: 'Ja' }, { id: 'no', label: 'Nej' }, { id: 'unsure', label: 'Osäker' }],
    });
  }
  qs.push({ id: 'after', kind: 'text', text: 'Hur känns det nu att du var med utan att veta om det?' });
  return qs;
}

/** Is a question answered? Only the choices and the scale are required; free text is voluntary. */
export function answered(q: Question, answers: Record<string, Answer>): boolean {
  const a = answers[q.id];
  if (q.kind === 'text') return true;
  if (q.kind === 'multi') return Array.isArray(a) && a.length > 0;
  return a !== undefined && a !== '';
}

/** The answers of one part, ready for the log: only that part's questions, free text trimmed and cut. */
export function forLog(qs: Question[], answers: Record<string, Answer>): Record<string, Answer> {
  const out: Record<string, Answer> = {};
  const put = (id: string) => {
    const a = answers[id];
    if (a === undefined) return;
    if (typeof a === 'string') { const t = a.trim().slice(0, MAX_TEXT); if (t) out[id] = t; }
    else out[id] = a;
  };
  for (const q of qs) {
    put(q.id);
    if ('more' in q && q.more) put(`${q.id}More`);
  }
  return out;
}
