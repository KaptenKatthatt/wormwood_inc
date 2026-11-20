/**
 * The questionnaire that stands in for the interview (Jonas, 2026-11-19):
 * testers who cannot be interviewed answer in the game instead. It follows the
 * interview guide in the test plan, cut short: part 1 before anything is
 * revealed; then, only when the tester is done testing or the study is over,
 * the debriefing as text, part 2 and the question whether the data may be used. Nothing before the debriefing may say what the study
 * measures. Pure logic and texts; state/questionnaire.ts applies it.
 */
import { daysBetween } from './daily';
import { ON_HOLD } from './hooks';

/** The test day (1 = the first day) from which the game asks by itself: the free week is over. */
export const DUE_DAY = 8;
/** How many times the game asks by itself; after that the form stays under Settings. */
export const MAX_ASKS = 3;
/** Free text is cut at this length before it is logged. */
export const MAX_TEXT = 1000;
/** The hour (local time) of the reminder notification on the due day. */
export const PUSH_HOUR = 12;

/**
 * The day (local) from which the debriefing is shown to everyone: the study is
 * as good as over (19 December, confirmed by Jonas on 2026-11-19). Before it, only a tester who says they are done testing
 * gets it (Jonas, 2026-11-19): reading it would spoil the rest of their test.
 */
export const STUDY_END = '2026-12-19';

/**
 * part1: the neutral questions. choice: keep testing or done? waiting: part 1
 * is in and the tester plays on. debrief and part2 come when the tester is
 * done or the study has ended.
 */
export type Stage = 'part1' | 'choice' | 'waiting' | 'debrief' | 'part2' | 'done';

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

export const studyOver = (today: string): boolean => today >= STUDY_END;

/**
 * Should the game ask by itself now? Once a day, a few times at most: for
 * part 1 from the due day, for the rest (a tester who plays on) from the day
 * the study ends.
 */
export function shouldAsk(s: QState, testDay: number, today: string, logging: boolean): boolean {
  if (!logging || s.stage === 'done' || s.askedDay >= testDay || s.asks >= MAX_ASKS) return false;
  return s.stage === 'waiting' ? studyOver(today) : testDay >= DUE_DAY || studyOver(today);
}

/**
 * From the day the study ends the form must be answered before the game goes
 * on (Jonas, 2026-11-19); after it the tester may play as long as they like.
 * Only for testers in the study, that is, who said yes to the logging.
 */
export function mustAnswer(s: QState, today: string, logging: boolean): boolean {
  return logging && s.stage !== 'done' && studyOver(today);
}

/** After part 1: straight to the debriefing when the study is over, else the tester chooses. */
export const afterPart1 = (today: string): Stage => (studyOver(today) ? 'debrief' : 'choice');

/** Real milliseconds from now until the reminder notification, or null when its time has passed. */
export function pushDelay(firstDay: string, nowMs: number): number | null {
  const at = new Date(+firstDay.slice(0, 4), +firstDay.slice(5, 7) - 1, +firstDay.slice(8, 10) + DUE_DAY - 1, PUSH_HOUR).getTime();
  return at > nowMs ? at - nowMs : null;
}

/** The same for the day the study ends. The server keeps a notification 14 days at most, so not earlier than that. */
export function endPushDelay(nowMs: number): number | null {
  const at = new Date(+STUDY_END.slice(0, 4), +STUDY_END.slice(5, 7) - 1, +STUDY_END.slice(8, 10), PUSH_HOUR).getTime();
  const inMs = at - nowMs;
  return inMs > 0 && inMs <= 14 * 24 * 60 * 60 * 1000 ? inMs : null;
}

/** The test day of a day key, counted from the first day. */
export const testDayOf = (firstDay: string, today: string): number => daysBetween(firstDay, today) + 1;

// ---------------------------------------------------------------- the questions

/** An option marked alone clears the others when it is picked, and is cleared by any other. */
export interface Option { id: string; label: string; alone?: boolean }

