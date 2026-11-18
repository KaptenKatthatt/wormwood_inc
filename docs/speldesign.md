# Speldesign: spelloop, ekonomi och krokar

Designdokument för My Dear Wormwood (förstudietitel "Kära spelare"). Besluten är Jonas, fattade i designpasset 2026-11-17. Dokumentet är byggunderlag, inte rapporttext. Det levande originalet är https://claude.ai/artifact/Mo6ghHMRrEjxGcDtBeGwFv och uppdateras vid varje designbeslut; den här filen hålls i synk med det. Siffrorna är startvärden som balanseras efter användartesterna.

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
- Utan tillräckligt försvar förlorar byn 30 % av guldet, och en byggnad skadas och måste repareras (tar byggtid, kan köpas bort).
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

**Stjärnor och slutfest.** Varje utmaning ger 1–3 stjärnor efter antal drag kvar, och en stjärna räcker för att gå vidare. Tre stjärnor ger 30 extra guld, och stjärnorna visas på kartan. När målet är klart blir varje drag som är kvar en raket som smäller av och ger 5 guld (byggt i 0.20.0).

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

### Testplånboken
Spelaren har 100 låtsaskronor. Köp drar från plånboken, och loggen visar vad pengarna lades på. Inga riktiga pengar.
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

Dagskrokarna startar dag 2, så att första passet bara har trappan. Besök loggas med datum, testdag och längd.

Brytpunkten mäts två gånger: steget i första passet där personen slutar, och dagen då personen slutar komma tillbaka. Spelet loggar varje besök med datum och längd.

### Rösterna i spelet
**Ton (beslut):** spelet har ingen märkbar mörk underton. Spelaren ska invaggas i en falsk trygghet: allt känns gulligt, vänligt och ofarligt. Screwtape-temat finns i titeln och i analysen, inte i det spelaren ser.

**Ljust och varmt:** spelet är alltid ljust och följer inte systemets mörka läge. Ljust vatten, falurött brädram, ljusa trärutor.

**Beslut:** en kombination av en rådgivare och byborna. Lite text att läsa.
- **Rådgivaren**, en äldre släkting, skriver korta brev ("Min käre ...") vid varje nytt steg i trappan och när spelaren vill sluta. Högst två meningar per brev. Varm, omtänksam och tryggt välmenande. Bär kroken *Figurer som pressar*.
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
- Säsonger och en samling att fylla.
