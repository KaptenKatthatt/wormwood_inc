# Speldesign: spelloop, ekonomi och krokar

Designdokument för My Dear Wormwood (förstudietitel "Kära spelare"). Besluten är Jonas, fattade i designpasset 2026-11-17. Dokumentet är byggunderlag, inte rapporttext. Det levande originalet är https://claude.ai/artifact/Mo6ghHMRrEjxGcDtBeGwFv och uppdateras vid varje designbeslut; den här filen hålls i synk med det. Siffrorna är startvärden som balanseras efter användartesterna.

## Regel för vad som får finnas i spelet (Jonas 2026-11-20)

Inget läggs in i spelet utan att Jonas har gått igenom det och godkänt det, funktion för funktion. En plan som är godkänd som helhet räcker inte.

**Vilande tills Jonas har gått igenom dem (ute ur spelet sedan 0.26.15):**
- Raden med spel över kartan: liga, pass, album, kistor, lyckohjul och mästare. Gås igenom i tråden "Gå igenom guldspel och minispel".
- Hela fliken Grannar: armé, byar att ta över, lojalitetsnivåer, och grannar som hjälper till och vill ha gåvor.
- De fyra senare byggnaderna Ladan, Skolan, Hamnen och Gästgiveriet. Deras funktion bestäms när grannbyarna och kistorna är genomgångna. De behöver en tomt och en bild först.

Avsnitten längre ner som beskriver det här gäller alltså som förslag, inte som beslut.

