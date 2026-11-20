# Skärgårdsbyn

Ett match-3-spel med en by, byggt som PWA för ett examensarbete om
engagemangsdriven design ("Kära spelare – En studie i manipulation och
underhållning"). Spelet är bara på svenska.

**Status:** spelbar första version enligt speldesignen (`docs/speldesign.md` på grenen claude/project-thread-poksrp): tre match-3-banor, liv, extra drag, byn med fem byggnader och kostnadskurva, butik med testplånbok. Hela kroktrappan i fem steg finns: rådgivarens brev, bybornas pratbubblor och trivselmätare, nästa bana som startar av sig själv, startpaketet med nedräkning, anfallet med sköld och soldater, Avsluta med tjat och ett tack (frågorna om press per steg ligger sist i frågeformuläret). Grafiken är platshållare. Tonen är varm och trygg på ytan (beslut 2026-11-17); temat syns bara i titel och analys.

## Stack

- **Phaser 4** ritar spelplanen och byn (`src/game/`)
- **Svelte 5 + TypeScript** för menyer, HUD och inställningar (`src/ui/`)
- **Vite** bygger, **vite-plugin-pwa** gör manifest och service worker (`src/sw.ts`), så spelet kan installeras på hemskärmen och starta offline
- **Node** (`server/`, inga ramverk) serverar spelet och tar emot speltestloggar och Web Push

## Tidssystemet

`src/lib/time/` är spelets klocka. Speltid räknas från den riktiga klockan, så
liv, byggtider och erbjudanden fortsätter även när spelet är stängt. Allt sparas
som tidpunkter i speltid och "räknas ikapp" när spelet öppnas.

- `clock.ts` – speltid med hastighet. **Verklig tid** eller **snabbläge** (×15, 30 minuter blir 2) väljs i utvecklarmenyn under Inställningar. Klockan går aldrig bakåt om telefonens klocka ställs om.
- `lives.ts` – liv som fylls på (5 st, ett per 30 min).
- `timers.ts` – nedräkningar (bygg, erbjudande, anfall) som kan "köpas bort".

När ett bygge startas och notiser är på ber spelet servern om en notis vid
rätt verklig tid (`/api/push/schedule`), så notisen kommer även när spelet är stängt.

## Kroktrappan

`src/lib/staircase.ts` avgör steget (1 Mild, 2 Lockande, 3 Begränsande, 4 Stressande, 5 Skuldbeläggande) från händelser i spelet (förlust, långt bygge, slut på liv, Avsluta), med klockan som reserv (minut 3, 6, 10 och 12 i speltid). Texterna ligger i `src/lib/voices.ts`. Nedräkningar som spelaren ska hinna reagera på (anfallet, startpaketet) går i verkliga sekunder även med snabbad klocka.

## Match-3 och riggad nära vinst

`src/lib/match3/engine.ts` har reglerna utan grafik; `src/game/Match3Scene.ts` animerar stegen. När kroken *Riggad nära vinst* är på styr en "regissör" nya brickor: ligger spelaren före kurvan undviker de nya brickorna att bilda rader och målbrickan, ligger hen efter gynnas båda. Det gör att banor oftast slutar precis vid målet. Bana 3 siktar på att sluta strax under målet. Av betyder ärlig slump.

## Introduktionen

`src/lib/tutorial.ts` håller elva steg som spelaren gör på riktigt: spela bana 1, byta brickor (två brickor blinkar som tips), målet, liven, bygga stugan i byn, ädelstenarna, var Avsluta finns och hemskärmen. `src/ui/Coach.svelte` ringar in det som ska tryckas på och läser upp varje steg för skärmläsare. Introduktionen startar efter samtycket, går att hoppa över och kan visas igen under Inställningar. Kroktrappan väntar tills introduktionen är klar. Brädet går också att spela med piltangenter och Enter.

## Utvecklarmeny och testplånbok

Utvecklarmenyn (tid, påfyllning av plånboken, nollställning, teknisk info)
finns i vanliga byggen. Versionen till testpersonerna byggs utan den, och då
går klockan alltid i verklig tid:

```bash
VITE_DEV_MENU=false npm run build
```

Köp görs med en **testplånbok** med låtsaskronor (`src/lib/economy/wallet.ts`),
100 kr från start, som bara köper ädelstenspaket i butiken. Allt annat i spelet, även startpaketet, kostar ädelstenar (Jonas, 2026-11-17). Inga riktiga pengar rör sig. Varje krokögonblick loggas som en `hook`-händelse med vad som erbjöds och vad spelaren gjorde. Varje krok kan slås av i utvecklarmenyn.

## Speltestlogg

`src/lib/log/logger.ts` köar händelser och skickar dem till `/api/log` först
när spelaren har sagt ja. Spelaren identifieras bara med ett slumpat id.
Servern sparar en NDJSON-fil per dag.

Varje avslutad bana loggas (`level_won` eller `level_lost`) med tid i sekunder, använda och givna drag, köpta extra drag, hur nära målet spelaren kom (0 till 1), vad som var kvar, poäng och om banan var riggad. Introduktionen loggas med `tutorial_start`, `tutorial_step` och `tutorial_end`.

## Frågeformuläret

Testare som inte kan intervjuas svarar i spelet i stället (`src/lib/questionnaire.ts`, `src/ui/Questionnaire.svelte`). Alla frågor har färdiga alternativ, och fritext är en frivillig ruta. Spelet frågar själv från testdag 8, högst tre gånger, och formuläret finns alltid under Inställningar. Del 1 ställs utan att något avslöjas. Debriefingen och de sista frågorna visas först när testaren väljer "Jag har testat klart", eller från `STUDY_END` för alla, så att den som spelar vidare inte påverkas. Från `STUDY_END` (19 december) måste formuläret besvaras innan spelet går vidare; därefter får testaren spela så länge hen vill. Svaren loggas som `questionnaire_part1` och `questionnaire_part2`; ett nej till att uppgifterna används loggas som `data_withdrawn` och stänger av loggningen.

## Kommandon

```bash
npm install
npm run dev          # Vite på :5173 (proxy för /api till :8787)
npm run dev:server   # backend på :8787
npm run verify       # typkontroll + tester + bygge
npm run preview      # bygg och kör allt på :8787
```

Driftsättning på devservern: `deploy/DEPLOY.md`.
