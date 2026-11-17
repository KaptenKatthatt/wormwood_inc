"""'Building starts' from real recordings: hammer blows and a hand saw (all CC0).

    python3 tools/audio/build_start.py SOURCE_DIR OUT_DIR

Jonas (2026-11-17): the synthesised hammer did not sound like a hammer;
use a few hammer blows and a saw. SOURCE_DIR holds the originals:
  workshop/workshop/workshop - wood hammering.wav   bart, "68 Workshop Sounds" (CC0)
  sfx_loops/saw.ogg                                  rubberduck, "30 CC0 SFX loops" (CC0)
  100-CC0-wood-metal-SFX/wood_hammer_0[12].ogg       rubberduck, "100 CC0 metal and wood SFX" (CC0)
  saw_-_starninjas.ogg                               StarNinjas, "Saw or Wood Impact" (CC0)
"""
from __future__ import annotations

import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from ambience import load  # noqa: E402
from compose import ACCORDION, AC_BASS, CLARINET, VIOLIN, one_shot  # noqa: E402
from midisynth import RATE, encode, normalize  # noqa: E402


def cut(x: np.ndarray, start: float, end: float, fade: float = 0.06) -> np.ndarray:
    out = x[int(start * RATE):int(end * RATE)].copy()
    f = min(len(out), int(fade * RATE))
    out[-f:] *= np.linspace(1, 0, f)[:, None]
    fi = min(len(out), int(0.004 * RATE))
    out[:fi] *= np.linspace(0, 1, fi)[:, None]
    return out


def mix(parts: list[tuple[float, np.ndarray, float]]) -> np.ndarray:
    total = max(int(at * RATE) + len(p) for at, p, _ in parts)
    out = np.zeros((total, 2), dtype=np.float32)
    for at, p, g in parts:
        i = int(at * RATE)
        out[i:i + len(p)] += p * g
    return out


def main() -> None:
    src, out = sys.argv[1], sys.argv[2]
    os.makedirs(out, exist_ok=True)
    hammering = load(os.path.join(src, "workshop/workshop/workshop - wood hammering.wav"))
    hits3 = cut(hammering, 0.17, 1.52, fade=0.15)  # three blows
    saw = load(os.path.join(src, "sfx_loops/saw.ogg"))
    saw2 = cut(saw, 0.0, 1.05, fade=0.2)  # two strokes
    small = [load(os.path.join(src, f"100-CC0-wood-metal-SFX/wood_hammer_0{k}.ogg")) for k in (1, 2)]
    ninja = load(os.path.join(src, "saw_-_starninjas.ogg"))
    ninja2 = cut(ninja, 0.25, 1.75, fade=0.25)

    def chord(s):
        a = s.instrument("a", ACCORDION, 0, reverb=50)
        for p in ["D4", "F#4", "A4"]:
            s.note(a, 0, p, 0.9, 90)
    acc = one_shot(chord, bpm=120, tail=0.8)

    variants = {
        "build_start_hammer_saw": [(0.0, hits3, 1.0), (1.35, saw2, 0.9)],
        "build_start_saw_hammer": [(0.0, saw2, 0.9), (0.95, hits3, 1.0)],
        "build_start_quick": [(0.0, small[0], 1.0), (0.2, small[1], 1.0), (0.4, small[0], 1.0),
                              (0.7, ninja2, 1.1)],
        "build_start_hammer_saw_accordion": [(0.0, hits3, 1.0), (1.35, saw2, 0.9), (2.3, acc, 0.6)],
    }
    # Round 3 (Jonas 2026-11-17 13.14): "hammer, saw, accordion" is on the right
    # track, more in that style.
    def tag(build, bpm=120):
        return one_shot(build, bpm=bpm, tail=0.9)

    def cadence(s):  # A7 -> D, accordion with a bass
        a = s.instrument("a", ACCORDION, 0, reverb=50)
        b = s.instrument("b", AC_BASS, 1, reverb=30)
        for p in ["A3", "C#4", "G4"]:
            s.note(a, 0, p, 0.4, 85)
        for p in ["D4", "F#4", "A4"]:
            s.note(a, 0.5, p, 1.0, 95)
        s.note(b, 0, "A2", 0.4, 90)
        s.note(b, 0.5, "D2", 1.0, 95)

    def dance(s):  # clarinet run up into an accordion chord, like the village tune
        c = s.instrument("c", CLARINET, 0, reverb=60)
        a = s.instrument("a", ACCORDION, 1, reverb=50, volume=85)
        s.seq(c, 0, [("A4", .25), ("B4", .25), ("C#5", .25), ("D5", .75)], vel=95)
        for p in ["D4", "F#4", "A4"]:
            s.note(a, 0.75, p, 0.8, 85)

    def fiddle(s):  # fiddle flourish ending on the tonic with accordion under
        v = s.instrument("v", VIOLIN, 0, reverb=60)
        a = s.instrument("a", ACCORDION, 1, reverb=50, volume=80)
        s.seq(v, 0, [("F#5", .125), ("G5", .125), ("F#5", .125), ("E5", .125), ("D5", .75)], vel=100)
        for p in ["D4", "F#4", "A4"]:
            s.note(a, 0.5, p, 0.8, 80)

    def oompah(s):  # an accordion chord on each hammer blow (blows are 0.45 s apart)
        a = s.instrument("a", ACCORDION, 0, reverb=45)
        for k, ch in enumerate((["D4", "F#4", "A4"], ["D4", "F#4", "A4"], ["A3", "C#4", "G4"])):
            for p in ch:
                s.note(a, k * 0.9, p, 0.3, 70)

    one_hit = cut(hammering, 0.17, 0.62, fade=0.12)
    saw1 = cut(saw, 0.0, 0.55, fade=0.15)
    dull = load(os.path.join(src, "workshop/workshop/workshop - dull hammering.wav"))
    variants.update({
        "build_start_r3_cadence": [(0.0, hits3, 1.0), (1.35, saw2, 0.9), (2.3, tag(cadence), 0.6)],
        "build_start_r3_dance": [(0.0, hits3, 1.0), (1.35, saw2, 0.9), (2.25, tag(dance, 140), 0.6)],
        "build_start_r3_fiddle": [(0.0, hits3, 1.0), (1.35, saw2, 0.9), (2.3, tag(fiddle, 110), 0.6)],
        "build_start_r3_oompah": [(0.0, hits3, 1.0), (0.0, tag(oompah, 120), 0.35), (1.35, saw2, 0.9),
                                  (2.3, tag(cadence), 0.6)],
        "build_start_r3_short": [(0.0, one_hit, 1.0), (0.42, one_hit, 0.9), (0.85, saw1, 0.9),
                                 (1.35, acc, 0.6)],
        "build_start_r3_dull_ninja": [(0.0, cut(dull, 0.0, 1.4, fade=0.2), 1.0), (1.3, ninja2, 1.1),
                                      (2.7, acc, 0.6)],
    })
    only = set(sys.argv[3:])
    for name, parts in variants.items():
        if only and name not in only:
            continue
        encode(normalize(mix(parts), 0.85), os.path.join(out, name), mono=True)
        print(name)


if __name__ == "__main__":
    main()
