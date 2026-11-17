# Musik och ljud – källor och licenser

Alla ljud valdes av Jonas Olson på lyssningssidan 2026-11-17. Varje fil i
`public/audio/` finns i två format (`.ogg` och `.mp3`) med samma innehåll.

## Egna (komponerade för spelet)

Melodier, arrangemang och ljudeffekter skrivna i kod av Claude (Anthropic) för
det här exjobbet, 2026. Noterna finns i `tools/audio/compose.py` och renderas
med FluidSynth och ljudbanken **FluidR3_GM** (Frank Wen, MIT-licens,
https://github.com/FluidSynth/fluidsynth/wiki/SoundFont). Effekterna "mynt" är
syntetiserade direkt i `compose.py`.

| Fil | Används till | Innehåll |
| --- | --- | --- |
| `music/village-udden` | musik i byn och på kartan | "Udden", polskaliknande vals i D-dur, dragspel och klarinett |
| `music/puzzle-brickor` | musik på udda banor | "Brickor", schottiskänsla i G-dur, marimba och blockflöjt |
| `sfx/match-0` … `match-7` | matchning och kombo | marimba, ett tonsteg högre för varje kedja |
| `sfx/swap` | byta brickor | mjukt marimbaljud |
| `sfx/invalid` | drag utan rad | tock-tock i trä |
| `sfx/near` | "Så nära!" | kalimba som stannar ett steg före grundtonen |
| `sfx/purchase` | köp | celesta och klockspel |
| `sfx/coins` | guld räknas in | syntetiserade mynt |
| `sfx/gems` | ädelstenar | celesta-glissando |
| `sfx/build-done` | bygge klart | folkfanfar på fiol, harpa och dragspel |
| `sfx/attack` | anfall | trumvirvel och stråkar |
| `sfx/defended` | anfallet avvärjt | horn och fiol |
| `sfx/notify` | brev och notis | klockspel |

## Från andra (CC0 och CC-BY)

| Fil | Verk | Upphovsperson | Licens | Källa |
| --- | --- | --- | --- | --- |
| `music/puzzle-gem-waltz` | Gem Waltz (free music loop) | Haley Halcyon | CC-BY 4.0 | https://opengameart.org/content/gem-waltz-free-music-loop |
| `sfx/win` | Gem Waltz, "cleared" | Haley Halcyon | CC-BY 4.0 | https://opengameart.org/content/gem-waltz-free-music-loop |
| `sfx/lose` | Gem Waltz, "gameover" | Haley Halcyon | CC-BY 4.0 | https://opengameart.org/content/gem-waltz-free-music-loop |
| `sfx/click` | Interface Sounds, select_001 | Kenney (kenney.nl) | CC0 | https://opengameart.org/content/interface-sounds |
| `sfx/build-start` | hammarslag: "68 Workshop Sounds" (wood hammering) | bart | CC0 | https://opengameart.org/content/68-workshop-sounds |
| `sfx/build-start` | handsåg: "30 CC0 SFX loops" (saw) | rubberduck | CC0 | https://opengameart.org/content/30-cc0-sfx-loops |
| `music/ambience-sea` | vattenbädd: "Sea and river wave sounds" (Vistula) | RandomMind | CC0 | https://opengameart.org/content/sea-and-river-wave-sounds |
| `music/ambience-sea` | vågor: "Beach Ocean Waves" | jasinski, uppladdat av qubodup | CC0 | https://opengameart.org/content/beach-ocean-waves |
| `music/ambience-sea` | måsar: "Solo Seagull Sound Effects" | Rango Mango | CC0 | https://opengameart.org/content/solo-seagull-sound-effects |

`sfx/build-start` är en mix av hammaren och sågen ovan med ett eget
dragspelsackord på slutet (`tools/audio/build_start.py`). `music/ambience-sea`
är en 48 sekunders loop mixad ur de tre CC0-inspelningarna
(`tools/audio/ambience.py`).

### Attribution (CC-BY)

"Gem Waltz" by Haley Halcyon, licensed under CC BY 4.0
(https://creativecommons.org/licenses/by/4.0/), from OpenGameArt. Converted
to Ogg Vorbis and MP3; not otherwise changed. Samma text visas i spelet under
Inställningar.

Licenserna kontrollerades på respektive OpenGameArt-sida 2026-11-17.
