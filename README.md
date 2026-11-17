# My Dear Wormwood

Ett match-3-spel med en by, byggt som PWA för ett examensarbete om
engagemangsdriven design ("Kära spelare – En studie i manipulation och
underhållning"). Spelet är bara på svenska.

**Status:** projektskelett. Pusslet och byn är platshållare; speldesignen görs separat.

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

## Utvecklarmeny och testplånbok

Utvecklarmenyn (tid, påfyllning av plånboken, nollställning, teknisk info)
finns i vanliga byggen. Versionen till testpersonerna byggs utan den, och då
går klockan alltid i verklig tid:

```bash
VITE_DEV_MENU=false npm run build
```

Köp görs med en **testplånbok** med låtsaskronor (`src/lib/economy/wallet.ts`),
100 kr från start. Inga riktiga pengar rör sig; varje köp och nekat köp loggas.

## Speltestlogg

`src/lib/log/logger.ts` köar händelser och skickar dem till `/api/log` först
när spelaren har sagt ja. Spelaren identifieras bara med ett slumpat id.
Servern sparar en NDJSON-fil per dag.

## Kommandon

```bash
npm install
npm run dev          # Vite på :5173 (proxy för /api till :8787)
npm run dev:server   # backend på :8787
npm run verify       # typkontroll + tester + bygge
npm run preview      # bygg och kör allt på :8787
```

Driftsättning på devservern: `deploy/DEPLOY.md`.