**Lyckohjulet (Jonas 2026-11-20).** Hasardspelen i steg 7 ska vara med i spelet, men de ska designas om och bli mycket mer spektakulära innan de läggs tillbaka. Lyckohjulet ger tre gratis snurr totalt och därefter en gratis snurr per dag. Övriga snurr kostar ädelstenar (i dag 10, priset är inte omprövat). Riggningen med nästan-vinst är kvar: hjulet stannar bredvid storvinsten ungefär 55 av 100 snurr och visar "Så nära storvinsten!", och det förklaras i genomgången efter testet. En mockup av ett spektakulärt hjul tas fram i tråden "Gå igenom guldspel och minispel", och inget byggs in förrän Jonas har sagt ja till den. På mockupen (https://claude.ai/artifact/CudSmXncGnCN9PQYjKRJcm) har Jonas godkänt fliken som böjs mot piggen och att tivolilåten "Galoppen" spelas medan hjulet är öppet. Hjulet är godkänt och byggs in i helskärm.

**Kistöppningen (Jonas 2026-11-20, godkänd som i mockupen https://claude.ai/artifact/W7bPVpydaiJB4WKvC4X6F8).** Två tryck skakar kistan. På det tredje hoppar den, snurrar och slår ner. Locket slår upp först, och först därefter sprutar guldet ut: inget får komma ur en stängd kista. Sedan flyger guldet upp till räknaren i menyfältet. Den kungliga kistan har en större öppning med uppladdning, konfetti och fyrverkeri. Jonas sa 2026-11-20 att kistorna kan byggas in, och de är tillbaka från veckosteg 7 i en egen helskärmsvy (0.26.27). Byggets egna val, som Jonas inte har bekräftat: en kista ger bara guld och ädelstenar så länge albumet och kämparna vilar, och att öppna i förtid kostar 1 ädelsten per 10 minuter som är kvar (18 för hela väntan), som i mockupen, i stället för byggpriset. Belöningen flyger i väg i samma ögonblick som spelaren trycker på den (0.26.26).

**Standardanimation för guld och ädelstenar (Jonas 2026-11-20, godkänd).** I alla rutor där spelaren får guldmynt eller ädelstenar poppar de fram vid texten, hänger kort och flyger i en båge upp till sin räknare i menyfältet, som räknar upp medan de landar. Visas i mockupen av Dagens gåva: https://claude.ai/artifact/FFXiLDuVsxFYrvuaosShET.

**Dagens gåva (Jonas 2026-11-20).** När gåvan väntar finns inga stängknappar, bara Hämta. Hämta tonar bort kalendern, och belöningen kommer fram med bild, antal, ett ljud och en skylt som "Du fick 100 guld!" eller "Du fick 8 timmars skydd mot attacker!". Ett tryck låter guld och ädelstenar flyga till menyfältet med standardanimationen, och spelaren hamnar direkt på Kartan utan fler skyltar. Det ersätter den tidigare knappen "Då kör vi!".

**Lyckohjulet i handen (Jonas 2026-11-20).** Hjulet startas bara genom att dra det med fingret eller med knappen Snurra, aldrig med ett vanligt tryck. Det går inte att flytta medan vinstskylten visas. Inget belöningsljud hörs när ett snurr startar. Ett tryck på vinstskylten låter vinsten flyga till räknaren. Byggs som 0.26.25.

**Kartans nederkant (Jonas 2026-11-20).** Fältet under kartan med utmaningens namn, mål och Spela är borttaget. Raden med Kistor och Hjulet ligger under kartan, och den pulserande cirkeln på kartan startar utmaningen (0.26.29).

**Veckopasset (Jonas 2026-11-20, godkänt med uppdrag, byggs som 0.27.3).** 20 nivåer om 10 poäng, med ett gratisspår och ett guldpass för 120 ädelstenar. Passet varar sju dagar, och sedan börjar ett nytt. Poäng kommer från vinster (2 plus stjärnorna) och från uppdrag. Tre uppdrag om dagen: Vinn 3 utmaningar (10 p), Få 3 stjärnor på en utmaning (5 p) och Snurra lyckohjulet (5 p). Två uppdrag i veckan: Vinn 20 utmaningar (30 p) och Öppna 3 kistor (20 p). Var femte guldnivå ger 40 ädelstenar i stället för en dragning av kämpe. Passet nås från en knapp i raden under kartan från veckosteg 6.

**Mellanreklam (Jonas 2026-11-20, godkänd: "din föreslagna ordning är bra, bygg in detta").** Ny krok i veckotrappan: reklamfilmer som visas av sig själva, utöver de frivilliga filmerna med belöning. Mockup: https://claude.ai/artifact/AxdueW863TxuscC6Ai6g2W.

| Steg | När filmen kommer | Minst mellan filmerna | Krysset |
|---|---|---|---|
| Före 6 | Ingen mellanreklam (första passet och dag 1) | – | – |
| 6 | Efter var tredje avslutade utmaning (vinst eller förlust) | 3 min | Efter 5 s |
| 7 | Efter varannan utmaning och efter varje förlust | 2 min | Efter 5 s |
| 8 | Som steg 7, och när appen öppnas igen efter minst 10 min borta eller spelaren går från byn till kartan. Ta bort reklam erbjuds. | 2 min | Efter 5 s |
| 9 | Som steg 8 | 1 min | Efter 8 s, var tredje gång litet och blekt i hörnet |

Stegen följer veckotrappan (dag eller värld, det som kommer först). Filmerna är de åtta som finns, och spelaren behåller sin reklamgrupp (lugn eller skrikig). Ingen mellanreklam mitt i en utmaning eller under introduktionen. En frivillig film med belöning nollställer spärren. Den som stänger i förtid går miste om ingenting. **Ta bort reklam** erbjuds från steg 8 efter tredje mellanreklamen samma dag: 39 kr en gång i testplånboken (priset bekräftat av Jonas 2026-11-20). Det tar bort mellanreklamen men inte de frivilliga filmerna. Loggas: varje film med grupp, steg och orsak (vinst, förlust, återkomst, till kartan), sedda sekunder, om krysset var litet, och om Ta bort reklam visades och köptes. Reklam efter förlust behålls (Jonas 2026-11-21: den kommer först i steg 7, när spelaren redan är inne i spelet). Ute i 0.29.0 (2026-11-20, efter Jonas "reklamen ser bra ut"). Byggets egna val: räknaren behålls när spärren stoppar en film, så filmen kommer efter nästa avslutade utmaning när spärren gått ut; att lämna en utmaning efter ett drag räknas som förlust (som spelet redan gör); nedräkningen till nästa utmaning pausas medan filmen visas; debriefingtexten oförändrad.

**Veckopass, veckoliga och album (Jonas 2026-11-20).** Veckopasset ska med, men designas först med mockups på passet och på utmaningarna i det. Veckoligan ska med efter en mockup. Albumet ska designas, och bilderna tas fram och gås igenom med Jonas. Det är borta ur spelet tills det är färdigbyggt. Veckoligan (Jonas 2026-11-20, tråden "Designa veckoligan") pågår längre än en vecka: när en ligavecka är slut delas priserna ut och en ny startar direkt från noll, så länge spelaren fortsätter. Det finns fem ligor ovanpå varandra, och alla börjar i den lägsta. Arbetsnamnen Bäcken, Viken, Fjärden, Skärgården och Havet är inte beslutade. Plats 1–3 flyttas upp, plats 8–10 flyttas ner och plats 4–7 stannar. En högre liga ger större priser och snabbare motståndare. De sju vanliga byarnas takt styrs av ligan och ska vara lättsam: ungefär 3 vunna utmaningar om dagen räcker för att gå upp ur Bäcken, ungefär 2 till per liga, och Havet kräver ungefär 11 om dagen. Siffrorna finjusteras i mockupen. Den som slutar spela ett par dagar åker ner. Två riggade byar finns i varje liga och vecka, med nya namn varje gång. De placeras runt strecket för uppflyttning om spelaren ligger nära plats 3, och runt strecket för nedflyttning om spelaren ligger nära plats 8. Sista dygnet går en av dem om spelaren, och 2–3 vunna utmaningar räcker alltid för att ta tillbaka platsen. Det förklaras i genomgången efter testet.

| Liga | Plats 1 / 2 / 3 (ädelstenar) | Plats 4–7 (guld) | Plats 8–10 (guld) |
|---|---|---|---|
| Bäcken | 30 / 20 / 10 | 100 | 25 |
| Viken | 50 / 30 / 15 | 150 | 40 |
| Fjärden | 70 / 45 / 25 | 200 | 50 |
| Skärgården | 100 / 60 / 30 | 300 | 75 |
| Havet | 150 / 100 / 50 | 400 | 100 |

Jonas sa 2026-11-20 "ser bra ut" om ligans klickbara mockup, https://claude.ai/artifact/Fyx6BWHeTGxe4i22URrRm6 (ligaskärm med fem vimplar, zoner för upp- och nedflyttning, pris per plats, notis när man blir omkörd, markerat sista dygn, prisutdelning och flytt mellan ligor). Om den ska byggas in är frågat men inte besvarat. Mockuparna görs i ordningen hjulet, kistor, veckopass, veckoliga, album, och inget byggs in förrän Jonas har sagt ja till respektive mockup.

**Kistor och kämpar (Jonas 2026-11-20).** Kistorna ska vara med. En mockup av en spektakulär kistöppning tas fram och godkänns av Jonas före bygge. Siffrorna är oförändrade tills dess: 30 % chans till en kista efter vinst, 3 timmars väntan, 4 platser, och en kunglig kista för 50 ädelstenar. Kämparna (dragningarna) läggs i backloggen och tas när striderna mot grannbyar byggs, efter att grannbyarna är genomgångna. Följden är att belöningen "dragning" i den kungliga kistan och på veckopassets guldspår behöver bytas mot något annat.

**Övriga beslut 2026-11-20:** det första anfallet är kvar som det är (senast 23 minuter in i första passet, och efter 20 timmars frånvaro). Vintermarknaden (värld 5) är stängd till 1 december. Rakettipset säger "brickan bredvid" i stället för "en granne", och fyrverkeritipset säger "fem brickor i vinkel" med en bild. Långa dialoger har ett runt stängkryss uppe till höger. Byn går att zooma med två fingrar, med en fingeranimation de tre första gångerna. Bakåtgesten frågar innan spelet stängs. Liv i byn med figurer och händelser tas fram i tråden "Ge byn liv med figurer och händelser". De fyra sista punkterna är byggda som 0.26.16 och väntar på Jonas ja.

**Liv i byn (Jonas 2026-11-20).** Figurer går omkring i byn: bybo, soldat i blå rock med gula uppslag och musköt, och präst i svart rock. Utseende och gång är godkända (stilprov https://claude.ai/artifact/XcSv3frt3FVyXSqF5uqdxZ). Figurerna är 28 px höga i byns bild, 1,3 gånger verklig skala och samma som dörrarna, även om de inte känns igen utan zoom. Livet i byn är ren dekoration: inget går att trycka på och inget ger något. Högst två händelser pågår åt gången, och bybor och soldater som bara går räknas inte som händelser. Händelserna är smed, fäktning, fiskebåt, torghandel, vattenbärare och åsna med kärra, med smeden först. Kyrkklockan slår varje kvart och timslagen varje hel timme efter riktig tid. Den hörs bara i byn, följer reglaget för ljudeffekter och slår dovare på natten. Figurernas gång är godkänd efter rättning (0.26.23): benen växlar och figurerna rör sig inte i höjdled. Smeden är godkänd och inlagd (0.26.27): han står vid städet i Smedjan och hamrar ett glödande järn, fyra slag och sedan vila, med gnistor och klang vid varje slag. Han finns bara när Smedjan står hel, inte när den är skadad eller under bygge. Smeden hamrar i 8 sekunder och återkommer sedan då och då som en händelse, inte hela tiden (0.26.30; vilan på 45–120 sekunder är byggets val). Bybornas utrop visas som en vit pratbubbla med mjuk skugga och pilen ner mot bybon, och bubblan följer bybon (förslag A, 0.27.2). Kyrkklockan är godkänd och inlagd (0.27.3) efter att det första ljudprovet underkändes för att den ringde för snabbt. Kapellets klocka slår 1, 2 och 3 slag vid kvartarna. Vid hel timme slår den 4 slag, gör en paus och slår sedan timslagen efter tolvtimmarsklockan i en djupare klocka. Takten är 2,0 sekunder mellan kvartsslagen, 3,2 sekunders paus och 2,8 sekunder mellan timslagen. Den hörs bara i byn när Kapellet är byggt, och är dovare och svagare när solen är nere i Eslöv. Klangen är en inspelning av en riktig kyrkklocka (CC BY-SA 3.0), krediterad under Medverkande. Fäktningen vid kasernen är godkänd och inlagd (0.28.3): två soldater med värja fäktas på kasernens gård i ungefär 8 sekunder, med en till två minuters mellanrum, utan ljud. Brunnen i vägkorset får tak, vindspel med vev och hink (godkänd, byggs in i 0.28.4). Den nya brunnen är knappt 2 meter bred i stället för den målade ringens 3,5 meter, och har snö på taket i vinterbyn. Tas fram i tråden "Ge byn liv med figurer och händelser".

## 1. Syfte med designen

Spelet ska mäta vid vilket steg i en trappa med ökande press som spelaren slutar spela (förstudien, Syfte). Därför ska varje krok ha ett tydligt ögonblick, kunna loggas och kunna slås av och på.

**Spelets namn:** *Skärgårdsbyn*. "My Dear Wormwood" är projektets arbetsnamn och syns inte i spelet. Introskärmen är A (Sjöboden), utan versionsnummer och med färre, verklighetstrogna förtöjningar för båten.

## 2. Spelloopen

1. **Pusselbana** (match-3, cirka 1–2 minuter, begränsat antal drag). Vinst ger guld, ibland en ädelsten. Förlust kostar ett liv.
2. **Byn.** Guldet går till att bygga och uppgradera byggnader. Varje bygge tar tid, som kan väntas ut eller köpas bort med ädelstenar.
3. **Armén.** Kaserner tränar soldater för guld. Armén försvarar byn automatiskt när den anfalls.
4. **Tillbaka till banorna**, eftersom nästa bygge kostar mer än det förra.

Två skärmar: banan och byn. Butik, erbjudanden och dialoger ligger ovanpå dem.

**Beslut:** spelaren bara försvarar. Påhittade grannar anfaller byn. Att själv anfalla och ta över andra byar är en möjlig utbyggnad senare, inte med nu.

## 3. Ekonomin

### Valutor
| Valuta | Fås från | Används till |
|---|---|---|
| Guld | Vunna banor | Byggen, uppgraderingar, soldater |
| Ädelstenar | Ett fåtal i spelet (startbidrag, sällsynt efter bana), resten köps för kronor | Köpa bort väntetid, liv, extra drag, sköld |
| Liv | Max 5, ett nytt var 30:e minut | En misslyckad utmaning kostar ett liv. Utan liv: vänta eller köp liv för ädelstenar |
| Kronor (låtsas) | Testplånbok, 100 kr vid start | Köpa ädelstenar och paket i butiken |

### Utmaningarna (inga banor att välja)
- **Beslut:** spelet öppnar på en karta över ett påhittat Sverige, en väg genom skärgård, skog och fjäll (som Candy Crush). Utmaningarna ligger i ordning på vägen, och spelaren trycker på nästa. Inga banor att välja mellan. Från steg 2 i trappan startar nästa utmaning av sig själv efter 3 sekunder på kartan (inga naturliga stopp).
- En utmaning har ett mål och ett begränsat antal drag. Tre sorters mål: samla brickor av en sort, rensa is, nå en poänggräns.
- Klarad utmaning ger en belöning (guld, ibland ädelstenar eller ett hjälpmedel) och kostar inget. Misslyckad utmaning ger ingen belöning och kostar ett liv (som Candy Crush).
- Utmaningarna blir svårare och belöningarna större efter hand; den tredje är svår. Ett första pass blir 8–10 utmaningar.
- **Nära vinst är riggad.** Spelet väljer nya brickor så att en misslyckad utmaning oftast slutar 1–3 drag eller några brickor från målet. Då erbjuds 5 extra drag för ädelstenar. Brytare i dev-menyn ger ärlig slump.

**De tre första utmaningarna (spelet 0.6.0):** samla 6 fiskar på 12 drag (utan riggning, 5 sorters brickor, snabb och lätt); rensa is i 2x4 rutor på 22 drag; nå 2 600 poäng på 16 drag. Hjälpmedlen ligger under brädet (hammare 20, blandare 15, +5 drag 30 ädelstenar) med egen krokbrytare "Hjälpmedel".

**Kartan och de 40 utmaningarna (spelet 0.7.0):** fliken heter Kartan. Vägen går genom skärgård (1–13), skog (14–27) och fjäll (28–40), och efter 40 börjar den om på 1. Utmaning 4–40 byggs av inställningar: målen växlar mellan samla, is och poäng och växer långsamt. Var femte är en riggad topp som slutar strax under målet, och nästa är en vilopaus. Belöning: 100 guld plus 10 per tredje utmaning, och 50 extra på topparna. Kartan är en platshållare ritad i kod tills en kartbild godkänns.

**Kartans utseende (godkänt som start 2026-11-17):** stil "Sommarkartan", en målad spelkarta snett ovanifrån i sommarljus, i Rödfärg och skärgård. Skärgården har utmaning 1–11 på skär med en båtrutt och 12–13 på stranden. Skogen har tjärnar och röda stugor. Fjällen överst är bergiga sommarfjäll med grön och gul fjällhed och nästan ingen snö (inte gröna kullar, inte vinterfjäll). Vägen är målad, och utmaningarna och båtrutten ritas i kod. Sjökortet och Bilderboken valdes bort. Inbyggd på startsidan i spelet 0.16.0: utmaning 1–11 på skär med streckad båtrutt, 12–40 längs den målade vägen. Granskningssida: https://claude.ai/artifact/2kyUCde6Y5fZMSzenhgkJJ, filer i /mnt/project-files/kartan/omg2/.

**Pusslets utseende (godkänt 2026-11-17):** stil "Rödfärg och skärgård". Bakgrunden är västkustskär med en röd sjöbod, brädet är 8x8 med rödfärgad träram. Sex målade brickor som går att skilja åt på formen även i gråskala: fisk, ankare, snäcka, fyr, silltunna och grön segelbåt med två segel. Inga godisbrickor. Granskningssida: https://claude.ai/artifact/9w6tdaRRE2s343Dwq3XBzP, bilder i /mnt/project-files/pussel-stil/stil1-v1/.

**Hjälpmedel (beslut):** hammaren tar bort en bricka, blandaren blandar om brädet. En gratis av varje i introduktionen, sedan köps de med ädelstenar.

**Hjälp på traven (beslut, som Candy Crush):** efter 5 sekunder utan drag börjar de två brickorna i ett bra drag gunga försiktigt. Det slutar så fort spelaren rör brädet, trycker en tangent eller gör ett drag, och väntan börjar om (spelet 0.14.0).

**Samla-målen** börjar på 8 brickor efter utmaning 1 och stiger långsamt mot cirka 20 (spelet 0.10.0).

**Specialbrickor i brädet (beslut, Royal Match-stil, spelet 0.17.0):** egna brickor utan sort. Fyra i rad ger en raket som rensar raden eller kolumnen den ligger längs. L- eller T-form ger fyrverkerier som rensar 3x3. Fem i rad ger en pärla som rensar alla brickor av en sort (ersätter kompassen, som var otydlig). De utlöses genom tryck (kostar ett drag), byte med valfri granne eller när något annat rensar dem. Gratis och kommer av skicklighet. Hammaren och blandaren ligger kvar som köpknappar utanför brädet (köpkrok).

### Byggnaderna
Stil: en gammal svensk by på fastlandet, med åkrar och skog runt om (inte en ö eller udde, som blir för begränsad i yta). Byggnaderna ska passa i sina rutor.

| Byggnad | Funktion |
|---|---|
| Stugan | Huvudbyggnaden. Dess nivå är taket för de andra byggnadernas nivå. |
| Sjöboden | Ger mer guld per vunnen bana (+10 % per nivå). |
| Kasernen | Tränar soldater för guld. |
| Vakttornen | Fyra torn, ett på varje sida av den samlade byn (norr, öster, söder, väster). Torn 1 finns från start, torn 2–4 låses upp vid Stugan nivå 2, 4 och 6. Varje torn har egna nivåer och följer samma kostnadskurva. |
| Kapellet | Bybornas humör. Härifrån kommer tjatet och skulden i steg 5. |
| Kvarnen | Röjs vid Stugan nivå 3. +1 drag per utmaning per 2 nivåer. |
| Smedjan | Röjs vid Stugan nivå 5. +5 försvar per soldat och nivå. |
| Marknaden | Röjs vid Stugan nivå 7. −5 % byggpris per nivå. |

Alla 8 byggnader har 10 nivåer (spelet 0.8.0).

### Anfallet (steg 5)
- En påhittad grannby anfaller runt minut 23. Varning med nedräkning på 60 sekunder.
- Under nedräkningen kan spelaren köpa sköld (100 ädelstenar) eller träna soldater i kasernen.
- Varningen säger från vilken sida anfallet kommer. Armén plus tornet på den sidan (fullt) och de andra tornen (till hälften) mot anfallets styrka avgör utgången. En osäkrad sida lockar till att bygga alla fyra.
- Utan tillräckligt försvar förlorar byn 30 % av guldet, och ett till tre hus skadas.
- **Skadade hus (Jonas 2026-11-19, alternativ B "Kännbar").** Ett skadat hus ger halv bonus och kan inte uppgraderas förrän det är lagat. Spelaren startar lagningen själv. Den kostar guld, 20 % av husets senaste uppgradering, och tid, 25 % av husets senaste byggtid men minst 2 minuter. Tiden kan köpas bort med ädelstenar som vid byggen. Antalet skadade hus följer av hur mycket försvaret saknade: 1 om försvaret var minst 75 % av anfallets styrka, 2 om det var minst 50 %, annars 3. Tornet på anfallssidan skadas först, sedan husen närmast den sidan, och Stugan sist. Trivseln sjunker 5 per skadat hus tills det är lagat. Jonas har valt principen. Siffrorna är förslag från tråden "Ta fram skadade byggnader efter anfall". Regeln ersätter den tidigare, där ett hus räknades som nivå 0 i 5 minuter och lagades gratis. Varje hus får en skadad bild per utseendenivå.
- **Skadade hus i bygget (0.26.5).** Byggets egna val, som Jonas inte har sett: lagning får pågå samtidigt som ett bygge, halv bonus räknas som halv nivå, trivseln sjunker 5 per skadat hus utöver de 25 för förlusten och stiger 5 per lagning, och ingen påfyllning av guld erbjuds vid lagning. Markeringen är tillfällig (mörkare hus med röd skylt) tills de målade bilderna finns. Händelserna loggas som building_damaged, repair_started, repair_skipped_with_gems och repair_done.
- Anfallet är inställt på att vara lite för starkt för det spelaren hunnit bygga, så att skölden lockar.

**Försvaret (spelet 0.13.0):** soldater × (10 + 5 × Smedjans nivå) + 30 per nivå på tornet på anfallssidan + 15 per nivå på de andra tornen. Sidan slumpas, även för anfall när spelaren är borta. Testversionen: https://skargardsbyn.84.247.143.6.sslip.io/ (dev med dev-meny: https://dev.skargardsbyn.84.247.143.6.sslip.io/).

### Kostnadskurvan
Kostnaden växer långsamt i början och sedan ungefär i kvadrat med antalet byggen.

| Bygge nr | Guld | Byggtid |
|---|---|---|
| 1–2 | 0 (gratis) | 5 s |
| 3–8 | stiger långsamt | under 1 min |
| 9–10 | stiger | 5 min |
| 11 | | 15 min |
| 12 | | 30 min |
| 13 och framåt | växer ungefär i kvadrat | 1–2 h |

**Beslut 2026-11-18 (generösare början):** belöningen per utmaning är 150–250 guld. De första 8 byggena tar under en minut. Den första riktiga väggen (bygge på 15–30 min, liven slut) kommer runt minut 20 i stället för minut 6–9. Stöd: Ascarza m.fl. 2025 (B1), där lättare banor gav mer spelande och mer intäkt totalt. Exakta guldpriser sätts i bygget så att väggen hamnar runt minut 20.

**Byggtid efter nivå (Jonas 2026-11-21, ersätter byggtiden per byggnummer ovan):** byggtiden beror bara på nivån som byggnaden byggs till, inte på hur många byggen spelaren gjort. Tidigare tog allt från bygge 13 minst en timme, även ett torn till nivå 2, fast byn var på låg nivå. Ingen byggnad går högre än Stugan, så tiden följer också byns nivå.

| Byggs till nivå | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Tid | 10 s | 1 min | 3 min | 8 min | 15 min | 25 min | 40 min | 1 h | 1 h 30 min | 2 h |

De två första byggena i introduktionen tar fortfarande 5 s. Guldpriset följer byggnumret som förut. Följd: väggen runt minut 20 kom av att bygge 11 tog 15 min; nu kommer den mest av guld och liv (öppen fråga till Jonas). Byggets val: ett bygge som redan pågår behåller sin tid; lagning tar fortfarande 25 % av senaste byggtiden; bygglistan visar "Tar X att bygga" per byggnad. Kroken longBuild (bygge på minst 5 min) kommer nu först vid bygge till nivå 4 (8 min), tidigare från bygge 9, så steg 3 i trappan kan komma senare. Ute i 0.34.0 (2026-11-21).

**Backlogg 2026-11-18 (minispel):** Fiska vid bryggan och Segla mellan skären (ett liv var, ger guld) ligger i backloggen. Jonas gillade dem men vill först få det nuvarande spelet riktigt bra. Mockup: https://claude.ai/artifact/VYPeBranLh1qSLmwJmj3co

### Djup i pusslet (beslut 2026-11-18)

**Nytt hinder var femte utmaning, per region.** Första gången visas hindret med en pil och en mening.

- Skärgården: **fisknät** (brickan sitter fast i ett nät, första matchningen river upp det och den andra tar bort det; ersatte isen 2026-11-18, i spelet sedan d9b95c5 med tipset "Fisknät! Brickan under sitter fast men går att matcha. Första träffen river nätet, den andra tar bort det." och målet "Riv alla fisknät") och **tång** (växer till en ny ruta varje drag den inte rensas).
- Skogen: **mossa** (tas bort med matchning bredvid) och **stockar** (ska ner till botten).
- Fjällen: **snö** i flera lager och **sten** (spricker bara av specialbrickor).

Nya hinders grafik visas för Jonas och godkänns innan den läggs ut.

**Kombinationer av specialbrickor** (byt plats på två specialbrickor). Spelet förklarar dem inte, spelaren upptäcker dem själv.

- Raket + raket: ett kors, en hel rad och en hel kolumn.
- Raket + fyrverkeri: tre rader och tre kolumner.
- Pärla + raket: alla brickor av den färgen blir raketer.
- Pärla + pärla: hela brädet rensas.

**Stjärnor och slutfest.** Varje utmaning ger 1–3 stjärnor efter antal drag kvar, och en stjärna räcker för att gå vidare. En vinst ger 10 guld per stjärna (Jonas 2026-11-20; förut 30 guld bara för tre stjärnor), och stjärnorna visas på kartan. När målet är klart blir varje drag som är kvar en raket som smäller av och ger 5 guld (byggt i 0.20.0).

**Brädet per region och värld (Jonas 2026-11-18):** varje region och värld har egen bakgrund, sex egna brickor, egen ramfärg och sina två hinder. Skärgården, Skogen och Fjällen är godkända och skickade till bygget. Den nya isen (en iskub) godkändes kl. 10.50. Värld 2–5 godkändes kl. 10.52. Mappningen finns i /mnt/project-files/pussel-stil/regioner/README.md, och granskningssidan är https://claude.ai/artifact/1mk7hqiYTf6p5RY4m9hGtN

**Byns utseende (Jonas godkände 2026-11-18 kl. 10.36):** byvyn är målad från 3D-skissen (/mnt/project-files/byns-utseende/3d/byvy3.png), och tonen ska vara ljusare och gladare framöver. Alla 11 byggnader har plats:

- Stugan, Kapellet, Kasernen, Smedjan och Marknaden står innanför muren runt ett torg med en brunn.
- Sjöboden står på strandhällen vid bryggan.
- Kvarnen står på ängen norr om muren.
- Fyra vakttorn står vid portarna i norr, öster, söder och väster.

Varje byggnad får tre utseenden: ett för nivå 1–3, ett för 4–7 och ett för 8–10. Medan den byggs står en byggställning. Låsta tomter täcks av snår eller skog tills de låses upp. Layouten finns i /mnt/project-files/byns-utseende/3d/village3.json.

**Introskärmen (Jonas godkände 2026-11-18 kl. 13.59):** introskärmen visar Sjöboden i stilen rödfärg och skärgård, med pynt B:

- Under fönstren sitter två blomlådor med pelargoner, men det finns ingen låda på gaveln.
- Det finns en bänk och en kruka med blå blommor.
- En grön roddbåt ligger i vattnet med två åror på längden. Den är förtöjd med en tunn lina i en smal stolpe vid bryggans hörn.

Skylten "Skärgårdsbyn" och Spela-knappen är ritade i kod, och skärmen visar inget versionsnummer. Filerna ligger i /mnt/project-files/pussel-stil/intro/slutlig/.

**Titelmusik (Jonas 2026-11-18 kl. 15.00):** titelskärmen har egen musik, låten "Solsken". Den är glad, går i A-dur och spelas på blockflöjt och dragspel. Jonas ville ha gladare och mer catchig musik med mindre fiol. Låten börjar vid första trycket och fortsätter när spelaren går vidare till kartan. Den slutar när spelaren går in i den första banan eller i byn. Den är inbyggd i PR #8.

**Julhändelsen (Jonas 2026-11-19):** säsongshändelsen är en julhändelse och läggs tidigare än V51. Den designas i V48 (23–29/11) och släpps runt 1/12. Det är ett undantag från frysningen av krokar och balans 28/11–14/12. Händelsen ingår i testet som en egen krok och loggas som en sådan, så att analysen kan se vilka testare som hade den. Jonas valde 2026-11-19 att händelsen ska vara adventskalender och julmarknad ihop.

### Julen i Skärgårdsbyn (1–24 december)

**Adventskalendern.** En lucka om dagen. Varje lucka ger 30 pepparkakor och en liten gåva: 100–300 guld, ett liv eller, i lucka 6, 13 och 20, en ädelsten. En missad lucka kan öppnas i efterhand för 3 ädelstenar. Luckor från dagar innan spelaren började räknas också som missade. Lucka 24 ger stjärnan till julgranens topp, och den går inte att få på annat sätt.

**Pepparkakor.** Julvalutan. En vunnen utmaning ger 10 pepparkakor plus 2 per stjärna. Den som saknar pepparkakor kan fylla på med ädelstenar, 15 pepparkakor per ädelsten.

**Julpynt till byn.** Pyntet köps för pepparkakor och syns i byn:

| Pynt | Pepparkakor |
|---|---|
| Ljusslingor på muren | 40 |
| Julkärvar vid portarna | 80 |
| Adventsstjärnor i fönstren | 100 |
| Marschaller längs vägarna | 150 |
| Halmbock på torget | 250 |
| Julgran på torget | 400 |

Pyntlistan har sex pynt (Jonas 2026-11-19): adventsstjärnorna är med, marschaller och halmbock är kvar, och snön är gratis eftersom den följer med vinterbyn. Granen och bocken har snö på sig i vinterbyn. Adventsstjärnorna ritas på fönstrens platser, som skiljer sig mellan utseenden och nivåer, och får inte sticka upp över takkanten.

Allt pynt kostar 1 020 pepparkakor. Jonas bad 2026-11-19 om snällare pepparkakor, och siffrorna ovan är de snällare (förut 20 per lucka, 5 plus 1 per stjärna, 5 ädelstenar för en missad lucka och 10 pepparkakor per ädelsten). En testare som spelar en vecka får nu ungefär 210 från luckorna och 500–600 från utmaningarna, alltså det mesta av pyntet på en vecka och allt på två, utan att köpa. Uppskattningen bygger på ungefär 40 vunna utmaningar i veckan.

**Nedräkningen.** En skylt visar "Julmarknaden stänger om X dagar". Efter den 24 december går pyntet inte att köpa. Det som är köpt står kvar.

**Krokar och loggning.** Händelsen är en egen krok med fyra delar: daglig vana (luckan), rädsla att missa (nedräkningen och missade luckor), tidsbegränsad valuta och betala för att ta igen. Spelet loggar varje öppnad lucka, varje lucka som köpts i efterhand, varje pyntköp, varje påfyllning av pepparkakor och när spelaren såg nedräkningen. Dev-menyn får en brytare för händelsen och ett sätt att ställa datumet. Ny grafik (kalendern, pepparkakan, pyntet) visas för Jonas och godkänns innan den läggs ut.

**Byn i vinterskrud (Jonas 2026-11-19).** Byn byter utseende i december. Sommarbyn visas till och med 30 november. Utseende A, lätt snö, visas 1–7 december. Utseende B, djup vinter, visas från 8 december. Utseende C, blå timmen, visas i stället för A och B när det är mörkt ute i Skåne, det vill säga när solen är nere i Eslöv (i december ungefär 15.35–08.30). Julpyntet ligger som lager ovanpå i alla utseenden. Dev-menyn får ett val som tvingar fram ett utseende. Alla byggnader finns målade i tre nivåer för varje utseende i `/mnt/project-files/jul/vinter/`. Granskningssida: https://claude.ai/artifact/5sQfYtKK6FypE6FBuXBrP3. Jonas godkände alla tre utseendena, granen och bocken 2026-11-19. Byn skalas upp och tomtgränserna justeras i en annan tråd, så vinterbilderna målas om efter den nya byn innan de släpps. Vintern gäller till och med februari tills Jonas säger annat. Byte av utseende för övriga årstider ligger i backloggen.

**Ingången.** Julskylten längst ner i byn öppnar kalendern och julmarknaden. Skylten visas från spelarens andra dag.

### Rättningar efter Jonas testrunda (2026-11-19)

Från tråden "Rätta felen från Jonas testrunda", efter Jonas lista:

- **Pris per byggnad.** Byggnumrets kostnad (kurvan är oförändrad) gånger byggnadens faktor, avrundat till 10. Marknadens rabatt gäller som förut. De två första byggena är gratis, och byggtiden följer byggnumret. Faktorerna, godkända av Jonas 2026-11-19: Stugan 1,5; Marknaden 1,4; Kvarnen 1,3; Hamnen 1,3; Sjöboden 1,2; Gästgiveriet 1,2; Smedjan 1,1; Skolan 1,1; Kasernen 1,0; Ladan 0,9; vakttornen 0,8; Kapellet 0,7.
- **Byn.** Byn tar hela skärmen. En flytande knapp "Bygg" öppnar bygglistan som ett ark nerifrån, med priset på varje knapp.
- **Inne i en utmaning.** Flikmenyn syns inte. En menyknapp uppe till vänster öppnar "Paus" med musik och ljud av och på, Fortsätt spela och Lämna utmaningen. Att lämna kostar ett liv om minst ett drag är gjort, annars inget.
- **Hinder utan siffror.** Malm och klappersten visar inga siffror utan spricker mer för varje träff.
- **Reklamfilmer.** Fyra egna påhittade filmer (Bärplock, Brygghuset Nordanvind, Mäklarhuset Vassen, Fiskelyckan), 10 sekunder med tre scener och en stapel som går från vänster till höger kant. Efter filmen visas en belöningsanimation där guldet räknas upp till det dubbla. Varje visning loggas med filmens id.
- **Ladans text.** "Förråden i byar du tagit över rymmer en timmes guld till för varje nivå". Mekaniken är oförändrad.
- **Musik per värld.** Värld 2–5 får egna låtar. Värld 1 behåller sina två.
- **Godkänt av Jonas 2026-11-19:** byn i helskärm med flytande Bygg-knapp, pris per byggnad, och animationen där guldet dubblas efter filmen.
- **Liv.** Liv visas som fem hjärtikoner, röda eller tomma, utan siffra och utan ordet "fullt".
- **Menyknappen** inne i en utmaning ligger i topplisten.
- **Skrikig reklam.** Jonas vill att reklamen skär sig med spelet och är lite irriterande, som riktig reklam. Utöver de fyra lugna filmerna finns fyra skrikiga påhittade: Guldregn (nätcasino), Fullträff (betting), Fyndo (shoppingapp) och Kungars Krig (krigsspel). Existerande reklamfilmer används inte, eftersom det kräver tillstånd. De fyra nya filmerna väntar på Jonas ja.
- **Topplisten inne i en utmaning (Jonas 2026-11-19, förslag A):** menyknapp, hjärtan, guld och ädelstenar ligger i topplisten.
- **Reklamen som A/B-test (Jonas 2026-11-19).** Alla åtta filmerna byggs. Vissa spelare får bara de fyra lugna filmerna och andra bara de fyra skrikiga, för att mäta hur det påverkar. Gruppen följer av spelar-id, ungefär hälften var, och är densamma hela tiden. Den loggas som adGroup (calm eller loud) tillsammans med filmens id när filmen visas, ses klart eller stängs i förtid (med antal sedda sekunder). Testbygget kan inte byta grupp, det kan bara dev-menyn. Med få testare blir grupperna små och inte säkert jämna. Om Jonas vill styra vem som hamnar var behövs en tilldelning per testkod.
- **Väntar på Jonas:** en tydligare sprucken malm.

### Testplånboken
Spelaren har 100 låtsaskronor. Köp drar från plånboken, och loggen visar vad pengarna lades på. Inga riktiga pengar.
**Påfyllning genom mejl (godkänd av Jonas 2026-11-20):** friktion med flit, och ett mått på hur många som orkar be om mer pengar. När plånboken inte räcker till ett köp visar butiken "Plånboken är tom" och knappen **Be om påfyllning**. Knappen öppnar ett färdigt mejl till Jonas (hej@jonasolson.se) med testarens testkod ifylld. Jonas svarar med en kod (till exempel FYLL-7K3Q) som testaren skriver in i butiken och får 100 kr. Koden gäller bara den testkoden och bara en gång, så den går inte att dela. Jonas tar fram koder på en sida i dev-menyn (skriv in testkoden, kopiera koden). Loggas: varje tryck på knappen och varje inlöst kod, med testkod, tid, testdag och plånbokens saldo. Ute i 0.29.1 (2026-11-20, Jonas godkände skärmbilderna). Koden skrivs in i butiken under "Kod från Jonas". Loggas som topup_asked, topup_redeem och topup_redeemed.
Idé i backloggen (Jonas funderar): det som är kvar betalas ut på riktigt efter testet, så att köpen kostar något. Om plånboken betalas ut på riktigt stängs steg 7 i veckotrappan (kistor, lyckohjul, mästardragningar) av för den testpersonen, så att det inte blir spel om pengar (Jonas 2026-11-18).

### Butiken och priserna
**Ädelstenar för kronor (testplånboken):**

| Paket | Pris | Märkning |
|---|---|---|
| 100 ädelstenar | 20 kr | |
| 300 ädelstenar | 49 kr | "Populärast" |
| 700 ädelstenar | 99 kr | "Bäst värde" |

**Vad ädelstenar köper:**

| Vara | Ädelstenar |
|---|---|
| 5 extra drag | 30 |
| Hammare | 20 |
| Blandare | 15 |
| Ett liv | 20 |
| Fulla liv | 60 |
| En minut byggtid | 1 (minst 5 per köp) |
| Sköld i 8 timmar | 100 |

**Startbidrag:** 30 ädelstenar, så att spelaren hinner betala med ädelstenar innan det kostar kronor.

**Erbjudandet i steg 4:** "Startpaket" för 60 ädelstenar (överstruket 150) som ger 2 000 guld och fulla liv, försvinner efter 5 minuter (nedräkning syns). Räcker ädelstenarna inte öppnas butiken.

**Beslut:** inget säljs direkt för kronor. Allt köps för ädelstenar, och bara ädelstenarna köps för kronor i butiken.

Priser i ädelstenar visas utan kronor bredvid, eftersom det otydliga priset är en del av kroken *Flera valutalager*.

### Tid
- **Verklig tid** är standard i testerna. Tiderna väljs så att väggarna kommer runt minut 20.
- **Snabbad klocka** (till exempel 60 gånger) kan väljas i dev-menyn.
- Byggtider, startvärden: första bygget 5 s, sedan 1 min, 5 min, 30 min, 2 h.
- Banorna 3–4 blir märkbart svårare, så att livet tar slut för de flesta inom ett pass.

### Dev-menyn
Växla verklig och snabbad tid, slå krokar av och på, nollställa sparad data, pausa rådgivarens brev (pausade som standard i utvecklarbygget, alltid på i testpersonernas version). Nedräkningarna för anfallet och Startpaketet går i verkliga sekunder även med snabbad klocka. Menyn stängs av helt i versionen som går till testpersoner (byggflagga).

## Längd och utveckling

Spelet ska räcka i några timmar, så att testare kan spela på egen hand längre än ett pass, och spelaren ska hela tiden se mer som väntar. Det ryms i sprint 3 (12 h fler banor och balansering, 12 h fler byggnader och nivåer).

1. **Byn växer utåt.** Marken utanför byn ligger under skog eller dimma och röjs i flera omgångar när Stugan går upp i nivå, så att nya tomter blir lediga.
2. **Fler nivåer och byggnader.** 8 byggnader med 10 nivåer var. Samma modell per byggnad med små tillägg per nivå. Nya byggnader (till exempel kvarn, smedja, marknad) låses upp med Stugans nivå.
3. **Cirka 40 utmaningar i följd**, byggda av inställningar (mål, drag, brickor) i samma pusselmotor. Kartan visar hur långt vägen fortsätter bortom det spelaren hunnit.

## 4. Kroktrappan

Fem steg med ökande press under ett första pass på 20–25 minuter (utsträckt 2026-11-18 så att väggen inte kommer för tidigt). Varje steg startas av en händelse i spelet, och klockan är reserv om händelsen dröjer.

| Steg | Ungefär | Krokar | Startas av |
|---|---|---|---|
| 1. Mild | min 0–8 | Starthjälp: startbidrag, generösa belöningar, de första 8 byggena klara på under en minut | Spelstart |
| 2. Lockande | min 8–14 | Nära vinst ("bara 2 drag kvar!"), betala för 5 extra drag | Första förlusten eller nära förlusten |
| 3. Begränsande | min 14–20 | Väntetid som går att köpa bort (byggen 15–30 min), liv tar slut, fyll på guld med ädelstenar | Första långa bygget, första gången liven är slut |
| 4. Stressande | min 20–23 | Tidsbegränsat erbjudande med nedräkning, impulsköp mellan banorna | Första förlusten efter minut 20 |
| 5. Skuldbeläggande | min 23–25 | Byn anfalls och skölden kostar ädelstenar (ägande), byborna blir ledsna och tjatar när spelaren vill sluta (skuld) | Minut 23, eller när spelaren försöker sluta |

**Fyll på guld (steg 3):** när guldet inte räcker till ett bygge visas "Fyll på X guld för Y ädelstenar" (10 guld per ädelsten, avrundat uppåt), och bygget startar direkt. Egen brytare i dev-menyn. Loggas som krokögonblick (visad, ja, räcker inte).

Hela tiden: butiken finns tillgänglig. Från steg 2: nästa bana startar av sig själv (inga naturliga stopp).

### Testupplägg: första pass plus en fri vecka

Varje testperson spelar först ett pass på cirka 20–25 minuter med trappan, och behåller sedan spelet en vecka hemma. Under veckan slås krokarna som verkar över dagar på. Jonas intervjuar efter veckan.

| Dagskrok | Så blir det |
|---|---|
| Dagliga belöningar | Kalender med 7 gåvor: 100 guld, 10 ädelstenar, 250 guld, sköld 8 h, 20 ädelstenar, 500 guld, 500 guld + 50 ädelstenar |
| Svit (streak) | 50 guld per dag i rad, högst 250, vid dagens första vinst |
| Notiser (Web Push) | När spelet läggs undan: fulla liv, dagens gåva nästa dag 18.00, hot efter 18 h |
| Anfall när spelaren är borta | Efter 20 h borta; förlusten visas vid återkomsten |
| Tidsbegränsad händelse | Helgmarknad fredag 18.00 till söndag midnatt med dubbelt guld |
| Minskande belöningar ("byborna är trötta") | Dagens 8 första vinster ger fullt guld. Sedan sjunker guldet 10 % var tredje vinst: vinst 9–11 90 %, 12–14 80 %, 15–17 70 %, 18–20 60 %, 21–23 50 %, från vinst 24 40 %. Fullt igen vid midnatt. (Jonas 2026-11-21: kvar, men var tredje vinst i stället för varje, eftersom banorna räcker. Ute i 0.34.2.) |

Dagskrokarna startar dag 2, så att första passet bara har trappan. Besök loggas med datum, testdag och längd.

Brytpunkten mäts två gånger: steget i första passet där personen slutar, och dagen då personen slutar komma tillbaka. Spelet loggar varje besök med datum och längd.

### Rösterna i spelet
**Ton (beslut):** spelet har ingen märkbar mörk underton. Spelaren ska invaggas i en falsk trygghet: allt känns gulligt, vänligt och ofarligt. Screwtape-temat finns i titeln och i analysen, inte i det spelaren ser.

**Ljust och varmt:** spelet är alltid ljust och följer inte systemets mörka läge. Ljust vatten, falurött brädram, ljusa trärutor.

**Beslut:** en kombination av en rådgivare och byborna. Lite text att läsa.
- **Breven** (Jonas 2026-11-19): korta brev visas vid varje nytt steg i trappan och när spelaren vill sluta. De vänder sig direkt till spelaren och har ingen avsändare: ingen hälsning som "Kära du", ingen underskrift som "Din farbror", och helst inget "jag". Spelet har ingen bakgrundshistoria med Screwtape eller en släkting, det har Jonas aldrig godkänt. Högst två meningar per brev, i varm och vänlig ton. Bär kroken *Figurer som pressar*.
- **Byborna** syns i byn och reagerar med korta pratbubblor på några ord: glada efter bygge, oroliga när anfallet närmar sig, ledsna när spelaren vill sluta.
- **Trivselmätare** i byns överkant: en snabb överblick över hur byborna trivs (ansikte plus stapel). Trivseln stiger med byggen och sjunker vid anfall, skadade byggnader och när spelaren varit borta. Ger skuldkroken något att peka på. Trivselmätaren och rådgivarens brev ligger under krokbrytaren *Figurer som pressar*.

## Ljud

Ljudbilden är "Rödfärg och skärgård": svensk folkton, varm och trygg, utan mörk underton. Jonas valde allt på lyssningssidan https://claude.ai/artifact/KuTHggqRTMhRB9kNH26ntz 2026-11-17.

**Musik**
- Byn och kartan: "Udden", en egen polskaliknande vals med dragspel och klarinett. Havsljud med vågor och måsar under musiken i byn.
- Pusslet: två låtar växlar mellan utmaningarna, "Brickor" (egen, marimba) och "Gem Waltz" (Haley Halcyon, CC-BY 4.0).

| Händelse | Ljud | Krok |
|---|---|---|
| Matchning | Marimba, ett tonsteg högre för varje kedja | Kombo (variabel belöning) |
| Utmaning klar, slut på drag | Gem Waltz-jinglar; förlustljudet är tröstande, aldrig bestraffande | |
| "Så nära!" | Kalimba som stannar ett steg före grundtonen | Nära vinst |
| Köp | Celesta-klang | |
| Guld / ädelstenar | Mynt som klingar / celesta-glissando | |
| Bygge startar / klart | Hammare, såg och dragspelsackord / folkfanfar på fiol | |
| Anfall / avvärjt | Trumvirvel och stråkar / horn och fiol | |
| Brev / knappar | Klockspel / mjukt klick | |

**Ljudnivåer (Jonas 2026-11-20).** Standardvolymen är 75 % på reglaget och låter som 10 % gjorde i 0.26.12. Förstärkningen och kompressorn från 2026-11-19 är borttagna. Havsljudet i byn ligger på ungefär halva musikens nivå. Kartan spelar låten för den värld den visar, inte alltid byns låt. Byggt som 0.26.13.

Musik, havsljud och effekter har var sitt reglage i Inställningar. Ljudet startar först efter spelarens första tryckning och pausas när appen är dold. Licenserna står i `public/audio/CREDITS.md`: eget (FluidR3_GM, MIT), CC0 eller CC-BY (Gem Waltz).

## Introduktion

Det ska gå jättefort att komma in i spelet, och spelet ska vara så tydligt att det knappt behövs någon introduktion. **Beslut:** högst 4 steg, som i liknande spel:

1. Samtycke till testet och loggningen.
2. Utmaning 1 startar direkt, och en hand visar första draget.
3. Spelaren spelar klart utan skylt över brädet.
4. Spelaren går till byn och bygger Stugan.

Liv, Avsluta, specialbrickor, hemskärm och notiser förklaras med ett kort tips första gången de dyker upp. Introduktionen går att spela om från Inställningar. Medan introduktionen pågår pausas brev, erbjudanden och anfallsbanner, och den flyttar själv spelaren till rätt flik.

## 5. Mätning och loggning

Vid varje krokögonblick loggar spelet: tid sedan start, steg, krok, vad som erbjöds och vad spelaren gjorde (ja, nej, väntade, slutade). Loggen skickas till logg-endpointen på devservern.

Per bana loggas: tid på banan, antal drag (även extra drag), vinst eller förlust, och hur nära målet spelaren kom (andel och vad som var kvar).

### Kontrolläge
**Beslut:** varje krok kan slås av och på en och en i dev-menyn. Testerna körs med hela trappan. Ett läge utan krokar kan köras som jämförelse om tiden räcker.

### Avsluta och enkät
- En synlig Avsluta-knapp i byn. Den startar tjatet i steg 5 när det steget är aktivt.
- Spelet loggar också när fliken stängs eller appen läggs i bakgrunden (`visibilitychange`, `pagehide`).
- **Beslut:** efter Avsluta visas en kort enkät i spelet. Varje steg i trappan visas som en bild, och personen skattar pressen 1–5 och svarar ja eller nej på "Hade du slutat här om du spelat på egen hand?". Svaren loggas. Jonas intervjuar efteråt för att fördjupa.

## 6. Backlogg och senare
- Testplånbok som betalas ut på riktigt efter testet (Jonas funderar). Om den betalas ut stängs steg 7 i veckotrappan (kistor, lyckohjul, mästardragningar) av för den testpersonen, så att det inte blir spel om pengar (Jonas 2026-11-18).
- Spelaren anfaller och tar över andra byar.
- Kämpar (dragningar): tas i samband med att striderna mot grannbyar byggs (Jonas 2026-11-20).
- Hård variant av skadade hus: ett hus som stått olagat i 24 timmar tappar en nivå (alternativ C, bortvalt 2026-11-19).
- Säsonger och en samling att fylla.
- Säsongsutseende på byn för vår, höst och övrig vinter (Jonas 2026-11-19: efter exjobbsperioden). Under exjobbet görs bara vinterskruden i december.
