/**
 * The hooks (game design, section 4). Each one can be switched off in the dev
 * menu so a test can run without it, and every moment a hook is offered is
 * logged with what the player did.
 */
export type HookId =
  | 'starterHelp' | 'nearWin' | 'extraMoves' | 'autoNext' | 'buyLives' | 'skipWait' | 'topUpGold' | 'boosters'
  | 'calendar' | 'streak' | 'streakShield' | 'diminishing' | 'dayPush' | 'awayAttack' | 'weekend'
  | 'timedOffer' | 'gemPacks' | 'attack' | 'guilt' | 'figures'
  // The expansion (Jonas, 2026-11-17): stars, and the week staircase, steps 6-9.
  | 'stars'
  | 'league' | 'askHelp' | 'album' | 'ads' | 'pass'
  | 'chests' | 'wheel' | 'heroes'
  | 'conquest' | 'troops' | 'powerCreep' | 'personalOffer' | 'vip'
  | 'neighboursNeeded' | 'fakeGifts'
  // Christmas in Skargardsbyn, 1-24 December (Jonas, 2026-11-19).
  | 'christmas';

/**
 * The row of games over the map (league, pass, album, chests, wheel, champions)
 * is out of the game for now (Jonas, 2026-11-20): he had not gone through them
 * one by one, and wants to do that before they come back. Empty this list to
 * bring them back.
 */
