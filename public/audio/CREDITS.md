# Musik och ljud – källor och licenser

Alla ljud valdes av Jonas Olson på lyssningssidan 2026-11-17. Varje fil i
`public/audio/` finns i två format (`.ogg` och `.mp3`) med samma innehåll.

## Egna (komponerade för spelet)

Melodier, arrangemang och ljudeffekter skrivna i kod av Claude (Anthropic) för
det här exjobbet, 2026. Noterna finns i `tools/audio/compose.py`, `tools/audio/title_tunes.py` och
`tools/audio/world_tunes.py` och renderas
med FluidSynth och ljudbanken **FluidR3_GM** (Frank Wen, MIT-licens,
https://github.com/FluidSynth/fluidsynth/wiki/SoundFont). Effekterna "mynt" är
syntetiserade direkt i `compose.py`.

| Fil | Används till | Innehåll |
| --- | --- | --- |
| `music/title-solsken` | musik på titelskärmen (sjöboden) | "Solsken", glad låt i A-dur, blockflöjt och dragspel (vald 2026-11-18, `tools/audio/title_tunes.py`) |
| `music/village-udden` | musik i byn och på kartan | "Udden", polskaliknande vals i D-dur, dragspel och klarinett |
| `music/puzzle-brickor` | musik på udda banor | "Brickor", schottiskänsla i G-dur, marimba och blockflöjt |
| `music/world-2` | musik i värld 2, Slätten | "Rapsfält", D-dur, visselflöjt och dragspel med träklapper (vald 2026-11-19, `tools/audio/world_tunes.py`) |
| `music/world-3` | musik i värld 3, Bergslagen | "Hammarsmeden", vers i e-moll och refräng i G-dur, klarinett och dragspel med städslag |
| `music/world-4` | musik i värld 4, Höga kusten | "Fiskeläget", jigg i G-dur, dragspel och visselflöjt |
| `music/world-5` | musik i värld 5, Vintermarknaden (växlar med julmelodierna nedan) | "Julmarknad", C-dur, speldosa och blockflöjt med bjällror |
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

## Gamla julmelodier i eget arrangemang (värld 5, Vintermarknaden)

Melodierna är fria att använda: upphovspersonen dog för mer än 70 år sedan
eller melodin är traditionell utan känd upphovsperson. Arrangemangen är egna,
skrivna i kod av Claude (Anthropic) i `tools/audio/carols.py` och renderade
med FluidR3_GM (MIT): speldosa, bjällror, celesta, harpa, valthorn och
rörklockor, med spelets dragspelskomp och marimba. De sex låtarna i värld 5
växlar från bana till bana (Jonas Olson, 2026-11-19).

| Fil | Melodi | Ursprung |
| --- | --- | --- |
| `music/world-5-jingle` | Jingle Bells ("Bjällerklang") | James Lord Pierpont (1822–1893), utgiven 1857 |
| `music/world-5-deck` | Deck the Halls ("Nos Galan") | walesisk folkmelodi, 1700-talet |
| `music/world-5-wish` | We Wish You a Merry Christmas | engelsk folkmelodi |
| `music/world-5-staffan` | Staffansvisan ("Staffan var en stalledräng") | svensk folkmelodi |
| `music/world-5-ogran` | O Tannenbaum ("O gran") | tysk folkmelodi, 1500–1700-talet |

## Från andra (CC0 och CC-BY)

| Fil | Verk | Upphovsperson | Licens | Källa |
| --- | --- | --- | --- | --- |
| `music/puzzle-gem-waltz` | Gem Waltz (free music loop) | Haley Halcyon | CC-BY 4.0 | https://opengameart.org/content/gem-waltz-free-music-loop |
| `sfx/win` | Gem Waltz, "cleared" | Haley Halcyon | CC-BY 4.0 | https://opengameart.org/content/gem-waltz-free-music-loop |
| `sfx/lose` | Gem Waltz, "gameover" | Haley Halcyon | CC-BY 4.0 | https://opengameart.org/content/gem-waltz-free-music-loop |
| `sfx/click` | Interface Sounds, select_001 | Kenney (kenney.nl) | CC0 | https://opengameart.org/content/interface-sounds |
| `sfx/rocket` | raketen: luftsus ur "100 CC0 SFX #2" (air_02) och smäll ur "100 CC0 SFX" (explosion), över ett eget brus som stiger | rubberduck | CC0 | https://opengameart.org/content/100-cc0-sfx-2 |
| `sfx/fireworks` | fyrverkeriet: "100 CC0 SFX" (explosion, shot_02) | rubberduck | CC0 | https://opengameart.org/content/100-cc0-sfx |
| `sfx/shine` | fem i rad som går av: "100 CC0 SFX" (bell_01) över ett eget brus | rubberduck | CC0 | https://opengameart.org/content/100-cc0-sfx |
| `sfx/crack` | sten, malm och klappersten som spricker: "75 CC0 breaking / falling / hit sfx" (rock_hit_01) | rubberduck | CC0 | https://opengameart.org/content/75-cc0-breaking-falling-hit-sfx |
| `sfx/break` | sten som går sönder: "75 CC0 breaking / falling / hit sfx" (rock_breaking_03) | rubberduck | CC0 | https://opengameart.org/content/75-cc0-breaking-falling-hit-sfx |
| `sfx/hammer` | hammaren: "100 CC0 SFX #2" (wood_hit_02) och rock_hit_01 ovan | rubberduck | CC0 | https://opengameart.org/content/100-cc0-sfx-2 |
| `sfx/build-start` | hammarslag: "68 Workshop Sounds" (wood hammering) | bart | CC0 | https://opengameart.org/content/68-workshop-sounds |
| `sfx/build-start` | handsåg: "30 CC0 SFX loops" (saw) | rubberduck | CC0 | https://opengameart.org/content/30-cc0-sfx-loops |
| `music/ambience-sea` | vattenbädd: "Sea and river wave sounds" (Vistula) | RandomMind | CC0 | https://opengameart.org/content/sea-and-river-wave-sounds |
| `music/ambience-sea` | vågor: "Beach Ocean Waves" | jasinski, uppladdat av qubodup | CC0 | https://opengameart.org/content/beach-ocean-waves |
| `music/ambience-sea` | måsar: "Solo Seagull Sound Effects" | Rango Mango | CC0 | https://opengameart.org/content/solo-seagull-sound-effects |

`sfx/build-start` är en mix av hammaren och sågen ovan
(`tools/audio/build_start.py`). Dragspelsackordet som låg på slutet klipptes
bort 2026-11-19 (Jonas: inget tut efter hammaren och sågen). Effekterna för
specialbrickorna och stenarna mixas i `tools/audio/specials.py`; licenserna
kontrollerades på OpenGameArt 2026-11-19. `music/ambience-sea`
är en 48 sekunders loop mixad ur de tre CC0-inspelningarna
(`tools/audio/ambience.py`).

### Attribution (CC-BY)

"Gem Waltz" by Haley Halcyon, licensed under CC BY 4.0
(https://creativecommons.org/licenses/by/4.0/), from OpenGameArt. Converted
to Ogg Vorbis and MP3; not otherwise changed. Samma text visas i spelet under
Inställningar.

Licenserna kontrollerades på respektive OpenGameArt-sida 2026-11-17.

## Reklamfilmernas ljudspår (`ads/`)

De åtta påhittade reklamfilmerna har var sitt tio sekunder långa ljudspår:
`ads/barplock`, `ads/nordanvind`, `ads/vassen`, `ads/fiskelyckan`,
`ads/guldregn`, `ads/fulltraff`, `ads/fyndo`, `ads/kungarskrig`.
Varje spår är mixat ur tre AI-genererade delar (2026-11-19, via Pollinations):
speakerröst på svenska (ElevenLabs Eleven v4, syntetisk röst), musik
(ElevenLabs Music v2.5) och en ljudeffekt (ElevenLabs Text to Sound v3).
Ingen människa har läst in rösterna och ingen befintlig musik har använts.
Manus, promptar och mixning finns i `tools/audio/ads.py`.
