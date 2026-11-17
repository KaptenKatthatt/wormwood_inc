# Speldesign: spelloop, ekonomi och krokar

Designdokument för My Dear Wormwood (förstudietitel "Kära spelare"). Besluten är Jonas, fattade i designpasset 2026-11-17. Dokumentet är byggunderlag, inte rapporttext. Siffrorna är startvärden som balanseras efter användartesterna.

## 1. Syfte med designen

Spelet ska mäta vid vilket steg i en trappa med ökande press som spelaren slutar spela (förstudien, Syfte). Därför ska varje krok ha ett tydligt ögonblick, kunna loggas och kunna slås av och på.

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
| Liv | Max 5, ett nytt var 20:e minut | Starta en bana (förlust kostar ett liv) |
| Kronor (låtsas) | Testplånbok, 100 kr vid start | Köpa ädelstenar och paket i butiken |

### Banorna
- Tre olika banor med olika mål: samla ett visst antal brickor av en sort, rensa is, nå en poänggräns.
- Banorna kan spelas om för guld. Ett pass blir 8–10 banor.
- Bana 3 är svår, så att liven tar slut för de flesta.
- **Beslut:** nära vinst är riggad. Spelet väljer nya brickor så att en förlust oftast slutar 1–3 drag eller några brickor från målet. Brytare i dev-menyn slår av riggningen (ärlig slump).

### Byggnaderna
Stil: "rödfärg och skärgård", byn ligger på en udde (se moodboarden).

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
| Ett liv | 20 |
| Fulla liv | 60 |
| En minut byggtid | 1 (minst 5 per köp) |
| Sköld i 8 timmar | 100 |

**Startbidrag:** 30 ädelstenar, så att spelaren hinner betala med ädelstenar innan det kostar kronor.

**Erbjudandet i steg 4:** "Startpaket", 19 kr för 250 ädelstenar och 1 000 guld, försvinner efter 5 minuter (nedräkning syns).

Priser i ädelstenar visas utan kronor bredvid, eftersom det otydliga priset är en del av kroken *Flera valutalager*.

### Tid
- **Verklig tid** är standard i testerna. Tiderna väljs så att väggarna kommer inom 10–15 minuter.
- **Snabbad klocka** (till exempel 60 gånger) kan väljas i dev-menyn.
- Byggtider, startvärden: första bygget 5 s, sedan 1 min, 5 min, 30 min, 2 h.
- Banorna 3–4 blir märkbart svårare, så att livet tar slut för de flesta inom ett pass.

### Dev-menyn
Växla verklig och snabbad tid, slå krokar av och på, nollställa sparad data. Menyn stängs av helt i versionen som går till testpersoner (byggflagga).

## 4. Kroktrappan

Fem steg med ökande press. Varje steg startas av en händelse i spelet, och klockan är reserv om händelsen dröjer.

| Steg | Ungefär | Krokar | Startas av |
|---|---|---|---|
| 1. Mild | min 0–3 | Starthjälp: startbidrag i guld och ädelstenar, de första byggena gratis och klara på sekunder | Spelstart |
| 2. Lockande | min 3–6 | Nära vinst ("bara 2 drag kvar!"), betala för 5 extra drag | Första förlusten eller nära förlusten |
| 3. Begränsande | min 6–9 | Väntetid som går att köpa bort (byggen 5–30 min), liv tar slut | Första långa bygget, första gången liven är slut |
| 4. Stressande | min 9–12 | Tidsbegränsat erbjudande med nedräkning, impulsköp mellan banorna | Första förlusten efter minut 9 |
| 5. Skuldbeläggande | min 12–15 | Byn anfalls och skölden kostar ädelstenar (ägande), byborna blir ledsna och tjatar när spelaren vill sluta (skuld) | Minut 12, eller när spelaren försöker sluta |

Hela tiden: butiken finns tillgänglig. Från steg 2: nästa bana startar av sig själv (inga naturliga stopp).

### Rösterna i spelet
**Beslut:** en kombination av en rådgivare och byborna. Lite text att läsa.
- **Rådgivaren**, en äldre släkting, skriver korta brev ("Min käre ...") vid varje nytt steg i trappan och när spelaren vill sluta. Högst två meningar per brev. Artig och varm, med en underton (Screwtape i bakgrunden, inget "djävul" rakt ut). Bär kroken *Figurer som pressar*.
- **Byborna** syns i byn och reagerar med korta pratbubblor på några ord: glada efter bygge, oroliga när anfallet närmar sig, ledsna när spelaren vill sluta.
- **Trivselmätare** i byns överkant: en snabb överblick över hur byborna trivs (ansikte plus stapel). Trivseln stiger med byggen och sjunker vid anfall, skadade byggnader och när spelaren varit borta. Ger skuldkroken något att peka på.

## 5. Mätning och loggning

Vid varje krokögonblick loggar spelet: tid sedan start, steg, krok, vad som erbjöds och vad spelaren gjorde (ja, nej, väntade, slutade). Loggen skickas till logg-endpointen på devservern.

### Kontrolläge
**Beslut:** varje krok kan slås av och på en och en i dev-menyn. Testerna körs med hela trappan. Ett läge utan krokar kan köras som jämförelse om tiden räcker.

### Avsluta och enkät
- En synlig Avsluta-knapp i byn. Den startar tjatet i steg 5 när det steget är aktivt.
- Spelet loggar också när fliken stängs eller appen läggs i bakgrunden (`visibilitychange`, `pagehide`).
- **Beslut:** efter Avsluta visas en kort enkät i spelet. Varje steg i trappan visas som en bild, och personen skattar pressen 1–5 och svarar ja eller nej på "Hade du slutat här om du spelat på egen hand?". Svaren loggas. Jonas intervjuar efteråt för att fördjupa.

## 6. Backlogg och senare
- Testplånbok som betalas ut på riktigt efter testet (Jonas funderar).
- Spelaren anfaller och tar över andra byar.
- Krokar när spelaren är borta (Web Push-notiser, byn anfallen under natten), sprint 3.
- Ett andra testpass en dag senare med samma person.
