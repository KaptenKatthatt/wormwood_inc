"""Composes the game's own music and sound effects and renders them.

    python3 tools/audio/compose.py OUT_DIR [name ...]

Every melody here is original (written for My Dear Wormwood, 2026). The
instruments come from the FluidR3_GM sound font (MIT). Style: "Rödfärg och
skärgård" (red cottages by the sea), Swedish folk colour, warm and safe,
no dark undertone (design decision 2026-11-17).
"""
from __future__ import annotations

import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from midisynth import RATE, Song, encode, loop_bake, n, normalize, trim  # noqa: E402

# General MIDI programs (0-based)
VIOLIN, FLUTE, RECORDER, ACCORDION, NYLON, HARP, AC_BASS = 40, 73, 74, 21, 24, 46, 32
PIZZ, MARIMBA, KALIMBA, CELESTA, GLOCK, MUSICBOX, TUBULAR = 45, 12, 108, 8, 9, 10, 14
HORN, TIMPANI, STRINGS, WOODBLOCK, VIBES, BRASS, TRUMPET = 60, 47, 48, 115, 11, 61, 56
CHURCH_ORGAN, CLARINET, OBOE, BASSOON = 19, 71, 68, 70

TRIADS = {
    "D": ["D3", "F#3", "A3"], "G": ["G2", "B2", "D3"], "A": ["A2", "C#3", "E3"],
    "Bm": ["B2", "D3", "F#3"], "Em": ["E3", "G3", "B3"], "A7": ["A2", "C#3", "G3"],
    "C": ["C3", "E3", "G3"], "Am": ["A2", "C3", "E3"], "D7": ["D3", "F#3", "C4"],
}


def up(pitch: str, octaves: int) -> int:
    return n(pitch) + 12 * octaves


# ---------------------------------------------------------------- music

# "Udden" (The headland): a calm polska-like waltz in D major, 3/4.
UDDEN_A = [
    [("F#4", 1), ("A4", 1), ("D5", 1)],
    [("B4", 1.5), ("A4", .5), ("G4", 1)],
    [("F#4", 1), ("E4", .5), ("F#4", .5), ("A4", 1)],
    [("E4", 1.5), ("F#4", .5), ("E4", 1)],
    [("F#4", 1), ("A4", 1), ("D5", 1)],
    [("E5", 1), ("D5", .5), ("B4", .5), ("G4", 1)],
    [("A4", 1), ("B4", .5), ("C#5", .5), ("E5", 1)],
    [("D5", 2), (None, 1)],
]
UDDEN_A_CHORDS = ["D", "G", "D", "A", "D", "G", "A", "D"]
UDDEN_B = [
    [("B4", 1), ("D5", 1), ("F#5", 1)],
    [("G5", 1.5), ("F#5", .5), ("E5", 1)],
    [("F#5", 1), ("D5", 1), ("A4", 1)],
    [("C#5", 1.5), ("B4", .5), ("A4", 1)],
    [("B4", 1), ("D5", .5), ("C#5", .5), ("B4", 1)],
    [("G4", 1), ("B4", 1), ("D5", 1)],
    [("E5", 1), ("B4", .5), ("C#5", .5), ("A4", 1)],
    [("D5", 2), (None, 1)],
]
UDDEN_B_CHORDS = ["Bm", "G", "D", "A", "Bm", "G", "A7", "D"]


def third_below(pitch: str) -> int:
    """Diatonic third below in D major, for a second voice."""
    scale = [n(p) % 12 for p in ["D4", "E4", "F#4", "G4", "A4", "B4", "C#5"]]
    p = n(pitch)
    pc = p % 12
    if pc not in scale:
        return p - 3
    i = scale.index(pc)
    target = scale[(i - 2) % 7]
    d = (pc - target) % 12
    return p - d


