"""Puzzle music for worlds 2-5 (Jonas 2026-11-19: "different music in the different worlds").

    python3 tools/audio/world_tunes.py OUT_DIR [name ...]

Same happy, catchy colour Jonas picked for the title screen (short hook that
comes back, whistle or recorder with accordion, little fiddle). All melodies
are original, written for the game; rendered with FluidR3_GM (MIT).
"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from compose import ACCORDION, AC_BASS, CELESTA, CLARINET, GLOCK, MARIMBA, MUSICBOX, PIZZ, WOODBLOCK  # noqa: E402
from midisynth import Song, encode, n  # noqa: E402
from title_tunes import (  # noqa: E402
    CRAB, POLKA, RECORDER, SAIL, TRIADS, WHISTLE, bass_root, finish, halves, melody, up,
)

NYLON_GTR = 24
DRUMS = 9
TAMB, SHAKER, CLAP, SLEIGH, TRIANGLE = 54, 82, 39, 83, 81
T = 1 / 3  # one eighth in a jig; the beat is a dotted quarter
TRIADS.update({"F": ["F3", "A3", "C4"], "Dm": ["D3", "F3", "A3"], "G7": ["G2", "B2", "F3"]})  # shared with title_tunes

# World 2, the plain: "Rapsfält" (Rapeseed field), D major. Rocking thirds like a windmill turning.
RAPS_A = [
    [("A5", .5), ("F#5", .5), ("D5", .5), ("F#5", .5), ("A5", 1), ("D6", 1)],
    [("B5", .5), ("G5", .5), ("D5", .5), ("G5", .5), ("B5", 2)],
    [("A5", .5), ("F#5", .5), ("D5", .5), ("F#5", .5), ("A5", 1), ("F#5", 1)],
    [("E5", .5), ("F#5", .5), ("G5", .5), ("F#5", .5), ("E5", 2)],
    [("A5", .5), ("F#5", .5), ("D5", .5), ("F#5", .5), ("A5", 1), ("D6", 1)],
    [("B5", .5), ("D6", .5), ("B5", .5), ("G5", .5), ("B5", 1), ("G5", 1)],
    [("G5", .5), ("F#5", .5), ("E5", .5), ("G5", .5), ("A5", .5), ("C#6", .5), ("E6", 1)],
    [("D6", 1), ("A5", .5), ("D6", .5), (None, 2)],
]
RAPS_AC = ["D", "G", "D", "A", "D", "G", ("Em", "A"), "D"]
RAPS_B = [
    [("D6", 1), ("B5", .5), ("D6", .5), (None, .5), ("B5", .5), ("G5", 1)],
    [("A5", 1), ("F#5", .5), ("A5", .5), (None, .5), ("F#5", .5), ("D5", 1)],
    [("G5", .5), ("A5", .5), ("B5", .5), ("G5", .5), ("E5", 1), ("B5", 1)],
    [("A5", 1.5), ("G5", .5), ("E5", 2)],
    [("D6", 1), ("B5", .5), ("D6", .5), (None, .5), ("B5", .5), ("G5", 1)],
    [("A5", 1), ("F#5", .5), ("A5", .5), (None, .5), ("F#5", .5), ("D5", 1)],
    [("E5", .5), ("G5", .5), ("B5", .5), ("A5", .5), ("G5", .5), ("E5", .5), ("C#5", 1)],
    [("D5", 2), (None, 2)],
]
RAPS_BC = ["G", "D", "Em", "A", "G", "D", ("Em", "A"), "D"]

# World 3, Bergslagen: "Hammarsmeden" (The hammer smith). E minor verse with an anvil,
# G major refrain, so it stays glad.
SMED_A = [
    [("E5", .5), ("G5", .5), ("B5", 1), ("B5", .5), ("A5", .5), ("G5", 1)],
    [("F#5", .5), ("A5", .5), ("D6", 1), ("D6", .5), ("C6", .5), ("A5", 1)],
    [("E5", .5), ("G5", .5), ("B5", 1), ("B5", .5), ("A5", .5), ("G5", .5), ("E5", .5)],
    [("A5", 1.5), ("F#5", .5), ("D5", 2)],
    [("E5", .5), ("G5", .5), ("B5", 1), ("B5", .5), ("A5", .5), ("G5", 1)],
    [("E5", .5), ("G5", .5), ("C6", 1), ("C6", .5), ("B5", .5), ("G5", 1)],
    [("A5", .5), ("B5", .5), ("C6", .5), ("A5", .5), ("F#5", 1), ("D5", 1)],
    [("E5", 2), (None, 2)],
]
SMED_AC = ["Em", "D", "Em", "D", "Em", "C", "D", "Em"]
SMED_B = [
    [("D6", 1), ("B5", .5), ("G5", .5), ("B5", 1), ("D6", 1)],
    [("E6", 1), ("C6", .5), ("G5", .5), ("C6", 2)],
    [("D6", .5), ("C6", .5), ("B5", .5), ("A5", .5), ("G5", 1), ("B5", 1)],
    [("A5", 1.5), ("B5", .5), ("A5", 2)],
    [("D6", 1), ("B5", .5), ("G5", .5), ("B5", 1), ("D6", 1)],
    [("E6", 1), ("C6", .5), ("G5", .5), ("C6", 2)],
    [("C6", .5), ("B5", .5), ("A5", .5), ("C6", .5), ("B5", 1), ("F#5", 1)],
    [("E5", 2), (None, 2)],
]
SMED_BC = ["G", "C", "G", "D", "G", "C", ("Am", "D7"), "Em"]

# World 4, the High Coast: "Fiskeläget" (The fishing village), a jig in G major.
# One bar here is two bars of 6/8.
FISK_A = [
    [("D5", T), ("G5", T), ("G5", T), ("B5", 2 * T), ("G5", T), ("A5", T), ("B5", T), ("A5", T), ("G5", 2 * T), ("E5", T)],
    [("E5", T), ("G5", T), ("C6", T), ("E6", 2 * T), ("C6", T), ("D6", T), ("C6", T), ("B5", T), ("A5", 1)],
    [("D5", T), ("G5", T), ("G5", T), ("B5", 2 * T), ("G5", T), ("A5", T), ("B5", T), ("A5", T), ("G5", 2 * T), ("B5", T)],
    [("A5", 2 * T), ("F#5", T), ("D5", 2 * T), ("F#5", T), ("A5", 1), (None, 1)],
    [("D5", T), ("G5", T), ("G5", T), ("B5", 2 * T), ("G5", T), ("A5", T), ("B5", T), ("A5", T), ("G5", 2 * T), ("E5", T)],
    [("E5", T), ("G5", T), ("C6", T), ("E6", 2 * T), ("C6", T), ("D6", T), ("E6", T), ("D6", T), ("C6", 1)],
    [("B5", T), ("A5", T), ("G5", T), ("F#5", 2 * T), ("A5", T), ("D6", 2 * T), ("C6", T), ("A5", 2 * T), ("F#5", T)],
    [("G5", 1), ("D5", 2 * T), ("D5", T), ("G5", 1), (None, 1)],
]
FISK_AC = ["G", "C", "G", "D", "G", "C", "D7", "G"]
FISK_B = [
    [("E5", 2 * T), ("G5", T), ("B5", 2 * T), ("G5", T), ("E6", 1), ("B5", 1)],
    [("C6", 2 * T), ("E6", T), ("D6", 2 * T), ("C6", T), ("B5", T), ("A5", T), ("G5", T), ("A5", 1)],
    [("B5", 2 * T), ("D6", T), ("G6", 2 * T), ("D6", T), ("B5", T), ("C6", T), ("D6", T), ("B5", 1)],
    [("A5", T), ("B5", T), ("A5", T), ("F#5", 2 * T), ("D5", T), ("A5", 1), (None, 1)],
    [("E5", 2 * T), ("G5", T), ("B5", 2 * T), ("G5", T), ("E6", 1), ("B5", 1)],
    [("C6", 2 * T), ("E6", T), ("D6", 2 * T), ("C6", T), ("B5", T), ("A5", T), ("G5", T), ("A5", 1)],
    [("C6", T), ("B5", T), ("A5", T), ("C6", 2 * T), ("A5", T), ("F#5", T), ("G5", T), ("A5", T), ("D6", 1)],
    [("G5", 2), (None, 2)],
]
FISK_BC = ["Em", "C", "G", "D", "Em", "C", ("Am", "D7"), "G"]

# World 5, the winter market: "Julmarknad" (Christmas market), C major, with sleigh bells.
JUL_A = [
    [("G5", 1), ("E5", .5), ("G5", .5), ("C6", 1), ("G5", 1)],
    [("A5", .5), ("C6", .5), ("A5", .5), ("F5", .5), ("A5", 2)],
    [("G5", 1), ("E5", .5), ("G5", .5), ("C6", 1), ("E6", 1)],
    [("D6", .5), ("C6", .5), ("B5", .5), ("A5", .5), ("G5", 2)],
    [("G5", 1), ("E5", .5), ("G5", .5), ("C6", 1), ("G5", 1)],
    [("A5", .5), ("C6", .5), ("F6", 1), ("E6", .5), ("D6", .5), ("C6", 1)],
    [("D6", .5), ("C6", .5), ("A5", .5), ("F5", .5), ("G5", .5), ("A5", .5), ("B5", 1)],
    [("C6", 1), ("G5", .5), ("C6", .5), (None, 2)],
]
JUL_AC = ["C", "F", "C", "G", "C", "F", ("Dm", "G7"), "C"]
JUL_B = [
    [("E6", 1), ("C6", .5), ("A5", .5), ("C6", 1), ("E6", 1)],
    [("F6", 1), ("C6", .5), ("A5", .5), ("C6", 2)],
    [("E6", .5), ("D6", .5), ("C6", .5), ("G5", .5), ("E5", 1), ("G5", 1)],
    [("B5", 1.5), ("A5", .5), ("G5", 2)],
    [("E6", 1), ("C6", .5), ("A5", .5), ("C6", 1), ("E6", 1)],
    [("F6", 1), ("C6", .5), ("A5", .5), ("C6", 2)],
    [("D6", .5), ("E6", .5), ("F6", .5), ("D6", .5), ("B5", 1), ("G5", 1)],
    [("C6", 2), (None, 2)],
]
JUL_BC = ["Am", "F", "C", "G", "Am", "F", ("Dm", "G7"), "C"]

RAPS = dict(A=RAPS_A, Ac=RAPS_AC, B=RAPS_B, Bc=RAPS_BC)
SMED = dict(A=SMED_A, Ac=SMED_AC, B=SMED_B, Bc=SMED_BC)
FISK = dict(A=FISK_A, Ac=FISK_AC, B=FISK_B, Bc=FISK_BC)
JUL = dict(A=JUL_A, Ac=JUL_AC, B=JUL_B, Bc=JUL_BC)
for _t in (RAPS, SMED, FISK, JUL):
    for _part in ("A", "B"):
        assert len(_t[_part]) == len(_t[_part + "c"]) == 8
        for _i, _bar in enumerate(_t[_part]):
            assert abs(sum(d for _, d in _bar) - 4) < 1e-6, (_part, _i)


def world(tune: dict, bpm: float, lead: int, lead2: int, groove: str = "pop", octave: int = 0,
          chords: int = NYLON_GTR, sparkle: int = GLOCK, extra: str | None = None):
    """A A B A, like the title tunes. groove: 'pop' (guitar off-beats, claps), 'polka'
    (oom-pah) or 'jig' (6/8). extra: 'anvil' (a hammer on metal on two and four),
    'sleigh' (sleigh bells) or 'mill' (a wooden clack on every beat)."""
    s = Song(bpm=bpm)
    s.instrument("lead", lead, 0, volume=96, pan=58, reverb=55)
    s.instrument("lead2", lead2, 1, volume=86, pan=74, reverb=55)
    s.instrument("sparkle", sparkle, 2, volume=62, pan=86, reverb=60)
    s.instrument("chords", chords, 3, volume=64, pan=46, reverb=45)
    s.instrument("bass", AC_BASS, 4, volume=86, pan=64, reverb=25)
    s.instrument("pizz", PIZZ, 5, volume=60, pan=36, reverb=50)
    s.instrument("anvil", GLOCK, 6, volume=70, pan=30, reverb=65)
    s.instrument("wood", WOODBLOCK, 7, volume=56, pan=34, reverb=40)
    s.instrument("drums", 0, DRUMS, volume=70, pan=64, reverb=30)
    off = 2 * T if groove == "jig" else 0.5  # where the off-beat falls
    plan = [("A", "lead", None, False), ("A", "lead", "sparkle", True),
            ("B", "lead2", "lead", True), ("A", "lead", "sparkle", True)]
    beat = 0.0
    for part, ld, dbl, full in plan:
        for bar, (notes, ch) in enumerate(zip(tune[part], tune[part + "c"])):
            b0 = beat + bar * 4
            sh = [((n(p) + 12 * octave) if p else None, d) for p, d in notes]
            melody(s, ld, b0, sh, 98, legato=0.85)
            if dbl == "sparkle":
                melody(s, "sparkle", b0, [((p + 12) if p else None, d) for p, d in sh], 68, legato=0.6)
            elif dbl:
                melody(s, dbl, b0, [((p - 12) if p else None, d) for p, d in sh], 72, legato=0.85)
            for h, c in enumerate(halves(ch)):
                span = 4 / len(halves(ch))
                hb = b0 + h * span
                tri = TRIADS[c]
                for k in range(int(span)):
                    t = hb + k
                    if k % 2 == 0:
                        s.note("bass", t, bass_root(c) if k == 0 else n(tri[2]) - 12, 0.6, 96)
                    else:
                        for p in tri:
                            s.note("chords", t, up(p, 1), 0.3, 70)
                    if groove != "polka":
                        for p in tri:
                            s.note("chords", t + off, up(p, 1), 0.22, 56)
                    if full:
                        s.note("pizz", t + off, up(tri[(k + 1) % 3], 1), 0.25, 54)
            for k in range(4):
                t = b0 + k
                if full:
                    s.note("drums", t + off, TAMB, 0.2, 52)
                    if groove == "pop" and k % 2 == 1:
                        s.note("drums", t, CLAP, 0.2, 58)
                    if groove == "polka":
                        s.note("drums", t, SHAKER, 0.2, 40)
                if extra == "anvil" and k % 2 == 1:
                    s.note("anvil", t, "B6", 0.2, 78 if full else 62)
                    s.note("anvil", t, "F#7", 0.2, 50 if full else 40)
                elif extra == "sleigh":
                    s.note("drums", t, SLEIGH, 0.2, 62)
                    s.note("drums", t + 0.5, SLEIGH, 0.2, 44)
                    if k == 0:
                        s.note("drums", t, TRIANGLE, 0.3, 50)
                elif extra == "mill":
                    s.note("wood", t, "A4" if k % 2 == 0 else "E5", 0.15, 58 if k % 2 == 0 else 44)
        beat += 32
    return finish(s, beat)


TUNES = {
    # 2 Slätten
    "world2_rapsfalt": lambda: world(RAPS, 120, WHISTLE, ACCORDION, "pop", extra="mill"),
    "world2_rapsfalt_recorder": lambda: world(RAPS, 116, RECORDER, ACCORDION, "pop", extra="mill"),
    "world2_segelvind": lambda: world(SAIL, 122, WHISTLE, ACCORDION, "pop"),
    # 3 Bergslagen
    "world3_hammarsmeden": lambda: world(SMED, 118, CLARINET, ACCORDION, "polka", chords=ACCORDION, extra="anvil"),
    "world3_hammarsmeden_whistle": lambda: world(SMED, 122, WHISTLE, ACCORDION, "pop", extra="anvil"),
    "world3_krabbfisket": lambda: world(CRAB, 122, ACCORDION, CLARINET, "polka", octave=-1, chords=ACCORDION,
                                        sparkle=MARIMBA, extra="anvil"),
    # 4 Höga kusten
    "world4_fiskelaget": lambda: world(FISK, 112, WHISTLE, ACCORDION, "jig", octave=-1),
    "world4_fiskelaget_accordion": lambda: world(FISK, 108, ACCORDION, WHISTLE, "jig", octave=-1),
    "world4_polka": lambda: world(POLKA, 134, WHISTLE, ACCORDION, "polka", octave=-1, chords=ACCORDION),
    # 5 Vintermarknaden
    "world5_julmarknad": lambda: world(JUL, 116, RECORDER, ACCORDION, "pop", octave=-1, sparkle=CELESTA, extra="sleigh"),
    "world5_julmarknad_musicbox": lambda: world(JUL, 110, MUSICBOX, RECORDER, "polka", octave=-1, chords=ACCORDION,
                                                sparkle=CELESTA, extra="sleigh"),
    "world5_julmarknad_whistle": lambda: world(JUL, 120, WHISTLE, ACCORDION, "pop", octave=-1, sparkle=GLOCK, extra="sleigh"),
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
