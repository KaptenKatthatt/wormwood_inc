"""More village tunes (Jonas 2026-11-17 13.34: "the village needs new music too").

    python3 tools/audio/village_tunes.py OUT_DIR [name ...]

All melodies are original, written for the game. Same folk colour as "Udden",
rendered with FluidR3_GM (MIT) like the rest of tools/audio.
"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from compose import (  # noqa: E402
    ACCORDION, AC_BASS, CLARINET, FLUTE, HARP, NYLON, STRINGS, TRIADS, VIOLIN, up,
)
from midisynth import Song, encode, loop_bake, n, normalize  # noqa: E402

CELLO = 42
TRIADS = {**TRIADS,
          "E": ["E3", "G#3", "B3"], "F#m": ["F#3", "A3", "C#4"], "Bb": ["Bb2", "D3", "F3"],
          "Dm": ["D3", "F3", "A3"], "F": ["F3", "A3", "C4"], "E7": ["E3", "G#3", "D4"]}

# "Bryggan" (The jetty): a schottis in A major, 4/4.
BRYGGAN = dict(
    A=[[("E5", .75), ("C#5", .25), ("A4", .75), ("C#5", .25), ("E5", 1), ("A5", 1)],
       [("F#5", .75), ("E5", .25), ("D5", .75), ("F#5", .25), ("A5", 2)],
       [("E5", .75), ("C#5", .25), ("A4", .75), ("B4", .25), ("C#5", 1), ("E5", 1)],
       [("D5", .75), ("C#5", .25), ("B4", .75), ("A4", .25), ("G#4", 2)],
       [("E5", .75), ("C#5", .25), ("A4", .75), ("C#5", .25), ("E5", 1), ("A5", 1)],
       [("F#5", .75), ("A5", .25), ("F#5", .75), ("D5", .25), ("B4", 2)],
       [("C#5", .75), ("E5", .25), ("D5", .75), ("B4", .25), ("G#4", 1), ("B4", 1)],
       [("A4", 3), (None, 1)]],
    Ac=["A", "D", "A", "E", "A", "D", "E7", "A"],
    B=[[("C#5", 1), ("F#5", 1), ("A5", 1), ("F#5", 1)],
       [("F#5", .75), ("E5", .25), ("D5", 1), ("A4", 1), ("D5", 1)],
       [("C#5", .75), ("D5", .25), ("E5", 1), ("A5", 1), ("E5", 1)],
       [("D5", .75), ("C#5", .25), ("B4", 1), ("E5", 2)],
       [("A5", .75), ("G#5", .25), ("F#5", 1), ("C#5", 1), ("F#5", 1)],
       [("D5", .75), ("E5", .25), ("F#5", 1), ("A5", 1), ("F#5", 1)],
       [("E5", .75), ("D5", .25), ("C#5", .75), ("B4", .25), ("G#4", 1), ("B4", 1)],
       [("A4", 2), ("C#5", 1), ("A4", 1)]],
    Bc=["F#m", "D", "A", "E", "F#m", "D", "E7", "A"],
    meter=4, key="A",
)

# "Sjöboden" (The boathouse): a slow song (visa) in G major, 4/4.
SJOBODEN = dict(
    A=[[("D5", 1.5), ("B4", .5), ("G4", 1), ("B4", 1)],
       [("E5", 2), ("D5", 1), ("B4", 1)],
       [("C5", 1.5), ("E5", .5), ("G5", 1), ("E5", 1)],
       [("D5", 3), (None, 1)],
       [("D5", 1.5), ("B4", .5), ("G4", 1), ("B4", 1)],
       [("E5", 1), ("G5", 1), ("F#5", 1), ("E5", 1)],
       [("C5", 1), ("A4", 1), ("D5", 1), ("F#4", 1)],
       [("G4", 3), (None, 1)]],
    Ac=["G", "Em", "C", "D", "G", "Em", ("Am", "D"), "G"],
    B=[[("E5", 1.5), ("F#5", .5), ("G5", 2)],
       [("D5", 1.5), ("E5", .5), ("D5", 1), ("B4", 1)],
       [("C5", 1.5), ("D5", .5), ("E5", 1), ("A4", 1)],
       [("D5", 2), ("F#5", 1), ("A5", 1)],
       [("G5", 1.5), ("E5", .5), ("C5", 1), ("E5", 1)],
       [("D5", 1), ("B4", 1), ("G4", 1), ("B4", 1)],
       [("A4", 1), ("C5", 1), ("B4", 1), ("A4", 1)],
       [("G4", 3), (None, 1)]],
    Bc=["C", "G", "Am", "D", "C", "G", ("Am", "D"), "G"],
    meter=4, key="G",
)

# "Morgondimma" (Morning mist): a gentle waltz in F major, 3/4.
MORGONDIMMA = dict(
    A=[[("A4", 1), ("C5", 1), ("F5", 1)],
       [("D5", 2), ("Bb4", 1)],
       [("A4", 1), ("G4", .5), ("A4", .5), ("C5", 1)],
       [("G4", 3)],
       [("A4", 1), ("C5", 1), ("F5", 1)],
       [("G5", 1), ("F5", .5), ("D5", .5), ("Bb4", 1)],
       [("C5", 1), ("E5", 1), ("G5", 1)],
       [("F5", 3)]],
    Ac=["F", "Bb", "F", "C", "F", "Bb", "C", "F"],
    B=[[("F5", 1), ("E5", .5), ("D5", .5), ("A4", 1)],
       [("Bb4", 1), ("D5", 1), ("F5", 1)],
       [("A5", 1.5), ("G5", .5), ("F5", 1)],
       [("E5", 2), ("C5", 1)],
       [("D5", 1), ("F5", 1), ("A5", 1)],
       [("G5", 1), ("F5", .5), ("D5", .5), ("Bb4", 1)],
       [("C5", 1), ("E5", 1), ("G5", 1)],
       [("F5", 3)]],
    Bc=["Dm", "Bb", "F", "C", "Dm", "Bb", "C", "F"],
    meter=3, key="F",
)

# "Ekan" (The rowing boat): a calm schottis in D major, 4/4, in the style of
# "Bryggan" (Jonas 2026-11-17 14.07: like Bryggan, but a bit calmer).
EKAN = dict(
    A=[[("F#5", .75), ("E5", .25), ("D5", .75), ("E5", .25), ("F#5", 1), ("A5", 1)],
       [("G5", .75), ("F#5", .25), ("E5", .75), ("D5", .25), ("B4", 2)],
       [("A4", .75), ("B4", .25), ("D5", .75), ("E5", .25), ("F#5", 1), ("D5", 1)],
       [("E5", .75), ("D5", .25), ("C#5", .75), ("B4", .25), ("A4", 2)],
       [("F#5", .75), ("E5", .25), ("D5", .75), ("E5", .25), ("F#5", 1), ("A5", 1)],
       [("B5", .75), ("A5", .25), ("G5", .75), ("F#5", .25), ("E5", 2)],
       [("A4", .75), ("C#5", .25), ("E5", .75), ("G5", .25), ("F#5", 1), ("E5", 1)],
       [("D5", 3), (None, 1)]],
    Ac=["D", "G", "D", "A", "D", "G", "A7", "D"],
    B=[[("D5", 1), ("F#5", 1), ("B5", 1), ("F#5", 1)],
       [("G5", .75), ("F#5", .25), ("E5", 1), ("D5", 1), ("B4", 1)],
       [("A4", .75), ("D5", .25), ("F#5", 1), ("A5", 1), ("F#5", 1)],
       [("E5", .75), ("F#5", .25), ("E5", 1), ("C#5", 2)],
       [("D5", .75), ("C#5", .25), ("B4", 1), ("F#5", 1), ("D5", 1)],
       [("B4", .75), ("D5", .25), ("G5", 1), ("F#5", 1), ("E5", 1)],
       [("E5", 1), ("G5", 1), ("C#5", 1), ("E5", 1)],
       [("D5", 2), ("A4", 1), ("D5", 1)]],
    Bc=["Bm", "G", "D", "A", "Bm", "G", ("Em", "A7"), "D"],
    meter=4, key="D",
)


MAJOR = [0, 2, 4, 5, 7, 9, 11]


def third_below(p: int, key: str) -> int:
    """The diatonic third below p in the major key, for a second voice."""
    root = n(key + "4") % 12
    degrees = [(root + i) % 12 for i in MAJOR]
    pc = p % 12
    if pc not in degrees:
        return p - 3
    target = degrees[(degrees.index(pc) - 2) % 7]
    return p - ((pc - target) % 12)


def bass_note(ch: str) -> int:
    root = n(TRIADS[ch][0])
    while root > n("E3"):
        root -= 12
    while root < n("E2"):
        root += 12
    return root


def tune(t: dict, bpm: float, style: str, lead1: int, lead2: int, chords: int, bass: int,
         arp: int | None, harmony: bool = True, soft: float = 1.0):
    """soft < 1 plays everything quieter and smoother (Jonas: 'a bit calmer')."""
    s = Song(bpm=bpm)
    L1 = s.instrument("lead1", lead1, 0, volume=92, pan=56, reverb=70)
    L2 = s.instrument("lead2", lead2, 1, volume=84, pan=74, reverb=70)
    C = s.instrument("chords", chords, 2, volume=56, pan=48, reverb=60)
    B = s.instrument("bass", bass, 3, volume=78, pan=64, reverb=35)
    A = s.instrument("arp", arp, 4, volume=60, pan=84, reverb=80) if arp is not None else None
    m = t["meter"]
    beat = 0.0
    for part, lead, harm in (("A", L1, False), ("A", L2, harmony), ("B", L1, False), ("B", L2, harmony)):
        for bar, (notes, ch) in enumerate(zip(t[part], t[part + "c"])):
            b0 = beat + bar * m
            tt = b0
            for p, d in notes:
                if p is not None:
                    vel = int((88 if abs(tt - b0) < 1e-6 else 76) * soft)
                    s.note(lead, tt, p, d * (0.93 if soft >= 1 else 0.99), vel)
                    if harm:
                        s.note(L1, tt, third_below(n(p), t["key"]), d * 0.9, vel - 24)
                tt += d
            halves = ch if isinstance(ch, tuple) else (ch,)
            span = m / len(halves)
            for h, c in enumerate(halves):
                hb = b0 + h * span
                tri = TRIADS[c]
                if style == "waltz":
                    s.note(B, hb, bass_note(c), 0.9, 84)
                    for k in (1, 2):
                        for p in tri:
                            s.note(C, hb + k, up(p, 1), 0.45, 50)
                elif style == "schottis":
                    for k in range(0, int(span), 2):
                        s.note(B, hb + k, bass_note(c) if k == 0 else n(tri[2]) - 12, 0.8 if soft >= 1 else 1.6, int(84 * soft))
                        for p in tri:
                            s.note(C, hb + k + 1, up(p, 1), 0.4 if soft >= 1 else 0.8, int(52 * soft))
                else:  # visa: long bass, guitar picks eighths
                    s.note(B, hb, bass_note(c), span * 0.95, 70)
                if A is not None:
                    pat = [tri[0], tri[1], tri[2], tri[1]] * 4
                    step = 0.5
                    for j in range(int(span / step)):
                        s.note(A, hb + j * step, up(pat[j], 1), step * 1.6, 46 if j % 2 else 54)
        beat += len(t[part]) * m
    data = s.render(tail=4.0, gain=0.55)
    secs = s.seconds(beat)
    return normalize(loop_bake(data, secs), 0.8), secs


TUNES = {
    "music_village_bryggan": lambda: tune(BRYGGAN, 116, "schottis", ACCORDION, VIOLIN, NYLON, AC_BASS, None),
    "music_village_bryggan_fiddle": lambda: tune(BRYGGAN, 112, "schottis", VIOLIN, CLARINET, ACCORDION, AC_BASS, None),
    "music_village_sjoboden": lambda: tune(SJOBODEN, 76, "visa", FLUTE, VIOLIN, STRINGS, CELLO, NYLON),
    # Round 2: calmer, in the style of Bryggan
    "music_village_bryggan_calm": lambda: tune(BRYGGAN, 96, "schottis", ACCORDION, VIOLIN, NYLON, AC_BASS, None, soft=0.8),
    "music_village_bryggan_calm_fiddle": lambda: tune(BRYGGAN, 92, "schottis", VIOLIN, CLARINET, ACCORDION, AC_BASS, HARP, soft=0.8),
    "music_village_ekan": lambda: tune(EKAN, 96, "schottis", ACCORDION, VIOLIN, NYLON, AC_BASS, None, soft=0.8),
    "music_village_ekan_fiddle": lambda: tune(EKAN, 92, "schottis", VIOLIN, FLUTE, ACCORDION, AC_BASS, HARP, soft=0.75),
    "music_village_morgondimma": lambda: tune(MORGONDIMMA, 80, "waltz", CLARINET, FLUTE, ACCORDION, AC_BASS, HARP),
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