def udden(variant: str) -> tuple[np.ndarray, float]:
    s = Song(bpm=84)
    if variant == "fiddle":
        lead1 = s.instrument("lead1", VIOLIN, 0, volume=92, pan=58, reverb=70)
        lead2 = s.instrument("lead2", FLUTE, 1, volume=80, pan=74, reverb=70)
    else:  # "dance": accordion lead, clarinet answer
        lead1 = s.instrument("lead1", ACCORDION, 0, volume=88, pan=60, reverb=55)
        lead2 = s.instrument("lead2", CLARINET, 1, volume=80, pan=72, reverb=60)
    chords = s.instrument("chords", ACCORDION if variant == "fiddle" else NYLON, 2, volume=58, pan=50, reverb=60)
    harp = s.instrument("harp", HARP, 3, volume=62, pan=84, reverb=80)
    bass = s.instrument("bass", AC_BASS, 4, volume=78, pan=64, reverb=30)

    beat = 0.0
    plan = [("A", lead1, False), ("A", lead2, True), ("B", lead1, False), ("B", lead2, True)]
    for part, lead, harmony in plan:
        mel = UDDEN_A if part == "A" else UDDEN_B
        chs = UDDEN_A_CHORDS if part == "A" else UDDEN_B_CHORDS
        for bar, (notes, ch) in enumerate(zip(mel, chs)):
            b0 = beat + bar * 3
            # lead, slightly humanised velocity: first beat stronger (polska lilt)
            t = b0
            for i, (p, d) in enumerate(notes):
                if p is not None:
                    vel = 88 if abs(t - b0) < 1e-6 else (80 if abs(t - b0 - 2) < 1e-6 else 74)
                    s.note(lead, t, p, d * 0.93, vel)
                    if harmony:
                        s.note(lead1, t, third_below(p), d * 0.9, vel - 22)
                t += d
            tri = TRIADS[ch]
            s.note(bass, b0, n(tri[0]) - 12 if n(tri[0]) > n("E3") else tri[0], 0.9, 84)
            s.note(bass, b0 + 2, n(tri[2]) - 12, 0.8, 62)  # the fifth on beat 3
            for k in (1, 2):
                for p in tri:
                    s.note(chords, b0 + k, up(p, 1), 0.45, 52)
            # harp: rolled arpeggio on each bar, very soft
            for j, p in enumerate([tri[0], tri[1], tri[2], tri[0]]):
                s.note(harp, b0 + j * 0.5, up(p, 1 if j < 3 else 2), 1.6, 44)
        beat += len(mel) * 3
    data = s.render(tail=4.0, gain=0.55)
    loop_s = s.seconds(beat)
    return normalize(loop_bake(data, loop_s), 0.8), loop_s


# "Brickor" (Tiles): a light schottis-like tune in G major, 4/4, for the puzzle.
BRICKOR_A = [
    [("D5", .5), ("B4", .5), ("G4", .5), ("B4", .5), ("D5", 1), ("G5", 1)],
    [("E5", 1), ("C5", .5), ("E5", .5), ("G5", 1), ("E5", 1)],
    [("D5", .5), ("C5", .5), ("B4", .5), ("A4", .5), ("B4", 1), ("G4", 1)],
    [("A4", 1), ("F#4", .5), ("A4", .5), ("D5", 2)],
    [("D5", .5), ("B4", .5), ("G4", .5), ("B4", .5), ("D5", 1), ("G5", 1)],
    [("E5", .5), ("F#5", .5), ("G5", .5), ("E5", .5), ("C5", 1), ("E5", 1)],
    [("D5", 1), ("A4", .5), ("B4", .5), ("C5", 1), ("F#4", 1)],
    [("G4", 3), (None, 1)],
]
BRICKOR_A_CHORDS = ["G", "C", "G", "D", "G", "C", "D7", "G"]
BRICKOR_B = [
    [("B4", 1), ("E5", 1), ("G5", 1), ("E5", 1)],
    [("E5", .5), ("D5", .5), ("C5", 1), ("G4", 1), ("C5", 1)],
    [("B4", .5), ("C5", .5), ("D5", 1), ("G5", 1), ("D5", 1)],
    [("F#5", 1), ("E5", .5), ("D5", .5), ("A4", 2)],
    [("G4", .5), ("B4", .5), ("E5", 1), ("G5", 1), ("F#5", .5), ("E5", .5)],
    [("E5", 1), ("C5", 1), ("G4", 1), ("E5", 1)],
    [("C5", .5), ("B4", .5), ("A4", 1), ("D5", 1), ("F#5", 1)],
    [("G5", 2), ("D5", .5), ("B4", .5), ("G4", 1)],
]
BRICKOR_B_CHORDS = ["Em", "C", "G", "D", "Em", "C", ("Am", "D"), "G"]


