"""Classic Christmas melodies for world 5, the winter market, in the game's own dress.

    python3 tools/audio/carols.py OUT_DIR [name ...]

Jonas 2026-11-19 13.30: "more classic Christmas tunes, but with some marks of
the rest of the game's music, so you feel it belongs to the game", and no
recorder. So: old melodies that are free to use (every composer died long
before 1956, or the tune is traditional), arranged here from scratch. The
music box leads (Jonas's pick for world 5), with the classic Christmas colours
(sleigh bells, celesta, glockenspiel, harp, tubular bells, French horn) and the
game's own marks: the accordion oom-pah and bass of the village and title
music, and the marimba of the match sounds.

The notes were written out by hand; Jingle Bells, Deck the Halls and
Staffansvisan were checked against public transcriptions of the melodies.
Rendered with FluidR3_GM (MIT).
"""
from __future__ import annotations

import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from compose import ACCORDION, AC_BASS, CELESTA, GLOCK, HARP, HORN, MARIMBA, MUSICBOX, PIZZ, TUBULAR  # noqa: E402
from midisynth import RATE, Song, encode, n  # noqa: E402
from title_tunes import TRIADS, bass_root, finish, up  # noqa: E402

DRUMS = 9
SLEIGH, TRIANGLE = 83, 81
TRIADS.update({
    "B7": ["B2", "D#3", "A3"], "Gm": ["G2", "Bb2", "D3"], "Cm": ["C3", "Eb3", "G3"],
    "Bb": ["Bb2", "D3", "F3"], "Eb": ["Eb3", "G3", "Bb3"], "F": ["F3", "A3", "C4"],
    "C7": ["C3", "E3", "Bb3"],
})


def parse(text: str, meter: float) -> list[list[tuple[str | None, float]]]:
    """'D4:1 B4:1 | z:2 G4:2' -> bars of (pitch or None, beats); every bar must fill the meter."""
    bars = []
    for i, bar in enumerate(text.split("|")):
        notes = []
        for tok in bar.split():
            p, d = tok.split(":")
            notes.append((None if p == "z" else p, float(d)))
        assert abs(sum(d for _, d in notes) - meter) < 1e-6, (i + 1, bar)
        bars.append(notes)
    return bars


def chord_plan(text: str, meter: float) -> list[list[tuple[str, float]]]:
    """'G | C:1 D7:2' -> per bar a list of (chord, beats)."""
    out = []
    for i, bar in enumerate(text.split("|")):
        segs = []
        for tok in bar.split():
            name, _, beats = tok.partition(":")
            segs.append((name, float(beats) if beats else meter))
        assert abs(sum(b for _, b in segs) - meter) < 1e-6, (i + 1, bar)
        out.append(segs)
    return out


# Jingle Bells (James Lord Pierpont, 1857; "Bjällerklang"). G major, 4/4.
JINGLE = dict(
    meter=4, bpm=184,
    mel="""D4:1 B4:1 A4:1 G4:1 | D4:3 D4:.5 D4:.5 | D4:1 B4:1 A4:1 G4:1 | E4:4 |
           E4:1 C5:1 B4:1 A4:1 | F#4:3 z:.5 F#4:.5 | D5:1 D5:1 C5:1 A4:1 | B4:3 z:.5 D4:.5 |
           D4:1 B4:1 A4:1 G4:1 | D4:3 z:.5 D4:.5 | D4:1 B4:1 A4:1 G4:1 | E4:3 z:.5 E4:.5 |
           E4:1 C5:1 B4:1 A4:1 | D5:1 D5:1 D5:1 D5:1 | E5:1 D5:1 C5:1 A4:1 | G4:2 D5:2 |
           B4:1 B4:1 B4:2 | B4:1 B4:1 B4:2 | B4:1 D5:1 G4:1.5 A4:.5 | B4:4 |
           C5:1 C5:1 C5:1.5 C5:.5 | C5:1 B4:1 B4:1 B4:.5 B4:.5 | B4:1 A4:1 A4:1 B4:1 | A4:2 D5:2 |
           B4:1 B4:1 B4:2 | B4:1 B4:1 B4:2 | B4:1 D5:1 G4:1.5 A4:.5 | B4:4 |
           C5:1 C5:1 C5:1.5 C5:.5 | C5:1 B4:1 B4:1 B4:.5 B4:.5 | D5:1 D5:1 C5:1 A4:1 | G4:2 z:2""",
    chords="""G | G | G | C | Am | D7 | D7 | G | G | G | G | C | Am | G | D7 | G:2 D7:2 |
              G | G | G | G | C | G | A7 | D7 | G | G | G | G | C | G | D7 | G""",
    passes=["box", "full"],
)

