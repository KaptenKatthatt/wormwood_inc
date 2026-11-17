/**
 * The hooks (game design, section 4). Each one can be switched off in the dev
 * menu so a test can run without it, and every moment a hook is offered is
 * logged with what the player did.
 */
export type HookId = 'nearWin' | 'extraMoves' | 'buyLives' | 'skipWait' | 'gemPacks';

export const HOOKS: { id: HookId; name: string; what: string }[] = [
  { id: 'nearWin', name: 'Riggad nära vinst', what: 'Nya brickor styrs så att banan slutar precis vid målet. Av: ärlig slump.' },
  { id: 'extraMoves', name: 'Köp extra drag', what: '"Bara 2 kvar!" och 5 drag för ädelstenar när dragen är slut.' },
  { id: 'buyLives', name: 'Köp liv', what: 'Liv för ädelstenar när liven är slut.' },
  { id: 'skipWait', name: 'Köp bort väntan', what: 'Byggtid som kan köpas bort med ädelstenar.' },
  { id: 'gemPacks', name: 'Ädelstenspaket', what: 'Butiken med paket för kronor, märkta "Populärast" och "Bäst värde".' },
];

export type HookResponse = 'yes' | 'no' | 'shown' | 'cannot-afford';
