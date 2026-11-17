/**
 * The hooks (game design, section 4). Each one can be switched off in the dev
 * menu so a test can run without it, and every moment a hook is offered is
 * logged with what the player did.
 */
export type HookId =
  | 'starterHelp' | 'nearWin' | 'extraMoves' | 'autoNext' | 'buyLives' | 'skipWait'
  | 'timedOffer' | 'gemPacks' | 'attack' | 'guilt' | 'figures';

export const HOOKS: { id: HookId; step: number; name: string; what: string }[] = [
  { id: 'starterHelp', step: 1, name: 'Starthjälp', what: 'Startbidrag i guld och ädelstenar, de två första byggena gratis och klara på sekunder. Gäller från nästa nollställning.' },
  { id: 'nearWin', step: 2, name: 'Riggad nära vinst', what: 'Nya brickor styrs så att banan slutar precis vid målet. Av: ärlig slump.' },
  { id: 'extraMoves', step: 2, name: 'Köp extra drag', what: '"Så nära!" och 5 drag för ädelstenar när dragen är slut.' },
  { id: 'autoNext', step: 2, name: 'Inga naturliga stopp', what: 'Nästa bana startar av sig själv efter en vinst.' },
  { id: 'buyLives', step: 3, name: 'Köp liv', what: 'Liv för ädelstenar när liven är slut.' },
  { id: 'skipWait', step: 3, name: 'Köp bort väntan', what: 'Byggtid som kan köpas bort med ädelstenar.' },
  { id: 'timedOffer', step: 4, name: 'Tidsbegränsat erbjudande', what: 'Startpaket för 60 ädelstenar (förr 150) som försvinner efter 5 minuter. Räcker inte ädelstenarna öppnas butiken.' },
  { id: 'gemPacks', step: 0, name: 'Ädelstenspaket', what: 'Butiken med paket för kronor, märkta "Populärast" och "Bäst värde".' },
  { id: 'attack', step: 5, name: 'Anfall och sköld', what: 'Grannar anfaller byn; sköld för ädelstenar eller soldater för guld.' },
  { id: 'guilt', step: 5, name: 'Skuld när man slutar', what: 'Rådgivaren och byborna ber spelaren stanna när hen trycker Avsluta.' },
  { id: 'figures', step: 0, name: 'Figurer som pressar', what: 'Rådgivarens brev, bybornas pratbubblor och trivselmätaren.' },
];

export type HookResponse = 'yes' | 'no' | 'shown' | 'cannot-afford' | 'waited' | 'expired';
