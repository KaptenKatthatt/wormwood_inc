/**
 * The hooks (game design, section 4). Each one can be switched off in the dev
 * menu so a test can run without it, and every moment a hook is offered is
 * logged with what the player did.
 */
export type HookId =
  | 'starterHelp' | 'nearWin' | 'extraMoves' | 'autoNext' | 'buyLives' | 'skipWait' | 'topUpGold' | 'boosters'
  | 'calendar' | 'streak' | 'dayPush' | 'awayAttack' | 'weekend'
  | 'timedOffer' | 'gemPacks' | 'attack' | 'guilt' | 'figures';

export const HOOKS: { id: HookId; step: number; name: string; what: string }[] = [
  { id: 'starterHelp', step: 1, name: 'Starthjälp', what: 'Startbidrag i guld och ädelstenar, de två första byggena gratis och klara på sekunder. Gäller från nästa nollställning.' },
  { id: 'nearWin', step: 2, name: 'Riggad nära vinst', what: 'Nya brickor styrs så att banan slutar precis vid målet. Av: ärlig slump.' },
  { id: 'extraMoves', step: 2, name: 'Köp extra drag', what: '"Så nära!" och 5 drag för ädelstenar när dragen är slut.' },
  { id: 'autoNext', step: 2, name: 'Inga naturliga stopp', what: 'Nästa bana startar av sig själv efter en vinst.' },
  { id: 'buyLives', step: 3, name: 'Köp liv', what: 'Liv för ädelstenar när liven är slut.' },
  { id: 'skipWait', step: 3, name: 'Köp bort väntan', what: 'Byggtid som kan köpas bort med ädelstenar.' },
  { id: 'topUpGold', step: 3, name: 'Fyll på guld', what: 'Saknas guld till ett bygge visas "Fyll på X guld för Y ädelstenar" (10 guld per ädelsten), så att spelaren slipper spela fler banor.' },
  { id: 'boosters', step: 2, name: 'Hjälpmedel', what: 'Hammare (20 ädelstenar) och blandare (15) under brädet. En gratis av varje i början.' },
  { id: 'timedOffer', step: 4, name: 'Tidsbegränsat erbjudande', what: 'Startpaket för 60 ädelstenar (förr 150) som försvinner efter 5 minuter. Räcker inte ädelstenarna öppnas butiken.' },
  { id: 'calendar', step: 0, name: 'Dagskrok: dagliga gåvor', what: 'En kalender med sju gåvor, en per dag. Dag 7 är störst.' },
  { id: 'streak', step: 0, name: 'Dagskrok: svit', what: 'Dagar i rad med minst en vunnen bana ger bonusguld (50 per dag, högst 250). En missad dag nollställer.' },
  { id: 'dayPush', step: 0, name: 'Dagskrok: notiser', what: 'Notiser när liven är fulla, när dagens gåva väntar och när byn hotas.' },
  { id: 'awayAttack', step: 0, name: 'Dagskrok: anfall när du är borta', what: 'Är spelaren borta i 20 timmar anfalls byn; förlusten visas vid nästa besök.' },
  { id: 'weekend', step: 0, name: 'Dagskrok: helgmarknad', what: 'Fredag 18 till söndag midnatt: dubbelt guld för vunna banor, med nedräkning.' },
  { id: 'gemPacks', step: 0, name: 'Ädelstenspaket', what: 'Butiken med paket för kronor, märkta "Populärast" och "Bäst värde".' },
  { id: 'attack', step: 5, name: 'Anfall och sköld', what: 'Grannar anfaller byn; sköld för ädelstenar eller soldater för guld.' },
  { id: 'guilt', step: 5, name: 'Skuld när man slutar', what: 'Rådgivaren och byborna ber spelaren stanna när hen trycker Avsluta.' },
  { id: 'figures', step: 0, name: 'Figurer som pressar', what: 'Rådgivarens brev, bybornas pratbubblor och trivselmätaren.' },
];

export type HookResponse = 'yes' | 'no' | 'shown' | 'cannot-afford' | 'waited' | 'expired';