def brickor(variant: str) -> tuple[np.ndarray, float]:
    bpm = 108 if variant == "marimba" else 116
    s = Song(bpm=bpm)
    if variant == "marimba":
        lead1 = s.instrument("lead1", MARIMBA, 0, volume=100, pan=56, reverb=55)
        lead2 = s.instrument("lead2", RECORDER, 1, volume=78, pan=72, reverb=65)
    else:  # "musicbox": brighter and sweeter
        lead1 = s.instrument("lead1", CELESTA, 0, volume=100, pan=56, reverb=60)
        lead2 = s.instrument("lead2", GLOCK, 1, volume=70, pan=72, reverb=70)
    pizz = s.instrument("pizz", PIZZ, 2, volume=80, pan=46, reverb=45)
    guitar = s.instrument("guitar", NYLON, 3, volume=60, pan=82, reverb=45)
    shaker = s.instrument("shaker", 0, 9, volume=40, pan=70, reverb=30)

    beat = 0.0
    plan = [("A", lead1), ("A", lead2), ("B", lead1), ("B", lead2)]
    for part, lead in plan:
        mel = BRICKOR_A if part == "A" else BRICKOR_B
        chs = BRICKOR_A_CHORDS if part == "A" else BRICKOR_B_CHORDS
        for bar, (notes, ch) in enumerate(zip(mel, chs)):
            b0 = beat + bar * 4
            t = b0
            for p, d in notes:
                if p is not None:
                    vel = 92 if abs((t - b0) % 2) < 1e-6 else 78
                    s.note(lead, t, p, d * (0.8 if lead == lead1 else 0.92), vel)
                t += d
            halves = ch if isinstance(ch, tuple) else (ch, ch)
            for h, c in enumerate(halves):
                tri = TRIADS[c]
                hb = b0 + h * 2
                root = n(tri[0]) - (12 if n(tri[0]) >= n("C3") else 0)
                s.note(pizz, hb, root, 0.5, 86)
                s.note(pizz, hb + 1, n(tri[2]) - 12, 0.5, 70)
                for p in tri:
                    s.note(guitar, hb + 0.5, up(p, 1), 0.3, 50)
                    s.note(guitar, hb + 1.5, up(p, 1), 0.3, 46)
            for k in range(8):
                s.note(shaker, b0 + k * 0.5, 70, 0.2, 40 if k % 2 else 30)
        beat += len(mel) * 4
    data = s.render(tail=3.0, gain=0.55)
    loop_s = s.seconds(beat)
    return normalize(loop_bake(data, loop_s), 0.8), loop_s


# ---------------------------------------------------------------- effects

PENTA = ["G5", "A5", "B5", "D6", "E6", "G6", "A6", "B6"]