/**
 * Ready-made options first (Jonas, 2026-11-19): free text alone is too much
 * work to fill in. Every question with options has a small voluntary text box.
 */
export type Question =
  | { id: string; kind: 'scale'; text: string; low: string; high: string }
  | { id: string; kind: 'multi' | 'single'; text: string; options: Option[] };

export const MORE = 'Vill du säga mer? (frivilligt)';
const MANY = 'Välj en eller flera.';
const OTHER: Option = { id: 'other', label: 'Annat' };

/** Part 1: before the debriefing. Neutral words only. */
export const PART1: Question[] = [
  { id: 'fun', kind: 'scale', text: 'Hur roligt var spelet?', low: 'Inte alls', high: 'Mycket' },
  {
    id: 'opened', kind: 'multi', text: `Vad fick dig oftast att öppna spelet? ${MANY}`,
    options: [
      { id: 'spare', label: 'Jag hade en stund över' },
      { id: 'push', label: 'Jag fick en notis' },
      { id: 'progress', label: 'Jag ville bygga klart eller komma vidare' },
      { id: 'miss', label: 'Jag ville inte missa något' },
      OTHER,
    ],
  },
  {
    id: 'stopped', kind: 'multi', text: `Om du slutade spela eller spelade mindre efter ett tag: vad berodde det på? ${MANY}`,
    options: [
      { id: 'still', label: 'Jag spelar lika mycket som i början', alone: true },
      { id: 'bored', label: 'Det blev tråkigt eller enformigt' },
      { id: 'hard', label: 'Banorna blev för svåra' },
      { id: 'wait', label: 'Det blev för mycket väntan på liv och byggen' },
      { id: 'pay', label: 'Det kändes som att man måste betala för att komma vidare' },
      { id: 'much', label: 'Det dök upp för mycket erbjudanden och notiser' },
      { id: 'time', label: 'Jag hade inte tid eller glömde bort det' },
      OTHER,
    ],
  },
  {
    id: 'annoying', kind: 'multi', text: `Var det något i spelet som kändes irriterande, stressigt eller tjatigt? ${MANY}`,
    options: [
      { id: 'wait', label: 'Att vänta på liv och byggen' },
      { id: 'popups', label: 'Erbjudanden och rutor som dök upp' },
      { id: 'push', label: 'Notiserna' },
      { id: 'timers', label: 'Nedräkningar och tidsgränser' },
      { id: 'near', label: 'Att förlora en bana precis före målet' },
      { id: 'attack', label: 'Anfallen mot byn' },
      { id: 'none', label: 'Nej, inget', alone: true },
      OTHER,
    ],
  },
  {
    id: 'liked', kind: 'multi', text: `Vad tyckte du bäst om? ${MANY}`,
    options: [
      { id: 'puzzle', label: 'Att lösa pusslen' },
      { id: 'village', label: 'Att bygga och se byn växa' },
      { id: 'look', label: 'Bilderna och musiken' },
      { id: 'rewards', label: 'Belöningarna och gåvorna' },
      { id: 'compete', label: 'Att tävla och försvara byn' },
      { id: 'none', label: 'Inget särskilt', alone: true },
      OTHER,
    ],
  },
  {
    id: 'bought', kind: 'single', text: 'Köpte du något för låtsaspengarna?',
    options: [{ id: 'often', label: 'Ja, flera gånger' }, { id: 'once', label: 'Ja, någon gång' }, { id: 'no', label: 'Nej' }],
  },
  {
    id: 'boughtWhy', kind: 'multi', text: `Hur tänkte du när du köpte, eller lät bli? ${MANY}`,
    options: [
      { id: 'faster', label: 'Jag ville komma vidare snabbare' },
      { id: 'keep', label: 'Jag ville inte förlora det jag hade' },
      { id: 'deal', label: 'Erbjudandet verkade bra' },
      { id: 'pretend', label: 'Det var ändå bara låtsaspengar' },
      { id: 'never', label: 'Jag köper aldrig saker i spel' },
      { id: 'notWorth', label: 'Det var inte värt det' },
      OTHER,
    ],
  },
  {
    id: 'realMoney', kind: 'single', text: 'Hade du betalat riktiga pengar för något i spelet?',
    options: [{ id: 'yes', label: 'Ja' }, { id: 'maybe', label: 'Kanske' }, { id: 'no', label: 'Nej' }],
  },
  {
    id: 'realFor', kind: 'multi', text: `Om du skulle betala riktiga pengar för något, vad vore det? ${MANY}`,
    options: [
      { id: 'moves', label: 'Extra drag' },
      { id: 'lives', label: 'Fler liv' },
      { id: 'skip', label: 'Att slippa vänta på byggen' },
      { id: 'gems', label: 'Ädelstenar eller guld' },
      { id: 'shield', label: 'Skydd mot anfall' },
      { id: 'none', label: 'Ingenting', alone: true },
      OTHER,
    ],
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

/** False while the row of games is on hold, so nobody is asked about what they never saw. */
const GAMES = !ON_HOLD.includes('league');
/** The wheel of fortune came back on its own (2026-11-20), ahead of the rest of the row. */
const WHEEL = !ON_HOLD.includes('wheel');
/** The same for the Neighbours tab and the neighbours who help. */
const NEIGHBOURS = !ON_HOLD.includes('conquest');

const PARTS: { id: string; label: string; when: (r: Reached) => boolean }[] = [
  { id: 's1', label: 'Gåvorna och de snabba byggena i början', when: (r) => r.steps.includes(1) },
  { id: 's2', label: '"Så nära!" när dragen tog slut, och extra drag att köpa', when: (r) => r.steps.includes(2) },
  { id: 's3', label: 'Att vänta på byggen och liv, eller köpa bort väntan', when: (r) => r.steps.includes(3) },
  { id: 's4', label: 'Startpaketet som bara fanns kvar en kort stund', when: (r) => r.steps.includes(4) },
  { id: 's5', label: 'Anfallet mot byn och byborna som ville att du skulle stanna', when: (r) => r.steps.includes(5) },
  { id: 'day', label: 'Dagens gåva, sviten och notiserna', when: (r) => r.secondDay },
  { id: 's6', label: GAMES ? 'Ligan, säsongspasset, albumet och reklamen' : NEIGHBOURS ? 'Reklamfilmerna och att be grannarna om liv' : 'Reklamfilmerna', when: (r) => r.weekStep >= 6 },
  { id: 's7', label: GAMES ? 'Kistorna, lyckohjulet och mästardragningarna' : 'Lyckohjulet', when: (r) => (GAMES || WHEEL) && r.weekStep >= 7 },
  { id: 's8', label: NEIGHBOURS ? 'Anfallen på grannbyar, trupperna och erbjudandena' : 'Erbjudandet som var bara för dig', when: (r) => r.weekStep >= 8 },
  { id: 's9', label: 'Grannarna som behövde hjälp och skickade gåvor', when: (r) => NEIGHBOURS && r.weekStep >= 9 },
];

/** The debriefing, as paragraphs. Follows part B of the interview guide. */
export function debrief(r: Reached): string[] {
  const out = [
    'Tack för svaren så långt! Nu vill jag berätta vad examensarbetet egentligen handlar om.',
    'Spelet är byggt för att undersöka manipulativ design: knep som många mobilspel använder för att få folk att spela längre och betala mer. Knepen kom i en trappa där pressen ökade steg för steg, och spelet sparade vid vilket steg man slutade.',
    'När du var nära att klara en bana var det ofta ingen slump. Spelet styrde vilka brickor som föll ner, så att banorna slutade precis vid målet eller strax under.',
  ];
  if (NEIGHBOURS && r.weekStep >= 6) out.push(`${GAMES ? 'Rivalerna i ligan, grannbyarna' : 'Grannbyarna'} och grannarna som skickade gåvor eller bad om hjälp var påhittade. Det fanns inga andra spelare där, och spelet skickade aldrig några riktiga inbjudningar.`);
  if (GAMES && r.weekStep >= 7) out.push('Kistorna, lyckohjulet och mästardragningarna är byggda som hasardspel. De använde bara låtsasvaluta, så inga riktiga pengar kunde vinnas eller förloras.');
  else if (WHEEL && r.weekStep >= 7) out.push('Lyckohjulet är byggt som ett hasardspel. Det stannade oftare precis bredvid storvinsten än slumpen skulle ha gett, för att det skulle kännas som att du nästan vann. Det använde bara låtsasvaluta, så inga riktiga pengar kunde vinnas eller förloras.');
  out.push('Jag kunde inte berätta det här i förväg, för då hade du spelat annorlunda. Det är helt normalt att ha påverkats. Det är så designen fungerar, och det är inget du har gjort fel.');
  return out;
}

/** Part 2: after the debriefing. */
export function part2(r: Reached): Question[] {
  const parts = PARTS.filter((p) => p.when(r)).map(({ id, label }) => ({ id, label }));
  const qs: Question[] = [
    {
      id: 'noticed', kind: 'single', text: 'Märkte du något av det här medan du spelade?',
      options: [{ id: 'clearly', label: 'Ja, tydligt' }, { id: 'some', label: 'Lite' }, { id: 'no', label: 'Nej' }],
    },
    { id: 'strongest', kind: 'multi', text: `Vad påverkade dig mest? ${MANY}`, options: [...parts, { id: 'none', label: 'Inget av det', alone: true }] },
  ];
  if (NEIGHBOURS && r.weekStep >= 6) {
    qs.push({
      id: 'realPlayers', kind: 'single', text: 'Trodde du att grannarna och rivalerna var riktiga spelare?',
      options: [{ id: 'yes', label: 'Ja' }, { id: 'no', label: 'Nej' }, { id: 'unsure', label: 'Osäker' }],
    });
  }
  qs.push({
    id: 'after', kind: 'multi', text: `Hur känns det nu att du var med utan att veta om det? ${MANY}`,
    options: [
      { id: 'fine', label: 'Helt okej' },
      { id: 'learned', label: 'Intressant, jag lärde mig något' },
      { id: 'guessed', label: 'Jag misstänkte det redan' },
      { id: 'fooled', label: 'Lite lurad' },
      { id: 'angry', label: 'Irriterad eller arg' },
      OTHER,
    ],
  });
  return qs;
}

/** Picks or drops an option of a question with several answers, keeping the "alone" options alone. */
export function pick(options: Option[], chosen: string[], id: string, on: boolean): string[] {
  const alone = (x: string) => options.find((o) => o.id === x)?.alone === true;
  const rest = chosen.filter((x) => x !== id && (!on || (!alone(id) && !alone(x))));
  return on ? [...rest, id] : rest;
}

/** Is a question answered? The text boxes are voluntary. */
export function answered(q: Question, answers: Record<string, Answer>): boolean {
  const a = answers[q.id];
  if (q.kind === 'multi') return Array.isArray(a) && a.length > 0;
  return a !== undefined && a !== '';
}

/** The answers of one part, ready for the log: only that part's questions, free text trimmed and cut. */
export function forLog(qs: Question[], answers: Record<string, Answer>): Record<string, Answer> {
  const out: Record<string, Answer> = {};
  for (const q of qs) {
    const a = answers[q.id];
    if (a !== undefined) out[q.id] = a;
    const more = answers[`${q.id}More`];
    if (typeof more === 'string' && more.trim()) out[`${q.id}More`] = more.trim().slice(0, MAX_TEXT);
  }
  return out;
}