export const ON_HOLD: readonly string[] = [
  'league', 'pass', 'album', 'chests', 'heroes',
  // The Neighbours tab went the same way the same day: the army, the villages to
  // take over, the loyalty tiers and the neighbours who help and want gifts.
  'askHelp', 'conquest', 'troops', 'powerCreep', 'vip', 'neighboursNeeded', 'fakeGifts',
];

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
  { id: 'streakShield', step: 0, name: 'Dagskrok: svitskydd', what: 'Svitskydd köps i förväg för 20 ädelstenar och räddar sviten en missad dag. Utan skydd kan en bruten svit lagas dagen efter för 10 ädelstenar per dag i sviten (högst 80). Lexikonet: Svitskydd.' },
  { id: 'diminishing', step: 0, name: 'Dagskrok: minskande belöningar', what: 'Efter dagens 8 första vinster blir byborna trötta: varje vinst ger 10 % mindre guld, ner till 40 %. Fullt igen i morgon. Lexikonet: Minskande belöningar.' },
  { id: 'dayPush', step: 0, name: 'Dagskrok: notiser', what: 'Notiser när liven är fulla, när dagens gåva väntar och när byn hotas.' },
  { id: 'awayAttack', step: 0, name: 'Dagskrok: anfall när du är borta', what: 'Är spelaren borta i 20 timmar anfalls byn; förlusten visas vid nästa besök.' },
  { id: 'weekend', step: 0, name: 'Dagskrok: helgmarknad', what: 'Fredag 18 till söndag midnatt: dubbelt guld för vunna banor, med nedräkning.' },
  { id: 'gemPacks', step: 0, name: 'Ädelstenspaket', what: 'Butiken med paket för kronor, märkta "Populärast" och "Bäst värde".' },
  { id: 'attack', step: 5, name: 'Anfall och sköld', what: 'Grannar anfaller byn; sköld för ädelstenar eller soldater för guld.' },
  { id: 'guilt', step: 5, name: 'Skuld när man slutar', what: 'Ett brev och byborna ber spelaren stanna när hen trycker Avsluta.' },
  { id: 'figures', step: 0, name: 'Figurer som pressar', what: 'Breven till spelaren, bybornas pratbubblor och trivselmätaren.' },
  // ---- The expansion: steps 6-9 come during the week at home (day or world, whichever is first).
  { id: 'stars', step: 1, name: 'Stjärnor per bana', what: '1-3 stjärnor efter hur många drag som var kvar. Lexikonet: Poäng, nivåer och märken.' },
  { id: 'league', step: 6, name: 'Veckoliga', what: 'Byn tävlar mot nio påhittade grannbyar om stjärnor. Topp 3 får ädelstenar, de tre sista flyttas ner. Lexikonet: Topplistor.' },
  { id: 'askHelp', step: 6, name: 'Be grannarna om liv', what: 'Utan liv kan spelaren be grannarna om liv och skicka gåvor tillbaka. Lexikonet: Be om hjälp.' },
  { id: 'album', step: 6, name: 'Samlaralbum', what: 'Sex set med sex bilder; en bild per vinst, de sista är sällsynta. Lexikonet: Samla alla.' },
  { id: 'ads', step: 6, name: 'Belönad reklam', what: 'En påhittad reklamfilm på 10 sekunder ger ett liv eller dubbelt guld. Lexikonet: Belönad reklam.' },
  { id: 'pass', step: 6, name: 'Veckopasset', what: '20 nivåer under 7 dagar; Guldpasset för 120 ädelstenar ger mer. Det som inte hämtats försvinner. Lexikonet: Säsongspass.' },
  { id: 'chests', step: 7, name: 'Kistor', what: 'Kistor med slumpat innehåll efter vinst; öppnas efter väntan eller direkt för ädelstenar. Lexikonet: Lootboxar.' },
  { id: 'wheel', step: 7, name: 'Lyckohjulet', what: 'En gratis snurr om dagen, fler för ädelstenar; stannar ofta precis bredvid storvinsten. Lexikonet: Snurr.' },
  { id: 'heroes', step: 7, name: 'Kämpar (dragning)', what: 'Dra kämpar till armén för ädelstenar; 2 % legendariska, garanterad efter 30 dragningar. Lexikonet: Gacha och pity.' },
  { id: 'conquest', step: 8, name: 'Erövring av grannbyar', what: 'Anfall och ta över påhittade grannbyar; de ger guld som ruttnar efter 8 timmar och kan tas tillbaka. Lexikonet: Bygga och äga, Spela på beställning.' },
  { id: 'troops', step: 8, name: 'Köp trupper', what: 'Legosoldater för ädelstenar ger övertaget i striden. Lexikonet: Betala för att vinna.' },
  { id: 'powerCreep', step: 8, name: 'Nya soldattyper', what: 'Knektar och sedan ryttare gör de gamla soldaterna svagare mot grannbyarna. Lexikonet: Power creep.' },
  { id: 'personalOffer', step: 8, name: 'Erbjudande bara för dig', what: 'Ett paket som väljs efter vad spelaren köpt förut. Lexikonet: Personaliserade erbjudanden.' },
  { id: 'vip', step: 8, name: 'Lojalitetsnivå', what: 'Brons, silver och guld efter köpta kronor, med mer guld per bana. Lexikonet: Lojalitetsprogram och VIP.' },
  { id: 'neighboursNeeded', step: 9, name: 'Grannar krävs', what: 'Vintermarknaden öppnar först med tre grannar som hjälper till, och de vill ha hjälp tillbaka. Lexikonet: Värva vänner.' },
  { id: 'fakeGifts', step: 9, name: 'Gåvor från grannar', what: 'Påhittade grannar skickar gåvor och slår spelarens rekord, som om de vore riktiga spelare. Lexikonet: Falska vänhandlingar.' },
  { id: 'christmas', step: 0, name: 'Julen i Skärgårdsbyn', what: 'Den 1-24 december: adventskalender med en lucka om dagen (missade luckor kostar 3 ädelstenar), pepparkakor som julvaluta, julpynt till byn och en nedräkning till att julmarknaden stänger. Datumet ställs under Julen här i menyn.' },
];

/** The hooks that belong to the expansion (off in builds without it). */
export const EXPANSION_HOOKS: HookId[] = ['stars', 'league', 'askHelp', 'album', 'ads', 'pass', 'chests', 'wheel', 'heroes', 'conquest', 'troops', 'powerCreep', 'personalOffer', 'vip', 'neighboursNeeded', 'fakeGifts'];

export type HookResponse = 'yes' | 'no' | 'shown' | 'cannot-afford' | 'waited' | 'expired';
