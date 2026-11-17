"""Builds the seaside ambience loop for the village from CC0 recordings.

    python3 tools/audio/ambience.py SOURCE_DIR OUT_BASE

SOURCE_DIR holds the downloaded originals (all CC0, see public/audio/CREDITS.md):
  Vistula/Vistula.mp3                        RandomMind, "Sea and river wave sounds"
  wave_0[1-4]_cc0-18363__jasinski__alkaibeach.flac   qubodup / jasinski, "Beach Ocean Waves"
  Seagull Ambient [1-3].wav                  Rango Mango, "Solo Seagull Sound Effects"
"""
from __future__ import annotations

import os
import subprocess
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from midisynth import RATE, encode, loop_bake, normalize  # noqa: E402

LOOP = 48.0


def load(path: str, start: float = 0.0, length: float | None = None) -> np.ndarray:
    args = ["ffmpeg", "-loglevel", "error", "-ss", str(start), "-i", path]
    if length:
        args += ["-t", str(length)]
    args += ["-ac", "2", "-ar", str(RATE), "-f", "f32le", "-"]
    raw = subprocess.run(args, capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()


def place(out: np.ndarray, clip: np.ndarray, at: float, gain: float, pan: float = 0.0) -> None:
    i = int(at * RATE) % len(out)
    c = clip * gain
    c[:, 0] *= 1 - max(0, pan)
    c[:, 1] *= 1 + min(0, pan)
    end = min(len(out), i + len(c))
    out[i:end] += c[:end - i]
    rest = len(c) - (end - i)
    if rest > 0:  # wrap around so the loop stays seamless
        out[:rest] += c[end - i:]


def main() -> None:
    src, out_base = sys.argv[1], sys.argv[2]
    rng = np.random.default_rng(7)
    bed = load(os.path.join(src, "Vistula/Vistula.mp3"), start=600, length=LOOP + 4)
    out = loop_bake(bed, LOOP) * 0.55
    waves = [load(os.path.join(src, f"wave_0{k}_cc0-18363__jasinski__alkaibeach.flac")) for k in range(1, 5)]
    t = 1.0
    while t < LOOP:
        place(out, waves[rng.integers(0, 4)], t, 0.5, pan=float(rng.uniform(-0.3, 0.3)))
        t += float(rng.uniform(5.5, 8.5))
    gulls = [load(os.path.join(src, f"Seagull Ambient {k}.wav")) for k in (1, 2, 3)]
    for at, g, pan in ((6.0, 0, -0.5), (21.0, 1, 0.6), (33.0, 2, -0.2), (41.5, 1, 0.4)):
        place(out, gulls[g], at, 0.16, pan)
    encode(normalize(out, 0.6), out_base)


if __name__ == "__main__":
    main()
