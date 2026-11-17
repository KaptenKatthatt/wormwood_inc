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

**De tre första utmaningarna (spelet 0.6.0):** samla 16 fiskar på 20 drag; rensa is i 2x4 rutor på 22 drag; nå 2 600 poäng på 16 drag. Hjälpmedlen ligger under brädet (hammare 20, blandare 15, +5 drag 30 ädelstenar) med egen krokbrytare "Hjälpmedel".

**Kartan och de 40 utmaningarna (spelet 0.7.0):** fliken heter Kartan. Vägen går genom skärgård (1–13), skog (14–27) och fjäll (28–40), och efter 40 börjar den om på 1. Utmaning 4–40 byggs av inställningar: målen växlar mellan samla, is och poäng och växer långsamt. Var femte är en riggad topp som slutar strax under målet, och nästa är en vilopaus. Belöning: 100 guld plus 10 per tredje utmaning, och 50 extra på topparna. Kartan är en platshållare ritad i kod tills en kartbild godkänns.

**Pusslets utseende (godkänt 2026-11-17):** stil "Rödfärg och skärgård". Bakgrunden är västkustskär med en röd sjöbod, brädet är 8x8 med rödfärgad träram. Sex målade brickor som går att skilja åt på formen även i gråskala: fisk, ankare, snäcka, fyr, silltunna och grön segelbåt med två segel. Inga godisbrickor. Granskningssida: https://claude.ai/artifact/9w6tdaRRE2s343Dwq3XBzP, bilder i /mnt/project-files/pussel-stil/stil1-v1/.

**Hjälpmedel (beslut):** hammaren tar bort en bricka, blandaren blandar om brädet. En gratis av varje i introduktionen, sedan köps de med ädelstenar.

### Byggnaderna
Stil: en gammal svensk by på fastlandet, med åkrar och skog runt om (inte en ö eller udde, som blir för begränsad i yta). Byggnaderna ska passa i sina rutor.

| Byggnad | Funktion |
|---|---|
| Stugan | Huvudbyggnaden. Dess nivå är taket för de andra byggnadernas nivå. |
| Sjöboden | Ger mer guld per vunnen bana (+10 % per nivå). |
| Kasernen | Tränar soldater för guld. |
| Vakttornet | Försvarar byn vid anfall. |
| Kapellet | Bybornas humör. Härifrån kommer tjatet och skulden i steg 5. |

### Anfallet (steg 5)
- En påhittad grannby anfaller runt minut 12. Varning med nedräkning på 60 sekunder.
- Under nedräkningen kan spelaren köpa sköld (100 ädelstenar) eller träna soldater i kasernen.
- Utgången avgörs av armén plus vakttornet mot anfallets styrka.
- Utan tillräckligt försvar förlorar byn 30 % av guldet, och en byggnad skadas och måste repareras (tar byggtid, kan köpas bort).
- Anfallet är inställt på att vara lite för starkt för det spelaren hunnit bygga, så att skölden lockar.

### Kostnadskurvan
Kostnaden växer ungefär i kvadrat med antalet byggen. En vunnen bana ger cirka 100 guld.

| Bygge nr | Guld | Byggtid |
|---|---|---|
| 1 | 0 (gratis) | 5 s |
| 2 | 0 (gratis) | 5 s |
| 3 | 150 | 1 min |
| 4 | 400 | 5 min |
| 5 | 900 | 30 min |
| 6 | 1 600 | 2 h |

Runt minut 6 behövs fyra banor per bygge, och där börjar grindingen.

### Testplånboken
Spelaren har 100 låtsaskronor. Köp drar från plånboken, och loggen visar vad pengarna lades på. Inga riktiga pengar.
Idé i backloggen (Jonas funderar): det som är kvar betalas ut på riktigt efter testet, så att köpen kostar något.

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
- **Verklig tid** är standard i testerna. Tiderna väljs så att väggarna kommer inom 10–15 minuter.
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

Fem steg med ökande press. Varje steg startas av en händelse i spelet, och klockan är reserv om händelsen dröjer.

| Steg | Ungefär | Krokar | Startas av |
|---|---|---|---|
| 1. Mild | min 0–3 | Starthjälp: startbidrag i guld och ädelstenar, de första byggena gratis och klara på sekunder | Spelstart |
| 2. Lockande | min 3–6 | Nära vinst ("bara 2 drag kvar!"), betala för 5 extra drag | Första förlusten eller nära förlusten |
| 3. Begränsande | min 6–9 | Väntetid som går att köpa bort (byggen 5–30 min), liv tar slut, fyll på guld med ädelstenar | Första långa bygget, första gången liven är slut |
| 4. Stressande | min 9–12 | Tidsbegränsat erbjudande med nedräkning, impulsköp mellan banorna | Första förlusten efter minut 9 |
| 5. Skuldbeläggande | min 12–15 | Byn anfalls och skölden kostar ädelstenar (ägande), byborna blir ledsna och tjatar när spelaren vill sluta (skuld) | Minut 12, eller när spelaren försöker sluta |

**Fyll på guld (steg 3):** när guldet inte räcker till ett bygge visas "Fyll på X guld för Y ädelstenar" (10 guld per ädelsten, avrundat uppåt), och bygget startar direkt. Egen brytare i dev-menyn. Loggas som krokögonblick (visad, ja, räcker inte).

Hela tiden: butiken finns tillgänglig. Från steg 2: nästa bana startar av sig själv (inga naturliga stopp).

### Testupplägg: första pass plus en fri vecka

Varje testperson spelar först ett pass på cirka 15 minuter med trappan, och behåller sedan spelet en vecka hemma. Under veckan slås krokarna som verkar över dagar på. Jonas intervjuar efter veckan.

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

## Introduktion

Spelet förklarar sig självt, så att Jonas kan lämna det till vem som helst utan att säga något. En kort interaktiv genomgång, varm och trygg i tonen, som går att spela om från Inställningar:

1. Samtycke till testet och loggningen.
2. Lägga spelet på hemskärmen och slå på notiser.
3. Hur man byter brickor.
4. Banans mål.
5. Liv.
6. Byn och byggen.
7. Var Avsluta finns.

Medan introduktionen pågår pausas brev, erbjudanden och anfallsbanner, och introduktionen flyttar själv spelaren till rätt flik.

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
- Testplånbok som betalas ut på riktigt efter testet (Jonas funderar).
- Spelaren anfaller och tar över andra byar.
- Säsonger och en samling att fylla.
