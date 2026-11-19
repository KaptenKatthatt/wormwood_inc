/**
 * What the notes and the villagers say. Decision 2026-11-17: no dark
 * undertone the player can notice. Everything sounds warm, kind and safe. At
 * most two sentences per note. The notes speak straight to the player and
 * come from nobody: no greeting, no signature and no "jag", and no uncle or other
 * backstory (Jonas, 2026-11-19).
 */
import type { Step } from './staircase';

export const LETTERS: Record<Step | 'quit' | 'attackLost' | 'defended', string> = {
  1: 'Välkommen till udden! Här finns lite guld och några ädelstenar, så att du kommer igång.',
  2: 'Så nära du var! Ibland behövs bara några drag till, och det är inget att skämmas för.',
  3: 'Fina saker tar tid, och det är helt i sin ordning att vänta. Men vill du se byn växa redan nu finns det alltid en genväg.',
  4: 'Ett startpaket väntar på dig, men det finns bara kvar en liten stund. Du får veta det först av alla.',
  5: 'Det kommer främlingar över vattnet och byborna är lite oroliga. De litar på dig.',
  quit: 'Går du redan? Byborna har precis börjat känna sig trygga med dig här.',
  attackLost: 'Det gick inte riktigt den här gången, men byborna är oskadda. Med lite hjälp blir allt som vanligt igen.',
  defended: 'Vad stolta byborna är över dig! De pratar inte om något annat.',
};

export const BUBBLES = {
  built: ['Vad fint det blev!', 'Tack, det här blir bra!', 'Äntligen!'],
  idle: ['Vad skönt att du är här.', 'Ska vi bygga något mer?', 'Vilken dag!'],
  worried: ['Vad är det där på vattnet?', 'Du skyddar väl oss?', 'Jag är lite rädd.'],
  sad: ['Kommer du tillbaka snart?', 'Stanna lite till?', 'Vi klarar oss inte utan dig.'],
  lost: ['Vårt guld…', 'Det gör inget, vi bygger igen.'],
};

export function pickLine(list: string[]): string {
  return list[Math.floor(Math.random() * list.length)];
}
