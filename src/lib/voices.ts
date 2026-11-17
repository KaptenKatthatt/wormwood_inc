/**
 * What the advisor and the villagers say. Decision 2026-11-17: no dark
 * undertone the player can notice. Everything sounds warm, kind and safe; the
 * Screwtape theme lives in the title and the analysis only. At most two
 * sentences per letter.
 */
import type { Step } from './staircase';

export const ADVISOR_SIGNATURE = 'Din farbror';

export const LETTERS: Record<Step | 'quit' | 'attackLost' | 'defended', string> = {
  1: 'Välkommen till udden! Jag har lagt undan lite guld och några ädelstenar åt dig, så att du kommer igång.',
  2: 'Så nära du var! Ibland behövs bara några drag till, och det är inget att skämmas för.',
  3: 'Fina saker tar tid, och det är helt i sin ordning att vänta. Men vill du se byn växa redan nu finns det alltid en genväg.',
  4: 'Jag fick tag i ett startpaket åt dig, men det finns bara kvar en liten stund. Jag ville att du skulle få veta först.',
  5: 'Det kommer främlingar över vattnet och byborna är lite oroliga. De litar på dig, och det gör jag med.',
  quit: 'Går du redan? Byborna har precis börjat känna sig trygga med dig här.',
  attackLost: 'Det gick inte riktigt den här gången, men byborna är oskadda. Med lite hjälp blir allt som vanligt igen.',
  defended: 'Vad stolt jag är över dig! Byborna pratar inte om något annat.',
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