# Deck the Halls (traditional Welsh, "Nos Galan", 18th century). G major, 4/4.
DECK = dict(
    meter=4, bpm=132,
    mel="""D5:1.5 C5:.5 B4:1 A4:1 | G4:1 A4:1 B4:1 G4:1 | A4:.5 B4:.5 C5:.5 A4:.5 B4:1.5 A4:.5 | G4:1 F#4:1 G4:2 |
           D5:1.5 C5:.5 B4:1 A4:1 | G4:1 A4:1 B4:1 G4:1 | A4:.5 B4:.5 C5:.5 A4:.5 B4:1.5 A4:.5 | G4:1 F#4:1 G4:2 |
           A4:1.5 B4:.5 C5:1 A4:1 | B4:1.5 C5:.5 D5:1 A4:1 | B4:.5 C#5:.5 D5:1 E5:.5 F#5:.5 G5:1 | F#5:1 E5:1 D5:2 |
           D5:1.5 C5:.5 B4:1 A4:1 | G4:1 A4:1 B4:1 G4:1 | E5:.5 E5:.5 E5:.5 E5:.5 D5:1.5 C5:.5 | B4:1 A4:1 G4:2""",
    chords="""G | G | D7:2 G:2 | D7:2 G:2 | G | G | D7:2 G:2 | D7:2 G:2 |
              D7 | G | G:2 Em:2 | A7:2 D:2 | G | G | C:2 G:2 | D7:2 G:2""",
    passes=["box", "acc", "full"],
)

# We Wish You a Merry Christmas (traditional English, West Country). G major, 3/4.
# The upbeat D sits at the end of the last bar, so the loop carries it round.
WISH = dict(
    meter=3, bpm=152,
    mel="""G4:1 G4:.5 A4:.5 G4:.5 F#4:.5 | E4:1 E4:1 E4:1 | A4:1 A4:.5 B4:.5 A4:.5 G4:.5 | F#4:1 D4:1 D4:1 |
           B4:1 B4:.5 C5:.5 B4:.5 A4:.5 | G4:1 E4:1 D4:.5 D4:.5 | E4:1 A4:1 F#4:1 | G4:2 D4:1 |
           G4:1 G4:1 G4:1 | F#4:2 F#4:1 | G4:1 F#4:1 E4:1 | D4:2 A4:1 |
           B4:1 A4:1 G4:1 | D5:1 D4:1 D4:.5 D4:.5 | E4:1 A4:1 F#4:1 | G4:2 D4:1""",
    chords="""G | C | A7 | D | B7 | Em | C:1 D7:2 | G |
              G | D | A7 | D | G | G | C:1 D7:2 | G""",
    passes=["box", "acc", "box", "full"],
)

# Staffansvisan, "Staffan var en stalledräng" (traditional Swedish). G minor, 4/4.
STAFFAN = dict(
    meter=4, bpm=168,
    mel="""G4:1 G4:1 G4:1 F#4:1 | G4:1 Bb4:1 D5:1.5 Bb4:.5 | G4:1 G4:1 Bb4:1 G4:1 | G4:2 F#4:1 F#4:1 |
           A4:1 A4:1 C5:1 C5:1 | A4:1 A4:1 Bb4:1 Bb4:1 | G4:1 G4:1 Bb4:1 G4:1 | G4:2 F#4:2 |
           G4:1 G4:1 G4:1 F4:1 | Bb4:1 C5:1 D5:2 | Eb5:1 D5:1 C5:1 Bb4:1 | A4:1 G4:1 Bb4:1.5 A4:.5 | G4:2 z:2""",
    chords="""Gm:3 D:1 | Gm | Gm | Gm:2 D:2 | F | F:2 Bb:2 | Gm | Gm:2 D:2 |
              Gm:3 F:1 | Bb | Cm:2 Gm:2 | D:1 Gm:2 D:1 | Gm""",
    passes=["box", "acc", "box", "full"],
)

