"""Music for the title screen (Jonas 2026-11-18: "the title screen needs a song").

    python3 tools/audio/title_tunes.py OUT_DIR [name ...]

All melodies are original, written for the game, in the same folk colour as
the rest (style "Rödfärg och skärgård", warm and safe). Rendered with
FluidR3_GM (MIT) like the rest of tools/audio. Every tune is a seamless loop.
"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from compose import (  # noqa: E402
    ACCORDION, AC_BASS, CLARINET, FLUTE, HARP, HORN, STRINGS, TIMPANI, TRIADS,
    UDDEN_A, UDDEN_A_CHORDS, UDDEN_B, UDDEN_B_CHORDS, VIOLIN, third_below, up,
)
from midisynth import Song, encode, loop_bake, n, normalize  # noqa: E402

CELLO = 42
TRIADS = {**TRIADS, "Bm": ["B2", "D3", "F#3"]}

# "Skärgårdsbyn": a broad, warm theme in D major, 4/4 (new).
THEME_A = [
    [("A4", 1), ("D5", 1.5), ("E5", .5), ("F#5", 1)],
    [("G5", 1.5), ("F#5", .5), ("E5", 1), ("D5", 1)],
    [("F#5", 1), ("A5", 1), ("F#5", 1), ("D5", 1)],
    [("E5", 3), (None, 1)],
    [("A4", 1), ("D5", 1.5), ("E5", .5), ("F#5", 1)],
    [("B5", 1.5), ("A5", .5), ("G5", 1), ("F#5", 1)],
    [("E5", 1), ("G5", 1), ("F#5", 1), ("E5", 1)],
    [("D5", 3), (None, 1)],
]
THEME_AC = ["D", "G", "Bm", "A", "D", "G", ("Em", "A"), "D"]
THEME_B = [
    [("B4", 1), ("D5", 1), ("G5", 2)],
    [("F#5", 1.5), ("E5", .5), ("D5", 1), ("A4", 1)],
    [("G5", 1), ("F#5", 1), ("E5", 1), ("B4", 1)],
    [("C#5", 1.5), ("D5", .5), ("E5", 2)],
    [("F#5", 1), ("D5", 1), ("B4", 1), ("D5", 1)],
    [("G5", 1.5), ("A5", .5), ("B5", 2)],
    [("A5", 1), ("G5", 1), ("F#5", 1), ("E5", 1)],
    [("D5", 4)],
]
THEME_BC = ["G", "D", "Em", "A", "Bm", "G", ("Em", "A"), "D"]

# "Vallåt vid sjöboden": a herding-call style tune over a drone, D mixolydian, 3/4 (new).
CALL_A = [
    [("A4", 1), ("D5", 1), ("E5", 1)],
    [("F#5", 2), ("E5", .5), ("D5", .5)],
    [("E5", 1), ("C5", 1), ("A4", 1)],
    [("D5", 3)],
    [("A5", 1.5), ("G5", .5), ("F#5", 1)],
    [("E5", 1), ("D5", 1), ("C5", 1)],
    [("D5", 1), ("E5", .5), ("F#5", .5), ("E5", 1)],
    [("D5", 3)],
]
CALL_AC = ["D", "D", "C", "D", "D", "C", "D", "D"]
CALL_B = [
    [("F#5", 1), ("A5", 1), ("B5", 1)],
    [("A5", 2), ("F#5", 1)],
    [("G5", 1), ("E5", 1), ("C5", 1)],
    [("D5", 2), ("A4", 1)],
    [("B4", 1), ("D5", 1), ("E5", 1)],
    [("F#5", 1.5), ("E5", .5), ("D5", 1)],
    [("C5", 1), ("E5", 1), ("A4", 1)],
    [("D5", 3)],
]
CALL_BC = ["D", "D", "C", "D", "G", "D", "C", "D"]


def bass_root(ch: str) -> int:
    p = n(TRIADS[ch][0])
    while p > n("E3"):
        p -= 12
    while p < n("E2"):
        p += 12
    return p


def halves(ch):
    return ch if isinstance(ch, tuple) else (ch,)


def melody(s: Song, inst: str, b0: float, notes, vel: int, legato=0.94, harmony: str | None = None,
           hvel: int = 22) -> None:
    t = b0
    for p, d in notes:
        if p is not None:
            v = vel if abs(t - b0) < 1e-6 else vel - 8
            s.note(inst, t, p, d * legato, v)
            if harmony:
                s.note(harmony, t, third_below(p), d * legato, v - hvel)
        t += d


def pad(s: Song, inst: str, b0: float, ch, span: float, vel: int) -> None:
    for c in halves(ch):
        for p in TRIADS[c]:
            s.note(inst, b0, up(p, 1), span / len(halves(ch)) * 0.98, vel)
        b0 += span / len(halves(ch))


def harp_roll(s: Song, inst: str, b0: float, ch, span: float, vel: int, step=0.5) -> None:
    for c in halves(ch):
        tri = TRIADS[c]
        pat = [tri[0], tri[1], tri[2], tri[1]]
        per = span / len(halves(ch))
        for j in range(int(per / step)):
            s.note(inst, b0 + j * step, up(pat[j % 4], 1 if j % 4 < 3 else 1), 1.6, vel - (6 if j % 2 else 0))
        b0 += per


def finish(s: Song, beats: float):
    data = s.render(tail=5.0, gain=0.55)
    secs = s.seconds(beats)
    return normalize(loop_bake(data, secs), 0.8), secs


def udden_overture():
    """1. The village tune 'Udden' as a slow, festive opening: harp and strings first,
    then the fiddle, then everyone. Ties the title screen to the village."""
    s = Song(bpm=72)
    s.instrument("fiddle", VIOLIN, 0, volume=94, pan=58, reverb=80)
    s.instrument("acc", ACCORDION, 1, volume=78, pan=72, reverb=60)
    s.instrument("strings", STRINGS, 2, volume=64, pan=50, reverb=85)
    s.instrument("harp", HARP, 3, volume=70, pan=84, reverb=85)
    s.instrument("bass", CELLO, 4, volume=74, pan=60, reverb=60)
    s.instrument("horn", HORN, 5, volume=66, pan=40, reverb=80)
    s.instrument("timp", TIMPANI, 6, volume=60, pan=64, reverb=70)
    beat = 0.0
    # Intro: four bars of harp over D and G
    for i, ch in enumerate(["D", "G", "D", "A"]):
        b0 = beat + i * 3
        harp_roll(s, "harp", b0, ch, 3, 60)
        pad(s, "strings", b0, ch, 3, 46 + i * 4)
        s.note("bass", b0, bass_root(ch), 2.8, 70)
    s.note("timp", beat + 9, "A2", 0.5, 60)
    s.note("timp", beat + 10.5, "A2", 0.5, 70)
    beat += 12
    plan = [
        (UDDEN_A, UDDEN_A_CHORDS, dict(lead="fiddle", harm=None, horn=False, acc=False)),
        (UDDEN_A, UDDEN_A_CHORDS, dict(lead="fiddle", harm="acc", horn=False, acc=True)),
        (UDDEN_B, UDDEN_B_CHORDS, dict(lead="fiddle", harm="acc", horn=True, acc=True)),
        (UDDEN_A, UDDEN_A_CHORDS, dict(lead="fiddle", harm="acc", horn=True, acc=True)),
    ]
    for mel, chs, o in plan:
        for bar, (notes, ch) in enumerate(zip(mel, chs)):
            b0 = beat + bar * 3
            melody(s, o["lead"], b0, notes, 90, harmony=o["harm"])
            pad(s, "strings", b0, ch, 3, 50)
            harp_roll(s, "harp", b0, ch, 3, 50)
            s.note("bass", b0, bass_root(ch), 1.8, 76)
            s.note("bass", b0 + 2, n(TRIADS[ch][2]) - 12, 0.9, 60)
            if o["horn"] and bar % 2 == 0:
                s.note("horn", b0, up(TRIADS[ch][1], 0), 2.8, 58)
            if o["horn"] and bar in (0, 4):
                s.note("timp", b0, bass_root(ch) + 12 if bass_root(ch) < n("G2") else bass_root(ch), 0.6, 66)
        beat += len(mel) * 3
    return finish(s, beat)


def skargardsbyn_theme():
    """2. A new main theme: broad and warm like a national-romantic song, fiddle and
    horn over strings and harp."""
    s = Song(bpm=78)
    s.instrument("fiddle", VIOLIN, 0, volume=94, pan=58, reverb=80)
    s.instrument("horn", HORN, 1, volume=82, pan=44, reverb=80)
    s.instrument("flute", FLUTE, 2, volume=80, pan=76, reverb=80)
    s.instrument("strings", STRINGS, 3, volume=62, pan=50, reverb=85)
    s.instrument("harp", HARP, 4, volume=68, pan=84, reverb=85)
    s.instrument("bass", CELLO, 5, volume=76, pan=60, reverb=60)
    s.instrument("timp", TIMPANI, 6, volume=62, pan=64, reverb=70)
    s.instrument("acc", ACCORDION, 7, volume=60, pan=70, reverb=60)
    beat = 0.0
    plan = [
        (THEME_A, THEME_AC, "fiddle", None, False),
        (THEME_A, THEME_AC, "horn", "fiddle", True),
        (THEME_B, THEME_BC, "flute", "fiddle", False),
        (THEME_B, THEME_BC, "fiddle", "horn", True),
    ]
    for mel, chs, lead, harm, full in plan:
        for bar, (notes, ch) in enumerate(zip(mel, chs)):
            b0 = beat + bar * 4
            melody(s, lead, b0, notes, 92, harmony=harm, hvel=18)
            pad(s, "strings", b0, ch, 4, 52 if full else 44)
            harp_roll(s, "harp", b0, ch, 4, 48)
            for h, c in enumerate(halves(ch)):
                span = 4 / len(halves(ch))
                s.note("bass", b0 + h * span, bass_root(c), span * 0.9, 76)
                if full:
                    for k in range(int(span)):
                        if k % 2 == 1:
                            for p in TRIADS[c]:
                                s.note("acc", b0 + h * span + k, up(p, 1), 0.5, 46)
            if full and bar in (0, 4):
                s.note("timp", b0, "D3" if TRIADS[halves(ch)[0]][0].startswith("D") else "A2", 0.8, 70)
        beat += len(mel) * 4
    return finish(s, beat)


def vallat():
    """3. Calm and airy: a herding-call style flute tune over a soft drone, the fiddle
    answers. Morning by the boathouse."""
    s = Song(bpm=66)
    s.instrument("flute", FLUTE, 0, volume=92, pan=60, reverb=90)
    s.instrument("fiddle", VIOLIN, 1, volume=86, pan=74, reverb=90)
    s.instrument("drone", STRINGS, 2, volume=56, pan=50, reverb=90)
    s.instrument("harp", HARP, 3, volume=66, pan=84, reverb=90)
    s.instrument("clar", CLARINET, 4, volume=60, pan=40, reverb=80)
    beat = 0.0
    plan = [
        (CALL_A, CALL_AC, ["flute"]),
        (CALL_B, CALL_BC, ["fiddle"]),
        (CALL_A, CALL_AC, ["flute", "fiddle"]),
        (CALL_B, CALL_BC, ["fiddle", "clar"]),
    ]
    for mel, chs, leads in plan:
        for bar, (notes, ch) in enumerate(zip(mel, chs)):
            b0 = beat + bar * 3
            for k, lead in enumerate(leads):
                # the second voice plays an octave lower, softer
                shifted = [((n(p) - 12 * k) if p else None, d) for p, d in notes]
                melody(s, lead, b0, shifted, 86 - 14 * k, legato=0.98)
            # drone: D and A held through, a C chord colours the mixolydian bars
            if bar % 4 == 0:
                s.note("drone", b0, "D3", 12 * 0.99, 46)
                s.note("drone", b0, "A3", 12 * 0.99, 40)
            tri = TRIADS[ch]
            for j, p in enumerate([tri[0], tri[1], tri[2]]):
                s.note("harp", b0 + j * 0.33, up(p, 1), 2.6, 46)
        beat += len(mel) * 3
    return finish(s, beat)


TUNES = {
    "music_title_udden": udden_overture,
    "music_title_theme": skargardsbyn_theme,
    "music_title_vallat": vallat,
}


# ------------------------------------------------ round 2: happier and catchier
# Jonas 2026-11-18 14.48: "make something happier and catchier".
GLOCK, WHISTLE, PIZZ, NYLON_GTR = 9, 78, 45, 24
DRUMS = 9  # GM percussion channel
TAMB, SHAKER, CLAP = 54, 82, 39
TRIADS.update({"C": ["C3", "E3", "G3"], "D7": ["D3", "F#3", "C4"], "Em": ["E3", "G3", "B3"]})

# "Hej skärgården": a polka in G major with a hook that comes back four times.
POLKA_A = [
    [("D5", .5), ("G5", .5), ("G5", .5), ("A5", .5), ("B5", 1), ("G5", 1)],
    [("A5", .5), ("F#5", .5), ("D5", .5), ("F#5", .5), ("A5", 2)],
    [("D5", .5), ("G5", .5), ("G5", .5), ("A5", .5), ("B5", 1), ("D6", 1)],
    [("C6", .5), ("B5", .5), ("A5", .5), ("G5", .5), ("A5", 2)],
    [("D5", .5), ("G5", .5), ("G5", .5), ("A5", .5), ("B5", 1), ("G5", 1)],
    [("C6", .5), ("B5", .5), ("A5", .5), ("G5", .5), ("E5", 1), ("C6", 1)],
    [("B5", .5), ("A5", .5), ("G5", .5), ("F#5", .5), ("A5", 1), ("F#5", 1)],
    [("G5", 1), ("D5", .5), ("D5", .5), ("G5", 1), (None, 1)],
]
POLKA_AC = ["G", "D", "G", "D", "G", "C", "D7", "G"]
POLKA_B = [
    [("E6", 1.5), ("D6", .5), ("C6", 1), ("G5", 1)],
    [("B5", .5), ("C6", .5), ("D6", 1), ("G5", 2)],
    [("A5", .5), ("B5", .5), ("C6", 1), ("F#5", .5), ("G5", .5), ("A5", 1)],
    [("B5", .5), ("A5", .5), ("G5", 1), ("D5", 2)],
    [("E6", 1.5), ("D6", .5), ("C6", 1), ("G5", 1)],
    [("B5", .5), ("C6", .5), ("D6", 1), ("G6", 2)],
    [("F#6", .5), ("E6", .5), ("D6", .5), ("C6", .5), ("A5", 1), ("F#5", 1)],
    [("G5", 2), (None, 2)],
]
POLKA_BC = ["C", "G", "D", "G", "C", "G", "D7", "G"]

# "Segelvind": a bouncy, syncopated folk-pop tune in D major.
SAIL_A = [
    [("F#5", .5), ("A5", .5), (None, .5), ("A5", .5), ("B5", .5), ("A5", .5), ("F#5", 1)],
    [("G5", .5), ("B5", .5), (None, .5), ("B5", .5), ("D6", .5), ("B5", .5), ("G5", 1)],
    [("F#5", .5), ("A5", .5), (None, .5), ("A5", .5), ("B5", .5), ("A5", .5), ("F#5", .5), ("D5", .5)],
    [("E5", 1.5), ("F#5", .5), ("E5", 2)],
    [("F#5", .5), ("A5", .5), (None, .5), ("A5", .5), ("B5", .5), ("A5", .5), ("F#5", 1)],
    [("G5", .5), ("B5", .5), (None, .5), ("B5", .5), ("D6", .5), ("B5", .5), ("G5", 1)],
    [("E5", .5), ("F#5", .5), ("G5", .5), ("A5", .5), ("B5", .5), ("A5", .5), ("G5", .5), ("E5", .5)],
    [("D5", 1), ("A4", .5), ("D5", .5), (None, 2)],
]
SAIL_AC = ["D", "G", "D", "A", "D", "G", ("Em", "A"), "D"]
SAIL_B = [
    [("D5", .5), ("F#5", .5), ("B5", 1), ("A5", .5), ("F#5", .5), ("D5", 1)],
    [("D5", .5), ("G5", .5), ("B5", 1), ("A5", .5), ("G5", .5), ("D5", 1)],
    [("F#5", .5), ("A5", .5), ("D6", 1), ("C#6", .5), ("A5", .5), ("F#5", 1)],
    [("E5", .5), ("A5", .5), ("C#6", 1), ("B5", .5), ("A5", .5), ("E5", 1)],
    [("D5", .5), ("F#5", .5), ("B5", 1), ("A5", .5), ("F#5", .5), ("D5", 1)],
    [("D5", .5), ("G5", .5), ("B5", 1), ("A5", .5), ("G5", .5), ("D5", 1)],
    [("G5", .5), ("F#5", .5), ("E5", .5), ("G5", .5), ("A5", 1), ("C#6", 1)],
    [("D6", 2), (None, 2)],
]
SAIL_BC = ["Bm", "G", "D", "A", "Bm", "G", ("Em", "A"), "D"]


def check(mel):
    for i, bar in enumerate(mel):
        assert abs(sum(d for _, d in bar) - 4) < 1e-6, (i, bar)


for _m in (POLKA_A, POLKA_B, SAIL_A, SAIL_B):
    check(_m)


def catchy(tune: dict, bpm: float, lead: int, lead2: int, groove: str, octave: int = 0):
    """A A B A: the hook opens, comes back after the B part, and the loop starts on it again."""
    s = Song(bpm=bpm)
    s.instrument("lead", lead, 0, volume=96, pan=58, reverb=55)
    s.instrument("lead2", lead2, 1, volume=86, pan=74, reverb=55)
    s.instrument("glock", GLOCK, 2, volume=62, pan=86, reverb=60)
    s.instrument("chords", ACCORDION if groove == "polka" else NYLON_GTR, 3, volume=64, pan=46, reverb=45)
    s.instrument("bass", AC_BASS, 4, volume=86, pan=64, reverb=25)
    s.instrument("pizz", PIZZ, 5, volume=60, pan=36, reverb=50)
    s.instrument("drums", 0, DRUMS, volume=70, pan=64, reverb=30)
    A, Ac, B, Bc = tune["A"], tune["Ac"], tune["B"], tune["Bc"]
    plan = [(A, Ac, "lead", None, False), (A, Ac, "lead", "glock", True),
            (B, Bc, "lead2", "lead", True), (A, Ac, "lead", "glock", True)]
    beat = 0.0
    for mel, chs, ld, dbl, full in plan:
        for bar, (notes, ch) in enumerate(zip(mel, chs)):
            b0 = beat + bar * 4
            sh = [((n(p) + 12 * octave) if p else None, d) for p, d in notes]
            melody(s, ld, b0, sh, 98, legato=0.85)
            if dbl == "glock":
                melody(s, "glock", b0, [((p + 12) if p else None, d) for p, d in sh], 70, legato=0.6)
            elif dbl:
                melody(s, dbl, b0, [((p - 12) if p else None, d) for p, d in sh], 72, legato=0.85)
            for h, c in enumerate(halves(ch)):
                span = 4 / len(halves(ch))
                hb = b0 + h * span
                tri = TRIADS[c]
                for k in range(int(span)):
                    t = hb + k
                    if k % 2 == 0:  # oom: root, then the fifth
                        s.note("bass", t, bass_root(c) if (k == 0) else n(tri[2]) - 12, 0.6, 96)
                    else:  # pah: short chord
                        for p in tri:
                            s.note("chords", t, up(p, 1), 0.3, 70)
                    if groove == "pop":  # guitar off-beat strum and pizzicato skips
                        for p in tri:
                            s.note("chords", t + 0.5, up(p, 1), 0.25, 58)
                    if full:
                        s.note("pizz", t + 0.5, up(tri[(k + 1) % 3], 1), 0.3, 56)
            if full:
                for k in range(4):
                    s.note("drums", b0 + k + 0.5, TAMB, 0.2, 54)
                    if groove == "pop" and k % 2 == 1:
                        s.note("drums", b0 + k, CLAP, 0.2, 60)
                    if groove == "polka":
                        s.note("drums", b0 + k, SHAKER, 0.2, 40)
        beat += len(mel) * 4
    return finish(s, beat)


POLKA = dict(A=POLKA_A, Ac=POLKA_AC, B=POLKA_B, Bc=POLKA_BC)
SAIL = dict(A=SAIL_A, Ac=SAIL_AC, B=SAIL_B, Bc=SAIL_BC)

TUNES.update({
    "music_title_polka": lambda: catchy(POLKA, 132, VIOLIN, ACCORDION, "polka", octave=-1),
    "music_title_polka_whistle": lambda: catchy(POLKA, 138, WHISTLE, VIOLIN, "polka", octave=-1),
    "music_title_segelvind": lambda: catchy(SAIL, 118, VIOLIN, FLUTE, "pop", octave=0),
    "music_title_segelvind_whistle": lambda: catchy(SAIL, 122, WHISTLE, ACCORDION, "pop", octave=0),
})


# ------------------------------------------------ round 3: more like Segelvind
# Jonas 2026-11-18 14.51: liked "Segelvind" with whistle and accordion; more happy
# tunes, less fiddle. So: whistle, recorder and accordion leads, no fiddle.
RECORDER = 74
TRIADS.update({"E": ["E3", "G#3", "B3"], "F#m": ["F#3", "A3", "C#4"], "Am": ["A2", "C3", "E3"]})

# "Solsken" (Sunshine): A major, skipping off-beat hook.
SUN_A = [
    [("E5", .5), ("A5", .5), ("C#6", .5), ("A5", .5), (None, .5), ("A5", .5), ("B5", 1)],
    [("A5", .5), ("F#5", .5), ("D5", .5), ("F#5", .5), ("A5", 1), ("F#5", 1)],
    [("E5", .5), ("A5", .5), ("C#6", .5), ("A5", .5), (None, .5), ("A5", .5), ("E6", 1)],
    [("D6", .5), ("C#6", .5), ("B5", .5), ("A5", .5), ("G#5", 2)],
    [("E5", .5), ("A5", .5), ("C#6", .5), ("A5", .5), (None, .5), ("A5", .5), ("B5", 1)],
    [("A5", .5), ("B5", .5), ("D6", .5), ("B5", .5), ("A5", 1), ("F#5", 1)],
    [("F#5", .5), ("G#5", .5), ("A5", .5), ("B5", .5), ("C#6", .5), ("B5", .5), ("G#5", 1)],
    [("A5", 1), ("E5", .5), ("A5", .5), (None, 2)],
]
SUN_AC = ["A", "D", "A", "E", "A", "D", ("D", "E"), "A"]
SUN_B = [
    [("C#6", 1), ("A5", .5), ("C#6", .5), (None, .5), ("B5", .5), ("A5", 1)],
    [("D6", 1), ("A5", .5), ("D6", .5), (None, .5), ("C#6", .5), ("B5", 1)],
    [("C#6", .5), ("B5", .5), ("A5", .5), ("E5", .5), ("A5", .5), ("B5", .5), ("C#6", 1)],
    [("B5", 1.5), ("A5", .5), ("G#5", 1), ("E5", 1)],
    [("C#6", 1), ("A5", .5), ("C#6", .5), (None, .5), ("B5", .5), ("A5", 1)],
    [("D6", 1), ("A5", .5), ("D6", .5), (None, .5), ("C#6", .5), ("B5", 1)],
    [("F#5", .5), ("A5", .5), ("D6", .5), ("C#6", .5), ("B5", 1), ("G#5", 1)],
    [("A5", 2), (None, 2)],
]
SUN_BC = ["F#m", "D", "A", "E", "F#m", "D", ("D", "E"), "A"]

# "Krabbfisket" (Crab fishing): G major, a jump up and a run down.
CRAB_A = [
    [("B4", .5), ("D5", .5), ("G5", 1), (None, .5), ("G5", .5), ("A5", .5), ("B5", .5)],
    [("C6", 1), ("B5", .5), ("A5", .5), ("G5", 1), ("E5", 1)],
    [("F#5", .5), ("A5", .5), ("D6", 1), (None, .5), ("C6", .5), ("B5", .5), ("A5", .5)],
    [("B5", 1), ("G5", 1), ("D5", 2)],
    [("B4", .5), ("D5", .5), ("G5", 1), (None, .5), ("G5", .5), ("A5", .5), ("B5", .5)],
    [("C6", 1), ("B5", .5), ("A5", .5), ("G5", 1), ("C6", 1)],
    [("B5", .5), ("A5", .5), ("G5", .5), ("F#5", .5), ("E5", .5), ("F#5", .5), ("A5", 1)],
    [("G5", 2), (None, 2)],
]
CRAB_AC = ["G", "C", "D", "G", "G", "C", "D7", "G"]
CRAB_B = [
    [("E5", .5), ("G5", .5), ("B5", .5), ("G5", .5), ("E5", .5), ("G5", .5), ("B5", 1)],
    [("C6", .5), ("B5", .5), ("A5", .5), ("G5", .5), ("E5", 2)],
    [("A5", .5), ("C6", .5), ("E6", 1), ("D6", .5), ("C6", .5), ("A5", 1)],
    [("B5", .5), ("A5", .5), ("F#5", 1), ("D5", 2)],
    [("E5", .5), ("G5", .5), ("B5", .5), ("G5", .5), ("E5", .5), ("G5", .5), ("B5", 1)],
    [("C6", .5), ("B5", .5), ("A5", .5), ("G5", .5), ("E5", 2)],
    [("C6", .5), ("B5", .5), ("A5", .5), ("C6", .5), ("B5", 1), ("A5", 1)],
    [("G5", 2), (None, 2)],
]
CRAB_BC = ["Em", "C", "Am", "D", "Em", "C", ("Am", "D7"), "G"]

for _m in (SUN_A, SUN_B, CRAB_A, CRAB_B):
    check(_m)
SUN = dict(A=SUN_A, Ac=SUN_AC, B=SUN_B, Bc=SUN_BC)
CRAB = dict(A=CRAB_A, Ac=CRAB_AC, B=CRAB_B, Bc=CRAB_BC)

TUNES.update({
    "music_title_solsken": lambda: catchy(SUN, 124, WHISTLE, ACCORDION, "pop", octave=-1),
    "music_title_solsken_recorder": lambda: catchy(SUN, 120, RECORDER, ACCORDION, "pop", octave=-1),
    "music_title_krabbfisket": lambda: catchy(CRAB, 126, WHISTLE, ACCORDION, "pop", octave=0),
    "music_title_krabbfisket_accordion": lambda: catchy(CRAB, 122, ACCORDION, WHISTLE, "pop", octave=-1),
    "music_title_polka_whistle_acc": lambda: catchy(POLKA, 136, WHISTLE, ACCORDION, "polka", octave=-1),
})


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