def one_shot(build, bpm=120, tail=1.5, gain=0.7, max_len: float | None = None) -> np.ndarray:
    s = Song(bpm=bpm)
    build(s)
    out = trim(s.render(tail=tail, gain=gain))
    if max_len is not None and len(out) > max_len * RATE:
        out = out[:int(max_len * RATE)].copy()
        fade = int(0.15 * RATE)
        out[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return normalize(out, 0.85)


def match_note(program: int, pitch, vel=100, dur=0.5):
    def b(s):
        i = s.instrument("i", program, 0, reverb=40)
        s.note(i, 0, pitch, dur, vel)
    return b


def fx_match(kind: str, step: int = 0) -> np.ndarray:
    """One match. step 0.. rises through the pentatonic scale for cascades."""
    pitch = n(PENTA[min(step, len(PENTA) - 1)])
    if kind == "kalimba":
        return one_shot(match_note(KALIMBA, pitch, 105, 0.6), tail=0.8, max_len=0.9)
    if kind == "marimba":
        def b(s):
            i = s.instrument("i", MARIMBA, 0, reverb=35)
            s.note(i, 0, pitch - 12, 0.4, 105)
            s.note(i, 0.12, pitch, 0.4, 95)
        return one_shot(b, tail=0.8, max_len=0.9)
    if kind == "harp":
        def b(s):
            i = s.instrument("i", HARP, 0, reverb=50)
            s.note(i, 0, pitch - 12, 0.6, 100)
            s.note(i, 0.08, pitch - 5, 0.6, 90)
            s.note(i, 0.16, pitch, 0.8, 100)
        return one_shot(b, bpm=120, tail=1.0, max_len=1.0)
    raise ValueError(kind)


def fx_combo_run(kind: str) -> np.ndarray:
    """Demo of a cascade: five matches in a row, each a step higher."""
    parts = [fx_match(kind, i) for i in range(5)]
    gap = int(0.28 * RATE)
    total = gap * 4 + max(len(p) for p in parts)
    out = np.zeros((total, 2), dtype=np.float32)
    for i, p in enumerate(parts):
        out[i * gap:i * gap + len(p)] += p * 0.8
    return normalize(out, 0.85)


def fx_win(kind: str) -> np.ndarray:
    if kind == "fiddle":
        def b(s):
            h = s.instrument("h", HARP, 0, reverb=70)
            v = s.instrument("v", VIOLIN, 1, reverb=70)
            g = s.instrument("g", GLOCK, 2, reverb=70, volume=80)
            a = s.instrument("a", ACCORDION, 3, reverb=60, volume=70)
            for k, p in enumerate(["D4", "F#4", "A4", "D5", "F#5", "A5"]):
                s.note(h, k * 0.125, p, 1.5, 90)
            s.seq(v, 0.75, [("A4", .25), ("B4", .25), ("C#5", .25), ("D5", 1.5)], vel=100)
            s.seq(g, 1.25, [("D6", .5), ("F#6", .5), ("A6", 1)], vel=85)
            for p in ["D4", "F#4", "A4"]:
                s.note(a, 1.25, p, 1.5, 70)
        return one_shot(b, bpm=132, tail=1.8)
    if kind == "musicbox":
        def b(s):
            m = s.instrument("m", MUSICBOX, 0, reverb=70)
            c = s.instrument("c", CELESTA, 1, reverb=70, volume=80)
            s.seq(m, 0, [("G5", .25), ("B5", .25), ("D6", .25), ("G6", .75), ("D6", .25), ("G6", 1)], vel=100)
            for p in ["G4", "B4", "D5", "G5"]:
                s.note(c, 1.75, p, 1.5, 80)
        return one_shot(b, bpm=120, tail=1.8)
    raise ValueError(kind)


def fx_lose(kind: str) -> np.ndarray:
    """Out of moves: gentle and consoling, never punishing."""
    if kind == "musicbox":
        def b(s):
            m = s.instrument("m", MUSICBOX, 0, reverb=70)
            h = s.instrument("h", HARP, 1, reverb=70, volume=70)
            s.seq(m, 0, [("D6", .5), ("B5", .5), ("A5", .5), ("G5", 1.5)], vel=88)
            for p in ["G3", "D4", "B4"]:
                s.note(h, 1.5, p, 1.5, 70)
        return one_shot(b, bpm=100, tail=1.8)
    if kind == "flute":
        def b(s):
            f = s.instrument("f", FLUTE, 0, reverb=70)
            h = s.instrument("h", HARP, 1, reverb=70, volume=70)
            s.seq(f, 0, [("B5", .5), ("A5", .5), ("F#5", .5), ("G5", 1.5)], vel=80)
            for p in ["C4", "E4", "G4", "G3", "D4", "B4"][3:]:
                s.note(h, 1.5, p, 1.5, 66)
        return one_shot(b, bpm=96, tail=1.8)
    raise ValueError(kind)


def fx_near(kind: str) -> np.ndarray:
    """'Så nära!': climbs and stops one step short of home, over a dominant
    chord, so the ear wants one more try."""
    if kind == "climb":
        def b(s):
            k = s.instrument("k", KALIMBA, 0, reverb=50)
            h = s.instrument("h", HARP, 1, reverb=70, volume=70)
            s.seq(k, 0, [("G5", .25), ("A5", .25), ("B5", .25), ("C6", .25), ("D6", .25), ("E6", .25), ("F#6", 1.5)], vel=96)
            for p in ["D4", "F#4", "A4", "C5"]:
                s.note(h, 1.5, p, 1.5, 70)
        return one_shot(b, bpm=132, tail=1.5)
    if kind == "fiddle":
        def b(s):
            v = s.instrument("v", VIOLIN, 0, reverb=60)
            a = s.instrument("a", ACCORDION, 1, reverb=60, volume=70)
            s.seq(v, 0, [("D5", .25), ("E5", .25), ("F#5", .25), ("G5", .25), ("A5", .5), ("C6", 1.25)], vel=96)
            for p in ["D4", "F#4", "A4", "C5"]:
                s.note(a, 1.0, p, 1.6, 70)
        return one_shot(b, bpm=120, tail=1.5)
    raise ValueError(kind)


def coin(seed: int, pitch_hz: float = 2600.0, length: float = 0.45) -> np.ndarray:
    """A small metallic clink from inharmonic partials (coin on coin)."""
    rng = np.random.default_rng(seed)
    t = np.arange(int(length * RATE)) / RATE
    ratios = [1.0, 1.38, 2.21, 2.76, 3.9]
    sig = np.zeros_like(t)
    for k, r in enumerate(ratios):
        f = pitch_hz * r * (1 + rng.uniform(-0.01, 0.01))
        decay = 14 + 9 * k
        sig += np.sin(2 * np.pi * f * t + rng.uniform(0, 6.28)) * np.exp(-decay * t) / (1 + k * 0.6)
    click = rng.normal(0, 1, len(t)) * np.exp(-400 * t) * 0.3
    sig = sig + click
    return np.stack([sig, sig], axis=1).astype(np.float32)


def mix(parts: list[tuple[float, np.ndarray, float]]) -> np.ndarray:
    total = max(int(at * RATE) + len(p) for at, p, _ in parts)
    out = np.zeros((total, 2), dtype=np.float32)
    for at, p, g in parts:
        i = int(at * RATE)
        out[i:i + len(p)] += p * g
    return out


def fx_purchase(kind: str) -> np.ndarray:
    if kind == "coins_bell":
        parts = [(0.00, coin(1, 2500), .7), (0.07, coin(2, 2900), .6), (0.13, coin(3, 2300), .6)]
        bell = one_shot(lambda s: (s.instrument("g", GLOCK, 0, reverb=60), s.note("g", 0, "C7", 1, 100), s.note("g", 0.25, "G7", 1, 100)), bpm=120, tail=1.2)
        parts.append((0.18, bell, .6))
        return normalize(mix(parts), 0.85)
    if kind == "chime":
        def b(s):
            c = s.instrument("c", CELESTA, 0, reverb=70)
            g = s.instrument("g", GLOCK, 1, reverb=70, volume=80)
            s.seq(c, 0, [("C6", .25), ("E6", .25), ("G6", .25), ("C7", 1)], vel=100)
            s.note(g, 0.75, "C7", 1.2, 90)
            s.note(g, 0.75, "E7", 1.2, 70)
        return one_shot(b, bpm=140, tail=1.6)
    raise ValueError(kind)


def fx_coins(kind: str) -> np.ndarray:
    """Gold being counted into the purse: quick clinks that rise."""
    parts = []
    for i in range(9):
        parts.append((i * 0.065, coin(10 + i, 2200 + i * 90, 0.3), 0.55 + i * 0.03))
    return normalize(mix(parts), 0.85)


def fx_build_start(kind: str) -> np.ndarray:
    def b(s):
        w = s.instrument("w", WOODBLOCK, 0, reverb=30)
        for i, p in enumerate([n("C5"), n("C5"), n("G4")]):
            s.note(w, i * 0.5, p, 0.2, 110 - i * 10)
    return one_shot(b, bpm=150, tail=0.6)


def fx_build_done(kind: str) -> np.ndarray:
    if kind == "bells":
        def b(s):
            t = s.instrument("t", TUBULAR, 0, reverb=80, volume=90)
            st = s.instrument("st", STRINGS, 1, reverb=80, volume=70)
            g = s.instrument("g", GLOCK, 2, reverb=80, volume=75)
            s.seq(t, 0, [("G4", .5), ("D5", .5), ("G5", 2)], vel=95)
            for p in ["G3", "D4", "B4", "G4"]:
                s.note(st, 0.5, p, 2.2, 70)
            s.seq(g, 1.0, [("B6", .25), ("D7", .25), ("G7", 1.5)], vel=80)
        return one_shot(b, bpm=110, tail=2.0)
    if kind == "fanfare":
        def b(s):
            v = s.instrument("v", VIOLIN, 0, reverb=70)
            v2 = s.instrument("v2", VIOLIN, 1, reverb=70, pan=80)
            h = s.instrument("h", HARP, 2, reverb=70)
            a = s.instrument("a", ACCORDION, 3, reverb=60, volume=70)
            s.seq(v, 0, [("D5", .25), ("D5", .25), ("D5", .25), ("A5", .75), ("F#5", .25), ("A5", .25), ("D6", 1.5)], vel=100)
            s.seq(v2, 0, [("F#4", .25), ("F#4", .25), ("F#4", .25), ("C#5", .75), ("A4", .25), ("C#5", .25), ("F#5", 1.5)], vel=80)
            for k, p in enumerate(["D3", "A3", "D4", "F#4", "A4", "D5"]):
                s.note(h, 2.0 + k * 0.08, p, 1.5, 85)
            for p in ["D4", "F#4", "A4"]:
                s.note(a, 2.0, p, 1.5, 70)
        return one_shot(b, bpm=132, tail=1.8)
    raise ValueError(kind)


def fx_attack(kind: str) -> np.ndarray:
    """Strangers over the water: a herding horn ('lur') call and a drum roll.
    Alert, but still storybook, not menacing."""
    if kind == "lur":
        def b(s):
            h = s.instrument("h", HORN, 0, reverb=90)
            tp = s.instrument("tp", TIMPANI, 1, reverb=60, volume=90)
            s.seq(h, 0, [("D4", 1.0), ("A4", 2.0), (None, .5), ("D4", .5), ("A4", 1.5)], vel=100)
            for k in range(12):
                s.note(tp, 2.0 + k * 0.125, "D3", 0.12, 50 + k * 4)
            s.note(tp, 3.5, "A2", 1.0, 110)
        return one_shot(b, bpm=100, tail=2.0)
    if kind == "drum":
        def b(s):
            tp = s.instrument("tp", TIMPANI, 0, reverb=60, volume=100)
            st = s.instrument("st", STRINGS, 1, reverb=70, volume=80)
            for k in range(16):
                s.note(tp, k * 0.125, "D3", 0.12, 50 + k * 4)
            s.note(tp, 2.0, "A2", 1.0, 115)
            for p in ["D3", "A3", "D4", "F4"]:
                s.note(st, 0, p, 2.5, 70)
        return one_shot(b, bpm=100, tail=2.0)
    raise ValueError(kind)


def fx_defended(kind: str) -> np.ndarray:
    def b(s):
        tr = s.instrument("tr", HORN, 0, reverb=80)
        v = s.instrument("v", VIOLIN, 1, reverb=70)
        tp = s.instrument("tp", TIMPANI, 2, reverb=60)
        s.seq(tr, 0, [("D4", .5), ("A4", .5), ("D5", 2)], vel=100)
        s.seq(v, 0.5, [("F#5", .25), ("G5", .25), ("A5", 2)], vel=95)
        s.note(tp, 1.0, "D3", 0.5, 110)
    return one_shot(b, bpm=110, tail=2.0)


def fx_notify(kind: str) -> np.ndarray:
    if kind == "glock":
        def b(s):
            g = s.instrument("g", GLOCK, 0, reverb=70)
            s.seq(g, 0, [("E6", .5), ("C6", 1)], vel=95)
        return one_shot(b, bpm=120, tail=1.5, max_len=2.0)
    if kind == "harp":
        def b(s):
            h = s.instrument("h", HARP, 0, reverb=70)
            for k, p in enumerate(["G4", "B4", "D5", "G5"]):
                s.note(h, k * 0.1, p, 1.2, 95)
        return one_shot(b, bpm=120, tail=1.5)
    raise ValueError(kind)


def fx_sparkle(kind: str) -> np.ndarray:
    """Gems: the brightest 'reward' sound, a celesta glissando."""
    def b(s):
        c = s.instrument("c", CELESTA, 0, reverb=80)
        g = s.instrument("g", GLOCK, 1, reverb=80, volume=70)
        notes = ["G5", "A5", "B5", "D6", "E6", "G6", "A6", "B6", "D7"]
        for k, p in enumerate(notes):
            s.note(c, k * 0.09, p, 0.6, 80 + k * 3)
        s.note(g, len(notes) * 0.09, "G7", 1.4, 90)
    return one_shot(b, bpm=120, tail=1.6)


def fx_click(kind: str) -> np.ndarray:
    def b(s):
        w = s.instrument("w", WOODBLOCK, 0, reverb=10)
        s.note(w, 0, "E5", 0.1, 90)
    return one_shot(b, bpm=120, tail=0.2, max_len=0.35)


def fx_swap(kind: str) -> np.ndarray:
    """Two tiles trading places: a soft wooden slide."""
    def b(s):
        m = s.instrument("m", MARIMBA, 0, reverb=20)
        s.note(m, 0, "D4", 0.15, 55)
        s.note(m, 0.12, "G4", 0.15, 55)
    return one_shot(b, bpm=160, tail=0.3, max_len=0.45)


def fx_invalid(kind: str) -> np.ndarray:
    """A swap that makes no match: a soft wooden 'tock-tock', not an error buzz."""
    def b(s):
        w = s.instrument("w", WOODBLOCK, 0, reverb=10)
        s.note(w, 0, "G4", 0.1, 70)
        s.note(w, 0.25, "D4", 0.1, 60)
    return one_shot(b, bpm=150, tail=0.2, max_len=0.5)


def knock(seed: int, body_hz: float = 190.0, length: float = 0.35, gain: float = 1.0) -> np.ndarray:
    """A hammer on a wooden beam: a short noise burst plus two damped body modes."""
    rng = np.random.default_rng(seed)
    t = np.arange(int(length * RATE)) / RATE
    noise = rng.normal(0, 1, len(t)) * np.exp(-90 * t)
    # crude low-pass by running mean
    k = 6
    noise = np.convolve(noise, np.ones(k) / k, mode="same")
    body = (np.sin(2 * np.pi * body_hz * t) * np.exp(-22 * t)
            + 0.6 * np.sin(2 * np.pi * body_hz * 2.7 * t) * np.exp(-40 * t)
            + 0.3 * np.sin(2 * np.pi * body_hz * 5.1 * t) * np.exp(-70 * t))
    sig = (0.7 * noise + body) * gain
    return np.stack([sig, sig], axis=1).astype(np.float32)


def fx_build_start2(kind: str) -> np.ndarray:
    """Second round (Jonas 2026-11-17: 'none were good'): folkier starts."""
    if kind == "hammer":
        parts = [(0.0, knock(1, 190), .9), (0.32, knock(2, 200), .8), (0.64, knock(3, 175), 1.0)]
        return normalize(mix(parts), 0.85)
    if kind == "accordion":
        def b(s):
            a = s.instrument("a", ACCORDION, 0, reverb=50)
            for p in ["D4", "F#4", "A4"]:
                s.note(a, 0, p, 0.35, 95)
            for p in ["G4", "B4", "D5"]:
                s.note(a, 0.5, p, 0.8, 100)
        acc = one_shot(b, bpm=140, tail=0.8)
        return normalize(mix([(0.0, knock(4, 190), .7), (0.22, knock(5, 180), .7), (0.42, acc, .8)]), 0.85)
    if kind == "fiddle":
        def b(s):
            v = s.instrument("v", PIZZ, 0, reverb=50)
            h = s.instrument("h", HARP, 1, reverb=60, volume=80)
            s.seq(v, 0, [("D5", .5), ("F#5", .5), ("A5", 1)], vel=105)
            s.note(h, 1.0, "D4", 1.0, 80)
            s.note(h, 1.0, "A4", 1.0, 75)
        pz = one_shot(b, bpm=150, tail=1.0)
        return normalize(mix([(0.0, knock(6, 200), .6), (0.05, pz, .9)]), 0.85)
    if kind == "dance":
        def b(s):
            a = s.instrument("a", ACCORDION, 0, reverb=50)
            c = s.instrument("c", CLARINET, 1, reverb=60, volume=85)
            s.seq(c, 0, [("A4", .25), ("B4", .25), ("C#5", .25), ("D5", .75)], vel=95)
            for p in ["D4", "F#4", "A4"]:
                s.note(a, 0.75, p, 0.6, 85)
        return one_shot(b, bpm=140, tail=1.0)
    raise ValueError(kind)


def fx_build_done2(kind: str) -> np.ndarray:
    """Second round, more folk music: in the style of the picked sounds
    (accordion and clarinet village tune, marimba, folk fanfare)."""
    if kind == "polska":
        # A polska-style cadence: accordion and fiddle in unison, stamp on the last beat.
        def b(s):
            v = s.instrument("v", VIOLIN, 0, reverb=60)
            a = s.instrument("a", ACCORDION, 1, reverb=55, volume=85)
            bs = s.instrument("bs", AC_BASS, 2, reverb=30)
            mel = [("A4", .5), ("B4", .25), ("C#5", .25), ("D5", .5), ("E5", .5), ("F#5", .5), ("E5", .25), ("C#5", .25), ("D5", 1.5)]
            s.seq(v, 0, mel, vel=100)
            s.seq(a, 0, mel, vel=80)
            for p in ["D4", "F#4", "A4"]:
                s.note(a, 3.0, p, 1.5, 90)
            s.seq(bs, 0, [("A2", 1.5), ("A2", 1.5), ("D2", 1.5)], vel=95)
        return one_shot(b, bpm=120, tail=1.6)
    if kind == "udden":
        # The last two bars of the village tune "Udden" (dance version) as a jingle,
        # so finishing a building sounds like the village itself.
        def b(s):
            a = s.instrument("a", ACCORDION, 0, reverb=55)
            c = s.instrument("c", CLARINET, 1, reverb=60, volume=85)
            g = s.instrument("g", NYLON, 2, reverb=50, volume=80)
            bs = s.instrument("bs", AC_BASS, 3, reverb=30)
            s.seq(a, 0, [("A4", 1), ("B4", .5), ("C#5", .5), ("E5", 1), ("D5", 2.5)], vel=100)
            s.seq(c, 0, [("F#4", 1), ("G4", .5), ("A4", .5), ("C#5", 1), ("A4", 2.5)], vel=80)
            for k, ch in enumerate(["A", "D"]):
                tri = TRIADS[ch]
                s.note(bs, k * 3, n(tri[0]) - 12 if n(tri[0]) > n("E3") else tri[0], 0.9, 90)
                for j in (1, 2):
                    for p in tri:
                        s.note(g, k * 3 + j, up(p, 1), 0.4, 60)
        return one_shot(b, bpm=96, tail=1.8)
    if kind == "fiddles":
        # Two fiddles in thirds with a folk ornament (a quick turn) and a drone.
        def b(s):
            v1 = s.instrument("v1", VIOLIN, 0, reverb=65, pan=50)
            v2 = s.instrument("v2", VIOLIN, 1, reverb=65, pan=80)
            dr = s.instrument("dr", VIOLIN, 2, reverb=65, volume=60)
            m1 = [("F#5", .25), ("G5", .125), ("F#5", .125), ("E5", .25), ("F#5", .25), ("A5", .5), ("D6", 1.5)]
            m2 = [("D5", .25), ("E5", .125), ("D5", .125), ("C#5", .25), ("D5", .25), ("F#5", .5), ("A5", 1.5)]
            s.seq(v1, 0, m1, vel=100)
            s.seq(v2, 0, m2, vel=82)
            s.note(dr, 0, "D4", 3.0, 70)
            s.note(dr, 0, "A4", 3.0, 60)
        return one_shot(b, bpm=110, tail=1.8)
    if kind == "marimba":
        # Matches the picked match/combo sound: marimba arpeggio up, accordion chord.
        def b(s):
            m = s.instrument("m", MARIMBA, 0, reverb=50)
            a = s.instrument("a", ACCORDION, 1, reverb=55, volume=80)
            s.seq(m, 0, [("D5", .25), ("F#5", .25), ("A5", .25), ("D6", .25), ("F#6", .25), ("A6", .25), ("D7", 1)], vel=100)
            for p in ["D4", "F#4", "A4", "D5"]:
                s.note(a, 1.5, p, 1.6, 85)
        return one_shot(b, bpm=140, tail=1.6)
    raise ValueError(kind)


EFFECTS = {
    "match_kalimba": lambda: fx_match("kalimba"),
    "match_marimba": lambda: fx_match("marimba"),
    "match_harp": lambda: fx_match("harp"),
    "combo_kalimba": lambda: fx_combo_run("kalimba"),
    "combo_marimba": lambda: fx_combo_run("marimba"),
    "combo_harp": lambda: fx_combo_run("harp"),
    "win_fiddle": lambda: fx_win("fiddle"),
    "win_musicbox": lambda: fx_win("musicbox"),
    "lose_musicbox": lambda: fx_lose("musicbox"),
    "lose_flute": lambda: fx_lose("flute"),
    "near_climb": lambda: fx_near("climb"),
    "near_fiddle": lambda: fx_near("fiddle"),
    "purchase_coins_bell": lambda: fx_purchase("coins_bell"),
    "purchase_chime": lambda: fx_purchase("chime"),
    "coins_count": lambda: fx_coins("x"),
    "gems_sparkle": lambda: fx_sparkle("x"),
    "build_start_wood": lambda: fx_build_start("x"),
    "build_done_bells": lambda: fx_build_done("bells"),
    "build_done_fanfare": lambda: fx_build_done("fanfare"),
    "build_start_hammer": lambda: fx_build_start2("hammer"),
    "build_start_accordion": lambda: fx_build_start2("accordion"),
    "build_start_pizz": lambda: fx_build_start2("fiddle"),
    "build_start_dance": lambda: fx_build_start2("dance"),
    "build_done_polska": lambda: fx_build_done2("polska"),
    "build_done_udden": lambda: fx_build_done2("udden"),
    "build_done_fiddles": lambda: fx_build_done2("fiddles"),
    "build_done_marimba": lambda: fx_build_done2("marimba"),
    "attack_lur": lambda: fx_attack("lur"),
    "attack_drum": lambda: fx_attack("drum"),
    "defended_horn": lambda: fx_defended("x"),
    "notify_glock": lambda: fx_notify("glock"),
    "notify_harp": lambda: fx_notify("harp"),
    "click_wood": lambda: fx_click("x"),
    "swap_marimba": lambda: fx_swap("x"),
    "invalid_wood": lambda: fx_invalid("x"),
}

MUSIC = {
    "music_village_fiddle": lambda: udden("fiddle"),
    "music_village_dance": lambda: udden("dance"),
    "music_puzzle_marimba": lambda: brickor("marimba"),
    "music_puzzle_musicbox": lambda: brickor("musicbox"),
}


def pitched_matches(out_dir: str, kind: str) -> None:
    """match_<kind>_0..7: one file per cascade step, for the game."""
    for i in range(len(PENTA)):
        encode(fx_match(kind, i), os.path.join(out_dir, f"match_{kind}_{i}"), mono=True)


def main() -> None:
    if sys.argv[1] == "--pitched":
        # python3 compose.py --pitched OUT_DIR KIND : match_<KIND>_0..7
        pitched_matches(sys.argv[2], sys.argv[3])
        return
    out = sys.argv[1]
    only = set(sys.argv[2:])
    os.makedirs(out, exist_ok=True)
    for name, fn in EFFECTS.items():
        if only and name not in only:
            continue
        encode(fn(), os.path.join(out, name), mono=True)
        print(name)
    for name, fn in MUSIC.items():
        if only and name not in only:
            continue
        data, secs = fn()
        encode(data, os.path.join(out, name))
        print(f"{name} {secs:.1f}s")


if __name__ == "__main__":
    main()