# O Tannenbaum (traditional German melody, 16th-18th century; "O gran"). F major, 3/4.
# Jonas 2026-11-19 14.56: slower, and a less sharp sound. So: a calmer tempo, the
# celesta leads instead of the music box, no glockenspiel on top, softer bells.
TANNEN = dict(
    soft=True,
    meter=3, bpm=100,
    mel="""F4:.75 F4:.25 F4:1.5 G4:.5 | A4:.75 A4:.25 A4:1.5 A4:.5 | G4:.5 A4:.5 Bb4:1 E4:1 | G4:1 F4:1 z:.5 C4:.5 |
           F4:.75 F4:.25 F4:1.5 G4:.5 | A4:.75 A4:.25 A4:1.5 A4:.5 | G4:.5 A4:.5 Bb4:1 E4:1 | G4:1 F4:1 z:.5 C5:.5 |
           C5:.5 A4:.5 D5:1.5 C5:.5 | C5:.5 Bb4:.5 Bb4:1.5 Bb4:.5 | Bb4:.5 G4:.5 C5:1.5 Bb4:.5 | Bb4:.5 A4:.5 A4:1 z:.5 C4:.5 |
           F4:.75 F4:.25 F4:1.5 G4:.5 | A4:.75 A4:.25 A4:1.5 A4:.5 | G4:.5 A4:.5 Bb4:1 E4:1 | G4:1 F4:1 z:.5 C4:.5""",
    chords="""F | F | C7 | F | F | F | C7 | F | F | C7 | C7 | F | F | F | C7 | F""",
    passes=["box", "acc", "full"],
)


def carol(t: dict):
    """Passes: 'box' (music box alone over harp and bass), 'acc' (the accordion takes the
    tune, as in the village), 'full' (both, with marimba, horn and bells)."""
    m = t["meter"]
    bars = parse(t["mel"], m)
    chords = chord_plan(t["chords"], m)
    assert len(bars) == len(chords), (len(bars), len(chords))
    s = Song(bpm=t["bpm"])
    s.instrument("box", MUSICBOX, 0, volume=100, pan=60, reverb=65)
    s.instrument("celesta", CELESTA, 1, volume=70, pan=80, reverb=70)
    s.instrument("lead", ACCORDION, 2, volume=84, pan=70, reverb=50)
    s.instrument("comp", ACCORDION, 3, volume=58, pan=44, reverb=45)
    s.instrument("bass", AC_BASS, 4, volume=86, pan=64, reverb=25)
    s.instrument("marimba", MARIMBA, 5, volume=66, pan=34, reverb=45)
    s.instrument("harp", HARP, 6, volume=70, pan=86, reverb=75)
    s.instrument("horn", HORN, 7, volume=60, pan=40, reverb=80)
    s.instrument("bell", TUBULAR, 8, volume=56, pan=52, reverb=85)
    s.instrument("drums", 0, DRUMS, volume=70, pan=64, reverb=30)
    s.instrument("glock", GLOCK, 10, volume=58, pan=88, reverb=65)
    s.instrument("pizz", PIZZ, 11, volume=58, pan=30, reverb=50)
    soft = bool(t.get("soft"))
    beat = 0.0
    for kind in t["passes"]:
        full = kind == "full"
        for bi, (notes, segs) in enumerate(zip(bars, chords)):
            b0 = beat + bi * m
            # melody
            tt = b0
            for p, d in notes:
                if p is not None:
                    vel = 100 if abs(tt - b0) < 1e-6 else 90
                    if kind in ("box", "full"):
                        if soft:  # the celesta is rounder than the music box
                            s.note("celesta", tt, n(p) + 12, d * 0.98, vel - 4)
                        else:
                            s.note("box", tt, n(p) + 12, d * 0.95, vel)
                    if kind in ("acc", "full"):
                        s.note("lead", tt, n(p), d * 0.88, vel - (16 if full else 6))
                    if kind == "acc" and d >= 1 and not soft:
                        s.note("glock", tt, n(p) + 24, 0.4, 56)  # a sparkle on the longer notes
                    if full and d >= 1 and not soft:
                        s.note("celesta", tt, n(p) + 12, d * 0.9, 62)
                tt += d
            # which chord sounds on each beat of the bar
            at, seg_start = [], 0.0
            for name, length in segs:
                at.append((seg_start, name))
                seg_start += length

            def chord_on(k: float) -> str:
                return [c for st, c in at if st <= k + 1e-6][-1]

            for name_start, name in at:
                tri = TRIADS[name]
                if kind == "box" or full:  # harp rolls the chord where it changes
                    for j, p in enumerate(tri):
                        s.note("harp", b0 + name_start + j * 0.08, up(p, 1), 1.8, 52 if full else 58)
                if full and (bi % 2 == 0) and name_start == 0:
                    s.note("horn", b0, up(tri[1], 1) if n(tri[1]) < n("C4") else n(tri[1]), m * 0.95, 54)
            for k in range(int(m)):
                c = chord_on(k)
                tri = TRIADS[c]
                strong = k == 0 or (m == 4 and k == 2)
                if strong:
                    root = bass_root(c)
                    fifth = n(tri[2]) - 12
                    same_as_bar_start = m == 4 and k == 2 and chord_on(0) == c
                    s.note("bass", b0 + k, fifth if same_as_bar_start else root, 0.7, 94)
                elif kind != "box":  # the oom-pah of the village and title music
                    for p in tri:
                        s.note("comp", b0 + k, up(p, 1), 0.3, 66)
                else:
                    s.note("pizz", b0 + k, up(tri[k % 3], 1), 0.3, 50)
                if kind != "box":  # the marimba of the match sounds, skipping through the chord
                    s.note("marimba", b0 + k + 0.5, up(tri[(k + 1) % 3], 2), 0.3, 60 if full else 50)
                    if full:
                        s.note("marimba", b0 + k, up(tri[k % 3], 2), 0.3, 46)
                s.note("drums", b0 + k, SLEIGH, 0.2, (44 if strong else 32) if soft else (64 if strong else 50))
                if kind != "box" and not soft:
                    s.note("drums", b0 + k + 0.5, SLEIGH, 0.2, 40)
            if bi % 4 == 0:
                if not soft:
                    s.note("drums", b0, TRIANGLE, 0.3, 52)
                if full:
                    s.note("bell", b0, up(TRIADS[chord_on(0)][0], 2), 2.5, 58)
        beat += len(bars) * m
    data, secs = finish(s, beat)
    # The music box has sharp attacks, so the peak-normalised mix comes out quieter than
    # the other worlds' music. Lift it and round the peaks off softly.
    if soft:
        # Take the edge off: a gentle low-pass from about 4.5 kHz, done on the spectrum
        # of the whole loop, so the loop point stays seamless.
        spec = np.fft.rfft(data.astype(np.float64), axis=0)
        freq = np.fft.rfftfreq(len(data), 1 / RATE)
        spec *= (1 / np.sqrt(1 + (freq / 4500.0) ** 4))[:, None]
        data = np.fft.irfft(spec, n=len(data), axis=0)
        return (np.tanh(data * 1.6) * 0.85).astype(np.float32), secs
    return (np.tanh(data * 1.7) * 0.85).astype(np.float32), secs


TUNES = {
    "carol_jingle_bells": lambda: carol(JINGLE),
    "carol_deck_the_halls": lambda: carol(DECK),
    "carol_we_wish_you": lambda: carol(WISH),
    "carol_staffansvisan": lambda: carol(STAFFAN),
    "carol_o_tannenbaum": lambda: carol(TANNEN),
}


def main() -> None:
    out = sys.argv[1]
    only = set(sys.argv[2:])
    os.makedirs(out, exist_ok=True)
    for name, fn in TUNES.items():
        if only and name not in only:
            continue
        data, secs = fn()
        encode(data, os.path.join(out, name))
        print(f"{name} {secs:.1f}s")


if __name__ == "__main__":
    main()
